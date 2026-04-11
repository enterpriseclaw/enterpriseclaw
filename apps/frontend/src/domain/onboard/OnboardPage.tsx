import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '@/lib/http'
import { config } from '@/lib/config'
import type { AvailableModel } from '@/domain/chat/useModels'

/* ---------- Types ---------- */

interface ProviderStatus {
  provider: string
  available: boolean
  reason: string | null
}

interface DiagnosticCheck {
  name: string
  status: 'OK' | 'WARN' | 'FAIL'
  message: string
}

interface DiagnosticReport {
  overallStatus: string
  checks: DiagnosticCheck[]
}

/* ---------- Provider hints ---------- */

const PROVIDER_HINTS: Record<string, string> = {
  openai: 'Add OPENAI_API_KEY to .env',
  anthropic: 'Add ANTHROPIC_API_KEY to .env',
  ollama: 'Run: ollama serve',
  copilot: 'Run: gh auth login',
  codex: 'Create ~/.codex/auth.json',
}

/* ---------- Step indicator ---------- */

const STEPS = ['Welcome', 'Providers', 'Models', 'Diagnostics', 'CLI', 'Ready'] as const

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i < current
                  ? 'bg-green-600 text-white'
                  : i === current
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i < current ? '\u2713' : i + 1}
            </div>
            <span className="text-xs mt-1 text-gray-500 whitespace-nowrap">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-12 h-0.5 mx-1 mt-[-12px] transition-colors ${
                i < current ? 'bg-green-600' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

/* ---------- Step 1: Welcome ---------- */

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-4">Welcome to EnterpriseClaw</h1>
      <p className="text-gray-600 mb-2">
        AI agentic platform with multi-provider support
      </p>
      <p className="text-gray-500 mb-8">
        Let&apos;s check what&apos;s available on your system
      </p>
      <button
        onClick={onNext}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Start Setup
      </button>
    </div>
  )
}

/* ---------- Step 2: Provider Detection ---------- */

function ProviderStep({
  providers,
  loading,
  onRefresh,
  onNext,
}: {
  providers: ProviderStatus[]
  loading: boolean
  onRefresh: () => void
  onNext: () => void
}) {
  const availableCount = providers.filter(p => p.available).length

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 text-center">Provider Detection</h2>
      <p className="text-gray-500 mb-6 text-center">
        {availableCount} of {providers.length} providers available
      </p>
      <div className="space-y-3 mb-6">
        {providers.map(p => (
          <div
            key={p.provider}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
          >
            <div className="flex items-center gap-3">
              {p.available ? (
                <span className="text-green-600 text-lg" data-testid={`provider-status-${p.provider}`}>&#10003;</span>
              ) : (
                <span className="text-gray-400 text-lg" data-testid={`provider-status-${p.provider}`}>&#10005;</span>
              )}
              <span className="font-medium capitalize">{p.provider}</span>
            </div>
            <span className="text-sm text-gray-500">
              {p.available ? 'Ready' : (PROVIDER_HINTS[p.provider] ?? p.reason ?? 'Unavailable')}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
        <button
          onClick={onNext}
          disabled={availableCount === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}

/* ---------- Step 3: Model Selection ---------- */

function ModelStep({
  models,
  selectedModel,
  onSelect,
  onNext,
}: {
  models: AvailableModel[]
  selectedModel: string
  onSelect: (id: string) => void
  onNext: () => void
}) {
  // Group by provider
  const grouped = models.reduce<Record<string, AvailableModel[]>>((acc, m) => {
    const key = m.provider
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 text-center">Select Default Model</h2>
      <p className="text-gray-500 mb-6 text-center">
        Choose a default model for your conversations
      </p>
      <div className="space-y-4 mb-6">
        {Object.entries(grouped).map(([provider, providerModels]) => (
          <div key={provider}>
            <h3 className="text-sm font-semibold uppercase text-gray-400 mb-2">{provider}</h3>
            <div className="space-y-2">
              {providerModels.map(m => (
                <button
                  key={m.id}
                  onClick={() => onSelect(m.id)}
                  className={`w-full text-left p-3 border rounded-lg transition-colors ${
                    selectedModel === m.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="font-medium">{m.displayName}</span>
                  {models.indexOf(m) === 0 && (
                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      Recommended
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
}

/* ---------- Step 4: Diagnostics ---------- */

function DiagnosticsStep({
  report,
  loading,
  onNext,
}: {
  report: DiagnosticReport | null
  loading: boolean
  onNext: () => void
}) {
  const statusIcon = (status: string) => {
    switch (status) {
      case 'OK':
        return <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
      case 'WARN':
        return <span className="inline-block w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-yellow-500" />
      case 'FAIL':
        return <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
      default:
        return <span className="inline-block w-3 h-3 rounded-full bg-gray-300" />
    }
  }

  const overallBadgeColor = (status: string) => {
    switch (status) {
      case 'OK': return 'bg-green-100 text-green-700'
      case 'WARN': return 'bg-yellow-100 text-yellow-700'
      case 'FAIL': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading || !report) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Running Diagnostics...</h2>
        <p className="text-gray-500">Checking system health</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 text-center">System Diagnostics</h2>
      <div className="flex justify-center mb-6">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${overallBadgeColor(report.overallStatus)}`}>
          Overall: {report.overallStatus}
        </span>
      </div>
      <div className="space-y-3 mb-6">
        {report.checks.map(check => (
          <div
            key={check.name}
            className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
          >
            {statusIcon(check.status)}
            <div>
              <span className="font-medium">{check.name}</span>
              <p className="text-sm text-gray-500">{check.message}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
}

/* ---------- Step 5: CLI Installation ---------- */

function CliStep({
  serverUrl,
  onNext,
}: {
  serverUrl: string
  onNext: () => void
}) {
  const [verified, setVerified] = useState(false)
  const [checking, setChecking] = useState(false)

  const handleVerify = async () => {
    setChecking(true)
    try {
      // If we can reach health, the server is up — CLI can connect too
      await apiRequest<unknown>(config.api.endpoints.health)
      setVerified(true)
    } catch {
      setVerified(false)
    } finally {
      setChecking(false)
    }
  }

  const wsUrl = serverUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws'

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2 text-center">CLI Installation</h2>
      <p className="text-gray-500 mb-6 text-center">
        Install the CLI on your local machine to use EnterpriseClaw from the terminal
      </p>

      <div className="space-y-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold mb-2">1. Build the CLI</h3>
          <code className="block bg-gray-900 text-green-400 p-3 rounded text-sm">
            cd apps/cli && task build
          </code>
          <p className="text-xs text-gray-500 mt-2">
            Or for a native image (~25MB): <code className="bg-gray-100 px-1 rounded">task jlink</code>
          </p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold mb-2">2. Verify connection</h3>
          <code className="block bg-gray-900 text-green-400 p-3 rounded text-sm">
            ec doctor --server {wsUrl}
          </code>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold mb-2">3. Try it out</h3>
          <code className="block bg-gray-900 text-green-400 p-3 rounded text-sm">
            ec agent &quot;hello world&quot;
          </code>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleVerify}
            disabled={checking}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {checking ? 'Checking...' : 'Verify Server'}
          </button>
          {verified && (
            <span className="text-green-600 text-sm font-medium">
              &#10003; Server reachable — CLI can connect
            </span>
          )}
        </div>
        <button
          onClick={onNext}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {verified ? 'Next' : 'Skip'}
        </button>
      </div>
    </div>
  )
}

/* ---------- Step 6: Ready ---------- */

function ReadyStep({
  providerCount,
  modelCount,
  onFinish,
}: {
  providerCount: number
  modelCount: number
  onFinish: () => void
}) {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-4">You&apos;re all set!</h1>
      <div className="flex justify-center gap-6 mb-8">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{providerCount}</div>
          <div className="text-sm text-gray-500">Providers</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{modelCount}</div>
          <div className="text-sm text-gray-500">Models</div>
        </div>
      </div>
      <button
        onClick={onFinish}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Start Chatting
      </button>
    </div>
  )
}

/* ---------- Main OnboardPage ---------- */

export function OnboardPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [providersLoading, setProvidersLoading] = useState(false)

  const [models, setModels] = useState<AvailableModel[]>([])
  const [selectedModel, setSelectedModel] = useState('')

  const [diagnostics, setDiagnostics] = useState<DiagnosticReport | null>(null)
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false)

  /* Fetch providers when entering step 1 */
  const fetchProviders = useCallback(async () => {
    setProvidersLoading(true)
    try {
      const data = await apiRequest<ProviderStatus[]>(config.api.endpoints.providers)
      setProviders(data)
    } catch {
      setProviders([])
    } finally {
      setProvidersLoading(false)
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    setProvidersLoading(true)
    try {
      await apiRequest<unknown>(config.api.endpoints.modelsRefresh, { method: 'POST' })
      await fetchProviders()
    } catch {
      setProvidersLoading(false)
    }
  }, [fetchProviders])

  /* Fetch models when entering step 2 */
  const fetchModels = useCallback(async () => {
    try {
      const data = await apiRequest<AvailableModel[]>(config.api.endpoints.models)
      setModels(data)
      if (data.length > 0 && !selectedModel) {
        setSelectedModel(data[0].id)
      }
    } catch {
      setModels([])
    }
  }, [selectedModel])

  /* Fetch diagnostics when entering step 3 */
  const fetchDiagnostics = useCallback(async () => {
    setDiagnosticsLoading(true)
    try {
      const data = await apiRequest<DiagnosticReport>(config.api.endpoints.doctor)
      setDiagnostics(data)
    } catch {
      setDiagnostics(null)
    } finally {
      setDiagnosticsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (step === 1) fetchProviders()
    if (step === 2) fetchModels()
    if (step === 3) fetchDiagnostics()
  }, [step, fetchProviders, fetchModels, fetchDiagnostics])

  function handleFinish() {
    if (selectedModel) {
      localStorage.setItem('ec_default_model', selectedModel)
    }
    localStorage.setItem('ec_onboard_complete', 'true')
    navigate(config.routes.chat)
  }

  const availableProviderCount = providers.filter(p => p.available).length

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl mx-auto">
        <StepIndicator current={step} />
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8">
          {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
          {step === 1 && (
            <ProviderStep
              providers={providers}
              loading={providersLoading}
              onRefresh={handleRefresh}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <ModelStep
              models={models}
              selectedModel={selectedModel}
              onSelect={setSelectedModel}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <DiagnosticsStep
              report={diagnostics}
              loading={diagnosticsLoading}
              onNext={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <CliStep
              serverUrl={window.location.origin}
              onNext={() => setStep(5)}
            />
          )}
          {step === 5 && (
            <ReadyStep
              providerCount={availableProviderCount}
              modelCount={models.length}
              onFinish={handleFinish}
            />
          )}
        </div>
      </div>
    </div>
  )
}
