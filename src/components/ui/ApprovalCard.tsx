'use client'

import { ApprovalItem } from '@/types/governance'
import { Button } from './Button'
import { CopyButton } from './CopyButton'

interface ApprovalCardProps {
  approval: ApprovalItem
  onApprove?: () => void
  onReject?: () => void
  loading?: boolean
  className?: string
}

const operationLabels: Record<string, { label: string; icon: string; danger: boolean }> = {
  delete: { label: 'Deletar', icon: '🗑️', danger: true },
  rename: { label: 'Renomear', icon: '✏️', danger: false },
  move: { label: 'Mover', icon: '📁', danger: false },
  default: { label: 'Operação', icon: '⚡', danger: false },
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return dateStr
  }
}

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
  loading = false,
  className = '',
}: ApprovalCardProps) {
  const opConfig = operationLabels[approval.operation_type] || operationLabels.default
  const isPending = approval.status === 'pending'

  return (
    <div className={`card overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`px-4 py-3 ${opConfig.danger ? 'bg-red-50' : 'bg-slate-50'} border-b border-slate-200`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">{opConfig.icon}</span>
            <div>
              <h3 className={`font-medium ${opConfig.danger ? 'text-red-700' : 'text-slate-900'}`}>
                {approval.display_name || opConfig.label}
              </h3>
              <p className="text-xs text-slate-500">{approval.rule_name}</p>
            </div>
          </div>
          <span className={`
            px-2.5 py-1 text-xs font-medium rounded-full
            ${isPending ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-600'}
          `}>
            {isPending ? 'Pendente' : approval.status}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Target info */}
        {approval.target_path && (
          <div>
            <p className="text-xs text-slate-500 mb-1">Alvo:</p>
            <p className="text-sm font-mono bg-slate-50 px-2 py-1 rounded truncate">
              {approval.target_path}
            </p>
          </div>
        )}

        {/* Reason */}
        {approval.reason && (
          <div>
            <p className="text-xs text-slate-500 mb-1">Motivo:</p>
            <p className="text-sm text-slate-700">{approval.reason}</p>
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span>Solicitado por: {approval.requested_by}</span>
          <span>•</span>
          <span>{formatDate(approval.requested_at)}</span>
        </div>

        {/* IDs */}
        <div className="flex flex-wrap gap-2">
          <CopyButton
            value={approval.approval_id}
            label={`ID: ${approval.approval_id.slice(0, 8)}...`}
          />
          <CopyButton
            value={approval.case_id}
            label={`Case: ${approval.case_id.slice(0, 8)}...`}
          />
        </div>
      </div>

      {/* Actions */}
      {isPending && (onApprove || onReject) && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          {onReject && (
            <Button
              variant="secondary"
              onClick={onReject}
              disabled={loading}
            >
              Rejeitar
            </Button>
          )}
          {onApprove && (
            <Button
              variant={opConfig.danger ? 'danger' : 'primary'}
              onClick={onApprove}
              loading={loading}
            >
              {opConfig.danger ? 'Aprovar (Irreversível)' : 'Aprovar'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
