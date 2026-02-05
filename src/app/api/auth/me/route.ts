import { NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth'

interface MeResponse {
  user_id: string
  email: string
  display_name: string | null
  is_dev_user: boolean
}

export async function GET() {
  // Get auth headers from cookie
  const authHeaders = await getAuthHeaders()

  if (!authHeaders.Authorization) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }

  // Call Console API /auth/me endpoint
  const result = await fetchFromConsoleApi<MeResponse>('/auth/me', {
    method: 'GET',
    headers: authHeaders,
  })

  if (result.error) {
    return NextResponse.json(
      {
        error: result.error.message,
        code: result.error.code,
      },
      { status: 401 }
    )
  }

  return NextResponse.json(result.data)
}
