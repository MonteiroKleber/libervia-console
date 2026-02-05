import { NextRequest, NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth'

interface InviteAcceptRequest {
  token: string
}

interface InviteAcceptResponse {
  status: string  // "accepted" | "already_member"
  institution_id: string
  role: string
}

/**
 * POST /api/invites/accept - Accept an invite
 */
export async function POST(request: NextRequest) {
  const authHeaders = await getAuthHeaders()

  if (!authHeaders.Authorization) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body: InviteAcceptRequest = await request.json()

  if (!body.token) {
    return NextResponse.json(
      { error: 'token is required' },
      { status: 400 }
    )
  }

  const result = await fetchFromConsoleApi<InviteAcceptResponse>('/invites/accept', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(body),
  })

  if (result.error) {
    const status = result.error.code === 'HTTP_401' ? 401 :
                   result.error.code === 'HTTP_403' ? 403 :
                   result.error.code === 'HTTP_404' ? 404 :
                   result.error.code === 'HTTP_410' ? 410 : 400
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status }
    )
  }

  return NextResponse.json(result.data)
}
