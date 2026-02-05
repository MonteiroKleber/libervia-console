import { NextRequest, NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { getInstitutionContext } from '@/lib/institution'
import { getAuthHeaders } from '@/lib/auth'

interface JobEvent {
  event_id: string
  event_type: string
  timestamp: string | null
  actor_id: string | null
  actor_roles: string[] | null
  payload: Record<string, unknown> | null
}

interface JobEventsResponse {
  events: JobEvent[]
  total: number
  job_id: string
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

  const result = await fetchFromConsoleApi<JobEventsResponse>(
    `/jobs/${jobId}/events?institution_id=${institutionId}`,
    { headers: authHeaders }
  )

  if (result.error) {
    if (result.error.code === 'HTTP_401') {
      return NextResponse.json(
        { message: 'Not authenticated. Please login first.' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { message: result.error.message, code: result.error.code },
      { status: 400 }
    )
  }

  return NextResponse.json(result.data)
}
