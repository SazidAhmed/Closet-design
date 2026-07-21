// ---------------------------------------------------------------------------
// Closet Catalog API — fetches catalog categories from the backend.
// ---------------------------------------------------------------------------

import {
  CLOSET_CATALOG_CATEGORIES,
  type ClosetCabinetEntry,
  type ClosetCatalogCategory,
  type ClosetDoorMode,
} from '../domain/closetCatalogs'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Parse the options string from a cabinet record into a boxOptions array.
 * e.g. "2 Boxes (Standard), Single Box" → [1, 2]
 *      "2 Boxes (Standard)"             → [2]
 */
function parseBoxOptions(options: string | null | undefined): number[] {
  if (!options) return [2]
  const lower = options.toLowerCase()
  if (lower.includes('single box')) return [1, 2]
  return [2]
}

/**
 * Map a raw cabinet object from the API into a ClosetCabinetEntry.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCabinet(raw: any): ClosetCabinetEntry {
  return {
    id: Number(raw.id ?? 0),
    code: String(raw.code ?? ''),
    width: Number(raw.width ?? 0),
    height: Number(raw.height ?? 0),
    depth: Number(raw.depth ?? 0),
    boxOptions: Array.isArray(raw.boxOptions)
      ? raw.boxOptions
      : parseBoxOptions(raw.options),
    numberOfShelves: Number(raw.number_of_shelves ?? raw.numberOfShelves ?? 0),
    numOfDrawers: Number(raw.num_of_drawers ?? raw.numOfDrawers ?? 0),
    numOfRollouts: Number(raw.num_of_rollouts ?? raw.numOfRollouts ?? 0),
    basePrice: String(raw.base_price ?? raw.basePrice ?? '0'),
  }
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
 *     catalogs: [{ catalogId, code, minW, maxW, minD, maxD, minH, maxH, cabinets: [] }],
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
        
        // Map cabinets from the API response (may be raw objects with snake_case keys)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawCabinets: any[] = (apiCatalog as any).cabinets ?? []
        const cabinets: ClosetCabinetEntry[] = rawCabinets.map(mapCabinet)

        return {
          ...apiCatalog,
          minW: apiCatalog.minW > 0 ? apiCatalog.minW : (staticCatalog ? staticCatalog.minW / 2.54 : 20),
          maxW: apiCatalog.maxW > 0 ? apiCatalog.maxW : (staticCatalog ? staticCatalog.maxW / 2.54 : 200),
          minD: apiCatalog.minD > 0 ? apiCatalog.minD : (staticCatalog ? staticCatalog.minD / 2.54 : 15),
          maxD: apiCatalog.maxD > 0 ? apiCatalog.maxD : (staticCatalog ? staticCatalog.maxD / 2.54 : 60),
          minH: apiCatalog.minH > 0 ? apiCatalog.minH : (staticCatalog ? staticCatalog.minH / 2.54 : 84),
          maxH: apiCatalog.maxH > 0 ? apiCatalog.maxH : (staticCatalog ? staticCatalog.maxH / 2.54 : 250),
          cabinets,
        }
      })
    }
  })
}
