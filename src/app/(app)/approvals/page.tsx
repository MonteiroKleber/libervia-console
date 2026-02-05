'use client'

import { useEffect, useState } from 'react'
import {
  Button,
  Select,
  ApprovalCard,
  Skeleton,
  ErrorState,
  NoApprovalsEmpty,
  ConfirmDialog,
  useToast,
  FilterBar,
} from '@/components/ui'
import { PageHeader } from '@/components/layout'
import type { ApprovalItem, ApprovalStatus } from '@/types/governance'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'rejected', label: 'Rejeitados' },
  { value: 'expired', label: 'Expirados' },
]

export default function ApprovalsPage() {
  const { showToast } = useToast()
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject'
    approval: ApprovalItem
  } | null>(null)

  const fetchApprovals = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const response = await fetch(`/api/approvals?${params}`)
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.message || result.error || 'Erro ao carregar aprovações')
      }
      setApprovals(result.approvals || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApprovals()
  }, [statusFilter])

  // SoD violation state
  const [sodViolation, setSodViolation] = useState<{
    message: string
    action?: string
  } | null>(null)

  const handleAction = async (approvalId: string, action: 'approve' | 'reject', reason?: string) => {
    setActionLoading(approvalId)
    setSodViolation(null)  // Clear previous SoD violation

    try {
      const response = await fetch(`/api/approvals/${approvalId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      const errorData = await response.json().catch(() => ({}))

      if (!response.ok) {
        // Check for SoD violation
        if (errorData.code === 'APPROVAL_SOD_VIOLATION' || errorData.code === 'SOD_VIOLATION') {
          setSodViolation({
            message: errorData.message || 'Você não pode aprovar a própria solicitação.',
            action: errorData.action,
          })
          return
        }
        throw new Error(errorData.message || `Erro ao ${action === 'approve' ? 'aprovar' : 'rejeitar'}`)
      }

      showToast(
        action === 'approve' ? 'Aprovação concedida' : 'Solicitação rejeitada',
        'success'
      )

      // Refresh list
      fetchApprovals()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao processar ação', 'error')
    } finally {
      setActionLoading(null)
      setConfirmAction(null)
    }
  }

  const handleApproveClick = (approval: ApprovalItem) => {
    setConfirmAction({ type: 'approve', approval })
  }

  const handleRejectClick = (approval: ApprovalItem) => {
    setConfirmAction({ type: 'reject', approval })
  }

  const pendingCount = approvals.filter((a) => a.status === 'pending').length

  if (loading && approvals.length === 0) {
    return (
      <div>
        <PageHeader title="Aprovações" description="Gerencie solicitações pendentes de aprovação" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-slate-200 p-6">
              <Skeleton className="h-6 w-1/3 mb-4" />
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Aprovações" />
        <ErrorState
          title="Erro ao carregar aprovações"
          message={error}
          onRetry={fetchApprovals}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Aprovações"
        description={`${pendingCount} solicitação${pendingCount !== 1 ? 'ões' : ''} pendente${pendingCount !== 1 ? 's' : ''}`}
        actions={
          <Button variant="secondary" onClick={fetchApprovals}>
            Atualizar
          </Button>
        }
      />

      {/* SoD Violation Banner */}
      {sodViolation && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-amber-800">
                Separação de Deveres (SoD)
              </h3>
              <p className="mt-1 text-sm text-amber-700">
                {sodViolation.message}
              </p>
              {sodViolation.action === 'SWITCH_ACCOUNT_EXEC_ADMIN' && (
                <div className="mt-3">
                  <p className="text-xs text-amber-600 mb-2">
                    Para aprovar ações destrutivas, use a conta exec_admin.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.location.href = '/login'}
                  >
                    Trocar conta
                  </Button>
                </div>
              )}
            </div>
            <button
              type="button"
              className="ml-auto flex-shrink-0 rounded-md text-amber-500 hover:text-amber-600 focus:outline-none"
              onClick={() => setSodViolation(null)}
            >
              <span className="sr-only">Fechar</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <FilterBar
        className="mb-6"
        onClear={() => setStatusFilter('all')}
        hasActiveFilters={statusFilter !== 'all'}
      >
        <div className="w-48">
          <label htmlFor="status-filter" className="sr-only">
            Filtrar por status
          </label>
          <Select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={STATUS_OPTIONS}
          />
        </div>
      </FilterBar>

      {/* Approvals List */}
      {approvals.length === 0 ? (
        <NoApprovalsEmpty />
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <ApprovalCard
              key={approval.approval_id}
              approval={approval}
              onApprove={approval.status === 'pending' ? () => handleApproveClick(approval) : undefined}
              onReject={approval.status === 'pending' ? () => handleRejectClick(approval) : undefined}
              loading={actionLoading === approval.approval_id}
            />
          ))}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <ConfirmDialog
          open={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={() =>
            handleAction(confirmAction.approval.approval_id, confirmAction.type)
          }
          title={confirmAction.type === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
          description={
            confirmAction.type === 'approve'
              ? `Você está prestes a aprovar a operação "${confirmAction.approval.display_name || confirmAction.approval.rule_name}". Esta ação permitirá que o agente execute a operação.`
              : `Você está prestes a rejeitar a operação "${confirmAction.approval.display_name || confirmAction.approval.rule_name}". O agente não poderá executar esta operação.`
          }
          confirmLabel={confirmAction.type === 'approve' ? 'Aprovar' : 'Rejeitar'}
          danger={confirmAction.type === 'reject'}
          loading={actionLoading !== null}
        />
      )}
    </div>
  )
}
