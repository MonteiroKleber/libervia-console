'use client'

import { useState } from 'react'
import { TimelineEvent } from '@/types/governance'
import { CopyButton } from './CopyButton'

interface EventTimelineProps {
  events: TimelineEvent[]
  onEventClick?: (event: TimelineEvent) => void
  className?: string
}

const eventTypeLabels: Record<string, { label: string; icon: string; color: string }> = {
  // RBAC/Auth events
  RBAC_DECISION: { label: 'Decisão RBAC', icon: '🔐', color: 'bg-blue-500' },
  ADMIN_KEY_USED: { label: 'Chave admin usada', icon: '🔑', color: 'bg-green-500' },
  ADMIN_KEY_DENIED: { label: 'Chave admin negada', icon: '🚫', color: 'bg-red-500' },

  // Approval events
  APPROVAL_REQUESTED: { label: 'Aprovação solicitada', icon: '⏳', color: 'bg-yellow-500' },
  APPROVAL_DECIDED: { label: 'Aprovação decidida', icon: '✓', color: 'bg-green-500' },
  APPROVAL_GRANTED: { label: 'Aprovação concedida', icon: '✓', color: 'bg-green-500' },
  APPROVAL_REJECTED: { label: 'Aprovação rejeitada', icon: '✗', color: 'bg-red-500' },

  // Actor token events
  ACTOR_TOKEN_CREATED: { label: 'Token criado', icon: '🔑', color: 'bg-purple-500' },
  ACTOR_TOKEN_REVOKED: { label: 'Token revogado', icon: '🚫', color: 'bg-red-500' },
  ACTOR_TOKEN_VALID: { label: 'Token válido', icon: '✓', color: 'bg-green-500' },
  ACTOR_TOKEN_INVALID: { label: 'Token inválido', icon: '✗', color: 'bg-red-500' },

  // Runtime/Job events
  RUNTIME_JOB_REPORTED: { label: 'Execução reportada', icon: '⚡', color: 'bg-indigo-500' },
  JOB_STARTED: { label: 'Job iniciado', icon: '▶', color: 'bg-blue-500' },
  JOB_COMPLETED: { label: 'Job concluído', icon: '✓', color: 'bg-green-500' },
  JOB_FAILED: { label: 'Job falhou', icon: '✗', color: 'bg-red-500' },

  // Case events
  CASE_CREATED: { label: 'Caso criado', icon: '📋', color: 'bg-blue-500' },
  CASE_DECIDED: { label: 'Caso decidido', icon: '⚖', color: 'bg-purple-500' },

  // Governance events
  PROPOSAL_CREATED: { label: 'Proposta criada', icon: '📝', color: 'bg-blue-500' },
  PROPOSAL_DECIDED: { label: 'Proposta decidida', icon: '✓', color: 'bg-green-500' },
  POLICY_UPDATED: { label: 'Política atualizada', icon: '📜', color: 'bg-purple-500' },

  // Default fallback
  DEFAULT: { label: 'Evento', icon: '•', color: 'bg-slate-400' },
}

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts)
    return date.toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    })
  } catch {
    return ts
  }
}

export function EventTimeline({ events, onEventClick, className = '' }: EventTimelineProps) {
  return (
    <div className={`space-y-0 ${className}`}>
      {events.map((event, index) => (
        <EventTimelineItem
          key={event.event_id}
          event={event}
          isLast={index === events.length - 1}
          onEventClick={onEventClick}
        />
      ))}
    </div>
  )
}

function EventTimelineItem({ event, isLast, onEventClick }: { event: TimelineEvent; isLast: boolean; onEventClick?: (event: TimelineEvent) => void }) {
  const [expanded, setExpanded] = useState(false)
  const config = eventTypeLabels[event.event_type] || eventTypeLabels.DEFAULT

  const handleClick = () => {
    onEventClick?.(event)
  }

  return (
    <div className="relative flex gap-4 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors" onClick={handleClick}>
      {/* Timeline line */}
      {!isLast && (
        <div
          className="absolute left-[11px] top-8 w-0.5 h-full bg-slate-200"
          aria-hidden="true"
        />
      )}

      {/* Dot */}
      <div
        className={`relative flex-shrink-0 w-6 h-6 rounded-full ${config.color} flex items-center justify-center text-white text-xs`}
        aria-hidden="true"
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-slate-900">{config.label}</p>
            <p className="text-xs text-slate-500">{formatTimestamp(event.timestamp)}</p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-slate-500 hover:text-slate-700"
            aria-expanded={expanded}
          >
            {expanded ? 'Ocultar' : 'Detalhes'}
          </button>
        </div>

        {/* Basic info */}
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {event.actor_id && (
            <span className="bg-slate-100 px-2 py-0.5 rounded">
              Ator: {event.actor_id}
            </span>
          )}
          {event.case_id && (
            <CopyButton value={event.case_id} label={`Case: ${event.case_id.slice(0, 8)}...`} />
          )}
        </div>

        {/* Expanded details */}
        {expanded && event.payload && (
          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
            <pre className="text-xs font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
