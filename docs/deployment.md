# Deployment

## Docker

Each app has its own Dockerfile and can be built and run independently.

### Build and Start All Containers

```bash
task local:docker:all
```

This builds and starts both the server and frontend containers.

### Individual Container Commands

```bash
# Server only
cd apps/server && docker compose up --build -d

# Frontend only
cd apps/frontend && docker compose up --build -d

# Stop everything
task local:docker:stop
```

### Docker Compose for PostgreSQL

For team mode, start the shared PostgreSQL instance:

```bash
task local:postgres:start
```

This uses `docker-compose-postgres.yaml`:

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: enterpriseclaw
      POSTGRES_USER: enterpriseclaw
      POSTGRES_PASSWORD: enterpriseclaw
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

The pgvector extension is included for future vector search capabilities.

### Full Docker Stack

To run the complete stack (PostgreSQL + server + frontend):

1. Start PostgreSQL:

   ```bash
   task local:postgres:start
   ```

2. Update `.env` for team mode:

   ```bash
   SPRING_PROFILES_ACTIVE=team
   SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/enterpriseclaw
   SPRING_DATASOURCE_USERNAME=enterpriseclaw
   SPRING_DATASOURCE_PASSWORD=enterpriseclaw
   ```

3. Build and start app containers:

   ```bash
   task local:docker:all
   ```

## Environment-Specific Taskfiles

The project uses environment-specific Taskfiles for different stages:

| Taskfile | Purpose |
|----------|---------|
| `Taskfile.yml` | Root orchestrator, includes all environments |
| `Taskfile.local.yml` | Local development tasks |
| `Taskfile.dev.yml` | Dev/staging environment tasks |
| `Taskfile.production.yml` | Production deployment tasks |

All Taskfiles load `.env` and `application.env` via `dotenv`.

## Kamal Deploy

Placeholder Kamal deploy configs exist in `infra/deploy/`:

```
infra/deploy/
  dev/       # Dev environment configs
  prod/      # Production environment configs
```

Kamal handles Docker image building, pushing to a registry, and zero-downtime deployment to remote servers.

## Database Setup

### Solo Mode (H2)

Default. No setup needed. H2 stores data in `./data/enterpriseclaw` relative to the server working directory.

```yaml
spring:
  datasource:
    url: jdbc:h2:file:./data/enterpriseclaw
    driver-class-name: org.h2.Driver
    username: sa
    password: ''
```

### Team Mode (PostgreSQL + pgvector)

1. Start PostgreSQL:

   ```bash
   task local:postgres:start
   ```

2. Set environment variables:

   ```bash
   SPRING_PROFILES_ACTIVE=team
   SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/enterpriseclaw
   SPRING_DATASOURCE_USERNAME=enterpriseclaw
   SPRING_DATASOURCE_PASSWORD=enterpriseclaw
   ```

3. Flyway runs migrations automatically on startup.

4. Verify with psql:

   ```bash
   task local:postgres:shell
   \dt  -- list tables
   ```

### Migrations

Flyway manages all schema changes. Migration files are in `apps/server/src/main/resources/db/migration/`:

| Migration | Creates |
|-----------|---------|
| V1 | `chat_sessions` |
| V2 | `chat_messages` |
| V3 | `agent_run_log` |
| V4 | `audit_events` |
| V5 | `scheduled_jobs` |
| V6 | `job_executions` |
| V7 | `tenants` |
| V8 | `app_users` |
| V9 | `channel_identities` |
| V10 | `executions` |
| V11 | `mcp_servers` |
| V12 | `skills_registry` |
| V13 | `channel_configs` |

Hibernate runs with `ddl-auto: validate` -- it validates the schema matches entity definitions but never modifies the database. All schema changes must go through Flyway.

### Database Reset

To wipe the PostgreSQL database and start fresh:

```bash
task local:postgres:reset
task local:postgres:start
```

For H2, delete the `data/` directory in the server working directory.

## Production Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SPRING_PROFILES_ACTIVE` | Yes | Set to `team` for production |
| `SPRING_DATASOURCE_URL` | Yes | PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | Yes | Database username |
| `SPRING_DATASOURCE_PASSWORD` | Yes | Database password |
| `OPENAI_API_KEY` | At least one provider | OpenAI API key |
| `ANTHROPIC_API_KEY` | At least one provider | Anthropic API key |
| `SERVER_PORT` | No | HTTP port (default 8080) |

### Server Address

By default, the server binds to `127.0.0.1` (localhost only). For production, change to `0.0.0.0`:

```yaml
server:
  address: 0.0.0.0
  port: 8080
```

Or via environment variable:

```bash
SERVER_ADDRESS=0.0.0.0
```

### Channel Webhook URLs

External messaging platforms (Teams, Telegram) need to reach your webhook endpoints over HTTPS. Options for exposing them:

**ngrok (development):**

```bash
ngrok http 8080
# Use the ngrok URL as your webhook base URL
```

**Cloudflare Tunnel (development/production):**

```bash
cloudflared tunnel --url http://localhost:8080
```

**Reverse proxy (production):**

Configure Caddy, nginx, or a cloud load balancer to terminate TLS and proxy to the server.

### Health Check

The server exposes a health endpoint for monitoring:

```
GET /actuator/health
```

Response:

```json
{
  "status": "UP"
}
```

Use this for Docker health checks, load balancer probes, and monitoring.

## Build for Production

```bash
# Build everything
task local:build:all

# Or individually
task local:build:frontend   # Produces dist/ in apps/frontend
task local:build:server     # Produces JAR in apps/server/build/libs
```

The server JAR is a fat JAR that can be run directly:

```bash
java -jar apps/server/build/libs/server-*.jar
```
