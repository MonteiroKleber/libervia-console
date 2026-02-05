'use client'

import { CopyButton } from './CopyButton'

interface Artifact {
  label: string
  value: string
  copyable?: boolean
}

interface ArtifactPanelProps {
  title?: string
  artifacts: Artifact[]
  className?: string
}

export function ArtifactPanel({ title = 'Evidências', artifacts, className = '' }: ArtifactPanelProps) {
  if (artifacts.length === 0) return null

  return (
    <div className={`bg-slate-50 rounded-lg p-4 ${className}`}>
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
        {title}
      </h4>
      <dl className="space-y-2">
        {artifacts.map((artifact) => (
          <div key={artifact.label} className="flex items-start gap-2">
            <dt className="text-xs text-slate-500 min-w-[100px]">{artifact.label}:</dt>
            <dd className="text-xs text-slate-900 font-mono flex-1 break-all">
              {artifact.copyable !== false ? (
                <CopyButton value={artifact.value} label={artifact.value} />
              ) : (
                artifact.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
