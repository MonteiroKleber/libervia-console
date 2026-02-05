'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import {
  Button,
  Select,
  Skeleton,
  ErrorState,
  EmptyState,
  FilterBar,
} from '@/components/ui'
import { PageHeader } from '@/components/layout'
import { downloadJSON, downloadGenericCSV } from '@/components/results/utils'
import {
  getSavedViews,
  saveView,
  deleteView,
  filtersToQueryString,
  copyToClipboard,
  type SavedView,
} from '@/lib/savedViews'

interface JobListItem {
  job_id: string
  job_type: string
  state: string
  occurred_at: string | null
  actor_id: string | null
  actor_roles: string[] | null
}

const STATE_OPTIONS = [
  { value: '', label: 'Todos os estados' },
  { value: 'requested', label: 'Solicitado' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'queued', label: 'Na fila' },
  { value: 'executed', label: 'Executado' },
  { value: 'failed', label: 'Falhou' },
]

const JOB_TYPE_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'files.plan.create', label: 'Recomendacoes (Planos)' },
  { value: 'files.read', label: 'Leitura' },
  { value: 'files.list', label: 'Listagem' },
  { value: 'files.stat', label: 'Metadados' },
  { value: 'files.hash', label: 'Hash' },
  { value: 'files.search', label: 'Busca' },
  { value: 'files.delete', label: 'Exclusao' },
  { value: 'files.rename', label: 'Renomear' },
  { value: 'files.move', label: 'Mover' },
  { value: 'files.plan.apply', label: 'Aplicar Plano' },
]

const STATE_COLORS: Record<string, string> = {
  requested: 'bg-blue-100 text-blue-800',
  approved: 'bg-purple-100 text-purple-800',
  queued: 'bg-amber-100 text-amber-800',
  executed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

const STATE_LABELS: Record<string, string> = {
  requested: 'Solicitado',
  approved: 'Aprovado',
  queued: 'Na fila',
  executed: 'Executado',
  failed: 'Falhou',
}

const VIEWS_NAMESPACE = 'jobs'

function JobsLoading() {
  return (
    <div>
      <PageHeader title="Historico de Jobs" description="Visualize o historico de execucoes" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-4">
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

function JobsContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [jobs, setJobs] = useState<JobListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stateFilter, setStateFilter] = useState(searchParams.get('state') || '')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('job_type') || '')

  // Saved views state
  const [savedViews, setSavedViews] = useState<SavedView[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

  // Load saved views on mount
  useEffect(() => {
    setSavedViews(getSavedViews(VIEWS_NAMESPACE))
  }, [])

  // Sync URL with filters
  const syncUrl = useCallback(
    (state: string, type: string) => {
      const filters: Record<string, string> = {}
      if (state) filters.state = state
      if (type) filters.job_type = type
      const qs = filtersToQueryString(filters)
      const newUrl = qs ? `${pathname}?${qs}` : pathname
      router.replace(newUrl, { scroll: false })
    },
    [pathname, router]
  )

  const fetchJobs = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (stateFilter) params.set('state', stateFilter)
      if (typeFilter) params.set('job_type', typeFilter)

      const response = await fetch(`/api/jobs?${params}`)
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Erro ao carregar jobs')
      }

      setJobs(result.jobs || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
    syncUrl(stateFilter, typeFilter)
  }, [stateFilter, typeFilter, syncUrl])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  const formatJobType = (type: string) => {
    return type.replace(/\./g, ' > ').replace(/_/g, ' ')
  }

  // Export handlers
  const handleExportJSON = () => {
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadJSON(jobs, `jobs-export-${timestamp}`)
  }

  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadGenericCSV(
      jobs,
      [
        { key: 'job_id', header: 'Job ID' },
        { key: 'job_type', header: 'Tipo' },
        { key: 'state', header: 'Estado' },
        { key: 'occurred_at', header: 'Data' },
        { key: 'actor_id', header: 'Actor' },
      ],
      `jobs-export-${timestamp}`
    )
  }

  // Saved views handlers
  const handleSaveView = () => {
    if (!newViewName.trim()) return
    const filters: Record<string, string> = {}
    if (stateFilter) filters.state = stateFilter
    if (typeFilter) filters.job_type = typeFilter
    const view = saveView(VIEWS_NAMESPACE, newViewName.trim(), filters)
    setSavedViews([...savedViews, view])
    setNewViewName('')
    setShowSaveDialog(false)
  }

  const handleLoadView = (view: SavedView) => {
    setStateFilter(view.filters.state || '')
    setTypeFilter(view.filters.job_type || '')
  }

  const handleDeleteView = (viewId: string) => {
    deleteView(VIEWS_NAMESPACE, viewId)
    setSavedViews(savedViews.filter((v) => v.id !== viewId))
  }

  const handleCopyLink = async () => {
    const filters: Record<string, string> = {}
    if (stateFilter) filters.state = stateFilter
    if (typeFilter) filters.job_type = typeFilter
    const qs = filtersToQueryString(filters)
    const url = `${window.location.origin}${pathname}${qs ? `?${qs}` : ''}`
    const success = await copyToClipboard(url)
    if (success) {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const hasActiveFilters = stateFilter !== '' || typeFilter !== ''

  if (loading && jobs.length === 0) {
    return <JobsLoading />
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Historico de Jobs" />
        <ErrorState
          title="Erro ao carregar jobs"
          message={error}
          onRetry={fetchJobs}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Historico de Jobs"
        description={`${jobs.length} job${jobs.length !== 1 ? 's' : ''} encontrado${jobs.length !== 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            {/* Export dropdown */}
            <div className="relative group">
              <Button variant="secondary" disabled={jobs.length === 0}>
                Exportar
              </Button>
              <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={handleExportJSON}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg"
                >
                  JSON
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 rounded-b-lg"
                >
                  CSV
                </button>
              </div>
            </div>
            {/* Copy link */}
            <Button variant="secondary" onClick={handleCopyLink}>
              {copiedLink ? 'Copiado!' : 'Copiar Link'}
            </Button>
            <Button variant="secondary" onClick={fetchJobs}>
              Atualizar
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <FilterBar
        className="mb-6"
        onClear={() => {
          setStateFilter('')
          setTypeFilter('')
        }}
        hasActiveFilters={hasActiveFilters}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-48">
            <Select
              id="state-filter"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              options={STATE_OPTIONS}
            />
          </div>
          <div className="w-48">
            <Select
              id="type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={JOB_TYPE_OPTIONS}
            />
          </div>

          {/* Saved Views */}
          <div className="flex items-center gap-2 ml-auto">
            {savedViews.length > 0 && (
              <div className="relative group">
                <Button variant="secondary" size="sm">
                  Views Salvas ({savedViews.length})
                </Button>
                <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  {savedViews.map((view) => (
                    <div
                      key={view.id}
                      className="flex items-center justify-between px-4 py-2 hover:bg-slate-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      <button
                        onClick={() => handleLoadView(view)}
                        className="flex-1 text-left text-sm text-slate-700"
                      >
                        {view.name}
                      </button>
                      <button
                        onClick={() => handleDeleteView(view.id)}
                        className="ml-2 text-slate-400 hover:text-red-600 text-xs"
                        title="Excluir"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {hasActiveFilters && (
              <>
                {showSaveDialog ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newViewName}
                      onChange={(e) => setNewViewName(e.target.value)}
                      placeholder="Nome da view..."
                      className="w-40 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveView()}
                    />
                    <Button variant="primary" size="sm" onClick={handleSaveView}>
                      Salvar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setShowSaveDialog(false)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setShowSaveDialog(true)}>
                    Salvar View
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </FilterBar>

      {/* Jobs Table */}
      {jobs.length === 0 ? (
        <EmptyState
          title="Nenhum job encontrado"
          description="Os jobs executados aparecerao aqui."
        />
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Job ID
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {jobs.map((job) => {
                const isPlanCreate = job.job_type === 'files.plan.create'
                const isRecommendation = isPlanCreate && job.state === 'executed'
                return (
                  <tr key={job.job_id} className={`hover:bg-slate-50 ${isRecommendation ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatDate(job.occurred_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                          {formatJobType(job.job_type)}
                        </span>
                        {isRecommendation && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Recomendacao
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATE_COLORS[job.state] || 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {STATE_LABELS[job.state] || job.state}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                      {job.job_id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-3">
                        {isRecommendation && (
                          <Link
                            href={`/jobs/${job.job_id}?action=apply`}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Aplicar
                          </Link>
                        )}
                        <Link
                          href={`/jobs/${job.job_id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Ver detalhes
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function JobsPage() {
  return (
    <Suspense fallback={<JobsLoading />}>
      <JobsContent />
    </Suspense>
  )
}
