import { NextRequest, NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth'

interface MemberInfo {
  user_id: string
  email: string
  display_name: string | null
  role: string
  created_at: string
}

interface MembersListResponse {
  members: MemberInfo[]
  total: number
}

interface RouteContext {
  params: Promise<{ institutionId: string }>
}

/**
 * GET /api/institutions/[institutionId]/members - List institution members
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { institutionId } = await context.params
  const authHeaders = await getAuthHeaders()

  if (!authHeaders.Authorization) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const result = await fetchFromConsoleApi<MembersListResponse>(
    `/institutions/${institutionId}/members`,
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
