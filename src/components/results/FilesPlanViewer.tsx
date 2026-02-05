'use client'

import { useState, useMemo } from 'react'
import { Button, Input, Select, CopyButton } from '@/components/ui'
import { formatBytes, downloadJSON } from './utils'

interface PlanAction {
  action: 'delete' | 'move' | 'rename'
  path?: string
  source?: string
  dest?: string
  reason: string
  size?: number
  original?: string
  hash?: string
}

interface FilesPlanViewerProps {
  planId: string
  path?: string
  mode?: string
  actions: PlanAction[]
  actionsCount: number
  planHash: string
  truncated?: boolean
  stats?: {
    filesAnalyzed?: number
    totalBytesRecoverable?: number
    byReason?: Record<string, number>
  }
}

type ActionFilter = 'all' | 'delete' | 'move' | 'rename'

const MAX_DISPLAY = 100

export function FilesPlanViewer({
  planId,
  path = '/',
  mode = 'cleanup',
  actions,
  actionsCount,
  planHash,
  truncated,
  stats,
}: FilesPlanViewerProps) {
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [search, setSearch] = useState('')

  const filteredActions = useMemo(() => {
    let result = [...actions]

    // Filter by action type
    if (actionFilter !== 'all') {
      result = result.filter((a) => a.action === actionFilter)
    }

    // Filter by search
    if (search) {
      const lowerSearch = search.toLowerCase()
      result = result.filter(
        (a) =>
          a.path?.toLowerCase().includes(lowerSearch) ||
          a.source?.toLowerCase().includes(lowerSearch) ||
          a.dest?.toLowerCase().includes(lowerSearch) ||
          a.reason?.toLowerCase().includes(lowerSearch)
      )
    }

    return result
  }, [actions, actionFilter, search])

  const displayActions = filteredActions.slice(0, MAX_DISPLAY)
  const isDisplayTruncated = filteredActions.length > MAX_DISPLAY

  const hasFilters = actionFilter !== 'all' || search !== ''

  const totalBytes = stats?.totalBytesRecoverable ?? 0
  const byReason = stats?.byReason ?? {}

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'delete':
        return '🗑️'
      case 'move':
        return '📦'
      case 'rename':
        return '✏️'
      default:
        return '📝'
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'delete':
        return 'text-red-600'
      case 'move':
        return 'text-blue-600'
      case 'rename':
        return 'text-amber-600'
      default:
        return 'text-slate-600'
    }
  }

  return (
    <div className="mt-3 bg-white rounded-lg border border-purple-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-purple-50 border-b border-purple-200">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="font-medium text-purple-800">
              Plano de {mode === 'cleanup' ? 'Limpeza' : mode}
            </div>
            <div className="text-xs text-purple-600 mt-1 font-mono">
              ID: {planId}
            </div>
          </div>
          <div className="flex gap-2">
            <CopyButton value={planId} label="Copiar ID" />
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                downloadJSON(
                  { planId, path, mode, actions, planHash, stats },
                  `plan-${planId}`
                )
              }
            >
              JSON
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
          <div className="bg-white rounded p-2 border border-purple-100">
            <div className="text-slate-500 text-xs uppercase tracking-wide">Acoes</div>
            <div className="font-medium text-purple-700">{actionsCount}</div>
          </div>
          <div className="bg-white rounded p-2 border border-purple-100">
            <div className="text-slate-500 text-xs uppercase tracking-wide">Recuperavel</div>
            <div className="font-medium text-green-600">{formatBytes(totalBytes)}</div>
          </div>
          {Object.entries(byReason).map(([reason, count]) => (
            <div key={reason} className="bg-white rounded p-2 border border-purple-100">
              <div className="text-slate-500 text-xs uppercase tracking-wide">{reason.replace('_', ' ')}</div>
              <div className="font-medium text-slate-700">{count}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center mt-3">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 text-xs"
          />
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as ActionFilter)}
            options={[
              { value: 'all', label: 'Todas' },
              { value: 'delete', label: 'Exclusao' },
              { value: 'move', label: 'Mover' },
              { value: 'rename', label: 'Renomear' },
            ]}
            className="w-32 text-xs"
          />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setActionFilter('all')
                setSearch('')
              }}
            >
              Limpar
            </Button>
          )}
          <span className="text-xs text-slate-500 ml-auto">
            {filteredActions.length} de {actionsCount}
          </span>
        </div>
      </div>

      {/* Actions Table */}
      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-slate-600 w-20">Acao</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600">Caminho</th>
              <th className="px-4 py-2 text-left font-medium text-slate-600 w-28">Motivo</th>
              <th className="px-4 py-2 text-right font-medium text-slate-600 w-24">Tamanho</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayActions.map((action, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <span className={`flex items-center gap-1 ${getActionColor(action.action)}`}>
                    {getActionIcon(action.action)}
                    <span className="font-medium capitalize">{action.action}</span>
                  </span>
                </td>
                <td className="px-4 py-2 font-mono">
                  {action.action === 'delete' ? (
                    <span className="text-slate-700">{action.path}</span>
                  ) : (
                    <div>
                      <div className="text-slate-700">{action.source}</div>
                      <div className="text-slate-400">→ {action.dest}</div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {action.reason?.replace('_', ' ')}
                  {action.original && (
                    <div className="text-xs text-slate-400">dup de: {action.original}</div>
                  )}
                </td>
                <td className="px-4 py-2 text-right text-slate-600 font-mono">
                  {action.size !== undefined ? formatBytes(action.size) : '-'}
                </td>
              </tr>
            ))}
            {displayActions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  {hasFilters ? 'Nenhuma acao para os filtros' : 'Nenhuma acao no plano'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {(truncated || isDisplayTruncated) && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-700">
          {isDisplayTruncated
            ? `Exibindo ${MAX_DISPLAY} de ${filteredActions.length} acoes. Baixe o JSON para ver todas.`
            : 'Plano truncado no servidor. Mais acoes disponiveis.'}
        </div>
      )}

      {/* Plan Hash */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span className="font-mono truncate">{planHash}</span>
        <CopyButton value={planHash} />
      </div>
    </div>
  )
}
