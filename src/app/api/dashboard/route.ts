import { NextRequest, NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { getInstitutionContext } from '@/lib/institution'
import { getAuthHeaders } from '@/lib/auth'

export async function GET(request: NextRequest) {
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
        message: 'Nenhuma instituição configurada. Complete o onboarding primeiro.',
        redirect: '/onboarding',
      },
      { status: 401 }
    )
  }

  const approvalsResult = await fetchFromConsoleApi<{ approvals: unknown[] }>(
    `/approvals?institution_id=${institutionId}&status=pending`,
    { headers: authHeaders }
  )

  const eventsResult = await fetchFromConsoleApi<{ events: unknown[] }>(
    `/audit/timeline?institution_id=${institutionId}&limit=10`,
    { headers: authHeaders }
  )

  if (approvalsResult.error?.code === 'HTTP_401' || eventsResult.error?.code === 'HTTP_401') {
    return NextResponse.json(
      { message: 'Not authenticated. Please login first.' },
      { status: 401 }
    )
  }

  if (approvalsResult.error?.code === 'HTTP_403' || eventsResult.error?.code === 'HTTP_403') {
    return NextResponse.json(
      {
        error: 'NO_MEMBERSHIP',
        message: 'Você não tem acesso a esta instituição. Faça onboarding ou troque de conta.',
        redirect: '/onboarding',
      },
      { status: 403 }
    )
  }

  const dashboard = {
    agent: {
      status: 'active' as const,
      last_heartbeat: new Date().toISOString(),
    },
    pending_approvals: approvalsResult.data?.approvals || [],
    recent_events: eventsResult.data?.events || [],
  }

  return NextResponse.json(dashboard)
}
