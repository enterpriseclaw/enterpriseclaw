import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Default handlers — keep unhandled-request noise out of test output
const defaultHandlers = [
  http.get('/api/v1/sessions', () => HttpResponse.json([])),
  http.post('/api/v1/sessions', () =>
    HttpResponse.json({ sessionId: 'test-session-id', title: null, lastMessageAt: new Date().toISOString() })
  ),
]

export const server = setupServer(...defaultHandlers)
