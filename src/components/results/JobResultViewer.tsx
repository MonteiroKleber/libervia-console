'use client'

import { FilesListTable } from './FilesListTable'
import { FilesSearchResults } from './FilesSearchResults'
import { FilesReadPreview } from './FilesReadPreview'
import { FilesHashResult } from './FilesHashResult'
import { FilesStatPanel } from './FilesStatPanel'
import { FilesPlanViewer } from './FilesPlanViewer'
import type { JobResult } from '@/types/governance'

interface JobResultViewerProps {
  result: JobResult
  jobType?: string
}

/**
 * Main component that dispatches to the appropriate result viewer
 * based on the job type or result structure.
 */
export function JobResultViewer({ result, jobType }: JobResultViewerProps) {
  // Detect result type from structure if jobType not provided
  const detectType = (): string => {
    if (jobType) return jobType
    if (result.entries !== undefined) return 'files.list'
    if (result.matches !== undefined) return 'files.search'
    if (result.content !== undefined) return 'files.read'
    if (result.hash !== undefined) return 'files.hash'
    if (result.exists !== undefined) return 'files.stat'
    if (result.duplicate_groups !== undefined) return 'files.scan'
    if (result.suggestions !== undefined) return 'files.suggest'
    if (result.plan_id !== undefined && result.actions !== undefined) return 'files.plan.create'
    if (result.applied_count !== undefined) return 'files.plan.apply'
    return 'unknown'
  }

  const type = detectType()

  switch (type) {
    case 'files.list':
      return (
        <FilesListTable
          entries={result.entries || []}
          path={result.path}
          total={result.total}
          truncated={result.truncated}
        />
      )

    case 'files.search':
      return (
        <FilesSearchResults
          pattern={result.pattern}
          matches={result.matches || []}
          total={result.total}
          truncated={result.truncated}
        />
      )

    case 'files.read':
      return (
        <FilesReadPreview
          path={result.path}
          content={result.content || ''}
          size={result.size}
          truncated={result.truncated}
        />
      )

    case 'files.hash':
      return <FilesHashResult path={result.path} hash={result.hash || ''} size={result.size} />

    case 'files.stat':
      return (
        <FilesStatPanel
          path={result.path}
          exists={result.exists ?? false}
          type={result.type}
          size={result.size}
          mtime={result.mtime}
          ctime={result.ctime}
          mode={result.mode}
        />
      )

    case 'files.plan.create':
      return (
        <FilesPlanViewer
          planId={result.plan_id || ''}
          path={result.path}
          mode={result.plan_mode}
          actions={result.actions || []}
          actionsCount={result.actions_count || 0}
          planHash={result.plan_hash || ''}
          truncated={result.truncated}
          stats={{
            filesAnalyzed: result.stats?.files_analyzed,
            totalBytesRecoverable: result.stats?.total_bytes_recoverable,
            byReason: result.stats?.by_reason,
          }}
        />
      )

    // Legacy renderers for scan/suggest can be added here
    // For now, return null and let the chat page use its existing renderers
    default:
      return null
  }
}
