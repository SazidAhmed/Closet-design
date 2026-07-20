// ---------------------------------------------------------------------------
// Closet Catalog API — fetches catalog categories from the backend.
// ---------------------------------------------------------------------------

import {
  CLOSET_CATALOG_CATEGORIES,
  type ClosetCatalogCategory,
  type ClosetDoorMode,
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

  const rawCategories = (await res.json()) as ClosetCatalogCategory[]
  console.log("Catalog Categories API Response:", rawCategories)

  return rawCategories.map((apiCat) => {
    const staticCat = CLOSET_CATALOG_CATEGORIES.find(
      (c) => c.doorMode === apiCat.doorMode && c.categoryCode === apiCat.categoryCode
    )

    return {
      ...apiCat,
      catalogs: apiCat.catalogs.map((apiCatalog) => {
        const staticCatalog = staticCat?.catalogs.find(c => c.catalogId === apiCatalog.catalogId || c.code === apiCatalog.code)
        
        return {
          ...apiCatalog,
          minW: apiCatalog.minW > 0 ? apiCatalog.minW : (staticCatalog ? staticCatalog.minW / 2.54 : 20),
          maxW: apiCatalog.maxW > 0 ? apiCatalog.maxW : (staticCatalog ? staticCatalog.maxW / 2.54 : 200),
          minD: apiCatalog.minD > 0 ? apiCatalog.minD : (staticCatalog ? staticCatalog.minD / 2.54 : 15),
          maxD: apiCatalog.maxD > 0 ? apiCatalog.maxD : (staticCatalog ? staticCatalog.maxD / 2.54 : 60),
          minH: apiCatalog.minH > 0 ? apiCatalog.minH : (staticCatalog ? staticCatalog.minH / 2.54 : 84),
          maxH: apiCatalog.maxH > 0 ? apiCatalog.maxH : (staticCatalog ? staticCatalog.maxH / 2.54 : 250),
        }
      })
    }
  })
}
