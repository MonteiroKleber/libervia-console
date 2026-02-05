import { NextRequest, NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth'
import { getInstitutionContext } from '@/lib/institution'

interface DecideApprovalResponse {
  success: boolean
  approval_id: string
  decision: string
  message?: string
  error_code?: string
  error_message?: string
  action?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ approvalId: string; action: string }> }
) {
  const { approvalId, action } = await params
  const body = await request.json().catch(() => ({}))

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

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json(
      { message: 'Invalid action', code: 'INVALID_ACTION' },
      { status: 400 }
    )
  }

  const result = await fetchFromConsoleApi<DecideApprovalResponse>(
    `/approvals/${approvalId}/decide?institution_id=${institutionId}`,
    {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        decision: action,
        reason: body.reason,
      }),
    }
  )

  if (result.error) {
    // SoD / domain errors from Console API (FastAPI detail object)
    if (result.error.code === 'APPROVAL_SOD_VIOLATION' || result.error.code === 'SOD_VIOLATION') {
      return NextResponse.json(
        {
          success: false,
          message: result.error.message,
          code: result.error.code,
          action: result.error.action,
        },
        { status: 403 }
      )
    }

    const statusCode =
      result.error.code === 'HTTP_401' ? 401 :
      result.error.code === 'HTTP_403' ? 403 :
      result.error.code === 'HTTP_404' ? 404 :
      result.error.code === 'HTTP_422' ? 422 :
      400

    return NextResponse.json(
      { message: result.error.message, code: result.error.code, action: result.error.action, request_id: result.error.request_id },
      { status: statusCode }
    )
  }

  // Console API returned success: false (non-exception business error)
  if (result.data && !result.data.success) {
    return NextResponse.json(
      {
        success: false,
        message: result.data.error_message || 'Erro ao processar aprovação',
        code: result.data.error_code || 'UNKNOWN_ERROR',
        action: result.data.action,
      },
      { status: 400 }
    )
  }

  return NextResponse.json(result.data)
}
