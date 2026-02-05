/**
 * Saved Views utility for persisting and sharing filter configurations.
 */

export interface SavedView {
  id: string
  name: string
  filters: Record<string, string>
  createdAt: string
}

const STORAGE_KEY = 'libervia-saved-views'

/**
 * Get all saved views from localStorage
 */
export function getSavedViews(namespace: string): SavedView[] {
  if (typeof window === 'undefined') return []
  try {
    const key = `${STORAGE_KEY}-${namespace}`
    const stored = localStorage.getItem(key)
    if (!stored) return []
    return JSON.parse(stored)
  } catch {
    return []
  }
}

/**
 * Save a new view
 */
export function saveView(
  namespace: string,
  name: string,
  filters: Record<string, string>
): SavedView {
  const views = getSavedViews(namespace)
  const newView: SavedView = {
    id: `view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    filters,
    createdAt: new Date().toISOString(),
  }
  views.push(newView)
  localStorage.setItem(`${STORAGE_KEY}-${namespace}`, JSON.stringify(views))
  return newView
}

/**
 * Delete a saved view
 */
export function deleteView(namespace: string, viewId: string): void {
  const views = getSavedViews(namespace)
  const filtered = views.filter((v) => v.id !== viewId)
  localStorage.setItem(`${STORAGE_KEY}-${namespace}`, JSON.stringify(filtered))
}

/**
 * Serialize filters to URL query string
 */
export function filtersToQueryString(filters: Record<string, string>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value)
    }
  }
  return params.toString()
}

/**
 * Parse URL query string to filters
 */
export function queryStringToFilters(queryString: string): Record<string, string> {
  const params = new URLSearchParams(queryString)
  const filters: Record<string, string> = {}
  params.forEach((value, key) => {
    filters[key] = value
  })
  return filters
}

/**
 * Generate a shareable URL with current filters
 */
export function getShareableUrl(
  baseUrl: string,
  filters: Record<string, string>
): string {
  const queryString = filtersToQueryString(filters)
  if (!queryString) return baseUrl
  return `${baseUrl}?${queryString}`
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
}
