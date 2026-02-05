/**
 * API client utilities for Console API
 */

const CONSOLE_API_BASE_URL = process.env.CONSOLE_API_BASE_URL || 'http://localhost:3001'

type FastApiErrorDetail =
  | string
  | Array<{ msg?: string }>
  | {
      code?: string
      error_code?: string
      message?: string
      detail?: string
      action?: string
    }

export interface ApiResponse<T> {
  data?: T
  error?: {
    code: string
    message: string
    request_id?: string
    action?: string
  }
}

export async function fetchFromConsoleApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${CONSOLE_API_BASE_URL}${path}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const requestId = response.headers.get('x-request-id') || undefined

    if (!response.ok) {
      let errorData: { detail?: FastApiErrorDetail } = {}
      try {
        errorData = await response.json()
      } catch {
        // ignore parse errors
      }

      const detail = errorData.detail

      // FastAPI can return detail as string, list of validation errors, or an object.
      if (typeof detail === 'object' && detail !== null && !Array.isArray(detail)) {
        const code = detail.code || detail.error_code || `HTTP_${response.status}`
        const message = detail.message || detail.detail || `HTTP ${response.status}`
        const action = detail.action

        return {
          error: {
            code,
            message,
            action,
            request_id: requestId,
          },
        }
      }

      const message = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((e) => e.msg).filter(Boolean).join(', ') || `HTTP ${response.status}`
          : `HTTP ${response.status}`

      return {
        error: {
          code: `HTTP_${response.status}`,
          message,
          request_id: requestId,
        },
      }
    }

    const data = await response.json()
    return { data }
  } catch (err) {
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Network error',
      },
    }
  }
}
