'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui'

interface AcceptResponse {
  status: string
  institution_id: string
  role: string
}

function InviteAcceptForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AcceptResponse | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Token de convite nao fornecido')
      setStatus('error')
    }
  }, [token])

  async function handleAccept() {
    if (!token) return

    setStatus('loading')
    setError(null)

    try {
      const response = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated - redirect to login with return URL
          const returnUrl = `/invite?token=${encodeURIComponent(token)}`
          router.push(`/login?redirect=${encodeURIComponent(returnUrl)}`)
          return
        }

        throw new Error(data.error || 'Falha ao aceitar convite')
      }

      setResult(data)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setStatus('error')
    }
  }

  const ROLE_LABELS: Record<string, string> = {
    owner: 'Proprietario',
    inst_owner: 'Proprietario',
    exec_admin: 'Administrador Executivo',
    admin: 'Administrador',
    member: 'Membro',
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Convite para Instituicao</h1>
        <p className="text-slate-600 mt-2">
          Voce foi convidado para participar de uma instituicao
        </p>
      </div>

      {status === 'error' && (
        <div className="mb-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-medium">Erro ao aceitar convite</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <div className="mt-4 text-center">
            <Link href="/login" className="text-blue-600 hover:text-blue-700 text-sm">
              Fazer login
            </Link>
          </div>
        </div>
      )}

      {status === 'success' && result && (
        <div className="space-y-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <p className="font-medium">
              {result.status === 'already_member'
                ? 'Voce ja e membro desta instituicao!'
                : 'Convite aceito com sucesso!'}
            </p>
            <p className="text-sm mt-2">
              Seu papel: <strong>{ROLE_LABELS[result.role] || result.role}</strong>
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/institutions">
              <Button className="w-full">
                Ver Minhas Instituicoes
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary" className="w-full">
                Ir para o Dashboard
              </Button>
            </Link>
          </div>
        </div>
      )}

      {status === 'idle' && token && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
            <p className="text-sm">
              Ao aceitar este convite, voce tera acesso a instituicao com as permissoes atribuidas pelo proprietario.
            </p>
          </div>

          <Button
            onClick={handleAccept}
            className="w-full"
          >
            Aceitar Convite
          </Button>

          <div className="text-center">
            <Link href="/login" className="text-slate-500 hover:text-slate-700 text-sm">
              Nao e sua conta? Fazer login com outra conta
            </Link>
          </div>
        </div>
      )}

      {status === 'loading' && (
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-slate-600">Processando convite...</p>
        </div>
      )}
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-3/4 mx-auto mb-4" />
        <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto mb-8" />
        <div className="space-y-4">
          <div className="h-20 bg-slate-200 rounded" />
          <div className="h-10 bg-slate-200 rounded" />
        </div>
      </div>
    }>
      <InviteAcceptForm />
    </Suspense>
  )
}
