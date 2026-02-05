'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button, Textarea, StatusPill, CopyButton, useToast } from '@/components/ui'
import { PageHeader } from '@/components/layout'
import { JobResultViewer } from '@/components/results'
import type { ChatMessage, GovernanceStatus, JobResult } from '@/types/governance'

// Polling interval for job status (2 seconds)
const JOB_POLL_INTERVAL = 2000
const JOB_MAX_POLLS = 150 // Max 5 minutes of polling
const JOB_ENQUEUE_MAX_POLLS = 5 // Max 10 seconds waiting for enqueue

export default function ChatPage() {
  const { showToast } = useToast()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [pollingJobs, setPollingJobs] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Poll job status and update message when result is available
  const pollJobStatus = useCallback(async (jobId: string, messageId: string) => {
    let pollCount = 0

    const poll = async () => {
      if (pollCount >= JOB_MAX_POLLS) {
        setPollingJobs((prev) => {
          const next = new Set(prev)
          next.delete(jobId)
          return next
        })
        // Update message to show timeout
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, job_status: 'executing', error_code: 'TIMEOUT', error_message: 'Ainda processando (timeout do acompanhamento automático). Verifique a aba Jobs.' }
              : m
          )
        )
        return
      }

      try {
        const response = await fetch(`/api/chat/jobs/${jobId}/status`)
        if (!response.ok) {
          pollCount++
          setTimeout(poll, JOB_POLL_INTERVAL)
          return
        }

        const result = await response.json()

        if (result.status === 'executed' || result.status === 'failed') {
          // Job completed, update message
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    job_status: result.status,
                    job_result: result.result,
                    content: result.summary || m.content.replace('(aguardando execução)', ''),
                  }
                : m
            )
          )
          // Stop polling
          setPollingJobs((prev) => {
            const next = new Set(prev)
            next.delete(jobId)
            return next
          })
        } else if (result.status === 'requested' && pollCount >= JOB_ENQUEUE_MAX_POLLS) {
          // Job stuck in requested state - enqueue likely failed
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    job_status: 'failed',
                    error_code: 'ENQUEUE_FAILED',
                    error_message: 'Job não foi enfileirado (enqueue falhou). Verifique o Console API.',
                  }
                : m
            )
          )
          // Stop polling
          setPollingJobs((prev) => {
            const next = new Set(prev)
            next.delete(jobId)
            return next
          })
        } else {
          // Still queued or requested, continue polling
          pollCount++
          setTimeout(poll, JOB_POLL_INTERVAL)
        }
      } catch {
        pollCount++
        setTimeout(poll, JOB_POLL_INTERVAL)
      }
    }

    // Start polling
    setPollingJobs((prev) => new Set(prev).add(jobId))
    poll()
  }, [])

  const handleSend = async () => {
    const content = input.trim()
    if (!content || sending) return

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setSending(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      })

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem')
      }

      const result = await response.json()

      // Map API intent format to UI format
      // API: { intent: "files_list", confidence: 0.8, parameters: { path: "docs" } }
      // UI:  { action: "files_list", target: "docs", params: {...} }
      let mappedIntent: ChatMessage['intent'] = undefined
      if (result.intent) {
        const apiIntent = result.intent
        const path = apiIntent.parameters?.path
        mappedIntent = {
          action: apiIntent.intent || 'unknown',
          target: path || undefined,
          params: apiIntent.parameters,
        }
      }

      // Add system response
      const messageId = result.message_id || `system-${Date.now()}`
      const systemMessage: ChatMessage = {
        id: messageId,
        type: 'system',
        content: result.message || result.content,
        timestamp: result.timestamp || new Date().toISOString(),
        intent: mappedIntent,
        decision: result.decision,
        approval_id: result.approval_id,
        case_id: result.case_id,
        job_id: result.job_id,
        job_status: result.job_status,
        error_code: result.error_code,
        error_message: result.error_message,
      }
      setMessages((prev) => [...prev, systemMessage])

      // Start polling if job was created
      if (result.job_id && result.job_status === 'queued') {
        pollJobStatus(result.job_id, messageId)
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao enviar mensagem', 'error')

      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem.',
        timestamp: new Date().toISOString(),
        error_code: 'SEND_ERROR',
        error_message: error instanceof Error ? error.message : 'Erro desconhecido',
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const renderDecisionBadge = (decision: GovernanceStatus) => {
    return <StatusPill status={decision} />
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const renderJobResult = (result: JobResult) => {
    // Use JobResultViewer for: list, search, read, hash, stat
    // It returns null for types it doesn't handle (scan, suggest)
    const viewerResult = <JobResultViewer result={result} />
    if (viewerResult) {
      return viewerResult
    }

    // Legacy: Duplicate scan result
    if (result.duplicate_groups !== undefined) {
      return (
        <div className="mt-3 p-3 bg-amber-50 rounded-lg text-xs border border-amber-200">
          <div className="font-medium text-amber-800 mb-2">
            Busca de Duplicados em {result.path || '/'}
          </div>
          <div className="space-y-1 text-slate-700">
            <div>Arquivos escaneados: {result.files_scanned}</div>
            <div>Grupos de duplicados: {result.duplicate_groups}</div>
            <div>Espaco desperdicado: {formatBytes(result.total_wasted_bytes || 0)}</div>
          </div>
          {result.duplicates && result.duplicates.length > 0 && (
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {result.duplicates.slice(0, 5).map((dup, idx) => (
                <div key={idx} className="p-2 bg-white rounded border border-amber-100">
                  <div className="text-amber-700 font-medium">
                    {dup.count} arquivos identicos ({formatBytes(dup.wasted_bytes)} desperdicado)
                  </div>
                  <div className="text-slate-600 mt-1">
                    {dup.files.map((f, i) => (
                      <div key={i} className="font-mono truncate">{f.path}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    // Legacy: Cleanup suggestions result
    if (result.suggestions) {
      const { suggestions, summary } = result
      return (
        <div className="mt-3 p-3 bg-purple-50 rounded-lg text-xs border border-purple-200">
          <div className="font-medium text-purple-800 mb-2">
            Sugestoes de Limpeza para {result.path || '/'}
          </div>
          <div className="space-y-1 text-slate-700 mb-2">
            <div>Arquivos analisados: {result.files_analyzed}</div>
            <div>Espaco recuperavel: {formatBytes(result.total_recoverable_bytes || 0)}</div>
          </div>
          {summary && (
            <div className="grid grid-cols-2 gap-2 text-slate-600">
              {summary.duplicates !== undefined && summary.duplicates > 0 && (
                <div>Duplicados: {summary.duplicates}</div>
              )}
              {summary.temp_files !== undefined && summary.temp_files > 0 && (
                <div>Temporarios: {summary.temp_files}</div>
              )}
              {summary.empty_files !== undefined && summary.empty_files > 0 && (
                <div>Vazios: {summary.empty_files}</div>
              )}
              {summary.cache_dirs !== undefined && summary.cache_dirs > 0 && (
                <div>Caches: {summary.cache_dirs}</div>
              )}
            </div>
          )}
          {suggestions.temp_files && suggestions.temp_files.length > 0 && (
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              <div className="text-purple-700 font-medium">Arquivos temporarios:</div>
              {suggestions.temp_files.slice(0, 5).map((f, idx) => (
                <div key={idx} className="font-mono text-slate-600 truncate">
                  {f.path} ({formatBytes(f.size)})
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    return null
  }

  const renderJobStatus = (message: ChatMessage) => {
    if (!message.job_id) return null

    const isPolling = pollingJobs.has(message.job_id)
    const status = message.job_status

    if (status === 'queued' || isPolling) {
      return (
        <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
          <span className="animate-spin">⏳</span>
          <span>Aguardando execução...</span>
        </div>
      )
    }

    if (status === 'executed' && message.job_result) {
      return renderJobResult(message.job_result)
    }

    if (status === 'failed') {
      return (
        <div className="mt-2 text-xs text-red-600">
          ❌ Falha na execução
        </div>
      )
    }

    return null
  }

  const renderMessageMetadata = (message: ChatMessage) => {
    if (message.type !== 'system') return null

    const hasMetadata = message.intent || message.decision || message.approval_id || message.case_id || message.job_id

    if (!hasMetadata) return null

    return (
      <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs space-y-2">
        {message.intent && (
          <div className="space-y-1">
            <div>
              <span className="text-slate-500">Intenção:</span>{' '}
              <span className="font-mono text-slate-700">
                {message.intent.action?.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            {message.intent.target && (
              <div>
                <span className="text-slate-500">Pasta:</span>{' '}
                <span className="font-mono text-slate-700">{message.intent.target || '/'}</span>
              </div>
            )}
          </div>
        )}
        {message.decision && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Decisão:</span>
            {renderDecisionBadge(message.decision)}
          </div>
        )}
        {message.approval_id && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Aprovação:</span>
            <code className="font-mono text-slate-700">{message.approval_id.slice(0, 8)}...</code>
            <CopyButton value={message.approval_id} className="scale-75" />
          </div>
        )}
        {message.case_id && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Case:</span>
            <code className="font-mono text-slate-700">{message.case_id.slice(0, 8)}...</code>
            <CopyButton value={message.case_id} className="scale-75" />
          </div>
        )}
        {message.job_id && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Job:</span>
            <code className="font-mono text-slate-700">{message.job_id.slice(0, 8)}...</code>
            <CopyButton value={message.job_id} className="scale-75" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-2rem)]">
      <PageHeader
        title="Chat"
        description="Converse com o agente Bazari para executar operações"
      />

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto bg-white rounded-lg border border-slate-200 mb-4"
        role="log"
        aria-live="polite"
        aria-label="Histórico de mensagens"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">Comece uma conversa</p>
              <p className="text-sm">Envie uma mensagem para interagir com o agente</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[80%] rounded-lg p-4
                    ${message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.error_code
                        ? 'bg-red-50 border border-red-200 text-slate-900'
                        : 'bg-slate-100 text-slate-900'
                    }
                  `}
                >
                  {/* Message content */}
                  <p className="whitespace-pre-wrap">{message.content}</p>

                  {/* Job status and result */}
                  {renderJobStatus(message)}

                  {/* Error details */}
                  {message.error_code && (
                    <div className="mt-2 text-xs text-red-600">
                      <span className="font-mono">[{message.error_code}]</span>
                      {message.error_message && `: ${message.error_message}`}
                    </div>
                  )}

                  {/* Metadata */}
                  {renderMessageMetadata(message)}

                  {/* Timestamp */}
                  <p
                    className={`text-xs mt-2 ${
                      message.type === 'user' ? 'text-blue-200' : 'text-slate-400'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex gap-3">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
            disabled={sending}
            className="flex-1 min-h-[60px] max-h-[200px] resize-none"
            aria-label="Mensagem"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            loading={sending}
            className="self-end"
          >
            Enviar
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          O agente processará sua solicitação e retornará o resultado.
          Operações sensíveis podem requerer aprovação.
        </p>
      </div>
    </div>
  )
}
