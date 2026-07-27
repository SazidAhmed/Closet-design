import type { Accessory, Tower } from "./types/tower";
import { createTowerId } from "./types/tower";

// No longer converting to cm, internal units are now inches.
// The entry function directly assigns the inch values.

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export type ClosetDoorMode = "without_doors" | "with_doors";

export type ClosetCatalogCategoryCode =
  | "CAS"
  | "CDH"
  | "CLH"
  | "CRD"
  | "CSS"
  | "CCS"
  | "CCH"
  | "CCL";

export type ClosetCabinetEntry = {
  id: number;
  code: string;
  width: number;
  height: number;
  depth: number;
  /** Min width this cabinet covers (from API). */
  minW: number;
  /** Max width this cabinet covers (from API). */
  maxW: number;
  /** Min height this cabinet covers (from API). */
  minH: number;
  /** Max height this cabinet covers (from API). */
  maxH: number;
  /** Min depth this cabinet covers (from API). */
  minD: number;
  /** Max depth this cabinet covers (from API). */
  maxD: number;
  boxOptions: number[]; // [1, 2] or [2]
  numberOfShelves: number;
  numOfDrawers: number;
  numOfRollouts: number;
  basePrice: string;
};

export type ClosetCatalogEntry = {
  catalogId: number;
  code: string;
  minW: number;
  maxW: number;
  minD: number;
  maxD: number;
  minH: number;
  maxH: number;
  cabinets: ClosetCabinetEntry[];
};

export type ClosetCatalogCategory = {
  doorMode: ClosetDoorMode;
  categoryCode: ClosetCatalogCategoryCode;
  categoryName: string;
  catalogs: ClosetCatalogEntry[];
  cornerCatalogIds?: number[];
  category_id?: number; // added to match api
};

export type ClosetCatalogLimits = {
  minW: number;
  maxW: number;
  minD: number;
  maxD: number;
  minH: number;
  maxH: number;
};

function entry(
  catalogId: number,
  code: string,
  minWIn: number,
  maxWIn: number,
  minDIn: number,
  maxDIn: number,
  minHIn: number,
  maxHIn: number,
): ClosetCatalogEntry {
  return {
    catalogId,
    code,
    minW: minWIn,
    maxW: maxWIn,
    minD: minDIn,
    maxD: maxDIn,
    minH: minHIn,
    maxH: maxHIn,
    cabinets: [],
  };
}

// Keep the hardcoded array strictly as a fallback mechanism for when API dimensions are 0
const CLOSET_CATALOG_CATEGORIES: ClosetCatalogCategory[] = [
  {
    doorMode: "without_doors",
    categoryCode: "CAS",
    categoryName: "Shelves",
    cornerCatalogIds: [214, 215],
    catalogs: [
      entry(205, "CAS128415-459615", 12, 45, 15, 16, 84, 96),
      entry(204, "CAS128418-459618", 12, 45, 18, 20, 84, 96),
      entry(199, "CAS128421-459621", 12, 45, 21, 23, 84, 96),
    ],
  },
  {
    doorMode: "without_doors",
    categoryCode: "CDH",
    categoryName: "Double Hanging",
    cornerCatalogIds: [214, 215],
    catalogs: [
      entry(207, "CDH128415-459615", 12, 45, 15, 16, 84, 96),
      entry(206, "CDH128418-459618", 12, 45, 18, 20, 84, 96),
      entry(200, "CDH128421-459621", 12, 45, 21, 23, 84, 96),
    ],
  },
  {
    doorMode: "without_doors",
    categoryCode: "CLH",
    categoryName: "Long Hanging",
    cornerCatalogIds: [214, 215],
    catalogs: [
      entry(209, "CLH128415-459615", 12, 45, 15, 16, 84, 96),
      entry(208, "CLH128418-459618", 12, 45, 18, 20, 84, 96),
      entry(201, "CLH128421-459621", 12, 45, 21, 23, 84, 96),
    ],
  },
  {
    doorMode: "without_doors",
    categoryCode: "CRD",
    categoryName: "Drawers",
    catalogs: [
      entry(211, "CRD128415-429615", 12, 42, 15, 16, 84, 96),
      entry(210, "CRD128418-429618", 12, 42, 18, 20, 84, 96),
      entry(202, "CRD128421-429621", 12, 42, 21, 23, 84, 96),
    ],
  },
  {
    doorMode: "without_doors",
    categoryCode: "CSS",
    categoryName: "Shoe Shelves",
    catalogs: [
      entry(213, "CSS128415-459615", 12, 45, 15, 16, 84, 96),
      entry(212, "CSS128418-459618", 12, 45, 18, 20, 84, 96),
      entry(203, "CSS128421-459621", 12, 45, 21, 23, 84, 96),
    ],
  },
  {
    doorMode: "with_doors",
    categoryCode: "CAS",
    categoryName: "Shelves",
    catalogs: [entry(190, "CAS128423-429623", 12, 42, 23, 23, 84, 96)],
  },
  {
    doorMode: "with_doors",
    categoryCode: "CDH",
    categoryName: "Double Hanging",
    catalogs: [entry(192, "CDH128423-429623", 12, 42, 23, 23, 84, 96)],
  },
  {
    doorMode: "with_doors",
    categoryCode: "CLH",
    categoryName: "Long Hanging",
    catalogs: [entry(194, "CLH128423-429623", 12, 42, 23, 23, 84, 96)],
  },
  {
    doorMode: "with_doors",
    categoryCode: "CRD",
    categoryName: "Rollouts",
    catalogs: [entry(196, "CRD128423-429623", 12, 42, 23, 23, 84, 96)],
  },
  {
    doorMode: "with_doors",
    categoryCode: "CSS",
    categoryName: "Shoe Shelves",
    catalogs: [entry(197, "CSS128423-429623", 12, 42, 23, 23, 84, 96)],
  },
  {
    doorMode: "with_doors",
    categoryCode: "CCS",
    categoryName: "Blind Corner Shelves",
    catalogs: [entry(191, "CCS4084-4696", 40, 46, 40, 46, 84, 96)],
  },
  {
    doorMode: "with_doors",
    categoryCode: "CCH",
    categoryName: "Blind Corner Double Hanging",
    catalogs: [entry(193, "CCH4084-4696", 40, 46, 40, 46, 84, 96)],
  },
  {
    doorMode: "with_doors",
    categoryCode: "CCL",
    categoryName: "Blind Corner Long Hanging",
    catalogs: [entry(195, "CCL4084-4696", 40, 46, 40, 46, 84, 96)],
  },
];

// This holds the currently active categories (from API or static fallback).
// It defaults to the static list so the UI can render before the API loads,
// but gets updated dynamically when loadCatalogCategories is called.
let activeCategories: ClosetCatalogCategory[] = [...CLOSET_CATALOG_CATEGORIES];

export function setActiveCategories(categories: ClosetCatalogCategory[]): void {
  if (Array.isArray(categories) && categories.length > 0) {
    activeCategories = [...categories];
  }
}

export function getCategoriesForDoorMode(
  doorMode: ClosetDoorMode,
): ClosetCatalogCategory[] {
  return activeCategories.filter(
    (category) => category.doorMode === doorMode,
  );
}

export function getCategoryByCode(
  doorMode: ClosetDoorMode,
  categoryCode: ClosetCatalogCategoryCode,
): ClosetCatalogCategory {
  const category = activeCategories.find(
    (entry) =>
      (entry.doorMode === doorMode || (entry as any).door_mode === doorMode) &&
      (entry.categoryCode === categoryCode || (entry as any).category_code === categoryCode || (entry as any).code === categoryCode),
  );
  if (!category) {
    throw new Error(`Unknown closet category ${doorMode}:${categoryCode}`);
  }
  return category;
}

export function getCategoryLimits(
  doorMode: ClosetDoorMode,
  categoryCode: ClosetCatalogCategoryCode,
): ClosetCatalogLimits {
  const category = getCategoryByCode(doorMode, categoryCode);
  return {
    minW: Math.min(...category.catalogs.map((catalog) => catalog.minW)),
    maxW: Math.max(...category.catalogs.map((catalog) => catalog.maxW)),
    minD: Math.min(...category.catalogs.map((catalog) => catalog.minD)),
    maxD: Math.max(...category.catalogs.map((catalog) => catalog.maxD)),
    minH: Math.min(...category.catalogs.map((catalog) => catalog.minH)),
    maxH: Math.max(...category.catalogs.map((catalog) => catalog.maxH)),
  };
}

export function resolveCatalogForTower(
  doorMode: ClosetDoorMode,
  categoryCode: ClosetCatalogCategoryCode,
  depth: number,
): ClosetCatalogEntry {
  const category = getCategoryByCode(doorMode, categoryCode);

  if (doorMode === "with_doors") {
    return category.catalogs[0]!;
  }

  const matchedCatalog = category.catalogs.find(
    (catalog) => depth >= catalog.minD && depth <= catalog.maxD,
  );
  if (matchedCatalog) return matchedCatalog;

  return (
    category.catalogs.find((catalog) => depth <= catalog.maxD) ??
    category.catalogs[category.catalogs.length - 1]!
  );
}

export function clampTowerWidth(tower: Tower, width: number): number {
  if (!tower.doorMode || !tower.categoryCode) return width;
  const limits = getCategoryLimits(tower.doorMode, tower.categoryCode);
  return clamp(width, limits.minW, limits.maxW);
}

export function clampTowerDepth(tower: Tower, depth: number): number {
  if (!tower.doorMode || !tower.categoryCode) return depth;
  const limits = getCategoryLimits(tower.doorMode, tower.categoryCode);
  return clamp(depth, limits.minD, limits.maxD);
}

export function clampTowerHeight(tower: Tower, height: number): number {
  if (!tower.doorMode || !tower.categoryCode) return height;
  const limits = getCategoryLimits(tower.doorMode, tower.categoryCode);
  return clamp(height, limits.minH, limits.maxH);
}

export function refreshTowerCatalog(tower: Tower): { switched: boolean; catalog: ClosetCatalogEntry } | null {
  if (!tower.doorMode || !tower.categoryCode) return null;
  const catalog = resolveCatalogForTower(
    tower.doorMode,
    tower.categoryCode,
    tower.depth,
  );
  const switched = tower.catalogId !== catalog.catalogId;
  tower.catalogId = catalog.catalogId;
  tower.catalogCode = catalog.code;
  return { switched, catalog };
}

/**
 * Select the best-matching cabinet from a cabinet array based on the
 * user-entered width and height using range matching.
 *
 * Selection logic:
 *  1. Filter cabinets by boxCount preference.
 *  2. Find cabinets whose minW ≤ width ≤ maxW AND minH ≤ height ≤ maxH.
 *  3. If multiple match, prefer the one with the tightest width range.
 *  4. If none match exactly, pick the cabinet whose range boundary is
 *     closest (preferring the next wider/taller cabinet when in a gap).
 *
 * Kept isolated so more selection rules can be layered in later.
 */
export function selectCabinet(
  cabinets: ClosetCabinetEntry[],
  width: number,
  height: number,
  boxCount: 1 | 2 = 2,
): ClosetCabinetEntry | null {
  console.log("selectCabinet called with", { cabinetsCount: cabinets?.length, width, height, boxCount });
  if (!cabinets || cabinets.length === 0) return null;

  // Normalize cabinet bounds so minW, maxW, minH, maxH are guaranteed valid numbers
  const normalizedCabinets: ClosetCabinetEntry[] = cabinets.map((raw: any) => {
    const minW = Number(raw.minW ?? raw.min_w ?? raw.width ?? 0);
    const maxW = Number(raw.maxW ?? raw.max_w ?? raw.width ?? 0);
    const minH = Number(raw.minH ?? raw.min_h ?? raw.height ?? 0);
    const maxH = Number(raw.maxH ?? raw.max_h ?? raw.height ?? 0);
    const minD = Number(raw.minD ?? raw.min_d ?? raw.depth ?? 0);
    const maxD = Number(raw.maxD ?? raw.max_d ?? raw.depth ?? 0);
    return {
      ...raw,
      id: Number(raw.id ?? 0),
      code: String(raw.code ?? raw.cabinet_code ?? ''),
      width: Number(raw.width ?? 0),
      height: Number(raw.height ?? 0),
      depth: Number(raw.depth ?? 0),
      minW,
      maxW,
      minH,
      maxH,
      minD,
      maxD,
      boxOptions: Array.isArray(raw.boxOptions) ? raw.boxOptions : [1, 2],
    };
  });

  // Step 1: filter by box-count preference
  let candidates = normalizedCabinets.filter((c) =>
    c.boxOptions.includes(boxCount),
  );
  if (candidates.length === 0) {
    candidates = normalizedCabinets;
  }
  
  console.log("selectCabinet candidates", candidates.map(c => ({ code: c.code, minW: c.minW, maxW: c.maxW, minH: c.minH, maxH: c.maxH })));

  // Step 2: find cabinets whose range covers the entered width AND height
  const inRange = candidates.filter(
    (c) =>
      width >= c.minW &&
      width <= c.maxW &&
      height >= c.minH &&
      height <= c.maxH,
  );

  if (inRange.length === 1) return inRange[0];

  if (inRange.length > 1) {
    // Step 3: multiple matches — prefer tightest width range
    return inRange.reduce((best, c) => {
      const bestSpan = best.maxW - best.minW;
      const cSpan = c.maxW - c.minW;
      return cSpan < bestSpan ? c : best;
    });
  }

  // Step 4: no exact range match — find the nearest cabinet.
  // Prefer the next wider/taller cabinet when the value falls in a gap.
  let nearest: ClosetCabinetEntry | null = null;
  let nearestDist = Infinity;

  for (const c of candidates) {
    // Distance from the entered width to this cabinet's width range
    let wDist = 0;
    if (width < c.minW) wDist = c.minW - width;
    else if (width > c.maxW) wDist = width - c.maxW;

    // Distance from the entered height to this cabinet's height range
    let hDist = 0;
    if (height < c.minH) hDist = c.minH - height;
    else if (height > c.maxH) hDist = height - c.maxH;

    const dist = wDist + hDist;

    if (
      dist < nearestDist ||
      // Tie-break: prefer the cabinet whose range starts above the entered
      // value (the "next" cabinet when in a gap between two ranges)
      (dist === nearestDist &&
        nearest &&
        c.minW >= width &&
        nearest.minW < width)
    ) {
      nearest = c;
      nearestDist = dist;
    }
  }

  return nearest;
}

/**
 * Resolve the best-matching cabinet record for a tower's dimensions
 * and box-count preference by delegating to the range-based selectCabinet.
 */
export function resolveCabinetForTower(
  doorMode: ClosetDoorMode,
  categoryCode: ClosetCatalogCategoryCode,
  width: number,
  height: number,
  depth: number,
  boxCount: 1 | 2 = 2,
): ClosetCabinetEntry | null {
  const catalog = resolveCatalogForTower(doorMode, categoryCode, depth);
  console.log("resolveCabinetForTower catalog found:", catalog?.code, "cabinets count:", catalog?.cabinets?.length);
  if (!catalog.cabinets || catalog.cabinets.length === 0) return null;
  return selectCabinet(catalog.cabinets, width, height, boxCount);
}

/**
 * Check whether 1-box configuration is available for a without-doors tower
 * at the given width and depth.
 *
 * Rules:
 * - with_doors → always false (no box concept)
 * - 15D and 18D closets → 1-box available up to 40" width
 * - 21D+ closets → 1-box available up to 37" width
 */
export function isOneBoxAvailable(
  doorMode: ClosetDoorMode,
  _categoryCode: ClosetCatalogCategoryCode,
  width: number,
  depth: number,
): boolean {
  if (doorMode === 'with_doors') return false;
  const maxW = depth >= 21 ? 37 : 40;
  return width <= maxW;
}

export function refreshTowerCabinet(
  tower: Tower,
  options?: { catalogSwitched?: boolean },
): void {
  if (!tower.doorMode || !tower.categoryCode) return;

  // Auto-force 2-box if 1-box is no longer available at current dimensions
  if (
    tower.boxCount === 1 &&
    !isOneBoxAvailable(tower.doorMode, tower.categoryCode, tower.width, tower.depth)
  ) {
    tower.boxCount = 2;
  }

  const catalog = resolveCatalogForTower(
    tower.doorMode,
    tower.categoryCode,
    tower.depth,
  );

  if (options?.catalogSwitched && catalog.cabinets && catalog.cabinets.length > 0) {
    const firstCabinet = catalog.cabinets[0]!;
    tower.cabinetId = Number(firstCabinet.id ?? (firstCabinet as any).cabinet_id ?? 0);
    tower.cabinetCode = String(firstCabinet.code ?? (firstCabinet as any).cabinet_code ?? '');
    return;
  }

  const cabinet = resolveCabinetForTower(
    tower.doorMode,
    tower.categoryCode,
    tower.width,
    tower.height,
    tower.depth,
    tower.boxCount ?? 2,
  );
  tower.cabinetId = cabinet?.id;
  tower.cabinetCode = cabinet?.code;
}

function accessoriesForCategory(
  categoryCode: ClosetCatalogCategoryCode,
): Accessory[] {
  switch (categoryCode) {
    case "CDH":
    case "CCH":
      return [
        { type: "rod", position: "high", count: 1 },
        { type: "rod", position: "low", count: 1 },
      ];
    case "CLH":
    case "CCL":
      return [{ type: "rod", position: "high", count: 1 }];
    case "CRD":
      return [{ type: "drawer", count: 4, drawerHeight: 8 }];
    case "CSS":
      return [{ type: "shoe_shelf", count: 5 }];
    case "CAS":
    case "CCS":
      return [{ type: "shelf_set", count: 5 }];
  }
}

export function createTowerFromCategory(
  doorMode: ClosetDoorMode,
  categoryCode: ClosetCatalogCategoryCode,
  index: number,
): Tower {
  const category = getCategoryByCode(doorMode, categoryCode);
  const limits = getCategoryLimits(doorMode, categoryCode);
  const catalog = resolveCatalogForTower(doorMode, categoryCode, limits.minD);

  const boxCount: 1 | 2 = 2; // default to 2-box
  const cabinet = resolveCabinetForTower(
    doorMode,
    categoryCode,
    limits.minW,
    limits.minH,
    limits.minD,
    boxCount,
  );

  return {
    id: createTowerId(),
    label: `${category.categoryName} ${index}`,
    width: cabinet ? cabinet.width : limits.minW,
    depth: cabinet ? cabinet.depth : limits.minD,
    height: cabinet ? cabinet.height : limits.minH,
    doorMode,
    categoryCode,
    categoryName: category.categoryName,
    catalogId: catalog.catalogId,
    catalogCode: catalog.code,
    isCorner: categoryCode === "CCS" || categoryCode === "CCH" || categoryCode === "CCL",
    boxCount,
    cabinetId: cabinet?.id,
    cabinetCode: cabinet?.code,
    accessories: accessoriesForCategory(categoryCode),
  };
}

export async function loadCatalogCategories(
  doorMode: ClosetDoorMode,
  opts?: { signal?: AbortSignal },
): Promise<ClosetCatalogCategory[]> {
  try {
    const ClosetService = (await import('../../../services/ClosetService')).default;
    const apiCategories = await ClosetService.getCatalogCategories(doorMode);

    if (Array.isArray(apiCategories) && apiCategories.length > 0) {
      console.log(`[API Response] Catalog Categories for door mode "${doorMode}":`, apiCategories);
      console.log(`[closetCatalogs] Successfully fetched ${apiCategories.length} categories for ${doorMode}`);
      // Map API data to the hardcoded list to retain limits
      const mapped = apiCategories.map(apiCat => {
        const catDoorMode = (apiCat.doorMode ?? (apiCat as any).door_mode ?? doorMode) as ClosetDoorMode;
        const catCode = (apiCat.categoryCode ?? (apiCat as any).category_code ?? (apiCat as any).code ?? '') as ClosetCatalogCategoryCode;
        const catName = (apiCat.categoryName ?? (apiCat as any).category_name ?? (apiCat as any).name ?? catCode);

        const staticCat = CLOSET_CATALOG_CATEGORIES.find(c => c.categoryCode === catCode && c.doorMode === catDoorMode);
        
        const parseBoxOptions = (options: string | null | undefined): number[] => {
          if (!options) return [2]
          const lower = options.toLowerCase()
          if (lower.includes('single box')) return [1, 2]
          return [2]
        }

        const rawCatalogs: any[] = apiCat.catalogs ?? (apiCat as any).catalog_list ?? [];

        return {
          ...apiCat,
          doorMode: catDoorMode,
          categoryCode: catCode,
          categoryName: catName,
          catalogs: rawCatalogs.map(catalog => {
            const staticCatalog = staticCat?.catalogs.find(c => c.code === catalog.code);
            const rawCabinetList: any[] = catalog.cabinets ?? (catalog as any).cabinet_list ?? (catalog as any).items ?? (catalog as any).closet_cabinets ?? [];
            const mappedCabinets = rawCabinetList.map((raw: any) => ({
              ...raw,
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
            }));
            
            const catMinW = Number((catalog as any).min_w ?? (catalog as any).minW ?? 0);
            const catMaxW = Number((catalog as any).max_w ?? (catalog as any).maxW ?? 0);
            const catMinD = Number((catalog as any).min_d ?? (catalog as any).minD ?? 0);
            const catMaxD = Number((catalog as any).max_d ?? (catalog as any).maxD ?? 0);
            const catMinH = Number((catalog as any).min_h ?? (catalog as any).minH ?? 0);
            const catMaxH = Number((catalog as any).max_h ?? (catalog as any).maxH ?? 0);
            const catalogId = Number((catalog as any).catalog_id ?? (catalog as any).catalogId ?? (catalog as any).id ?? catalog.catalogId ?? 0);

            const cabMinW = mappedCabinets.length > 0 ? Math.min(...mappedCabinets.map(c => c.minW)) : 0;
            const cabMaxW = mappedCabinets.length > 0 ? Math.max(...mappedCabinets.map(c => c.maxW)) : 0;
            const cabMinD = mappedCabinets.length > 0 ? Math.min(...mappedCabinets.map(c => c.depth || c.minD)) : 0;
            const cabMaxD = mappedCabinets.length > 0 ? Math.max(...mappedCabinets.map(c => c.depth || c.maxD)) : 0;
            const cabMinH = mappedCabinets.length > 0 ? Math.min(...mappedCabinets.map(c => c.minH)) : 0;
            const cabMaxH = mappedCabinets.length > 0 ? Math.max(...mappedCabinets.map(c => c.maxH)) : 0;

            console.log(`[closetCatalogs] Mapped ${mappedCabinets.length} cabinets for catalog ${catalog.code || catalogId}`);
            
            return {
              ...catalog,
              catalogId: catalogId > 0 ? catalogId : (catalog.catalogId ?? 0),
              minW: catMinW > 0 ? catMinW : (cabMinW > 0 ? cabMinW : (staticCatalog ? staticCatalog.minW : 0)),
              maxW: catMaxW > 0 ? catMaxW : (cabMaxW > 0 ? cabMaxW : (staticCatalog ? staticCatalog.maxW : 0)),
              minD: catMinD > 0 ? catMinD : (cabMinD > 0 ? cabMinD : (staticCatalog ? staticCatalog.minD : 0)),
              maxD: catMaxD > 0 ? catMaxD : (cabMaxD > 0 ? cabMaxD : (staticCatalog ? staticCatalog.maxD : 0)),
              minH: catMinH > 0 ? catMinH : (cabMinH > 0 ? cabMinH : (staticCatalog ? staticCatalog.minH : 0)),
              maxH: catMaxH > 0 ? catMaxH : (cabMaxH > 0 ? cabMaxH : (staticCatalog ? staticCatalog.maxH : 0)),
              cabinets: mappedCabinets,
            };
          })
        };
      });

      // Update the active categories for this door mode
      activeCategories = [
        ...activeCategories.filter(c => c.doorMode !== doorMode),
        ...mapped
      ];

      return mapped;
    }

    console.warn(
      `[closetCatalogs] API returned empty catalog list for ${doorMode}; falling back to static data.`,
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw err; // Re-throw abort signals so callers can handle them.
    }
    console.error(`[closetCatalogs] Failed to fetch catalog categories for ${doorMode}:`, err);
  }

  // Static fallback — always available, no network required.
  return CLOSET_CATALOG_CATEGORIES.filter((c) => c.doorMode === doorMode);
}
