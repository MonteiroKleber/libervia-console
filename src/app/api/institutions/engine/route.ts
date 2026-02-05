import { NextRequest, NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const body = await request.json()

  const requireAuth = process.env.CONSOLE_REQUIRE_AUTH === 'true'
  const authHeaders = await getAuthHeaders()

  if (requireAuth && !authHeaders.Authorization) {
    return NextResponse.json(
      { message: 'Not authenticated. Please login first.' },
      { status: 401 }
    )
  }

  const result = await fetchFromConsoleApi('/onboarding', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ ...body, step: 'engine_config' }),
  })

  if (result.error) {
    return NextResponse.json(
      { message: result.error.message, code: result.error.code, request_id: result.error.request_id },
      { status: 400 }
    )
  }

  return NextResponse.json(result.data)
}
