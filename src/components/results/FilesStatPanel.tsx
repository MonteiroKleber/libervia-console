'use client'

import { Button } from '@/components/ui'
import { formatBytes, formatDate, downloadJSON } from './utils'

interface FilesStatPanelProps {
  path?: string
  exists: boolean
  type?: string
  size?: number
  mtime?: string
  ctime?: string
  mode?: number
}

export function FilesStatPanel({
  path,
  exists,
  type,
  size,
  mtime,
  ctime,
  mode,
}: FilesStatPanelProps) {
  const modeStr = mode !== undefined ? mode.toString(8).padStart(4, '0') : undefined

  return (
    <div className="mt-3 bg-white rounded-lg border border-cyan-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-cyan-50 border-b border-cyan-200">
        <div className="flex items-center justify-between">
          <div className="font-medium text-cyan-800">
            Informacoes de <code className="text-cyan-600">{path || 'arquivo'}</code>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadJSON({ path, exists, type, size, mtime, ctime, mode }, `stat-${Date.now()}`)
            }
          >
            JSON
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* Exists */}
          <div>
            <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Existe</div>
            <div className={exists ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
              {exists ? '✓ Sim' : '✗ Nao'}
            </div>
          </div>

          {exists && (
            <>
              {/* Type */}
              <div>
                <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Tipo</div>
                <div className="flex items-center gap-2">
                  <span>{type === 'dir' ? '📁' : '📄'}</span>
                  <span className="font-medium text-slate-700">
                    {type === 'dir' ? 'Diretorio' : 'Arquivo'}
                  </span>
                </div>
              </div>

              {/* Size */}
              {size !== undefined && (
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Tamanho</div>
                  <div className="font-mono text-slate-700">
                    {formatBytes(size)}
                    <span className="text-slate-400 ml-2">({size.toLocaleString()} bytes)</span>
                  </div>
                </div>
              )}

              {/* Mode */}
              {modeStr && (
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                    Permissoes
                  </div>
                  <div className="font-mono text-slate-700">{modeStr}</div>
                </div>
              )}

              {/* Modified */}
              {mtime && (
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                    Modificado
                  </div>
                  <div className="font-mono text-slate-700">{formatDate(mtime)}</div>
                </div>
              )}

              {/* Created */}
              {ctime && (
                <div>
                  <div className="text-slate-500 text-xs uppercase tracking-wide mb-1">Criado</div>
                  <div className="font-mono text-slate-700">{formatDate(ctime)}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
