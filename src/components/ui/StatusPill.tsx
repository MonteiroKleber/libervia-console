'use client'

import { GovernanceStatus } from '@/types/governance'

interface StatusPillProps {
  status: GovernanceStatus
  size?: 'sm' | 'md'
  className?: string
}

const statusConfig: Record<
  GovernanceStatus,
  { label: string; icon: string; bgColor: string; textColor: string }
> = {
  allowed: {
    label: 'Permitido',
    icon: '✓',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
  },
  needs_approval: {
    label: 'Aguardando aprovação',
    icon: '⏳',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
  },
  denied: {
    label: 'Bloqueado',
    icon: '✕',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
  },
  executing: {
    label: 'Executando',
    icon: '⟳',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
  },
  executed: {
    label: 'Executado',
    icon: '✓',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
  },
  failed: {
    label: 'Falhou',
    icon: '!',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
  },
}

export function StatusPill({ status, size = 'md', className = '' }: StatusPillProps) {
  const config = statusConfig[status]
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${config.bgColor} ${config.textColor} ${sizeClasses} ${className}
      `}
      role="status"
      aria-label={config.label}
    >
      <span aria-hidden="true" className={status === 'executing' ? 'animate-spin' : ''}>
        {config.icon}
      </span>
      <span>{config.label}</span>
    </span>
  )
}
