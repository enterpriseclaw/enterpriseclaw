import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppRoutes } from '@/app/routing/AppRoutes'
import { beforeAll, afterEach, afterAll, test } from 'vitest'
import { server } from '@/tests/mocks/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderWithRouter(initialEntry = '/chat') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

test.each(['/chat', '/skills', '/cronjobs', '/dashboard', '/audit-log', '/settings'])(
  'route %s renders without crashing',
  (route) => {
    renderWithRouter(route)
    // no error = pass
  }
)
