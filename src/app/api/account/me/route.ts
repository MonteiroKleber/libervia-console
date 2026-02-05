import { NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth'

interface MeResponse {
  user_id: string
  email: string
  display_name: string | null
  is_dev_user: boolean
}

/**
 * GET /api/account/me - Get current user info
 */
export async function GET() {
  const authHeaders = await getAuthHeaders()

  if (!authHeaders.Authorization) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const result = await fetchFromConsoleApi<MeResponse>('/auth/me', {
    method: 'GET',
    headers: authHeaders,
  })

  if (result.error) {
    const status = result.error.code === 'HTTP_401' ? 401 : 400
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status }
    )
  }

  return NextResponse.json(result.data)
}
