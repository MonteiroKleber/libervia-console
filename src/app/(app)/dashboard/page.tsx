'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, StatusPill, Skeleton, SkeletonCard, ErrorState, EmptyState } from '@/components/ui'
import { PageHeader } from '@/components/layout'
import type { GovernanceStatus, ApprovalItem, TimelineEvent } from '@/types/governance'

interface AgentStatus {
  status: 'active' | 'inactive' | 'error'
  last_heartbeat?: string
  engine_institution_id?: string
}

interface DashboardData {
  agent: AgentStatus
  pending_approvals: ApprovalItem[]
  recent_events: TimelineEvent[]
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/dashboard')
      if (!response.ok) {
        throw new Error('Erro ao carregar dados do dashboard')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    // Poll every 30 seconds
    const interval = setInterval(fetchDashboard, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Visão geral do seu ambiente Bazari" />
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <ErrorState
          title="Erro ao carregar dashboard"
          message={error}
          onRetry={fetchDashboard}
        />
      </div>
    )
  }

  const agentStatusLabel = {
    active: 'Ativo',
    inactive: 'Inativo',
    error: 'Erro',
  }

  const agentStatusColor = {
    active: 'text-green-600 bg-green-100',
    inactive: 'text-slate-600 bg-slate-100',
    error: 'text-red-600 bg-red-100',
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral do seu ambiente Bazari"
        actions={
          <Button variant="secondary" onClick={fetchDashboard}>
            Atualizar
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        {/* Agent Status */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Status do Agente</h3>
          <div className="flex items-center gap-3">
            <span
              className={`
                inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                ${data?.agent ? agentStatusColor[data.agent.status] : 'bg-slate-100 text-slate-600'}
              `}
            >
              {data?.agent ? agentStatusLabel[data.agent.status] : 'Desconhecido'}
            </span>
            {data?.agent?.last_heartbeat && (
              <span className="text-xs text-slate-400">
                Último ping: {new Date(data.agent.last_heartbeat).toLocaleTimeString('pt-BR')}
              </span>
            )}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Aprovações Pendentes</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-slate-900">
              {data?.pending_approvals?.length ?? 0}
            </span>
            {(data?.pending_approvals?.length ?? 0) > 0 && (
              <Link href="/approvals" className="text-sm text-blue-600 hover:underline">
                Ver todas
              </Link>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Eventos Recentes</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-slate-900">
              {data?.recent_events?.length ?? 0}
            </span>
            <Link href="/audit" className="text-sm text-blue-600 hover:underline">
              Ver histórico
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Approvals List */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Aprovações Pendentes</h2>
            <Link href="/approvals">
              <Button variant="ghost" size="sm">Ver todas</Button>
            </Link>
          </div>
          <div className="p-6">
            {!data?.pending_approvals || data.pending_approvals.length === 0 ? (
              <EmptyState
                title="Nenhuma aprovação pendente"
                description="Todas as solicitações foram processadas"
              />
            ) : (
              <ul className="space-y-4">
                {data.pending_approvals.slice(0, 5).map((approval) => (
                  <li
                    key={approval.approval_id}
                    className="flex items-start justify-between gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">
                        {approval.display_name || approval.rule_name}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        {approval.operation_type}
                        {approval.target_path && ` • ${approval.target_path}`}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(approval.requested_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <StatusPill status="needs_approval" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Atividade Recente</h2>
            <Link href="/audit">
              <Button variant="ghost" size="sm">Ver histórico</Button>
            </Link>
          </div>
          <div className="p-6">
            {!data?.recent_events || data.recent_events.length === 0 ? (
              <EmptyState
                title="Nenhum evento recente"
                description="A atividade do sistema aparecerá aqui"
              />
            ) : (
              <ul className="space-y-4">
                {data.recent_events.slice(0, 5).map((event) => (
                  <li
                    key={event.event_id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">
                        {event.event_type}
                      </p>
                      {event.step && (
                        <p className="text-sm text-slate-500">
                          Step: {event.step}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(event.timestamp).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/chat">
            <Button>Iniciar Conversa</Button>
          </Link>
          <Link href="/approvals">
            <Button variant="secondary">Ver Aprovações</Button>
          </Link>
          <Link href="/audit">
            <Button variant="secondary">Ver Auditoria</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
