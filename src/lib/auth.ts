/**
 * Authentication helpers for Console
 *
 * Manages JWT tokens via httpOnly cookies for security.
 * Token is NEVER exposed to client-side JavaScript.
 */

import { cookies } from 'next/headers'

const ACCESS_TOKEN_COOKIE_NAME = 'libervia_console_access_token'

export interface AuthContext {
  accessToken: string | null
  isAuthenticated: boolean
}

/**
 * Get auth context from cookies (server-side only)
 */
export async function getAuthContext(): Promise<AuthContext> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value || null

  return {
    accessToken,
    isAuthenticated: !!accessToken,
  }
}

/**
 * Get Authorization header for API calls (server-side only)
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { accessToken } = await getAuthContext()

  if (!accessToken) {
    return {}
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

/**
 * Build cookie options for setting access token
 */
function getTokenCookieOptions(maxAge?: number): Record<string, unknown> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAge ?? 60 * 60 * 24, // Default 24 hours (matches JWT expiration)
  }
}

/**
 * Set access token cookie (returns cookie spec for NextResponse)
 */
export function setAccessTokenCookie(token: string): {
  name: string
  value: string
  options: Record<string, unknown>
} {
  return {
    name: ACCESS_TOKEN_COOKIE_NAME,
    value: token,
    options: getTokenCookieOptions(),
  }
}

/**
 * Clear access token cookie (returns cookie spec for NextResponse)
 */
export function clearAccessTokenCookie(): {
  name: string
  value: string
  options: Record<string, unknown>
} {
  return {
    name: ACCESS_TOKEN_COOKIE_NAME,
    value: '',
    options: getTokenCookieOptions(0), // maxAge 0 = delete
  }
}

export const AUTH_COOKIE_NAMES = {
  ACCESS_TOKEN: ACCESS_TOKEN_COOKIE_NAME,
}
