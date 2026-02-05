import { NextRequest, NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { getInstitutionContext } from '@/lib/institution'
import { getAuthHeaders } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const body = await request.json()

  const requireAuth = process.env.CONSOLE_REQUIRE_AUTH === 'true'
  const authHeaders = await getAuthHeaders()

  if (requireAuth && !authHeaders.Authorization) {
    return NextResponse.json(
      {
        content: 'Você precisa entrar (login) para usar o chat.',
        error_code: 'NOT_AUTHENTICATED',
        error_message: 'Faça login em /login e tente novamente.',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  }

  // Get institution_id from cookies
  const { institutionId } = await getInstitutionContext()

  if (!institutionId) {
    return NextResponse.json(
      {
        content: 'Nenhuma instituição configurada. Complete o onboarding primeiro.',
        error_code: 'NO_INSTITUTION',
        error_message: 'Complete o onboarding em /onboarding',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  }

  const result = await fetchFromConsoleApi(`/chat?institution_id=${institutionId}`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(body),
  })

  if (result.error) {
    if (result.error.code === 'HTTP_401') {
      return NextResponse.json(
        {
          content: 'Você precisa entrar (login) para usar o chat.',
          error_code: 'NOT_AUTHENTICATED',
          error_message: 'Faça login em /login e tente novamente.',
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      )
    }

    if (result.error.code === 'HTTP_403') {
      return NextResponse.json(
        {
          content: 'Você não tem acesso a esta instituição. Faça onboarding ou troque de conta.',
          error_code: 'NO_MEMBERSHIP',
          error_message: result.error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        content: `Erro: ${result.error.message}`,
        error_code: result.error.code,
        error_message: result.error.message,
        request_id: result.error.request_id,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  }

  return NextResponse.json(result.data)
}
