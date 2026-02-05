'use client'

import { Button, CopyButton } from '@/components/ui'
import { formatBytes, downloadJSON } from './utils'

interface FilesReadPreviewProps {
  path?: string
  content: string
  size?: number
  truncated?: boolean
}

export function FilesReadPreview({ path, content, size, truncated }: FilesReadPreviewProps) {
  const lineCount = content ? content.split('\n').length : 0

  return (
    <div className="mt-3 bg-white rounded-lg border border-blue-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-blue-800">
              Conteudo de <code className="text-blue-600">{path || 'arquivo'}</code>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {size !== undefined && <span>{formatBytes(size)}</span>}
              {lineCount > 0 && <span className="ml-2">{lineCount} linha(s)</span>}
              {truncated && <span className="text-amber-600 ml-2">(truncado)</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <CopyButton value={content} label="Copiar" />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadJSON({ path, content, size, truncated }, `file-content-${Date.now()}`)}
            >
              JSON
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-auto bg-slate-900 p-4">
        <pre className="font-mono text-xs text-slate-100 whitespace-pre-wrap break-words">
          {content || '(arquivo vazio)'}
        </pre>
      </div>

      {/* Footer */}
      {truncated && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-700">
          Conteudo truncado. O arquivo completo pode ser maior.
        </div>
      )}
    </div>
  )
}
