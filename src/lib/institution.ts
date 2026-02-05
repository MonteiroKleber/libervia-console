/**
 * Institution context management via cookies
 */

import { cookies } from 'next/headers'

const INSTITUTION_COOKIE_NAME = 'libervia_institution_id'
const ENGINE_INSTITUTION_COOKIE_NAME = 'libervia_engine_institution_id'

export interface InstitutionContext {
  institutionId: string | null
  engineInstitutionId: string | null
}

/**
 * Get institution context from cookies (server-side)
 */
export async function getInstitutionContext(): Promise<InstitutionContext> {
  const cookieStore = await cookies()
  const institutionId = cookieStore.get(INSTITUTION_COOKIE_NAME)?.value || null
  const engineInstitutionId = cookieStore.get(ENGINE_INSTITUTION_COOKIE_NAME)?.value || null

  return { institutionId, engineInstitutionId }
}

/**
 * Set institution context cookies (server-side response)
 */
export function setInstitutionCookies(
  institutionId: string,
  engineInstitutionId: string
): { name: string; value: string; options: object }[] {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  }

  return [
    { name: INSTITUTION_COOKIE_NAME, value: institutionId, options: cookieOptions },
    { name: ENGINE_INSTITUTION_COOKIE_NAME, value: engineInstitutionId, options: cookieOptions },
  ]
}

/**
 * Clear institution cookies
 */
export function clearInstitutionCookies(): { name: string; value: string; options: object }[] {
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  }

  return [
    { name: INSTITUTION_COOKIE_NAME, value: '', options: clearOptions },
    { name: ENGINE_INSTITUTION_COOKIE_NAME, value: '', options: clearOptions },
  ]
}

export const COOKIE_NAMES = {
  INSTITUTION_ID: INSTITUTION_COOKIE_NAME,
  ENGINE_INSTITUTION_ID: ENGINE_INSTITUTION_COOKIE_NAME,
}
