import { NextRequest, NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { getInstitutionContext } from '@/lib/institution'
import { getAuthHeaders } from '@/lib/auth'

interface JobDetail {
  job_id: string
  job_type: string
  state: string
  params: Record<string, unknown> | null
  result_summary: string | null
  result_json: Record<string, unknown> | null
  created_at: string | null
  executed_at: string | null
  approval_id: string | null
}

interface JobDetailResponse {
  job: JobDetail
  institution_id: string
}

interface RouteContext {
  params: Promise<{ jobId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { jobId } = await context.params

  const requireAuth = process.env.CONSOLE_REQUIRE_AUTH === 'true'
  const authHeaders = await getAuthHeaders()

  if (requireAuth && !authHeaders.Authorization) {
    return NextResponse.json(
      { message: 'Not authenticated. Please login first.' },
      { status: 401 }
    )
  }

  const { institutionId } = await getInstitutionContext()

  if (!institutionId) {
    return NextResponse.json(
      {
        error: 'NO_INSTITUTION',
        message: 'Nenhuma instituicao configurada. Complete o onboarding primeiro.',
        redirect: '/onboarding',
      },
      { status: 401 }
    )
  }

  const result = await fetchFromConsoleApi<JobDetailResponse>(
    `/jobs/${jobId}?institution_id=${institutionId}`,
    { headers: authHeaders }
  )

  if (result.error) {
    if (result.error.code === 'HTTP_401') {
      return NextResponse.json(
        { message: 'Not authenticated. Please login first.' },
        { status: 401 }
      )
    }

    if (result.error.code === 'HTTP_404') {
      return NextResponse.json(
        { message: 'Job not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: result.error.message, code: result.error.code },
      { status: 400 }
    )
  }

  return NextResponse.json(result.data)
}
