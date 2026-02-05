'use client'

type BannerVariant = 'online' | 'offline' | 'degraded' | 'info' | 'warning'

interface BannerStatusProps {
  variant: BannerVariant
  message: string
  detail?: string
  onDismiss?: () => void
}

const variantStyles: Record<BannerVariant, { bg: string; text: string; icon: string }> = {
  online: { bg: 'bg-green-50', text: 'text-green-800', icon: '✓' },
  offline: { bg: 'bg-red-50', text: 'text-red-800', icon: '✕' },
  degraded: { bg: 'bg-yellow-50', text: 'text-yellow-800', icon: '⚠' },
  info: { bg: 'bg-blue-50', text: 'text-blue-800', icon: 'ℹ' },
  warning: { bg: 'bg-yellow-50', text: 'text-yellow-800', icon: '⚠' },
}

export function BannerStatus({ variant, message, detail, onDismiss }: BannerStatusProps) {
  const styles = variantStyles[variant]

  return (
    <div
      className={`${styles.bg} ${styles.text} px-4 py-3 flex items-center gap-3`}
      role="status"
      aria-live="polite"
    >
      <span className="text-lg" aria-hidden="true">
        {styles.icon}
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
        {detail && <p className="text-xs opacity-80">{detail}</p>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-current opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Fechar banner"
        >
          ✕
        </button>
      )}
    </div>
  )
}
