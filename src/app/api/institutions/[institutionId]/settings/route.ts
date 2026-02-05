import { NextRequest, NextResponse } from 'next/server'
import { fetchFromConsoleApi } from '@/lib/api'
import { getAuthHeaders } from '@/lib/auth'

interface SettingsResponse {
  managed_root_dir: string | null
  autonomy_enabled: boolean
  autonomy_plan_create_interval_seconds: number
  autonomy_max_plans_per_day: number
  autonomy_scope_path: string | null
}

interface RouteContext {
  params: Promise<{ institutionId: string }>
}

/**
 * GET /api/institutions/[institutionId]/settings - Get institution settings
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { institutionId } = await context.params
  const authHeaders = await getAuthHeaders()

  if (!authHeaders.Authorization) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const result = await fetchFromConsoleApi<SettingsResponse>(
    `/institutions/${institutionId}/settings`,
    {
      method: 'GET',
      headers: authHeaders,
    }
  )

  if (result.error) {
    const status = result.error.code === 'HTTP_401' ? 401 :
                   result.error.code === 'HTTP_403' ? 403 : 400
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status }
    )
  }

  return NextResponse.json(result.data)
}

/**
 * PUT /api/institutions/[institutionId]/settings - Update institution settings
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { institutionId } = await context.params
  const authHeaders = await getAuthHeaders()

  if (!authHeaders.Authorization) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()

  const result = await fetchFromConsoleApi<SettingsResponse>(
    `/institutions/${institutionId}/settings`,
    {
      method: 'PUT',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (result.error) {
    const status = result.error.code === 'HTTP_401' ? 401 :
                   result.error.code === 'HTTP_403' ? 403 : 400
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status }
    )
  }

  return NextResponse.json(result.data)
}
