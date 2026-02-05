'use client'

import { ReactNode } from 'react'
import { Button } from './Button'

interface FilterBarProps {
  children: ReactNode
  onClear?: () => void
  hasActiveFilters?: boolean
  className?: string
}

export function FilterBar({
  children,
  onClear,
  hasActiveFilters = false,
  className = '',
}: FilterBarProps) {
  return (
    <div className={`flex flex-wrap items-end gap-4 ${className}`}>
      {children}
      {onClear && hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
