'use client'

import { useState } from 'react'

interface CopyButtonProps {
  value: string
  label?: string
  className?: string
}

export function CopyButton({ value, label, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono
        bg-slate-100 hover:bg-slate-200 rounded transition-colors
        ${className}
      `}
      title="Copiar para área de transferência"
      aria-label={`Copiar ${label || value}`}
    >
      <span className="truncate max-w-[200px]">{label || value}</span>
      <span className="flex-shrink-0" aria-hidden="true">
        {copied ? '✓' : '📋'}
      </span>
      {copied && (
        <span className="sr-only">Copiado!</span>
      )}
    </button>
  )
}
