import { NextRequest, NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth'
import { setInstitutionCookies } from '@/lib/institution'

interface InstitutionInfo {
  institution_id: string
  display_name: string
  engine_institution_id: string | null
  role: string
  created_at: string
}

interface InstitutionsListResponse {
  institutions: InstitutionInfo[]
  total: number
}

interface OnboardingResponse {
  status: string
  institution_id: string
  engine_institution_id?: string
  engine_slug?: string
  bundle_name?: string
  bundle_version?: string
  message: string
  runtime_config?: {
    engine_base_url: string
    institution_id: string
    agent_token: string
  }
  error_code?: string
  error_message?: string
}

/**
 * GET /api/institutions - List user's institutions
 */
export async function GET() {
  const authHeaders = await getAuthHeaders()

  if (!authHeaders.Authorization) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const result = await fetchFromConsoleApi<InstitutionsListResponse>('/institutions', {
    method: 'GET',
    headers: authHeaders,
  })

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

/**
 * POST /api/institutions - Create institution (onboarding)
 */
export async function POST(request: NextRequest) {
  const authHeaders = await getAuthHeaders()

  // Check auth if CONSOLE_REQUIRE_AUTH is enabled
  const requireAuth = process.env.CONSOLE_REQUIRE_AUTH !== 'false'
  if (requireAuth && !authHeaders.Authorization) {
    return NextResponse.json(
      { message: 'Not authenticated. Please login first.' },
      { status: 401 }
    )
  }

  const body = await request.json()

  // Call Console API onboarding endpoint with auth headers
  const result = await fetchFromConsoleApi<OnboardingResponse>('/onboarding', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      display_name: body.display_name || body.institutionName,
    }),
  })

  if (result.error) {
    return NextResponse.json(
      {
        message: result.error.message,
        code: result.error.code,
        request_id: result.error.request_id
      },
      { status: 400 }
    )
  }

  const data = result.data!

  // Create response
  const response = NextResponse.json(data)

  // Set institution cookies if onboarding was successful or if we have institution IDs
  if (data.institution_id && data.engine_institution_id) {
    const cookiesToSet = setInstitutionCookies(data.institution_id, data.engine_institution_id)
    for (const cookie of cookiesToSet) {
      response.cookies.set(cookie.name, cookie.value, cookie.options as any)
    }
  }

  return response
}
