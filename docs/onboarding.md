# Onboarding

EnterpriseClaw provides two onboarding paths: a web-based wizard for browser users and a CLI command for terminal users. Both check the same things -- provider availability, model access, and system health.

## Web Onboarding Wizard

The web wizard is accessible at `/onboard` (route defined in `config.routes.onboard`).

### Steps

The wizard walks through six steps:

1. **Welcome** -- introduction to EnterpriseClaw
2. **Provider Check** -- detects which LLM providers are available
3. **Model Selection** -- shows available models, lets you pick a default
4. **Skills Check** -- lists loaded skills
5. **Diagnostics** -- runs system health checks (database, providers, skills)
6. **Ready** -- summary and link to start chatting

### How It Works

The wizard calls these API endpoints:

| Step | Endpoint | Purpose |
|------|----------|---------|
| Provider Check | `GET /api/v1/settings/providers` | List provider statuses |
| Model Selection | `GET /api/v1/settings/models` | List available models |
| Skills Check | `GET /api/v1/skills` | List loaded skills |
| Diagnostics | `GET /api/v1/settings/doctor` | Full diagnostic report |

### Diagnostic Report Shape

The `/api/v1/settings/doctor` endpoint returns:

```json
{
  "overallStatus": "ok",
  "checks": [
    {"name": "database", "status": "ok", "message": "Connected"},
    {"name": "openai", "status": "ok", "message": "API key configured"},
    {"name": "anthropic", "status": "warn", "message": "No API key"},
    {"name": "ollama", "status": "warn", "message": "Ollama not reachable"},
    {"name": "copilot", "status": "ok", "message": "GitHub token available"},
    {"name": "codex", "status": "warn", "message": "Codex auth file not found"},
    {"name": "skills", "status": "ok", "message": "2 skill(s) loaded"}
  ]
}
```

Status values: `ok`, `warn`, `fail`.

Overall status is `fail` if any check fails, `warn` if any check warns, `ok` otherwise.

## CLI Onboarding

Run `ec setup` for the CLI onboarding experience:

```bash
ec setup
```

### What It Checks

1. **Server connectivity** -- connects to `ws://localhost:8080/ws` and calls `health`
2. **Available models** -- calls `models.list` and displays all models with their provider and availability status
3. **Diagnostics** -- reads diagnostic checks from the health response
4. **Provider availability** -- determines if at least one AI provider is available

### Output

```
EnterpriseClaw Setup
====================

Server: ws://localhost:8080/ws
Status: UP
Version: 0.0.1-SNAPSHOT

Available Models:
  MODEL                          PROVIDER        STATUS
  -----                          --------        ------
  GPT-4.1                        openai          ready
  GPT-4o                         openai          ready
  Copilot GPT-4.1                copilot         ready
  Llama 3.2                      ollama          unavailable

Diagnostics:
  [OK]   database -- Connected
  [OK]   openai -- API key configured
  [WARN] anthropic -- No API key
  [OK]   copilot -- GitHub token available
  [WARN] ollama -- Ollama not reachable
  [OK]   skills -- 2 skill(s) loaded

Ready! Try: ec agent 'hello world'
```

If no providers are available:

```
No AI providers available.
Add API keys to .env.sample -> .env
```

## Troubleshooting

### No Providers Available

**Symptom:** All providers show as unavailable.

**Fix:**

- Add at least one API key to `.env`:

  ```bash
  OPENAI_API_KEY=sk-...
  # or
  ANTHROPIC_API_KEY=sk-ant-...
  ```

- Or authenticate with GitHub CLI for Copilot: `gh auth login`
- Or start Ollama: `ollama serve`

### OpenAI Not Available

**Symptom:** `"No API key"` for OpenAI provider.

**Fix:** Set `OPENAI_API_KEY` in `.env`. Restart the server.

### Anthropic Not Available

**Symptom:** `"No API key"` for Anthropic provider.

**Fix:** Set `ANTHROPIC_API_KEY` in `.env`. Restart the server.

### Ollama Not Reachable

**Symptom:** `"Ollama not reachable"`.

**Fix:**

1. Install Ollama: `brew install ollama`
2. Start it: `ollama serve`
3. Pull a model: `ollama pull llama3.2`
4. Verify: `curl http://localhost:11434` should return 200

### Copilot Not Available

**Symptom:** `"gh auth token not available"`.

**Fix:**

1. Install GitHub CLI: `brew install gh`
2. Authenticate: `gh auth login`
3. Verify: `gh auth token` should print a token
4. Ensure you have a GitHub Copilot subscription

### Codex Not Available

**Symptom:** `"Codex auth file not found"`.

**Fix:**

1. Install Codex CLI
2. Authenticate: `codex auth login`
3. Verify: `cat ~/.codex/auth.json` should contain an `access_token`

### Database Check Fails

**Symptom:** `"Unreachable"` for database.

**Fix (solo mode):** Check that the `data/` directory is writable. The H2 database is file-based.

**Fix (team mode):**

1. Start PostgreSQL: `task local:postgres:start`
2. Verify connection: `task local:postgres:shell`
3. Check `.env` has correct `SPRING_DATASOURCE_URL`, `USERNAME`, and `PASSWORD`

### Skills Not Loading

**Symptom:** `"0 skill(s) loaded"`.

**Fix:**

1. Check that `skills/` directory exists at the repo root
2. Each skill needs a subdirectory with a `SKILL.md` file
3. Verify the path in `application.yml`: `enterpriseclaw.skills.directory`
4. Try a rescan: `curl -X POST http://localhost:8080/api/v1/skills/rescan`

### CLI Cannot Connect to Server

**Symptom:** `"Server not running at ws://localhost:8080/ws"`.

**Fix:**

1. Start the server: `task local:dev:server`
2. Wait for Spring Boot to finish starting (look for "Started EnterpriseclawApplication")
3. If using a different port, pass `--server ws://host:port/ws`

## Refreshing Provider Status

After fixing a provider issue, you can force the server to re-probe all providers without restarting:

```bash
curl -X POST http://localhost:8080/api/v1/settings/models/refresh
```

The frontend model selector will automatically reflect the updated availability.
