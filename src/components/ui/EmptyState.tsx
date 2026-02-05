'use client'

import { ReactNode } from 'react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      {icon && (
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl text-slate-400">
            {icon}
          </div>
        </div>
      )}
      <h3 className="text-lg font-medium text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 max-w-sm mx-auto mb-6">{description}</p>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

// Preset empty states
export function NoApprovalsEmpty() {
  return (
    <EmptyState
      icon="✓"
      title="Nenhuma aprovação pendente"
      description="Não há decisões aguardando sua ação. Novas solicitações aparecerão aqui."
    />
  )
}

export function NoEventsEmpty() {
  return (
    <EmptyState
      icon="📋"
      title="Nenhum evento encontrado"
      description="Não há eventos para os filtros selecionados. Tente ajustar os filtros ou aguarde novas atividades."
    />
  )
}
