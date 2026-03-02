# Sprint 8 — Hardening

> **Epic:** Epic 9 — Docker, JLink, smoke tests, CI pipeline, final polish  
> **Goal:** The application ships as a working Docker image and JLink runtime. A full CI pipeline runs on every push. Smoke tests cover every endpoint group. Zero `task test` failures.  
> **Prerequisites:** All previous sprints complete  
> **Test Gate:** Docker image boots and serves the UI · JLink image runs without system JDK · `ijhttp` smoke tests pass · `task test` green in CI · `task build` clean

---

## Context

This is the production-readiness sprint. No new features — focus on containerisation, distribution, automated smoke tests, and making sure the full test suite is solid and fast in CI.

---

## Backend Deliverables

### 1. Dockerfile (multi-stage)

```dockerfile
# Dockerfile
FROM gradle:8.5-jdk21 AS build
WORKDIR /app
COPY build.gradle settings.gradle gradle.properties ./
COPY gradle/ gradle/
RUN gradle dependencies --no-daemon  # cache deps layer
COPY src/ src/
RUN gradle build -x test --no-daemon

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
COPY .claude/skills/ .claude/skills/
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -q -O- http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### 2. docker-compose.yml (solo mode)

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - SPRING_PROFILES_ACTIVE=solo
    volumes:
      - ./data:/app/data          # persist H2 DB
      - ./.claude/skills:/app/.claude/skills  # mount skill folder
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "-O-", "http://localhost:8080/actuator/health"]
      interval: 30s
      retries: 3
```

### 3. docker-compose-team.yml (team mode with Postgres)

```yaml
version: '3.8'
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: enterpriseclaw
      POSTGRES_USER: ec
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "ec"]
      interval: 10s
      retries: 5

  app:
    build: .
    ports:
      - "8080:8080"
    depends_on:
      db:
        condition: service_healthy
    environment:
      - SPRING_PROFILES_ACTIVE=team
      - SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/enterpriseclaw
      - SPRING_DATASOURCE_USERNAME=ec
      - SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped

volumes:
  pgdata:
```

### 4. JLink task in Taskfile

```yaml
# Taskfile.yml additions
jlink:
  desc: Build self-contained JLink runtime image
  cmds:
    - task: build
    - ./gradlew jlink

docker:build:
  desc: Build Docker image
  cmds:
    - task: build
    - docker build -t enterpriseclaw:latest .

docker:run:
  desc: Run Docker image (solo mode)
  cmds:
    - docker run -p 8080:8080 --env-file .env enterpriseclaw:latest

docker:compose:
  desc: Start with Docker Compose (solo mode)
  cmds:
    - docker compose up -d

docker:compose:team:
  desc: Start with Docker Compose (team mode, Postgres)
  cmds:
    - docker compose -f docker-compose-team.yml up -d
```

### 5. .env.example (final)

```bash
# .env.example — copy to .env and fill in real values — NEVER commit .env

# LLM providers (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# App mode: solo (default) or team
SPRING_PROFILES_ACTIVE=solo

# Team mode only
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/enterpriseclaw
SPRING_DATASOURCE_USERNAME=ec
DB_PASSWORD=changeme
JWT_SECRET=your-32-character-minimum-secret-here

# Optional
SERVER_PORT=8080
VITE_BASE_API_URL=
VITE_APP_MODE=solo
```

### 6. .gitignore additions

```gitignore
# .gitignore
.env
data/
src/main/resources/static/
frontend/dist/
build/
dist/
.gradle/
```

---

## HTTP Smoke Tests (`.http` files)

Structure:
```
requests/
├── http-client.env.json        ← environment config
├── 01-health.http
├── 02-sessions.http
├── 03-chat.http
├── 04-skills.http
├── 05-cronjobs.http
├── 06-dashboard.http
├── 07-audit-log.http
└── 08-settings.http
```

### http-client.env.json

```json
{
  "local": {
    "baseurl": "http://localhost:8080",
    "token": ""
  },
  "docker": {
    "baseurl": "http://localhost:8080",
    "token": ""
  }
}
```

### 01-health.http

```http
### Health check
GET {{baseurl}}/actuator/health

> {%
  client.test("Health UP", function() {
    client.assert(response.status === 200, "Expected 200");
    client.assert(response.body.status === "UP", "Expected status UP");
  });
%}
```

### 02-sessions.http

```http
### Create session
POST {{baseurl}}/api/v1/sessions
Content-Type: application/json

> {%
  client.test("Session created", function() {
    client.assert(response.status === 200, "Expected 200");
    client.assert(response.body.sessionId !== undefined, "sessionId missing");
    client.global.set("sessionId", response.body.sessionId);
  });
%}

### List sessions
GET {{baseurl}}/api/v1/sessions

> {%
  client.test("Sessions listed", function() {
    client.assert(response.status === 200, "Expected 200");
    client.assert(Array.isArray(response.body), "Expected array");
  });
%}

### Delete session
DELETE {{baseurl}}/api/v1/sessions/{{sessionId}}

> {%
  client.test("Session deleted", function() {
    client.assert(response.status === 204, "Expected 204");
  });
%}
```

### 03-chat.http (NDJSON stream — note: ijhttp handles streaming)

```http
### Send chat message (stub or real LLM)
POST {{baseurl}}/api/v1/chat
Content-Type: application/json
Accept: application/x-ndjson

{
  "sessionId": "{{sessionId}}",
  "message": "Hello, what can you do?",
  "model": "gpt-4o"
}

> {%
  client.test("Chat returns NDJSON", function() {
    client.assert(response.status === 200, "Expected 200");
    client.assert(response.headers["content-type"].includes("application/x-ndjson"), "Wrong content type");
  });
%}
```

### 04-skills.http

```http
### List skills
GET {{baseurl}}/api/v1/skills

> {%
  client.test("Skills listed", function() {
    client.assert(response.status === 200);
    client.assert(response.body.length >= 8, "Expected at least 8 built-in skills");
  });
%}

### Get skill detail
GET {{baseurl}}/api/v1/skills/code-reviewer

> {%
  client.test("Skill detail returned", function() {
    client.assert(response.status === 200);
    client.assert(response.body.name === "code-reviewer");
    client.assert(response.body.content !== null, "Content should be populated");
  });
%}

### Rescan skills
POST {{baseurl}}/api/v1/skills/rescan

> {%
  client.test("Rescan returns count", function() {
    client.assert(response.status === 200);
    client.assert(response.body.count >= 8);
  });
%}
```

### 05-cronjobs.http

```http
### Create cron job
POST {{baseurl}}/api/v1/cronjobs
Content-Type: application/json

{
  "name": "Smoke Test Job",
  "prompt": "Say hello",
  "cronExpression": "0 0 * * *",
  "model": "gpt-4o",
  "questionContextEnabled": false,
  "sessionTarget": "isolated"
}

> {%
  client.test("CronJob created", function() {
    client.assert(response.status === 201);
    client.global.set("cronJobId", response.body.id);
  });
%}

### Trigger job
POST {{baseurl}}/api/v1/cronjobs/{{cronJobId}}/trigger

> {%
  client.test("Trigger accepted", function() {
    client.assert(response.status === 202);
  });
%}

### Delete job
DELETE {{baseurl}}/api/v1/cronjobs/{{cronJobId}}

> {%
  client.test("Job deleted", function() {
    client.assert(response.status === 204);
  });
%}
```

---

## CI Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Java 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: 'gradle'

      - name: Set up Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install Task
        run: sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b ~/.local/bin

      - name: Install frontend deps
        run: task install

      - name: Run all tests
        run: task test
        env:
          OPENAI_API_KEY: ""       # WireMock stubs LLM — no real key needed
          ANTHROPIC_API_KEY: ""

      - name: Lint
        run: task lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '21', distribution: 'temurin', cache: 'gradle' }
      - uses: oven-sh/setup-bun@v1

      - name: Install Task
        run: sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b ~/.local/bin

      - name: Full build
        run: task build

      - name: Build Docker image
        run: docker build -t enterpriseclaw:${{ github.sha }} .

  smoke:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '21', distribution: 'temurin', cache: 'gradle' }
      - uses: oven-sh/setup-bun@v1

      - name: Install Task + ijhttp
        run: |
          sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b ~/.local/bin
          # Install IntelliJ HTTP Client CLI
          curl -L https://jb.gg/ijhttp-cli/latest -o ijhttp.zip && unzip ijhttp.zip

      - name: Build and start app
        run: |
          task build
          java -jar build/libs/*.jar &
          sleep 15
        env:
          OPENAI_API_KEY: ""
          SPRING_PROFILES_ACTIVE: solo

      - name: Run smoke tests
        run: |
          ./ijhttp requests/01-health.http requests/02-sessions.http requests/04-skills.http \
                   requests/05-cronjobs.http requests/06-dashboard.http requests/07-audit-log.http \
                   --env local
```

### Taskfile additions for smoke tests

```yaml
test:smoke:
  desc: Run ijhttp smoke tests against running instance
  cmds:
    - ./ijhttp requests/*.http --env local

test:all:
  desc: Run unit + integration + smoke tests
  cmds:
    - task: test
    - task: test:smoke
```

---

## README.md (root)

The final `README.md` should cover:
1. **Quick start** (solo mode): `cp .env.example .env` → add API key → `task dev`
2. **Docker** (solo): `task docker:run`
3. **Docker Compose** (team): `task docker:compose:team`
4. **Dev workflow**: `task dev`, `task test`, `task build`, `task lint`
5. **Skills**: how to add a skill in `.claude/skills/`
6. **Configuration**: full `.env` variable reference

---

## Performance & NFR Checklist

- [ ] `task test` completes in < 3 minutes (unit + slice tests; WireMock integration excluded from fast path)
- [ ] `task build` completes in < 5 minutes with Gradle cache warm
- [ ] Docker image size < 400 MB
- [ ] App starts up in < 20 seconds (solo mode, H2)
- [ ] `GET /actuator/health` responds in < 100ms
- [ ] Chat NDJSON stream first byte arrives in < 3 seconds (excluding LLM latency)
- [ ] Frontend Lighthouse score ≥ 85 (desktop)
- [ ] No `console.error` in frontend CI build output

---

## Acceptance Criteria

- [ ] `task docker:build` produces an image that boots and serves the UI on port 8080
- [ ] `docker compose up -d` starts the app and health check passes
- [ ] `docker compose -f docker-compose-team.yml up -d` starts app + Postgres
- [ ] JLink task produces `dist/` with working launcher script
- [ ] All 8 `.http` smoke test files exist and pass against a locally running instance
- [ ] GitHub Actions CI pipeline runs all jobs green
- [ ] `task test` completes in < 3 minutes
- [ ] README documents all three installation paths
- [ ] `.env.example` covers all required variables with comments
- [ ] `.gitignore` excludes `.env`, `data/`, `static/`, `dist/`

---

## Handover Notes

- The JLink task requires `jdeps` analysis to determine the correct module set. Start with `--add-modules ALL-MODULE-PATH` and trim from there.
- Docker `.dockerignore` must exclude `.env`, `frontend/node_modules/`, `build/`, `data/`, `.gradle/`.
- The `smoke` CI job skips the chat NDJSON test in CI (no LLM key) — mark that test with `@Disabled("Requires LLM")` or skip with a profile.
- Consider caching the Gradle wrapper and Bun store in CI for faster builds.
- After this sprint, the project is production-ready. Tag `v1.0.0`.
