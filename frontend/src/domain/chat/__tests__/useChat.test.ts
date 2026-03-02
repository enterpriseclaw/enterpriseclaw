import { renderHook, act, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeAll, afterEach, afterAll, test, expect } from 'vitest'
import { server } from '@/tests/mocks/server'
import { useChat } from '../useChat'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('sendMessage streams tokens into messages', async () => {
  server.use(
    http.post('/api/v1/chat', () => {
      const enc = new TextEncoder()
      return new HttpResponse(
        new ReadableStream({
          start(c) {
            c.enqueue(enc.encode('{"type":"token","text":"Hello "}\n'))
            c.enqueue(enc.encode('{"type":"token","text":"world"}\n'))
            c.enqueue(enc.encode('{"type":"done"}\n'))
            c.close()
          },
        }),
        { headers: { 'Content-Type': 'application/x-ndjson' } }
      )
    })
  )

  const { result } = renderHook(() => useChat('session-1'))
  act(() => {
    result.current.sendMessage('hi', 'gpt-4o')
  })

  await waitFor(() =>
    expect(result.current.messages.at(-1)?.content).toBe('Hello world')
  )
  expect(result.current.streaming).toBe(false)
})

test('sendMessage handles error event', async () => {
  server.use(
    http.post('/api/v1/chat', () => {
      const enc = new TextEncoder()
      return new HttpResponse(
        new ReadableStream({
          start(c) {
            c.enqueue(enc.encode('{"type":"error","message":"something went wrong"}\n'))
            c.close()
          },
        }),
        { headers: { 'Content-Type': 'application/x-ndjson' } }
      )
    })
  )

  const { result } = renderHook(() => useChat('session-1'))
  act(() => {
    result.current.sendMessage('hi', 'gpt-4o')
  })

  await waitFor(() => expect(result.current.streaming).toBe(false))
  const lastMsg = result.current.messages.at(-1)
  expect(lastMsg?.status).toBe('error')
})

test('sendMessage emits tool_call and tool_done chips', async () => {
  server.use(
    http.post('/api/v1/chat', () => {
      const enc = new TextEncoder()
      return new HttpResponse(
        new ReadableStream({
          start(c) {
            c.enqueue(enc.encode('{"type":"tool_call","tool":"code-reviewer"}\n'))
            c.enqueue(enc.encode('{"type":"tool_done","tool":"code-reviewer"}\n'))
            c.enqueue(enc.encode('{"type":"token","text":"Done."}\n'))
            c.enqueue(enc.encode('{"type":"done"}\n'))
            c.close()
          },
        }),
        { headers: { 'Content-Type': 'application/x-ndjson' } }
      )
    })
  )

  const { result } = renderHook(() => useChat('session-1'))
  act(() => {
    result.current.sendMessage('review', 'gpt-4o')
  })

  await waitFor(() => expect(result.current.streaming).toBe(false))
  const lastMsg = result.current.messages.at(-1)
  expect(lastMsg?.toolChips).toEqual([{ tool: 'code-reviewer', status: 'done' }])
})
