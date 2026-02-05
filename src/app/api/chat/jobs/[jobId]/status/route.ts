import { NextRequest, NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { getInstitutionContext } from '@/lib/institution'
import { getAuthHeaders } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

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
      { error: 'NO_INSTITUTION', message: 'No institution configured' },
      { status: 400 }
    )
  }

  const result = await fetchFromConsoleApi(
    `/chat/jobs/${jobId}/status?institution_id=${institutionId}`,
    { method: 'GET', headers: authHeaders }
  )

  if (result.error) {
    if (result.error.code === 'HTTP_401') {
      return NextResponse.json(
        { error: 'NOT_AUTHENTICATED', message: 'Not authenticated. Please login first.' },
        { status: 401 }
      )
    }

    if (result.error.code === 'HTTP_404') {
      return NextResponse.json(
        { status: 'not_found', job_id: jobId },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: result.error.code, message: result.error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(result.data)
}
