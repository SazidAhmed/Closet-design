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
    minW: Number(raw.min_w ?? raw.minW ?? 0),
    maxW: Number(raw.max_w ?? raw.maxW ?? 0),
    minH: Number(raw.min_h ?? raw.minH ?? 0),
    maxH: Number(raw.max_h ?? raw.maxH ?? 0),
    minD: Number(raw.min_d ?? raw.minD ?? 0),
    maxD: Number(raw.max_d ?? raw.maxD ?? 0),
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
    return {
      ...apiCat,
      catalogs: apiCat.catalogs.map((apiCatalog) => {
        // Map cabinets from the API response (may be raw objects with snake_case keys)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawCabinets: any[] = (apiCatalog as any).cabinets ?? (apiCatalog as any).cabinet_list ?? (apiCatalog as any).items ?? (apiCatalog as any).closet_cabinets ?? []
        const cabinets: ClosetCabinetEntry[] = rawCabinets.map(mapCabinet)

        const catMinW = Number((apiCatalog as any).min_w ?? (apiCatalog as any).minW ?? 0);
        const catMaxW = Number((apiCatalog as any).max_w ?? (apiCatalog as any).maxW ?? 0);
        const catMinD = Number((apiCatalog as any).min_d ?? (apiCatalog as any).minD ?? 0);
        const catMaxD = Number((apiCatalog as any).max_d ?? (apiCatalog as any).maxD ?? 0);
        const catMinH = Number((apiCatalog as any).min_h ?? (apiCatalog as any).minH ?? 0);
        const catMaxH = Number((apiCatalog as any).max_h ?? (apiCatalog as any).maxH ?? 0);
        const catalogId = Number((apiCatalog as any).catalog_id ?? (apiCatalog as any).catalogId ?? (apiCatalog as any).id ?? apiCatalog.catalogId ?? 0);

        const cabMinW = cabinets.length > 0 ? Math.min(...cabinets.map(c => c.minW)) : 0;
        const cabMaxW = cabinets.length > 0 ? Math.max(...cabinets.map(c => c.maxW)) : 0;
        const cabMinD = cabinets.length > 0 ? Math.min(...cabinets.map(c => c.depth || c.minD)) : 0;
        const cabMaxD = cabinets.length > 0 ? Math.max(...cabinets.map(c => c.depth || c.maxD)) : 0;
        const cabMinH = cabinets.length > 0 ? Math.min(...cabinets.map(c => c.minH)) : 0;
        const cabMaxH = cabinets.length > 0 ? Math.max(...cabinets.map(c => c.maxH)) : 0;

        return {
          ...apiCatalog,
          catalogId: catalogId > 0 ? catalogId : (apiCatalog.catalogId ?? 0),
          minW: catMinW > 0 ? catMinW : (cabMinW > 0 ? cabMinW : 20),
          maxW: catMaxW > 0 ? catMaxW : (cabMaxW > 0 ? cabMaxW : 200),
          minD: catMinD > 0 ? catMinD : (cabMinD > 0 ? cabMinD : 15),
          maxD: catMaxD > 0 ? catMaxD : (cabMaxD > 0 ? cabMaxD : 60),
          minH: catMinH > 0 ? catMinH : (cabMinH > 0 ? cabMinH : 84),
          maxH: catMaxH > 0 ? catMaxH : (cabMaxH > 0 ? cabMaxH : 250),
          cabinets,
        }
      }),
      cornerCatalogIds: apiCat.cornerCatalogIds?.map(id => Number(id)) ?? [],
    }
  })
}
