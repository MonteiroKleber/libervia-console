'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Button,
  Skeleton,
  ErrorState,
  CopyButton,
} from '@/components/ui'
import { PageHeader } from '@/components/layout'
import { JobResultViewer } from '@/components/results/JobResultViewer'

interface JobDetail {
  job_id: string
  job_type: string
  state: string
  params: Record<string, unknown> | null
  result_summary: string | null
  result_json: Record<string, unknown> | null
  created_at: string | null
  executed_at: string | null
  approval_id: string | null
}

interface JobEvent {
  event_id: string
  event_type: string
  timestamp: string | null
  actor_id: string | null
  actor_roles: string[] | null
  payload: Record<string, unknown> | null
}

interface PageProps {
  params: { jobId: string }
}

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

export default function JobDetailPage({ params }: PageProps) {
  const { jobId } = params
  const router = useRouter()
  const searchParams = useSearchParams()
  const showApplyAction = searchParams.get('action') === 'apply'

  const [job, setJob] = useState<JobDetail | null>(null)
  const [events, setEvents] = useState<JobEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'result' | 'params' | 'events'>('result')
  const [showApplyConfirm, setShowApplyConfirm] = useState(showApplyAction)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const [jobRes, eventsRes] = await Promise.all([
          fetch(`/api/jobs/${jobId}`),
          fetch(`/api/jobs/${jobId}/events`),
        ])

        if (jobRes.status === 401) {
          router.push(`/login?redirect=/jobs/${jobId}`)
          return
        }

        if (jobRes.status === 404) {
          setError('Job nao encontrado')
          setLoading(false)
          return
        }

        if (!jobRes.ok) {
          const data = await jobRes.json().catch(() => ({}))
          throw new Error(data.message || 'Erro ao carregar job')
        }

        const jobData = await jobRes.json()
        setJob(jobData.job)

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json()
          setEvents(eventsData.events || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [jobId, router])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'medium',
    })
  }

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-8 w-64 mb-4" />
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-4 w-2/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Detalhes do Job" />
        <ErrorState
          title="Erro"
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  if (!job) {
    return (
      <div>
        <PageHeader title="Job nao encontrado" />
        <ErrorState
          title="Job nao encontrado"
          message="O job solicitado nao foi encontrado."
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/jobs" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">
          ← Voltar para Jobs
        </Link>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Job: {jobId.slice(0, 8)}...</h1>
          <CopyButton value={jobId} label="Copiar ID" />
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              STATE_COLORS[job.state] || 'bg-slate-100 text-slate-800'
            }`}
          >
            {STATE_LABELS[job.state] || job.state}
          </span>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-slate-500">Tipo</p>
            <p className="font-mono text-sm">{job.job_type}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Criado em</p>
            <p className="text-sm">{formatDate(job.created_at)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Executado em</p>
            <p className="text-sm">{formatDate(job.executed_at)}</p>
          </div>
          {job.approval_id && (
            <div>
              <p className="text-sm text-slate-500">Aprovacao</p>
              <Link
                href={`/approvals`}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {job.approval_id.slice(0, 8)}...
              </Link>
            </div>
          )}
        </div>
        {job.result_summary && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">Resumo</p>
            <p className="text-sm text-slate-900">{job.result_summary}</p>
          </div>
        )}
      </div>

      {/* Apply Plan Action for executed plan.create jobs */}
      {job.job_type === 'files.plan.create' && job.state === 'executed' && (
        <div className={`rounded-lg border p-6 mb-6 ${showApplyConfirm ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                {showApplyConfirm ? 'Aplicar este Plano?' : 'Recomendacao Disponivel'}
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                {showApplyConfirm
                  ? 'Para aplicar este plano, use o chat do agente. A execucao requer aprovacao (SoD).'
                  : 'Este plano foi criado pela autonomia assistida. Revise os detalhes abaixo e decida se deseja aplicar.'}
              </p>
              {showApplyConfirm ? (
                <div className="flex items-center gap-3">
                  <Link
                    href={`/chat?apply_plan=${jobId}`}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Ir para Chat e Aplicar
                  </Link>
                  <Button
                    variant="secondary"
                    onClick={() => setShowApplyConfirm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setShowApplyConfirm(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Aplicar Plano
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('result')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'result'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Resultado
            </button>
            <button
              onClick={() => setActiveTab('params')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'params'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Parametros
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'events'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Auditoria ({events.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Result Tab */}
          {activeTab === 'result' && (
            <div>
              {job.result_json ? (
                <JobResultViewer result={job.result_json as never} jobType={job.job_type} />
              ) : (
                <p className="text-slate-500 text-sm">Nenhum resultado disponivel.</p>
              )}
            </div>
          )}

          {/* Params Tab */}
          {activeTab === 'params' && (
            <div>
              {job.params ? (
                <pre className="bg-slate-50 p-4 rounded-lg overflow-auto text-sm font-mono">
                  {JSON.stringify(job.params, null, 2)}
                </pre>
              ) : (
                <p className="text-slate-500 text-sm">Nenhum parametro disponivel.</p>
              )}
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div>
              {events.length === 0 ? (
                <p className="text-slate-500 text-sm">Nenhum evento de auditoria encontrado.</p>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <div
                      key={event.event_id}
                      className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs bg-slate-200 px-2 py-0.5 rounded">
                            {event.event_type}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(event.timestamp)}
                          </span>
                        </div>
                        {event.actor_id && (
                          <p className="text-xs text-slate-600">
                            Actor: {event.actor_id}
                          </p>
                        )}
                        {event.payload && Object.keys(event.payload).filter(k => event.payload?.[k] != null).length > 0 && (
                          <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto">
                            {JSON.stringify(
                              Object.fromEntries(
                                Object.entries(event.payload).filter(([_, v]) => v != null)
                              ),
                              null,
                              2
                            )}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
