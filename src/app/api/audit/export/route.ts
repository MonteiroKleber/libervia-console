import { NextRequest, NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { getInstitutionContext } from '@/lib/institution'
import { getAuthHeaders } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

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
  params.set('limit', '10000')

  // Forward filter params
  const eventType = searchParams.get('event_type')
  const caseId = searchParams.get('case_id')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (eventType) params.set('event_type', eventType)
  if (caseId) params.set('case_id', caseId)
  if (from) params.set('from', from)
  if (to) params.set('to', to)

  const result = await fetchFromConsoleApi<{ events: unknown[] }>(
    `/audit/timeline?${params}`,
    { headers: authHeaders }
  )

  if (result.error) {
    if (result.error.code === 'HTTP_401') {
      return NextResponse.json(
        { message: 'Not authenticated. Please login first.' },
        { status: 401 }
      )
    }

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

    return NextResponse.json(
      { message: result.error.message, code: result.error.code, request_id: result.error.request_id },
      { status: 400 }
    )
  }

  const events = result.data?.events || []
  const jsonl = events.map((e) => JSON.stringify(e)).join('\n')

  return new NextResponse(jsonl, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Content-Disposition': `attachment; filename="audit-export-${new Date().toISOString().split('T')[0]}.jsonl"`,
    },
  })
}
