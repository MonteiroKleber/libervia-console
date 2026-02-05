import { NextRequest, NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { setAccessTokenCookie } from '@/lib/auth'

interface RegisterRequest {
  email: string
  password: string
  display_name?: string
}

interface RegisterResponse {
  access_token: string
  token_type: string
  user_id: string
  email: string
}

export async function POST(request: NextRequest) {
  const body: RegisterRequest = await request.json()

  // Validate input
  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  // Call Console API register endpoint
  const result = await fetchFromConsoleApi<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: body.email,
      password: body.password,
      display_name: body.display_name,
    }),
  })

  if (result.error) {
    // Map specific error codes
    const status = result.error.code === 'HTTP_409' ? 409 : 400
    return NextResponse.json(
      {
        error: result.error.message,
        code: result.error.code,
      },
      { status }
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
