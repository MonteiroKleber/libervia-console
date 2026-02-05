'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Input, Skeleton, ErrorState } from '@/components/ui'

interface SettingsResponse {
  managed_root_dir: string | null
  autonomy_enabled: boolean
  autonomy_plan_create_interval_seconds: number
  autonomy_max_plans_per_day: number
  autonomy_scope_path: string | null
}

interface PageProps {
  params: { institutionId: string }
}

export default function SettingsPage({ params }: PageProps) {
  const { institutionId } = params
  const router = useRouter()

  const [settings, setSettings] = useState<SettingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Form state
  const [managedRootDir, setManagedRootDir] = useState('')

  // Autonomy form state
  const [autonomyEnabled, setAutonomyEnabled] = useState(false)
  const [autonomyIntervalMinutes, setAutonomyIntervalMinutes] = useState(60)
  const [autonomyMaxPlansPerDay, setAutonomyMaxPlansPerDay] = useState(6)
  const [autonomyScopePath, setAutonomyScopePath] = useState('')

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/institutions/${institutionId}/settings`)

        if (response.status === 401) {
          router.push(`/login?redirect=/institutions/${institutionId}/settings`)
          return
        }

        if (response.status === 403) {
          setError('Voce nao tem permissao para acessar as configuracoes desta instituicao. Apenas proprietarios podem gerenciar configuracoes.')
          setLoading(false)
          return
        }

        if (!response.ok) {
          throw new Error('Falha ao carregar configuracoes')
        }

        const data = await response.json()
        setSettings(data)
        setManagedRootDir(data.managed_root_dir || '')
        // Populate autonomy state
        setAutonomyEnabled(data.autonomy_enabled || false)
        setAutonomyIntervalMinutes(Math.floor((data.autonomy_plan_create_interval_seconds || 3600) / 60))
        setAutonomyMaxPlansPerDay(data.autonomy_max_plans_per_day || 6)
        setAutonomyScopePath(data.autonomy_scope_path || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [institutionId, router])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      const response = await fetch(`/api/institutions/${institutionId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managed_root_dir: managedRootDir || null,
          autonomy_enabled: autonomyEnabled,
          autonomy_plan_create_interval_seconds: autonomyIntervalMinutes * 60,
          autonomy_max_plans_per_day: autonomyMaxPlansPerDay,
          autonomy_scope_path: autonomyScopePath || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Falha ao salvar configuracoes')
      }

      const data = await response.json()
      setSettings(data)
      setSaveSuccess(true)

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-32" />
        </div>
      </div>
    )
  }

  if (error && !settings) {
    return (
      <ErrorState
        title="Erro"
        message={error}
        onRetry={() => window.location.reload()}
      />
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/institutions" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">
          ← Voltar para Instituicoes
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Configuracoes da Instituicao</h1>
        <p className="text-slate-600 mt-1">
          Configure o diretorio raiz para operacoes do agente nesta instituicao.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Configuracoes salvas com sucesso!
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="managed_root_dir" className="block text-sm font-medium text-slate-700 mb-1">
              Diretorio Raiz (Root Dir)
            </label>
            <Input
              id="managed_root_dir"
              type="text"
              value={managedRootDir}
              onChange={(e) => setManagedRootDir(e.target.value)}
              placeholder="/home/usuario ou deixe vazio para padrao"
            />
            <p className="text-sm text-slate-500 mt-1">
              Caminho absoluto do diretorio onde o agente executara operacoes de arquivos.
              Deixe vazio para usar o diretorio padrao do sistema.
            </p>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 font-medium">Importante</p>
            <ul className="text-sm text-amber-700 mt-1 list-disc list-inside space-y-1">
              <li>O diretorio deve existir e ser acessivel pelo agente</li>
              <li>Operacoes de arquivo serao restritas a este diretorio</li>
              <li>Mudancas serao aplicadas na proxima execucao do agente</li>
            </ul>
          </div>
        </div>

        {/* Autonomy Settings Section */}
        <div className="pt-6 border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Autonomia Assistida</h2>
          <p className="text-sm text-slate-600 mb-4">
            Quando habilitada, o agente cria recomendacoes de planos automaticamente em segundo plano.
            Planos NAO sao executados automaticamente — voce decide quando aplicar via aprovacao.
          </p>

          <div className="space-y-4">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="autonomy_enabled" className="block text-sm font-medium text-slate-700">
                  Habilitar Autonomia
                </label>
                <p className="text-sm text-slate-500">
                  Permitir que o agente crie planos automaticamente
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autonomyEnabled}
                onClick={() => setAutonomyEnabled(!autonomyEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  autonomyEnabled ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    autonomyEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {autonomyEnabled && (
              <>
                {/* Interval */}
                <div>
                  <label htmlFor="autonomy_interval" className="block text-sm font-medium text-slate-700 mb-1">
                    Intervalo entre Planos (minutos)
                  </label>
                  <Input
                    id="autonomy_interval"
                    type="number"
                    min={5}
                    value={autonomyIntervalMinutes}
                    onChange={(e) => setAutonomyIntervalMinutes(Math.max(5, parseInt(e.target.value) || 5))}
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Minimo: 5 minutos. Recomendado: 60 minutos.
                  </p>
                </div>

                {/* Max plans per day */}
                <div>
                  <label htmlFor="autonomy_max_plans" className="block text-sm font-medium text-slate-700 mb-1">
                    Maximo de Planos por Dia
                  </label>
                  <Input
                    id="autonomy_max_plans"
                    type="number"
                    min={1}
                    max={48}
                    value={autonomyMaxPlansPerDay}
                    onChange={(e) => setAutonomyMaxPlansPerDay(Math.min(48, Math.max(1, parseInt(e.target.value) || 1)))}
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Limite de planos criados automaticamente por dia (1-48).
                  </p>
                </div>

                {/* Scope path override */}
                <div>
                  <label htmlFor="autonomy_scope" className="block text-sm font-medium text-slate-700 mb-1">
                    Escopo da Autonomia (opcional)
                  </label>
                  <Input
                    id="autonomy_scope"
                    type="text"
                    value={autonomyScopePath}
                    onChange={(e) => setAutonomyScopePath(e.target.value)}
                    placeholder="Deixe vazio para usar Diretorio Raiz"
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Caminho especifico para operacoes de autonomia. Se vazio, usa o Diretorio Raiz.
                  </p>
                </div>
              </>
            )}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">Como funciona</p>
              <ul className="text-sm text-blue-700 mt-1 list-disc list-inside space-y-1">
                <li>Agente analisa o diretorio e sugere organizacao de arquivos</li>
                <li>Planos aparecem como recomendacoes na lista de Jobs</li>
                <li>Voce revisa e decide aplicar (requer aprovacao + SoD)</li>
                <li>Nenhuma operacao destrutiva e executada automaticamente</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <Button onClick={handleSave} loading={saving}>
            Salvar Configuracoes
          </Button>
        </div>
      </div>
    </div>
  )
}
