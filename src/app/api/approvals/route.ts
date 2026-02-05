import { NextRequest, NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { getInstitutionContext } from '@/lib/institution'
import { getAuthHeaders } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')

  const requireAuth = process.env.CONSOLE_REQUIRE_AUTH === 'true'
  const authHeaders = await getAuthHeaders()

  if (requireAuth && !authHeaders.Authorization) {
    return NextResponse.json(
      { message: 'Not authenticated. Please login first.' },
      { status: 401 }
    )
  }

  // Get institution_id from cookies
  const { institutionId } = await getInstitutionContext()

  if (!institutionId) {
    return NextResponse.json(
      {
        error: 'NO_INSTITUTION',
        message: 'Nenhuma instituição configurada. Complete o onboarding primeiro.',
        redirect: '/onboarding',
      },
      { status: 401 }
    )
  }

  const params = new URLSearchParams()
  params.set('institution_id', institutionId)
  if (status && status !== 'all') {
    params.set('status', status)
  }

  const result = await fetchFromConsoleApi<{ approvals: unknown[] }>(
    `/approvals?${params}`,
    { headers: authHeaders }
  )

  if (result.error) {
    if (result.error.code === 'HTTP_401') {
      return NextResponse.json(
        { message: 'Not authenticated. Please login first.' },
        { status: 401 }
      )
    }

    // Special handling for 403
    if (result.error.code === 'HTTP_403') {
      return NextResponse.json(
        {
          error: 'NO_MEMBERSHIP',
          message: 'Você não tem acesso a esta instituição. Faça onboarding ou troque de conta.',
          redirect: '/onboarding',
        },
        { status: 403 }
      )
    }

    const statusCode =
      result.error.code === 'HTTP_404' ? 404 :
      result.error.code === 'HTTP_422' ? 422 :
      400

    return NextResponse.json(
      { message: result.error.message, code: result.error.code, request_id: result.error.request_id },
      { status: statusCode }
    )
  }

  return NextResponse.json({ approvals: result.data?.approvals || [] })
}
