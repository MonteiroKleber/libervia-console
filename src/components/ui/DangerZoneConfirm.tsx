'use client'

import { useState } from 'react'
import { Dialog } from './Dialog'
import { Button } from './Button'
import { Input } from './Input'

interface DangerZoneConfirmProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText: string // Text user must type to confirm
  confirmLabel?: string
  loading?: boolean
}

export function DangerZoneConfirm({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  confirmLabel = 'Confirmar exclusão',
  loading = false,
}: DangerZoneConfirmProps) {
  const [inputValue, setInputValue] = useState('')
  const isValid = inputValue === confirmText

  const handleClose = () => {
    setInputValue('')
    onClose()
  }

  const handleConfirm = () => {
    if (isValid) {
      onConfirm()
      setInputValue('')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={title}
      danger
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{description}</p>

        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-800 font-medium mb-3">
            Para confirmar, digite: <span className="font-mono bg-red-100 px-1 rounded">{confirmText}</span>
          </p>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={confirmText}
            className="font-mono"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={!isValid}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
