'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Skeleton, ErrorState, EmptyState } from '@/components/ui'

interface InstitutionInfo {
  institution_id: string
  display_name: string
  engine_institution_id: string | null
  role: string
  created_at: string
}

interface InstitutionsResponse {
  institutions: InstitutionInfo[]
  total: number
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietario',
  inst_owner: 'Proprietario',
  exec_admin: 'Administrador Executivo',
  admin: 'Administrador',
  member: 'Membro',
}

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-800',
  inst_owner: 'bg-purple-100 text-purple-800',
  exec_admin: 'bg-blue-100 text-blue-800',
  admin: 'bg-green-100 text-green-800',
  member: 'bg-slate-100 text-slate-800',
}

export default function InstitutionsPage() {
  const router = useRouter()
  const [data, setData] = useState<InstitutionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selecting, setSelecting] = useState<string | null>(null)

  useEffect(() => {
    async function fetchInstitutions() {
      try {
        const response = await fetch('/api/institutions')
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login?redirect=/institutions')
            return
          }
          throw new Error('Falha ao carregar instituicoes')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }
    fetchInstitutions()
  }, [router])

  async function handleSelect(inst: InstitutionInfo) {
    if (!inst.engine_institution_id) {
      alert('Instituicao ainda nao foi provisionada no Engine')
      return
    }

    setSelecting(inst.institution_id)
    try {
      const response = await fetch('/api/institutions/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution_id: inst.institution_id,
          engine_institution_id: inst.engine_institution_id,
        }),
      })

      if (!response.ok) {
        throw new Error('Falha ao selecionar instituicao')
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Select failed:', err)
      setSelecting(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="Erro ao carregar instituicoes"
        message={error}
        onRetry={() => window.location.reload()}
      />
    )
  }

  if (!data?.institutions.length) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Minhas Instituicoes</h1>
        <EmptyState
          title="Nenhuma instituicao"
          description="Voce ainda nao faz parte de nenhuma instituicao. Crie uma nova ou aceite um convite."
        />
        <div className="mt-6">
          <Link href="/onboarding">
            <Button>Criar Instituicao</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Minhas Instituicoes</h1>
        <Link href="/onboarding">
          <Button variant="secondary" size="sm">+ Nova Instituicao</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {data.institutions.map((inst) => (
          <div
            key={inst.institution_id}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">
                  {inst.display_name}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[inst.role] || ROLE_COLORS.member}`}>
                    {ROLE_LABELS[inst.role] || inst.role}
                  </span>
                  <span className="text-sm text-slate-500">
                    Desde {new Date(inst.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(inst.role === 'owner' || inst.role === 'inst_owner') && (
                  <>
                    <Link href={`/institutions/${inst.institution_id}/members`}>
                      <Button variant="secondary" size="sm">
                        Gerenciar
                      </Button>
                    </Link>
                    <Link href={`/institutions/${inst.institution_id}/settings`}>
                      <Button variant="secondary" size="sm">
                        Configurações
                      </Button>
                    </Link>
                  </>
                )}
                <Button
                  onClick={() => handleSelect(inst)}
                  loading={selecting === inst.institution_id}
                  disabled={!inst.engine_institution_id || selecting !== null}
                  size="sm"
                >
                  Selecionar
                </Button>
              </div>
            </div>

            {!inst.engine_institution_id && (
              <p className="mt-3 text-sm text-amber-600">
                Aguardando provisionamento no Engine...
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
