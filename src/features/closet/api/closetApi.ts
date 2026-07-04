// ---------------------------------------------------------------------------
// Closet Catalog API — fetches catalog categories from the backend.
// ---------------------------------------------------------------------------

import type {
  ClosetCatalogCategory,
  ClosetDoorMode,
} from '../domain/closetCatalogs'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Fetch closet catalog categories for the given door mode from the backend.
 *
 * GET /api/closet/catalog-categories?doorMode={doorMode}
 *
 * Response shape mirrors ClosetCatalogCategory[] from closetCatalogs.ts:
 * [
 *   {
 *     doorMode, categoryCode, categoryName,
 *     catalogs: [{ catalogId, code, minW, maxW, minD, maxD, minH, maxH }],
 *     cornerCatalogIds?: number[]
 *   }
 * ]
 *
 * @throws if the network request fails or the server returns a non-OK status.
 */
export async function fetchClosetCatalogCategories(
  doorMode: ClosetDoorMode,
  opts?: { signal?: AbortSignal },
): Promise<ClosetCatalogCategory[]> {
  const url = `${API_BASE}/closet/catalog-categories?doorMode=${doorMode}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
    signal: opts?.signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `Catalog categories request failed (${res.status}): ${text || res.statusText}`,
    )
  }

  return (await res.json()) as ClosetCatalogCategory[]
}
