'use client'

import { useState, useMemo } from 'react'
import { Button, Input, Select, CopyButton } from '@/components/ui'
import { formatBytes, formatDate, downloadJSON, downloadCSV } from './utils'

interface FileEntry {
  name: string
  type: 'file' | 'dir'
  size?: number
  modified?: number
}

interface FilesListTableProps {
  entries: FileEntry[]
  path?: string
  total?: number
  truncated?: boolean
}

type SortField = 'name' | 'type' | 'size' | 'modified'
type SortOrder = 'asc' | 'desc'

const MAX_DISPLAY = 200

export function FilesListTable({ entries, path = '/', total, truncated }: FilesListTableProps) {
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [typeFilter, setTypeFilter] = useState<'all' | 'file' | 'dir'>('all')
  const [search, setSearch] = useState('')

  const filteredAndSorted = useMemo(() => {
    let result = [...entries]

    // Filter by type
    if (typeFilter !== 'all') {
      result = result.filter((e) => e.type === typeFilter)
    }

    // Filter by search
    if (search) {
      const lowerSearch = search.toLowerCase()
      result = result.filter((e) => e.name.toLowerCase().includes(lowerSearch))
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'type':
          cmp = a.type.localeCompare(b.type)
          break
        case 'size':
          cmp = (a.size ?? 0) - (b.size ?? 0)
          break
        case 'modified':
          cmp = (a.modified ?? 0) - (b.modified ?? 0)
          break
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })

    return result
  }, [entries, sortField, sortOrder, typeFilter, search])

  const displayEntries = filteredAndSorted.slice(0, MAX_DISPLAY)
  const isDisplayTruncated = filteredAndSorted.length > MAX_DISPLAY

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-slate-300 ml-1">-</span>
    return <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
  }

  const hasFilters = typeFilter !== 'all' || search !== ''

  return (
    <div className="mt-3 bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium text-slate-800">
            Arquivos em <code className="text-blue-600">{path}</code>
            {truncated && <span className="text-amber-600 ml-2 text-xs">(truncado no servidor)</span>}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadJSON({ path, entries, total }, `files-list-${Date.now()}`)}
            >
              JSON
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => downloadCSV(entries, `files-list-${Date.now()}`)}
            >
              CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 text-xs"
          />
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'file' | 'dir')}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'file', label: 'Arquivos' },
              { value: 'dir', label: 'Pastas' },
            ]}
            className="w-32 text-xs"
          />
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTypeFilter('all')
                setSearch('')
              }}
            >
              Limpar
            </Button>
          )}
          <span className="text-xs text-slate-500 ml-auto">
            {filteredAndSorted.length} de {total ?? entries.length}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th
                className="px-4 py-2 text-left font-medium text-slate-600 cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('name')}
              >
                Nome <SortIndicator field="name" />
              </th>
              <th
                className="px-4 py-2 text-left font-medium text-slate-600 cursor-pointer hover:bg-slate-100 w-20"
                onClick={() => handleSort('type')}
              >
                Tipo <SortIndicator field="type" />
              </th>
              <th
                className="px-4 py-2 text-right font-medium text-slate-600 cursor-pointer hover:bg-slate-100 w-24"
                onClick={() => handleSort('size')}
              >
                Tamanho <SortIndicator field="size" />
              </th>
              <th
                className="px-4 py-2 text-right font-medium text-slate-600 cursor-pointer hover:bg-slate-100 w-36"
                onClick={() => handleSort('modified')}
              >
                Modificado <SortIndicator field="modified" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayEntries.map((entry, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className={entry.type === 'dir' ? 'text-blue-600' : 'text-slate-400'}>
                      {entry.type === 'dir' ? '📁' : '📄'}
                    </span>
                    <span className="font-mono truncate max-w-xs">{entry.name}</span>
                    <CopyButton value={entry.name} className="opacity-0 group-hover:opacity-100" />
                  </div>
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {entry.type === 'dir' ? 'pasta' : 'arquivo'}
                </td>
                <td className="px-4 py-2 text-right text-slate-600 font-mono">
                  {entry.size !== undefined ? formatBytes(entry.size) : '-'}
                </td>
                <td className="px-4 py-2 text-right text-slate-500 font-mono">
                  {entry.modified ? formatDate(entry.modified) : '-'}
                </td>
              </tr>
            ))}
            {displayEntries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  {hasFilters ? 'Nenhum resultado para os filtros' : 'Pasta vazia'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {isDisplayTruncated && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-xs text-amber-700">
          Exibindo {MAX_DISPLAY} de {filteredAndSorted.length} itens. Baixe o JSON/CSV para ver todos.
        </div>
      )}
    </div>
  )
}
