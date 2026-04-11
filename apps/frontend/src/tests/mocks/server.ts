import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Default handlers — keep unhandled-request noise out of test output
const defaultHandlers = [
  http.get('/api/v1/sessions', () => HttpResponse.json([])),
  http.post('/api/v1/sessions', () =>
    HttpResponse.json({ sessionId: 'test-session-id', title: null, lastMessageAt: new Date().toISOString() })
  ),
  http.get('/api/v1/sessions/:id/messages', () => HttpResponse.json([])),
  http.delete('/api/v1/sessions/:id/messages', () =>
    new HttpResponse(null, { status: 204 })
  ),
  http.get('/api/v1/settings/models', () =>
    HttpResponse.json([
      { id: 'gpt-4.1', displayName: 'GPT-4.1', provider: 'openai', available: true },
      { id: 'claude-sonnet-4-5-20250929', displayName: 'Claude Sonnet 4.5', provider: 'anthropic', available: true },
    ])
  ),
  http.get('/api/v1/settings/models/all', () =>
    HttpResponse.json([
      { id: 'gpt-4.1', displayName: 'GPT-4.1', provider: 'openai', available: true },
      { id: 'claude-sonnet-4-5-20250929', displayName: 'Claude Sonnet 4.5', provider: 'anthropic', available: true },
      { id: 'ollama:llama3.2', displayName: 'Llama 3.2', provider: 'ollama', available: false },
      { id: 'copilot:gpt-4.1', displayName: 'Copilot GPT-4.1', provider: 'copilot', available: false },
    ])
  ),
  http.get('/api/v1/settings/providers', () =>
    HttpResponse.json([
      { provider: 'openai', available: true, reason: null },
      { provider: 'anthropic', available: true, reason: null },
      { provider: 'ollama', available: false, reason: 'Ollama not running on localhost:11434' },
      { provider: 'copilot', available: false, reason: 'gh CLI not authenticated' },
      { provider: 'codex', available: false, reason: '~/.codex/auth.json not found' },
    ])
  ),
  http.post('/api/v1/settings/models/refresh', () =>
    HttpResponse.json([
      { id: 'gpt-4.1', displayName: 'GPT-4.1', provider: 'openai', available: true },
      { id: 'claude-sonnet-4-5-20250929', displayName: 'Claude Sonnet 4.5', provider: 'anthropic', available: true },
    ])
  ),
  http.get('/api/v1/settings/doctor', () =>
    HttpResponse.json({
      overallStatus: 'OK',
      checks: [
        { name: 'Database', status: 'OK', message: 'H2 in-memory database active' },
        { name: 'Skills Directory', status: 'OK', message: '3 skills loaded' },
        { name: 'Ollama', status: 'WARN', message: 'Ollama not running on localhost:11434' },
      ],
    })
  ),
]

export const server = setupServer(...defaultHandlers)
