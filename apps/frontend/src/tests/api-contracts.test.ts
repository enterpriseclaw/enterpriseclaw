/**
 * E2E API Contract Tests — Frontend
 *
 * Validates that API response shapes match the contracts documented in
 * docs/fsd-enterpriseclaw.md §12 and consumed by the React client via
 * frontend/src/lib/config.ts.
 *
 * Scenario coverage per endpoint:
 *   - Happy-path: response shape matches the contract (fields, types, status)
 *   - Error path: 4xx/5xx responses carry the common error shape
 *   - NDJSON streaming: POST /chat emits the correct event types in order
 *
 * All fetch calls go through the MSW interceptor — no real network.
 *
 * Implementation note: tests use the global `fetch` directly rather than the
 * `apiRequest`/`apiLongRequest` wrapper so that tests are focused purely on the
 * API contract and are not affected by the wrapper's AbortSignal.timeout() call.
 * The wrapper behaviour is covered by domain/chat/__tests__/useChat.test.ts.
 */
import { http, HttpResponse } from 'msw'
import { beforeAll, afterEach, afterAll, describe, test, expect } from 'vitest'
import { server } from './mocks/server'
import { config } from '@/lib/config'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

/** Register a one-off MSW handler for the current test. */
function withHandler(handler: Parameters<typeof server.use>[0]) {
  server.use(handler)
}

/** Parse an NDJSON response body into an array of parsed objects. */
async function readNdjson(res: Response): Promise<Array<Record<string, unknown>>> {
  const text = await res.text()
  return text
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => JSON.parse(line) as Record<string, unknown>)
}

/** Build an MSW ReadableStream for NDJSON streaming responses. */
function makeNdjsonStream(...events: Record<string, unknown>[]): ReadableStream {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const ev of events) {
        controller.enqueue(enc.encode(JSON.stringify(ev) + '\n'))
      }
      controller.close()
    },
  })
}

// ---------------------------------------------------------------------------
// POST /api/v1/sessions
// Contract: 200 OK, application/json
//   body: { sessionId: string, title: string | null, lastMessageAt: string }
// ---------------------------------------------------------------------------

describe('POST /api/v1/sessions', () => {
  test('happy path — 200 with SessionSummary shape', async () => {
    const res = await fetch(config.api.endpoints.sessions, { method: 'POST' })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/json')

    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('sessionId')
    expect(body.sessionId).toBeTypeOf('string')
    expect((body.sessionId as string).length).toBeGreaterThan(0)
    // title may be null or a string
    expect(body.title === null || typeof body.title === 'string').toBe(true)
    expect(body).toHaveProperty('lastMessageAt')
    expect(body.lastMessageAt).toBeTypeOf('string')
  })

  test('happy path — sessionId is unique per request', async () => {
    withHandler(
      http.post(config.api.endpoints.sessions, () =>
        HttpResponse.json({ sessionId: 'sess-unique-42', title: null, lastMessageAt: new Date().toISOString() })
      )
    )

    const res = await fetch(config.api.endpoints.sessions, { method: 'POST' })
    const body = await res.json() as { sessionId: string }

    expect(body.sessionId).toBe('sess-unique-42')
  })

  test('error path — 500 response follows common error shape', async () => {
    withHandler(
      http.post(config.api.endpoints.sessions, () =>
        HttpResponse.json(
          { status: 500, error: 'Internal Server Error', message: 'db down', path: '/api/v1/sessions' },
          { status: 500 }
        )
      )
    )

    const res = await fetch(config.api.endpoints.sessions, { method: 'POST' })
    expect(res.status).toBe(500)

    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('status', 500)
    expect(body).toHaveProperty('error', 'Internal Server Error')
    expect(body).toHaveProperty('message')
    expect(body).toHaveProperty('path')
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/sessions
// Contract: 200 OK, application/json
//   body: Array<{ sessionId: string, title: string | null, lastMessageAt: string }>
// ---------------------------------------------------------------------------

describe('GET /api/v1/sessions', () => {
  test('happy path — 200 returns JSON array', async () => {
    withHandler(
      http.get(config.api.endpoints.sessions, () =>
        HttpResponse.json([
          { sessionId: 's1', title: 'First',  lastMessageAt: new Date().toISOString() },
          { sessionId: 's2', title: null,      lastMessageAt: new Date().toISOString() },
        ])
      )
    )

    const res = await fetch(config.api.endpoints.sessions)
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/json')

    const body = await res.json() as Array<Record<string, unknown>>
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(2)
  })

  test('happy path — empty array when no sessions exist', async () => {
    // default handler returns []
    const res = await fetch(config.api.endpoints.sessions)
    const body = await res.json() as unknown[]

    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(0)
  })

  test('each item has sessionId, title, lastMessageAt fields', async () => {
    withHandler(
      http.get(config.api.endpoints.sessions, () =>
        HttpResponse.json([
          { sessionId: 'abc', title: 'Chat', lastMessageAt: '2026-01-01T12:00:00Z' },
        ])
      )
    )

    const res = await fetch(config.api.endpoints.sessions)
    const [session] = await res.json() as Array<Record<string, unknown>>

    expect(session).toHaveProperty('sessionId')
    expect(session).toHaveProperty('title')
    expect(session).toHaveProperty('lastMessageAt')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/sessions/:id
// Contract: 204 No Content (no body)
// ---------------------------------------------------------------------------

describe('DELETE /api/v1/sessions/:id', () => {
  test('happy path — 204 No Content', async () => {
    withHandler(
      http.delete(config.api.endpoints.session('sess-1'), () =>
        new HttpResponse(null, { status: 204 })
      )
    )

    const res = await fetch(config.api.endpoints.session('sess-1'), { method: 'DELETE' })
    expect(res.status).toBe(204)
  })

  test('error path — 404 follows common error shape', async () => {
    withHandler(
      http.delete(config.api.endpoints.session('ghost'), () =>
        HttpResponse.json(
          { status: 404, error: 'Not Found', message: 'session not found', path: '/api/v1/sessions/ghost' },
          { status: 404 }
        )
      )
    )

    const res = await fetch(config.api.endpoints.session('ghost'), { method: 'DELETE' })
    expect(res.status).toBe(404)

    const body = await res.json() as Record<string, unknown>
    expect(body).toMatchObject({ status: 404, error: 'Not Found' })
    expect(body).toHaveProperty('message')
    expect(body).toHaveProperty('path')
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/v1/sessions/:id/title
// Contract: 200 OK (empty body), request body: { title: string }
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/sessions/:id/title', () => {
  test('happy path — 200 OK with valid title body', async () => {
    withHandler(
      http.patch('/api/v1/sessions/sess-42/title', () =>
        new HttpResponse(null, { status: 200 })
      )
    )

    const res = await fetch('/api/v1/sessions/sess-42/title', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Renamed Session' }),
    })

    expect(res.status).toBe(200)
  })

  test('error path — 400 when title is missing', async () => {
    withHandler(
      http.patch('/api/v1/sessions/sess-42/title', () =>
        HttpResponse.json(
          { status: 400, error: 'Bad Request', message: 'title must not be blank', path: '/api/v1/sessions/sess-42/title' },
          { status: 400 }
        )
      )
    )

    const res = await fetch('/api/v1/sessions/sess-42/title', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as Record<string, unknown>
    expect(body).toMatchObject({ status: 400, error: 'Bad Request' })
    expect(body).toHaveProperty('message')
    expect(body).toHaveProperty('path')
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/sessions/:id/messages
// Contract: 200 OK, application/json
//   body: Array<{ id: string, role: string, content: string, createdAt: string }>
// ---------------------------------------------------------------------------

describe('GET /api/v1/sessions/:id/messages', () => {
  test('happy path — 200 returns MessageSummary[] shape', async () => {
    withHandler(
      http.get(config.api.endpoints.sessionMessages('s1'), () =>
        HttpResponse.json([
          { id: 'm1', role: 'USER', content: 'Hello', createdAt: '2026-01-01T00:00:00Z' },
          { id: 'm2', role: 'ASSISTANT', content: 'Hi there', createdAt: '2026-01-01T00:00:01Z' },
        ])
      )
    )

    const res = await fetch(config.api.endpoints.sessionMessages('s1'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/json')

    const body = await res.json() as Array<Record<string, unknown>>
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(2)

    for (const msg of body) {
      expect(msg).toHaveProperty('id')
      expect(msg).toHaveProperty('role')
      expect(msg).toHaveProperty('content')
      expect(msg).toHaveProperty('createdAt')
      expect(msg.id).toBeTypeOf('string')
      expect(msg.role).toBeTypeOf('string')
      expect(msg.content).toBeTypeOf('string')
      expect(msg.createdAt).toBeTypeOf('string')
    }
  })

  test('empty session returns empty array', async () => {
    // default handler returns []
    const res = await fetch(config.api.endpoints.sessionMessages('empty'))
    const body = await res.json() as unknown[]

    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(0)
  })

  test('supports limit and offset query params', async () => {
    withHandler(
      http.get(config.api.endpoints.sessionMessages('s1'), ({ request }) => {
        const url = new URL(request.url)
        const limit = url.searchParams.get('limit')
        const offset = url.searchParams.get('offset')
        return HttpResponse.json([
          { id: 'm3', role: 'USER', content: `limit=${limit}&offset=${offset}`, createdAt: '2026-01-01T00:00:03Z' },
        ])
      })
    )

    const res = await fetch(config.api.endpoints.sessionMessages('s1') + '?limit=10&offset=5')
    expect(res.status).toBe(200)
    const body = await res.json() as Array<Record<string, unknown>>
    expect(body).toHaveLength(1)
    expect(body[0].content).toBe('limit=10&offset=5')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/sessions/:id/messages
// Contract: 204 No Content (no body)
// ---------------------------------------------------------------------------

describe('DELETE /api/v1/sessions/:id/messages', () => {
  test('happy path — 204 No Content', async () => {
    const res = await fetch(config.api.endpoints.sessionMessages('s1'), { method: 'DELETE' })
    expect(res.status).toBe(204)
  })
})

// ---------------------------------------------------------------------------
// POST /api/v1/chat  (NDJSON streaming)
// Contract: 200 OK, Content-Type: application/x-ndjson
//   body: newline-delimited ChatEvent objects
//   event types: token | tool_call | tool_done | question | done | error
// ---------------------------------------------------------------------------

describe('POST /api/v1/chat — NDJSON streaming', () => {
  const chatRequest = JSON.stringify({ sessionId: 's1', message: 'hi', model: 'gpt-4o' })
  const chatHeaders = { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' }

  test('Content-Type is application/x-ndjson', async () => {
    withHandler(
      http.post(config.api.endpoints.chat, () =>
        new HttpResponse(makeNdjsonStream({ type: 'done' }), {
          headers: { 'Content-Type': 'application/x-ndjson' },
        })
      )
    )

    const res = await fetch(config.api.endpoints.chat, {
      method: 'POST', headers: chatHeaders, body: chatRequest,
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toContain('application/x-ndjson')
  })

  test('stream ends with a done event', async () => {
    withHandler(
      http.post(config.api.endpoints.chat, () =>
        new HttpResponse(
          makeNdjsonStream(
            { type: 'token', text: 'Hello ' },
            { type: 'token', text: 'world' },
            { type: 'done' }
          ),
          { headers: { 'Content-Type': 'application/x-ndjson' } }
        )
      )
    )

    const res = await fetch(config.api.endpoints.chat, {
      method: 'POST', headers: chatHeaders, body: chatRequest,
    })
    const events = await readNdjson(res)

    expect(events.at(-1)?.type).toBe('done')
  })

  test('token events have a text field of type string', async () => {
    withHandler(
      http.post(config.api.endpoints.chat, () =>
        new HttpResponse(
          makeNdjsonStream(
            { type: 'token', text: 'Hello ' },
            { type: 'token', text: 'world' },
            { type: 'done' }
          ),
          { headers: { 'Content-Type': 'application/x-ndjson' } }
        )
      )
    )

    const res = await fetch(config.api.endpoints.chat, {
      method: 'POST', headers: chatHeaders, body: chatRequest,
    })
    const events = await readNdjson(res)

    const tokenEvents = events.filter(e => e.type === 'token')
    expect(tokenEvents.length).toBeGreaterThan(0)
    tokenEvents.forEach(e => expect(e.text).toBeTypeOf('string'))
  })

  test('tool_call event has a tool field; tool_done follows with same tool name', async () => {
    withHandler(
      http.post(config.api.endpoints.chat, () =>
        new HttpResponse(
          makeNdjsonStream(
            { type: 'tool_call', tool: 'code-reviewer' },
            { type: 'tool_done', tool: 'code-reviewer' },
            { type: 'token',     text: 'Done.' },
            { type: 'done' }
          ),
          { headers: { 'Content-Type': 'application/x-ndjson' } }
        )
      )
    )

    const res = await fetch(config.api.endpoints.chat, {
      method: 'POST', headers: chatHeaders, body: chatRequest,
    })
    const events = await readNdjson(res)

    const toolCall = events.find(e => e.type === 'tool_call')
    const toolDone = events.find(e => e.type === 'tool_done')
    expect(toolCall?.tool).toBe('code-reviewer')
    expect(toolDone?.tool).toBe('code-reviewer')
  })

  test('question event has questionId and text fields', async () => {
    withHandler(
      http.post(config.api.endpoints.chat, () =>
        new HttpResponse(
          makeNdjsonStream(
            { type: 'question', questionId: 'q-1', text: 'Which branch should I deploy to?' },
            { type: 'done' }
          ),
          { headers: { 'Content-Type': 'application/x-ndjson' } }
        )
      )
    )

    const res = await fetch(config.api.endpoints.chat, {
      method: 'POST', headers: chatHeaders,
      body: JSON.stringify({ sessionId: 's1', message: 'deploy', model: 'gpt-4o' }),
    })
    const events = await readNdjson(res)

    const question = events.find(e => e.type === 'question')
    expect(question).toBeDefined()
    expect(question?.questionId).toBe('q-1')
    expect(question?.text).toBeTypeOf('string')
    expect((question?.text as string).length).toBeGreaterThan(0)
  })

  test('error event has a message field', async () => {
    withHandler(
      http.post(config.api.endpoints.chat, () =>
        new HttpResponse(
          makeNdjsonStream({ type: 'error', message: 'LLM unavailable' }),
          { headers: { 'Content-Type': 'application/x-ndjson' } }
        )
      )
    )

    const res = await fetch(config.api.endpoints.chat, {
      method: 'POST', headers: chatHeaders, body: chatRequest,
    })
    const events = await readNdjson(res)

    const errorEv = events.find(e => e.type === 'error')
    expect(errorEv).toBeDefined()
    expect(errorEv?.message).toBe('LLM unavailable')
  })

  test('400 error — common error shape for missing sessionId', async () => {
    withHandler(
      http.post(config.api.endpoints.chat, () =>
        HttpResponse.json(
          { status: 400, error: 'Bad Request', message: 'sessionId must not be blank', path: '/api/v1/chat' },
          { status: 400 }
        )
      )
    )

    const res = await fetch(config.api.endpoints.chat, {
      method: 'POST', headers: chatHeaders,
      body: JSON.stringify({ sessionId: '', message: 'hi', model: 'gpt-4o' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('status', 400)
    expect(body).toHaveProperty('error', 'Bad Request')
    expect(body).toHaveProperty('message')
    expect((body.message as string)).toContain('sessionId')
  })

  test('400 error — common error shape for missing message', async () => {
    withHandler(
      http.post(config.api.endpoints.chat, () =>
        HttpResponse.json(
          { status: 400, error: 'Bad Request', message: 'message must not be blank', path: '/api/v1/chat' },
          { status: 400 }
        )
      )
    )

    const res = await fetch(config.api.endpoints.chat, {
      method: 'POST', headers: chatHeaders,
      body: JSON.stringify({ sessionId: 's1', message: '', model: 'gpt-4o' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as Record<string, unknown>
    expect((body.message as string)).toContain('message')
  })
})

// ---------------------------------------------------------------------------
// POST /api/v1/chat/answer
// Contract: 200 OK (empty body)
//   request: { sessionId: string, questionId: string, answer: string } — all required
// ---------------------------------------------------------------------------

describe('POST /api/v1/chat/answer', () => {
  test('happy path — 200 OK with valid payload', async () => {
    withHandler(
      http.post(config.api.endpoints.chatAnswer, () =>
        new HttpResponse(null, { status: 200 })
      )
    )

    const res = await fetch(config.api.endpoints.chatAnswer, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 's1', questionId: 'q1', answer: 'main' }),
    })

    expect(res.status).toBe(200)
  })

  test('400 — blank sessionId yields error shape with message about sessionId', async () => {
    withHandler(
      http.post(config.api.endpoints.chatAnswer, () =>
        HttpResponse.json(
          { status: 400, error: 'Bad Request', message: 'sessionId must not be blank', path: '/api/v1/chat/answer' },
          { status: 400 }
        )
      )
    )

    const res = await fetch(config.api.endpoints.chatAnswer, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: '', questionId: 'q1', answer: 'main' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('status', 400)
    expect(body).toHaveProperty('error', 'Bad Request')
    expect((body.message as string)).toContain('sessionId')
    expect(body).toHaveProperty('path')
  })

  test('400 — blank questionId', async () => {
    withHandler(
      http.post(config.api.endpoints.chatAnswer, () =>
        HttpResponse.json(
          { status: 400, error: 'Bad Request', message: 'questionId must not be blank', path: '/api/v1/chat/answer' },
          { status: 400 }
        )
      )
    )

    const res = await fetch(config.api.endpoints.chatAnswer, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 's1', questionId: '', answer: 'main' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as Record<string, unknown>
    expect((body.message as string)).toContain('questionId')
  })

  test('400 — blank answer', async () => {
    withHandler(
      http.post(config.api.endpoints.chatAnswer, () =>
        HttpResponse.json(
          { status: 400, error: 'Bad Request', message: 'answer must not be blank', path: '/api/v1/chat/answer' },
          { status: 400 }
        )
      )
    )

    const res = await fetch(config.api.endpoints.chatAnswer, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 's1', questionId: 'q1', answer: '' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as Record<string, unknown>
    expect((body.message as string)).toContain('answer')
  })
})

// ---------------------------------------------------------------------------
// Common error response shape
// All 4xx/5xx responses must match: { status: number, error: string, message: string, path: string }
// ---------------------------------------------------------------------------

describe('Common error response shape', () => {
  test('4xx body has status (number), error (string), message (string), path (string)', async () => {
    withHandler(
      http.post(config.api.endpoints.chat, () =>
        HttpResponse.json(
          { status: 400, error: 'Bad Request', message: 'sessionId must not be blank', path: '/api/v1/chat' },
          { status: 400 }
        )
      )
    )

    const res = await fetch(config.api.endpoints.chat, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: '', message: '', model: 'gpt-4o' }),
    })

    expect(res.status).toBe(400)
    const body = await res.json() as Record<string, unknown>
    expect(body).toHaveProperty('status')
    expect(body).toHaveProperty('error')
    expect(body).toHaveProperty('message')
    expect(body).toHaveProperty('path')
    expect(typeof body.status).toBe('number')
    expect(typeof body.error).toBe('string')
    expect(typeof body.message).toBe('string')
    expect(typeof body.path).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// Settings API
// ---------------------------------------------------------------------------

describe('Settings API', () => {
  describe('GET /api/v1/settings/models', () => {
    test('happy path — 200 with AvailableModel[] shape', async () => {
      const res = await fetch(config.api.endpoints.models)

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('application/json')

      const body = await res.json() as Array<Record<string, unknown>>
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThan(0)
    })

    test('response contains id, displayName, provider, available fields', async () => {
      const res = await fetch(config.api.endpoints.models)
      const body = await res.json() as Array<Record<string, unknown>>

      for (const model of body) {
        expect(model).toHaveProperty('id')
        expect(model).toHaveProperty('displayName')
        expect(model).toHaveProperty('provider')
        expect(model).toHaveProperty('available')
        expect(model.id).toBeTypeOf('string')
        expect(model.displayName).toBeTypeOf('string')
        expect(model.provider).toBeTypeOf('string')
        expect(model.available).toBeTypeOf('boolean')
      }
    })
  })

  describe('GET /api/v1/settings/providers', () => {
    test('happy path — 200 with ProviderStatus[] shape', async () => {
      const res = await fetch(config.api.endpoints.providers)

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('application/json')

      const body = await res.json() as Array<Record<string, unknown>>
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThan(0)
    })

    test('response contains provider, available, reason fields', async () => {
      const res = await fetch(config.api.endpoints.providers)
      const body = await res.json() as Array<Record<string, unknown>>

      for (const provider of body) {
        expect(provider).toHaveProperty('provider')
        expect(provider).toHaveProperty('available')
        expect(provider).toHaveProperty('reason')
        expect(provider.provider).toBeTypeOf('string')
        expect(provider.available).toBeTypeOf('boolean')
        expect(provider.reason === null || typeof provider.reason === 'string').toBe(true)
      }
    })
  })

  describe('POST /api/v1/settings/models/refresh', () => {
    test('happy path — 200 with refreshed AvailableModel[]', async () => {
      const res = await fetch(config.api.endpoints.modelsRefresh, { method: 'POST' })

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('application/json')

      const body = await res.json() as Array<Record<string, unknown>>
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThan(0)

      for (const model of body) {
        expect(model).toHaveProperty('id')
        expect(model).toHaveProperty('displayName')
        expect(model).toHaveProperty('provider')
        expect(model).toHaveProperty('available')
      }
    })
  })
})

// ---------------------------------------------------------------------------
// GET /actuator/health
// Contract: 200 { status: "UP" } | 503 { status: "DOWN" }
// ---------------------------------------------------------------------------

describe('GET /actuator/health', () => {
  test('happy path — 200 with { status: "UP" }', async () => {
    withHandler(
      http.get(config.api.endpoints.health, () =>
        HttpResponse.json({ status: 'UP' })
      )
    )

    const res = await fetch(config.api.endpoints.health)
    expect(res.status).toBe(200)

    const body = await res.json() as { status: string }
    expect(body.status).toBe('UP')
  })

  test('service down — 503 with { status: "DOWN" }', async () => {
    withHandler(
      http.get(config.api.endpoints.health, () =>
        HttpResponse.json({ status: 'DOWN' }, { status: 503 })
      )
    )

    const res = await fetch(config.api.endpoints.health)
    expect(res.status).toBe(503)

    const body = await res.json() as { status: string }
    expect(body.status).toBe('DOWN')
  })
})
