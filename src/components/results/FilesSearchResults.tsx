'use client'

import { useState, useMemo } from 'react'
import { Button, Input, CopyButton } from '@/components/ui'
import { downloadJSON } from './utils'

interface SearchMatch {
  path: string
  type: string
}

interface FilesSearchResultsProps {
  pattern?: string
  matches: SearchMatch[]
  total?: number
  truncated?: boolean
}

const MAX_DISPLAY = 100

export function FilesSearchResults({
  pattern,
  matches,
  total,
  truncated,
}: FilesSearchResultsProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search) return matches
    const lowerSearch = search.toLowerCase()
    return matches.filter((m) => m.path.toLowerCase().includes(lowerSearch))
  }, [matches, search])

  const displayMatches = filtered.slice(0, MAX_DISPLAY)
  const isDisplayTruncated = filtered.length > MAX_DISPLAY

  return (
    <div className="mt-3 bg-white rounded-lg border border-emerald-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-200">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium text-emerald-800">
            Busca por <code className="text-emerald-600">&quot;{pattern}&quot;</code>
            {truncated && <span className="text-amber-600 ml-2 text-xs">(mais resultados no servidor)</span>}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadJSON({ pattern, matches, total }, `search-results-${Date.now()}`)}
          >
            JSON
          </Button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Input
            placeholder="Filtrar resultados..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 text-xs"
          />
          <span className="text-xs text-emerald-700 ml-auto">
            {filtered.length} de {total ?? matches.length} encontrado(s)
          </span>
        </div>
      </div>

      {/* Results */}
      <div className="max-h-72 overflow-y-auto">
        {displayMatches.length > 0 ? (
          <div className="divide-y divide-emerald-100">
            {displayMatches.map((match, idx) => (
              <div key={idx} className="px-4 py-2 hover:bg-emerald-50 flex items-center gap-2">
                <span className={match.type === 'dir' ? 'text-blue-600' : 'text-slate-400'}>
                  {match.type === 'dir' ? '📁' : '📄'}
                </span>
                <span className="font-mono text-xs text-slate-700 flex-1 truncate">{match.path}</span>
                <CopyButton value={match.path} />
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-slate-500 text-sm">
            {search ? 'Nenhum resultado para o filtro' : 'Nenhum arquivo encontrado'}
          </div>
        )}
      </div>

      {/* Footer */}
      {isDisplayTruncated && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-700">
          Exibindo {MAX_DISPLAY} de {filtered.length} resultados. Baixe o JSON para ver todos.
        </div>
      )}
    </div>
  )
}
