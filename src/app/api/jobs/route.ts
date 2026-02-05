import { NextRequest, NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { getInstitutionContext } from '@/lib/institution'
import { getAuthHeaders } from '@/lib/auth'

interface JobListItem {
  job_id: string
  job_type: string
  state: string
  occurred_at: string | null
  actor_id: string | null
  actor_roles: string[] | null
}

interface JobsListResponse {
  jobs: JobListItem[]
  total: number
  institution_id: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const jobType = searchParams.get('job_type')
  const state = searchParams.get('state')
  const limit = searchParams.get('limit') || '50'
  const offset = searchParams.get('offset') || '0'

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

  const params = new URLSearchParams()
  params.set('institution_id', institutionId)
  params.set('limit', limit)
  params.set('offset', offset)
  if (jobType) params.set('job_type', jobType)
  if (state) params.set('state', state)

  const result = await fetchFromConsoleApi<JobsListResponse>(
    `/jobs?${params}`,
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
          message: 'Voce nao tem acesso a esta instituicao.',
          redirect: '/onboarding',
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { message: result.error.message, code: result.error.code },
      { status: 400 }
    )
  }

  return NextResponse.json(result.data)
}
