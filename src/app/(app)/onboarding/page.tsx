'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, useToast } from '@/components/ui'
import { PageHeader } from '@/components/layout'

interface OnboardingResponse {
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  institution_id: string
  engine_institution_id?: string
  engine_slug?: string
  bundle_name?: string
  bundle_version?: string
  message: string
  runtime_config?: {
    engine_base_url: string
    institution_id: string
    agent_token: string
  }
  error_code?: string
  error_message?: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [institutionName, setInstitutionName] = useState('')
  const [result, setResult] = useState<OnboardingResponse | null>(null)
  const [showRuntimeConfig, setShowRuntimeConfig] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/institutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: institutionName || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao configurar instituição')
      }

      setResult(data)

      if (data.status === 'completed') {
        showToast('Instituição configurada com sucesso!', 'success')

        // If we have runtime config (first time completion), show it
        if (data.runtime_config) {
          setShowRuntimeConfig(true)
        } else {
          // Already completed before - redirect to dashboard
          setTimeout(() => {
            router.push('/dashboard')
          }, 1500)
        }
      } else if (data.status === 'failed') {
        showToast(data.error_message || 'Erro no onboarding', 'error')
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro desconhecido', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleContinueToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Configuração Inicial"
        description="Configure sua instituição para começar a usar o Bazari Console"
      />

      {/* Show runtime config if available (first-time completion) */}
      {showRuntimeConfig && result?.runtime_config ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h2 className="text-lg font-semibold text-slate-900">Onboarding Concluído!</h2>
            </div>
            <p className="text-sm text-slate-600">
              Sua instituição foi configurada com sucesso. Guarde as informações abaixo para configurar o Agent Runtime.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 font-medium mb-2">
                Importante: O token abaixo será exibido apenas uma vez!
              </p>
              <p className="text-xs text-amber-700">
                Copie e guarde em um local seguro. Você precisará dele para configurar o Agent Runtime.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">
                Engine Base URL
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-slate-100 px-3 py-2 rounded font-mono break-all">
                  {result.runtime_config.engine_base_url}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(result.runtime_config!.engine_base_url)
                    showToast('URL copiada!', 'success')
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">
                Institution ID (Engine)
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-slate-100 px-3 py-2 rounded font-mono break-all">
                  {result.runtime_config.institution_id}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(result.runtime_config!.institution_id)
                    showToast('ID copiado!', 'success')
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1">
                Agent Token
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-slate-100 px-3 py-2 rounded font-mono break-all text-xs">
                  {result.runtime_config.agent_token}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(result.runtime_config!.agent_token)
                    showToast('Token copiado!', 'success')
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg mb-6">
            <h3 className="text-sm font-medium text-slate-900 mb-2">Configurar Agent Runtime</h3>
            <pre className="text-xs bg-slate-200 p-3 rounded overflow-x-auto">
{`cd /home/bazari/libervia-agent-runtime
libervia-agent configure \\
  --api-url ${result.runtime_config.engine_base_url} \\
  --token "${result.runtime_config.agent_token}" \\
  --institution-id ${result.runtime_config.institution_id} \\
  --root-dir /tmp/files`}
            </pre>
          </div>

          <Button onClick={handleContinueToDashboard} className="w-full">
            Continuar para o Dashboard
          </Button>
        </div>
      ) : result?.status === 'completed' && !result.runtime_config ? (
        /* Already completed before - show summary */
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h2 className="text-lg font-semibold text-slate-900">Instituição Já Configurada</h2>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              {result.message}
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Slug</label>
                <p className="text-sm font-mono text-slate-900">{result.engine_slug}</p>
              </div>
              {result.bundle_name && (
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">Bundle</label>
                  <p className="text-sm text-slate-900">{result.bundle_name} v{result.bundle_version}</p>
                </div>
              )}
            </div>
          </div>

          <Button onClick={handleContinueToDashboard} className="w-full">
            Ir para o Dashboard
          </Button>
        </div>
      ) : result?.status === 'failed' ? (
        /* Failed - show error */
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <h2 className="text-lg font-semibold text-slate-900">Erro no Onboarding</h2>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <p className="text-sm text-red-800 font-medium">
                {result.error_code}: {result.error_message}
              </p>
            </div>

            <p className="text-sm text-slate-600">
              {result.message}
            </p>
          </div>

          <Button onClick={handleSubmit} loading={loading} className="w-full">
            Tentar Novamente
          </Button>
        </div>
      ) : (
        /* Initial form */
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Configurar Instituição
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Defina um nome para sua instituição. Um identificador único será gerado automaticamente.
          </p>

          <div className="space-y-6">
            <div>
              <label htmlFor="institution-name" className="block text-sm font-medium text-slate-700 mb-2">
                Nome da Instituição (opcional)
              </label>
              <Input
                id="institution-name"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                placeholder="Ex: Minha Empresa Ops"
                disabled={loading}
              />
              <p className="mt-1 text-sm text-slate-500">
                Se não informado, será usado um nome padrão baseado no seu email.
              </p>
            </div>

            <Button onClick={handleSubmit} loading={loading} className="w-full">
              {loading ? 'Configurando...' : 'Iniciar Configuração'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
