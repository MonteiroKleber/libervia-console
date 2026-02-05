import { NextRequest, NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { setAccessTokenCookie } from '@/lib/auth'

interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  access_token: string
  token_type: string
  user_id: string
  email: string
}

export async function POST(request: NextRequest) {
  const body: LoginRequest = await request.json()

  // Validate input
  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  // Call Console API login endpoint
  const result = await fetchFromConsoleApi<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: body.email,
      password: body.password,
    }),
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

  const data = result.data!

  // Create response with user info (no token exposed to client)
  const response = NextResponse.json({
    user_id: data.user_id,
    email: data.email,
  })

  // Set httpOnly cookie with access token
  const cookie = setAccessTokenCookie(data.access_token)
  response.cookies.set(cookie.name, cookie.value, cookie.options as Parameters<typeof response.cookies.set>[2])

  return response
}
