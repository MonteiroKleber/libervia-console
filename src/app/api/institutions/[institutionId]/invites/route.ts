import { NextRequest, NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth'

interface InviteInfo {
  invite_id: string
  invited_email: string
  role: string
  status: string
  created_at: string
  expires_at: string
}

interface InvitesListResponse {
  invites: InviteInfo[]
  total: number
}

interface InviteCreateRequest {
  email: string
  role: string
}

interface InviteCreateResponse {
  invite_id: string
  expires_at: string
  invite_token?: string  // Only returned in dev mode
}

interface RouteContext {
  params: Promise<{ institutionId: string }>
}

/**
 * GET /api/institutions/[institutionId]/invites - List institution invites (owner only)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { institutionId } = await context.params
  const authHeaders = await getAuthHeaders()

  if (!authHeaders.Authorization) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const result = await fetchFromConsoleApi<InvitesListResponse>(
    `/institutions/${institutionId}/invites`,
    {
      method: 'GET',
      headers: authHeaders,
    }
  )

  if (result.error) {
    const status = result.error.code === 'HTTP_401' ? 401 :
                   result.error.code === 'HTTP_403' ? 403 : 400
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status }
    )
  }

  return NextResponse.json(result.data)
}

/**
 * POST /api/institutions/[institutionId]/invites - Create invite (owner only)
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { institutionId } = await context.params
  const authHeaders = await getAuthHeaders()

  if (!authHeaders.Authorization) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body: InviteCreateRequest = await request.json()

  if (!body.email || !body.role) {
    return NextResponse.json(
      { error: 'email and role are required' },
      { status: 400 }
    )
  }

  const result = await fetchFromConsoleApi<InviteCreateResponse>(
    `/institutions/${institutionId}/invites`,
    {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(body),
    }
  )

  if (result.error) {
    const status = result.error.code === 'HTTP_401' ? 401 :
                   result.error.code === 'HTTP_403' ? 403 :
                   result.error.code === 'HTTP_409' ? 409 : 400
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status }
    )
  }

  return NextResponse.json(result.data)
}
