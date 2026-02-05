import { NextResponse } from 'next/server'
import { clearAccessTokenCookie } from '@/lib/auth'
import { clearInstitutionCookies } from '@/lib/institution'

export async function POST() {
  const response = NextResponse.json({ message: 'Logged out successfully' })

  // Clear access token cookie
  const tokenCookie = clearAccessTokenCookie()
  response.cookies.set(
    tokenCookie.name,
    tokenCookie.value,
    tokenCookie.options as Parameters<typeof response.cookies.set>[2]
  )

  // Also clear institution cookies on logout
  const institutionCookies = clearInstitutionCookies()
  for (const cookie of institutionCookies) {
    response.cookies.set(
      cookie.name,
      cookie.value,
      cookie.options as Parameters<typeof response.cookies.set>[2]
    )
  }

  return response
}
