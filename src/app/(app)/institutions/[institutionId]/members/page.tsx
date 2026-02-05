'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Input, Skeleton, ErrorState, EmptyState, Dialog, CopyButton } from '@/components/ui'

interface MemberInfo {
  user_id: string
  email: string
  display_name: string | null
  role: string
  created_at: string
}

interface InviteInfo {
  invite_id: string
  invited_email: string
  role: string
  status: string
  created_at: string
  expires_at: string
}

interface MembersResponse {
  members: MemberInfo[]
  total: number
}

interface InvitesResponse {
  invites: InviteInfo[]
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

interface PageProps {
  params: { institutionId: string }
}

export default function MembersPage({ params }: PageProps) {
  const { institutionId } = params
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'members' | 'invites'>('members')
  const [members, setMembers] = useState<MembersResponse | null>(null)
  const [invites, setInvites] = useState<InvitesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<{ token?: string; expires_at: string } | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      try {
        const [membersRes, invitesRes] = await Promise.all([
          fetch(`/api/institutions/${institutionId}/members`),
          fetch(`/api/institutions/${institutionId}/invites`),
        ])

        if (membersRes.status === 401 || invitesRes.status === 401) {
          router.push(`/login?redirect=/institutions/${institutionId}/members`)
          return
        }

        if (membersRes.status === 403) {
          setError('Voce nao tem permissao para ver esta instituicao')
          setLoading(false)
          return
        }

        if (!membersRes.ok) {
          throw new Error('Falha ao carregar membros')
        }

        const membersData = await membersRes.json()
        setMembers(membersData)

        // Invites might 403 if user is not owner
        if (invitesRes.ok) {
          const invitesData = await invitesRes.json()
          setInvites(invitesData)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [institutionId, router])

  async function handleCreateInvite() {
    setInviting(true)
    setInviteError(null)
    setInviteSuccess(null)

    try {
      const response = await fetch(`/api/institutions/${institutionId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: 'exec_admin', // Fixed role for SoD
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao criar convite')
      }

      setInviteSuccess({
        token: data.invite_token,
        expires_at: data.expires_at,
      })

      // Refresh invites list
      const invitesRes = await fetch(`/api/institutions/${institutionId}/invites`)
      if (invitesRes.ok) {
        setInvites(await invitesRes.json())
      }
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Erro ao criar convite')
    } finally {
      setInviting(false)
    }
  }

  function closeInviteModal() {
    setShowInviteModal(false)
    setInviteEmail('')
    setInviteError(null)
    setInviteSuccess(null)
  }

  const inviteLink = inviteSuccess?.token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invite?token=${inviteSuccess.token}`
    : null

  if (loading) {
    return (
      <div className="max-w-4xl">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <Skeleton className="h-10 w-48" />
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="Erro"
        message={error}
        onRetry={() => window.location.reload()}
      />
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/institutions" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">
            ← Voltar para Instituicoes
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Membros e Convites</h1>
        </div>
        {invites !== null && (
          <Button onClick={() => setShowInviteModal(true)}>
            + Convidar Aprovador
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'members'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Membros ({members?.total || 0})
            </button>
            {invites !== null && (
              <button
                onClick={() => setActiveTab('invites')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'invites'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Convites Pendentes ({invites?.total || 0})
              </button>
            )}
          </nav>
        </div>

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="divide-y divide-slate-200">
            {members?.members.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="Nenhum membro"
                  description="Esta instituicao ainda nao tem membros."
                />
              </div>
            ) : (
              members?.members.map((member) => (
                <div key={member.user_id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{member.email}</p>
                    {member.display_name && (
                      <p className="text-sm text-slate-500">{member.display_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[member.role] || ROLE_COLORS.member}`}>
                      {ROLE_LABELS[member.role] || member.role}
                    </span>
                    <span className="text-sm text-slate-500">
                      Desde {new Date(member.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Invites Tab */}
        {activeTab === 'invites' && invites !== null && (
          <div className="divide-y divide-slate-200">
            {invites.invites.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="Nenhum convite pendente"
                  description="Convide um administrador executivo para aprovar operacoes."
                />
              </div>
            ) : (
              invites.invites.map((invite) => (
                <div key={invite.invite_id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{invite.invited_email}</p>
                    <p className="text-sm text-slate-500">
                      Expira em {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[invite.role] || ROLE_COLORS.member}`}>
                      {ROLE_LABELS[invite.role] || invite.role}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pendente
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Dialog
        open={showInviteModal}
        onClose={closeInviteModal}
        title="Convidar Administrador Executivo"
      >
        {inviteSuccess ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">Convite criado com sucesso!</p>
              <p className="text-green-700 text-sm mt-1">
                Expira em {new Date(inviteSuccess.expires_at).toLocaleString('pt-BR')}
              </p>
            </div>

            {inviteLink && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Link de Convite (modo dev)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 font-mono"
                  />
                  <CopyButton value={inviteLink} label="Copiar" />
                </div>
                <p className="text-xs text-slate-500">
                  Envie este link para o usuario aceitar o convite.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={closeInviteModal}>Fechar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-600 text-sm">
              Convide um administrador executivo (exec_admin) para aprovar operacoes destrutivas.
              Este papel e necessario para Separacao de Deveres (SoD).
            </p>

            {inviteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {inviteError}
              </div>
            )}

            <Input
              label="Email do Convidado"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="aprovador@exemplo.com"
              required
            />

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-sm text-slate-600">
                <strong>Papel:</strong> Administrador Executivo (exec_admin)
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Pode aprovar operacoes destrutivas (delete, rename, move)
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={closeInviteModal}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateInvite}
                loading={inviting}
                disabled={!inviteEmail}
              >
                Enviar Convite
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
