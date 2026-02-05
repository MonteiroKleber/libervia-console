'use client'

import { useState } from 'react'
import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  message: string
  code?: string
  requestId?: string
  onRetry?: () => void
  retrying?: boolean
  className?: string
}

export function ErrorState({
  title = 'Erro ao carregar',
  message,
  code,
  requestId,
  onRetry,
  retrying = false,
  className = '',
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false)
  const hasDetails = code || requestId

  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-3xl text-red-600">
          !
        </div>
      </div>
      <h3 className="text-lg font-medium text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 max-w-sm mx-auto mb-4">{message}</p>

      <div className="flex justify-center gap-3">
        {onRetry && (
          <Button variant="primary" onClick={onRetry} loading={retrying}>
            Tentar novamente
          </Button>
        )}
        {hasDetails && (
          <Button variant="ghost" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
          </Button>
        )}
      </div>

      {showDetails && hasDetails && (
        <div className="mt-4 p-4 bg-slate-100 rounded-lg text-left max-w-md mx-auto">
          <p className="text-xs font-mono text-slate-600">
            {code && (
              <>
                <span className="font-semibold">Código:</span> {code}
                <br />
              </>
            )}
            {requestId && (
              <>
                <span className="font-semibold">Request ID:</span> {requestId}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
