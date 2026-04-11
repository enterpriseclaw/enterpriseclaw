import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, afterEach, afterAll, describe, test, expect, vi } from 'vitest'
import { server } from '@/tests/mocks/server'
import { OnboardPage } from '../OnboardPage'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderOnboard() {
  return render(
    <MemoryRouter initialEntries={['/onboard']}>
      <OnboardPage />
    </MemoryRouter>
  )
}

describe('OnboardPage', () => {
  test('renders welcome step with heading and Start Setup button', () => {
    renderOnboard()

    expect(screen.getByText('Welcome to EnterpriseClaw')).toBeInTheDocument()
    expect(screen.getByText('AI agentic platform with multi-provider support')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start setup/i })).toBeInTheDocument()
  })

  test('navigates to provider detection step and shows providers', async () => {
    const user = userEvent.setup()
    renderOnboard()

    await user.click(screen.getByRole('button', { name: /start setup/i }))

    expect(screen.getByText('Provider Detection')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('openai')).toBeInTheDocument()
    })

    expect(screen.getByText('anthropic')).toBeInTheDocument()
    expect(screen.getByText('ollama')).toBeInTheDocument()
    expect(screen.getByText('copilot')).toBeInTheDocument()
    expect(screen.getByText('codex')).toBeInTheDocument()
  })

  test('navigates through all steps to completion and redirects to /chat', async () => {
    const user = userEvent.setup()
    renderOnboard()

    // Step 1: Welcome -> click Start Setup
    await user.click(screen.getByRole('button', { name: /start setup/i }))

    // Step 2: Providers -> wait for load, click Next
    await waitFor(() => {
      expect(screen.getByText('openai')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    // Step 3: Models -> wait for load, click Next
    await waitFor(() => {
      expect(screen.getByText('Select Default Model')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    // Step 4: Diagnostics -> wait for load, click Next
    await waitFor(() => {
      expect(screen.getByText('System Diagnostics')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^next$/i }))

    // Step 5: CLI Installation -> click Skip
    await waitFor(() => {
      expect(screen.getByText('CLI Installation')).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /skip/i }))

    // Step 6: Ready -> click Start Chatting
    expect(screen.getByText("You're all set!")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /start chatting/i }))

    expect(localStorage.getItem('ec_onboard_complete')).toBe('true')
    expect(mockNavigate).toHaveBeenCalledWith('/chat')
  })
})
