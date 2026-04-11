import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeAll, afterEach, afterAll, describe, test, expect } from 'vitest'
import { server } from '@/tests/mocks/server'
import { useModels } from '../useModels'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('useModels', () => {
  test('fetches models from API', async () => {
    const { result } = renderHook(() => useModels())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.models).toHaveLength(2)
    expect(result.current.models[0]).toMatchObject({
      id: 'gpt-4.1',
      displayName: 'GPT-4.1',
      provider: 'openai',
      available: true,
    })
    expect(result.current.models[1]).toMatchObject({
      id: 'claude-sonnet-4-5-20250929',
      displayName: 'Claude Sonnet 4.5',
      provider: 'anthropic',
      available: true,
    })
  })

  test('handles API errors gracefully', async () => {
    server.use(
      http.get('/api/v1/settings/models', () =>
        HttpResponse.json(
          { status: 500, error: 'Internal Server Error', message: 'db down', path: '/api/v1/settings/models' },
          { status: 500 }
        )
      )
    )

    const { result } = renderHook(() => useModels())

    await waitFor(() => expect(result.current.loading).toBe(false))

    // Falls back to default model
    expect(result.current.models).toHaveLength(1)
    expect(result.current.models[0]).toMatchObject({
      id: 'gpt-4.1',
      displayName: 'GPT-4.1',
      provider: 'openai',
      available: true,
    })
  })

  test('starts with loading true', () => {
    const { result } = renderHook(() => useModels())

    expect(result.current.loading).toBe(true)
  })
})
