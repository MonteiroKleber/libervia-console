'use client'

import { useState } from 'react'
import { CopyButton } from './CopyButton'

interface CodeBlockProps {
  code: string
  language?: string
  title?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
  className?: string
}

export function CodeBlock({
  code,
  language = 'json',
  title,
  collapsible = false,
  defaultCollapsed = true,
  className = '',
}: CodeBlockProps) {
  const [collapsed, setCollapsed] = useState(collapsible && defaultCollapsed)

  return (
    <div className={`bg-slate-900 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800">
        <div className="flex items-center gap-3">
          {collapsible && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-slate-400 hover:text-white transition-colors"
              aria-expanded={!collapsed}
            >
              {collapsed ? '▶' : '▼'}
            </button>
          )}
          {title && <span className="text-sm text-slate-300">{title}</span>}
          <span className="text-xs text-slate-500 uppercase">{language}</span>
        </div>
        <CopyButton
          value={code}
          className="bg-slate-700 text-slate-300 hover:bg-slate-600"
        />
      </div>

      {/* Code */}
      {!collapsed && (
        <pre className="p-4 overflow-x-auto">
          <code className="text-sm font-mono text-slate-300">{code}</code>
        </pre>
      )}
    </div>
  )
}
