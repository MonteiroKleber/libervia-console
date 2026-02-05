'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Skeleton, ErrorState } from '@/components/ui'

interface UserInfo {
  user_id: string
  email: string
  display_name: string | null
  is_dev_user: boolean
}

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/account/me')
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login?redirect=/account')
            return
          }
          throw new Error('Falha ao carregar dados do usuario')
        }
        const data = await response.json()
        setUser(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [router])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (err) {
      console.error('Logout failed:', err)
      setLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-4 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="Erro ao carregar conta"
        message={error}
        onRetry={() => window.location.reload()}
      />
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Minha Conta</h1>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-200">
        {/* User Info */}
        <div className="p-6">
          <h2 className="text-sm font-medium text-slate-500 mb-4">Informacoes da Conta</h2>

          <dl className="space-y-4">
            <div>
              <dt className="text-sm text-slate-500">Email</dt>
              <dd className="text-slate-900 font-medium">{user?.email}</dd>
            </div>

            <div>
              <dt className="text-sm text-slate-500">ID do Usuario</dt>
              <dd className="text-slate-900 font-mono text-sm">{user?.user_id}</dd>
            </div>

            {user?.display_name && (
              <div>
                <dt className="text-sm text-slate-500">Nome</dt>
                <dd className="text-slate-900">{user.display_name}</dd>
              </div>
            )}

            {user?.is_dev_user && (
              <div>
                <dt className="text-sm text-slate-500">Modo</dt>
                <dd className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  Desenvolvimento
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Actions */}
        <div className="p-6">
          <h2 className="text-sm font-medium text-slate-500 mb-4">Acoes</h2>

          <Button
            onClick={handleLogout}
            loading={loggingOut}
            variant="danger"
          >
            Sair da Conta
          </Button>
        </div>
      </div>
    </div>
  )
}
