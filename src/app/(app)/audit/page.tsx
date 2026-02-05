'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Button,
  Input,
  Select,
  EventTimeline,
  Skeleton,
  ErrorState,
  NoEventsEmpty,
  FilterBar,
  CodeBlock,
  useToast,
} from '@/components/ui'
import { PageHeader } from '@/components/layout'
import type { TimelineEvent } from '@/types/governance'

const EVENT_TYPE_OPTIONS = [
  { value: 'all', label: 'Todos os tipos' },
  // Auth events
  { value: 'ADMIN_KEY_USED', label: 'Chave admin usada' },
  { value: 'ADMIN_KEY_DENIED', label: 'Chave admin negada' },
  { value: 'RBAC_DECISION', label: 'Decisão RBAC' },
  // Runtime events
  { value: 'RUNTIME_JOB_REPORTED', label: 'Execução reportada' },
  // Approval events
  { value: 'APPROVAL_REQUESTED', label: 'Aprovação solicitada' },
  { value: 'APPROVAL_DECIDED', label: 'Aprovação decidida' },
  // Token events
  { value: 'ACTOR_TOKEN_CREATED', label: 'Token criado' },
  { value: 'ACTOR_TOKEN_REVOKED', label: 'Token revogado' },
  // Case events
  { value: 'CASE_CREATED', label: 'Caso criado' },
  { value: 'CASE_DECIDED', label: 'Caso decidido' },
]

export default function AuditPage() {
  const { showToast } = useToast()
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState('all')
  const [caseIdFilter, setCaseIdFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const PAGE_SIZE = 50

  // Selected event for detail view
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null)

  const fetchEvents = useCallback(async (reset = false) => {
    if (reset) {
      setPage(1)
      setEvents([])
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(reset ? 0 : (page - 1) * PAGE_SIZE))

      if (eventTypeFilter !== 'all') {
        params.set('event_type', eventTypeFilter)
      }
      if (caseIdFilter.trim()) {
        params.set('case_id', caseIdFilter.trim())
      }
      if (dateFrom) {
        params.set('from', dateFrom)
      }
      if (dateTo) {
        params.set('to', dateTo)
      }

      const response = await fetch(`/api/audit/events?${params}`)
      if (!response.ok) {
        throw new Error('Erro ao carregar eventos')
      }

      const result = await response.json()
      const newEvents = result.events || []

      setEvents((prev) => (reset ? newEvents : [...prev, ...newEvents]))
      setHasMore(newEvents.length === PAGE_SIZE)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [page, eventTypeFilter, caseIdFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchEvents(true)
  }, [eventTypeFilter, caseIdFilter, dateFrom, dateTo])

  const handleLoadMore = () => {
    setPage((p) => p + 1)
    fetchEvents(false)
  }

  const handleClearFilters = () => {
    setEventTypeFilter('all')
    setCaseIdFilter('')
    setDateFrom('')
    setDateTo('')
  }

  const hasActiveFilters =
    eventTypeFilter !== 'all' ||
    caseIdFilter.trim() !== '' ||
    dateFrom !== '' ||
    dateTo !== ''

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (eventTypeFilter !== 'all') params.set('event_type', eventTypeFilter)
      if (caseIdFilter.trim()) params.set('case_id', caseIdFilter.trim())
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)

      const response = await fetch(`/api/audit/export?${params}`)
      if (!response.ok) throw new Error('Erro ao exportar')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      showToast('Exportação concluída', 'success')
    } catch (err) {
      showToast('Erro ao exportar eventos', 'error')
    }
  }

  if (loading && events.length === 0) {
    return (
      <div>
        <PageHeader title="Auditoria" description="Histórico de eventos do sistema" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-2 h-2 rounded-full mt-2" />
              <div className="flex-1">
                <Skeleton className="h-4 w-1/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error && events.length === 0) {
    return (
      <div>
        <PageHeader title="Auditoria" />
        <ErrorState
          title="Erro ao carregar eventos"
          message={error}
          onRetry={() => fetchEvents(true)}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Auditoria"
        description="Histórico completo de eventos do sistema"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => fetchEvents(true)}>
              Atualizar
            </Button>
            <Button variant="secondary" onClick={handleExport}>
              Exportar
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <FilterBar
        className="mb-6"
        onClear={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      >
        <div className="w-48">
          <label htmlFor="event-type-filter" className="block text-xs text-slate-500 mb-1">
            Tipo de evento
          </label>
          <Select
            id="event-type-filter"
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            options={EVENT_TYPE_OPTIONS}
          />
        </div>

        <div className="w-48">
          <label htmlFor="case-id-filter" className="block text-xs text-slate-500 mb-1">
            ID do Caso
          </label>
          <Input
            id="case-id-filter"
            value={caseIdFilter}
            onChange={(e) => setCaseIdFilter(e.target.value)}
            placeholder="case-..."
            className="font-mono text-sm"
          />
        </div>

        <div className="w-40">
          <label htmlFor="date-from" className="block text-xs text-slate-500 mb-1">
            Data início
          </label>
          <Input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="w-40">
          <label htmlFor="date-to" className="block text-xs text-slate-500 mb-1">
            Data fim
          </label>
          <Input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </FilterBar>

      {/* Events Timeline */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-6">
          {events.length === 0 ? (
            <NoEventsEmpty />
          ) : (
            <>
              <EventTimeline
                events={events}
                onEventClick={setSelectedEvent}
              />

              {/* Load More */}
              {hasMore && (
                <div className="mt-6 text-center">
                  <Button
                    variant="secondary"
                    onClick={handleLoadMore}
                    loading={loading}
                  >
                    Carregar mais
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Event Detail Panel */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Detalhes do Evento</h3>

          {selectedEvent ? (
            <div className="space-y-4">
              <div>
                <span className="text-xs text-slate-500">Tipo</span>
                <p className="font-medium text-slate-900">{selectedEvent.event_type}</p>
              </div>

              <div>
                <span className="text-xs text-slate-500">Data/Hora</span>
                <p className="font-medium text-slate-900">
                  {new Date(selectedEvent.timestamp).toLocaleString('pt-BR')}
                </p>
              </div>

              {selectedEvent.event_id && (
                <div>
                  <span className="text-xs text-slate-500">ID do Evento</span>
                  <p className="font-mono text-sm text-slate-700 break-all">
                    {selectedEvent.event_id}
                  </p>
                </div>
              )}

              {selectedEvent.case_id && (
                <div>
                  <span className="text-xs text-slate-500">ID do Caso</span>
                  <p className="font-mono text-sm text-slate-700 break-all">
                    {selectedEvent.case_id}
                  </p>
                </div>
              )}

              {selectedEvent.actor_id && (
                <div>
                  <span className="text-xs text-slate-500">Ator (Executor)</span>
                  <p className="font-mono text-sm text-slate-700">{selectedEvent.actor_id}</p>
                  {selectedEvent.actor_roles && selectedEvent.actor_roles.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      Roles: {selectedEvent.actor_roles.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {selectedEvent.payload?.requester_user_name != null && (
                <div>
                  <span className="text-xs text-slate-500">Solicitado por (Funcionario)</span>
                  <p className="font-medium text-slate-900">
                    {String(selectedEvent.payload.requester_user_name)}
                  </p>
                  {selectedEvent.payload.requester_user_id != null && (
                    <p className="font-mono text-xs text-slate-500 mt-1">
                      ID: {String(selectedEvent.payload.requester_user_id)}
                    </p>
                  )}
                </div>
              )}

              {selectedEvent.step && (
                <div>
                  <span className="text-xs text-slate-500">Step</span>
                  <p className="font-medium text-slate-900">{selectedEvent.step}</p>
                </div>
              )}

              {selectedEvent.payload && Object.keys(selectedEvent.payload).length > 0 && (
                <div>
                  <span className="text-xs text-slate-500 block mb-2">Payload</span>
                  <CodeBlock
                    code={JSON.stringify(selectedEvent.payload, null, 2)}
                    language="json"
                    collapsible
                    defaultCollapsed={false}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Selecione um evento na timeline para ver os detalhes
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
