'use client'

import { useEffect, useState } from 'react'
import { Button, Input, Skeleton, ErrorState, EmptyState, useToast } from '@/components/ui'
import { PageHeader } from '@/components/layout'

interface InstitutionSettings {
  institution_id: string
  engine_institution_id: string
  display_name: string
  status: string
  created_at?: string
}

interface RuntimeStatus {
  status: 'active' | 'inactive' | 'unknown'
  last_heartbeat?: string
  version?: string
}

export default function SettingsPage() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [institution, setInstitution] = useState<InstitutionSettings | null>(null)
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null)

  const fetchSettings = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/dashboard')
      if (!response.ok) {
        const err = await response.json()
        if (err.redirect) {
          // No institution configured
          setInstitution(null)
          setRuntime(null)
          setLoading(false)
          return
        }
        throw new Error(err.message || 'Erro ao carregar configurações')
      }

      const data = await response.json()

      // Extract institution info from cookies (would be better to have a dedicated endpoint)
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = value
        return acc
      }, {} as Record<string, string>)

      setInstitution({
        institution_id: cookies['libervia_institution_id'] || 'N/A',
        engine_institution_id: cookies['libervia_engine_institution_id'] || 'N/A',
        display_name: 'Instituição Configurada',
        status: 'active',
      })

      setRuntime({
        status: data.agent?.status || 'unknown',
        last_heartbeat: data.agent?.last_heartbeat,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleClearInstitution = async () => {
    if (!confirm('Tem certeza que deseja desconectar desta instituição? Você precisará refazer o onboarding.')) {
      return
    }

    // Clear cookies
    document.cookie = 'libervia_institution_id=; path=/; max-age=0'
    document.cookie = 'libervia_engine_institution_id=; path=/; max-age=0'

    showToast('Instituição desconectada. Redirecionando para onboarding...', 'success')

    setTimeout(() => {
      window.location.href = '/onboarding'
    }, 1500)
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Configurações" description="Gerencie as configurações do seu ambiente" />
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Configurações" />
        <ErrorState
          title="Erro ao carregar configurações"
          message={error}
          onRetry={fetchSettings}
        />
      </div>
    )
  }

  const runtimeStatusLabel = {
    active: 'Ativo',
    inactive: 'Inativo',
    unknown: 'Desconhecido',
  }

  const runtimeStatusColor = {
    active: 'text-green-600 bg-green-100',
    inactive: 'text-slate-600 bg-slate-100',
    unknown: 'text-amber-600 bg-amber-100',
  }

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Gerencie as configurações do seu ambiente Bazari"
      />

      <div className="space-y-6">
        {/* Instituição Section */}
        <section className="bg-white rounded-lg border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Instituição</h2>
            <p className="text-sm text-slate-500 mt-1">Informações da instituição conectada</p>
          </div>
          <div className="p-6">
            {institution ? (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">
                      ID (Console)
                    </label>
                    <p className="text-sm font-mono text-slate-900 bg-slate-50 px-3 py-2 rounded">
                      {institution.institution_id}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">
                      ID (Engine)
                    </label>
                    <p className="text-sm font-mono text-slate-900 bg-slate-50 px-3 py-2 rounded">
                      {institution.engine_institution_id}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1">
                    Status
                  </label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Conectada
                  </span>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Nenhuma instituição configurada"
                description="Complete o onboarding para configurar sua instituição"
                action={{
                  label: 'Iniciar Onboarding',
                  onClick: () => window.location.href = '/onboarding'
                }}
              />
            )}
          </div>
        </section>

        {/* Runtime / Agente Section */}
        <section className="bg-white rounded-lg border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Runtime / Agente</h2>
            <p className="text-sm text-slate-500 mt-1">Status do agente de execução local</p>
          </div>
          <div className="p-6">
            {runtime ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">
                      Status
                    </label>
                    <span
                      className={`
                        inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                        ${runtimeStatusColor[runtime.status]}
                      `}
                    >
                      {runtimeStatusLabel[runtime.status]}
                    </span>
                  </div>
                  {runtime.last_heartbeat && (
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">
                        Último Heartbeat
                      </label>
                      <p className="text-sm text-slate-900">
                        {new Date(runtime.last_heartbeat).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  )}
                </div>

                {runtime.status !== 'active' && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      O agente não está ativo. Para executar operações locais, inicie o runtime:
                    </p>
                    <pre className="mt-2 text-xs bg-amber-100 p-2 rounded font-mono">
                      cd /home/bazari/libervia-agent-runtime{'\n'}
                      libervia-agent run
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                title="Informações indisponíveis"
                description="Configure uma instituição para ver o status do runtime"
              />
            )}
          </div>
        </section>

        {/* Acesso Section */}
        <section className="bg-white rounded-lg border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">Acesso</h2>
            <p className="text-sm text-slate-500 mt-1">Gerenciar acesso e sessão</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <h3 className="text-sm font-medium text-slate-900 mb-2">Trocar de Instituição</h3>
              <p className="text-sm text-slate-500 mb-3">
                Para acessar outra instituição, você pode refazer o onboarding ou desconectar da instituição atual.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => window.location.href = '/onboarding'}
                >
                  Refazer Onboarding
                </Button>
              </div>
            </div>

            {institution && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-sm font-medium text-red-900 mb-2">Zona de Perigo</h3>
                <p className="text-sm text-red-700 mb-3">
                  Desconectar da instituição atual irá limpar suas configurações locais.
                </p>
                <Button
                  variant="danger"
                  onClick={handleClearInstitution}
                >
                  Desconectar Instituição
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
