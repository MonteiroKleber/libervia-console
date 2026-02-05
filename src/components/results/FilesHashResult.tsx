'use client'

import { Button, CopyButton } from '@/components/ui'
import { formatBytes, downloadJSON } from './utils'

interface FilesHashResultProps {
  path?: string
  hash: string
  size?: number
}

export function FilesHashResult({ path, hash, size }: FilesHashResultProps) {
  return (
    <div className="mt-3 bg-white rounded-lg border border-indigo-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-indigo-800">
              Hash SHA256 de <code className="text-indigo-600">{path || 'arquivo'}</code>
            </div>
            {size !== undefined && (
              <div className="text-xs text-indigo-600 mt-1">{formatBytes(size)}</div>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadJSON({ path, hash, size }, `hash-${Date.now()}`)}
          >
            JSON
          </Button>
        </div>
      </div>

      {/* Hash display */}
      <div className="p-4 bg-slate-50">
        <div className="flex items-center gap-3">
          <code className="font-mono text-sm text-indigo-700 bg-white px-3 py-2 rounded border border-indigo-100 flex-1 break-all select-all">
            {hash}
          </code>
          <CopyButton value={hash} label="Copiar" />
        </div>
      </div>
    </div>
  )
}
