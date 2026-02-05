import { NextRequest, NextResponse } from 'next/server'
import { setInstitutionCookies } from '@/lib/institution'

interface SelectRequest {
  institution_id: string
  engine_institution_id: string
}

/**
 * POST /api/institutions/select - Select an institution (sets cookies)
 */
export async function POST(request: NextRequest) {
  const body: SelectRequest = await request.json()

  if (!body.institution_id || !body.engine_institution_id) {
    return NextResponse.json(
      { error: 'institution_id and engine_institution_id are required' },
      { status: 400 }
    )
  }

  const response = NextResponse.json({
    status: 'selected',
    institution_id: body.institution_id,
    engine_institution_id: body.engine_institution_id,
  })

  // Set institution cookies
  const cookiesToSet = setInstitutionCookies(body.institution_id, body.engine_institution_id)
  for (const cookie of cookiesToSet) {
    response.cookies.set(cookie.name, cookie.value, cookie.options as Record<string, unknown>)
  }

  return response
}
