import { NextRequest, NextResponse } from 'next/server'

// Cookie name for access token (must match src/lib/auth.ts)
const ACCESS_TOKEN_COOKIE_NAME = 'libervia_console_access_token'

// Protected routes that require authentication when CONSOLE_REQUIRE_AUTH=true
const PROTECTED_PATHS = [
  '/dashboard',
  '/chat',
  '/approvals',
  '/audit',
  '/settings',
  '/onboarding',
]

// Auth pages (shouldn't redirect to login if already there)
const AUTH_PAGES = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Settings redirect (temporary - coming soon)
  if (pathname === '/settings' || pathname.startsWith('/settings/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.searchParams.set('notice', 'settings_coming_soon')
    return NextResponse.redirect(url)
  }

  // Check if auth enforcement is enabled (default: false for backwards compatibility)
  const requireAuth = process.env.CONSOLE_REQUIRE_AUTH === 'true'

  if (!requireAuth) {
    // Auth not required - allow all requests
    return NextResponse.next()
  }

  // Auth is required - check for protected paths
  const isProtectedPath = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )

  if (!isProtectedPath) {
    // Not a protected path - allow
    return NextResponse.next()
  }

  // Check for auth token
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value

  if (accessToken) {
    // Has token - allow access
    return NextResponse.next()
  }

  // No token - redirect to login
  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.searchParams.set('redirect', pathname)

  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Match all paths except static files and api routes
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg).*)',
  ],
}
