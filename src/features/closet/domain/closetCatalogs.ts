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
  cornerLeftCatalogs?: ClosetCatalogEntry[];
  cornerRightCatalogs?: ClosetCatalogEntry[];
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

// This holds the currently active categories (from API).
let activeCategories: ClosetCatalogCategory[] = [];

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
    // Return a safe dummy category so the UI does not crash while loading
    return {
      doorMode,
      categoryCode,
      categoryName: "Loading...",
      catalogs: [
        {
          catalogId: 0,
          code: "LOADING",
          minW: 12, maxW: 120,
          minD: 12, maxD: 30,
          minH: 84, maxH: 108,
          cabinets: []
        }
      ]
    };
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
  isCorner?: boolean,
  cornerPosition?: CornerPosition | 'left' | 'right',
): ClosetCatalogEntry {
  const category = getCategoryByCode(doorMode, categoryCode);

  const cornerPos = cornerPosition ?? (isCorner ? 'left' : 'none');
  const isCornerActive = isCorner || (cornerPos === 'left' || cornerPos === 'right');

  if (isCornerActive && doorMode === 'without_doors') {
    let list: ClosetCatalogEntry[] = [];
    const prefix = cornerPos === 'right' ? 'CRB' : 'CLB';
    if (category.cornerCatalogIds && category.cornerCatalogIds.length > 0) {
      list = category.catalogs.filter((c) => category.cornerCatalogIds!.includes(c.catalogId));
      list = list.filter((c) => c.code.startsWith(prefix));
    } else {
      list = category.catalogs.filter((c) => c.code.startsWith(prefix));
    }

    if (list && list.length > 0) {
      const matched = list.find((catalog) => depth >= catalog.minD && depth <= catalog.maxD);
      const chosen = matched ?? (list.find((catalog) => depth <= catalog.maxD) ?? list[list.length - 1]!);
      return { ...chosen, __debugInfo: `prefix=${prefix}, listLen=${list.length}, first=${list[0]?.code}, cabs=${list[0]?.cabinets?.length}` } as any;
    }
    
    return { ...category.catalogs[0]!, __debugInfo: `NO_LIST_FOUND(prefix=${prefix}, catCabsLen=${category.catalogs.length})` } as any;
  }

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
  const isCorner = tower.isCorner ?? (tower.cornerPosition === 'left' || tower.cornerPosition === 'right' || tower.cornerOrientation === 'left' || tower.cornerOrientation === 'right');
  const minW = isCorner ? Math.max(limits.minW, 30) : limits.minW;
  return clamp(width, minW, limits.maxW);
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
  const isCorner = tower.isCorner ?? (tower.cornerPosition === 'left' || tower.cornerPosition === 'right' || tower.cornerOrientation === 'left' || tower.cornerOrientation === 'right');
  const position = tower.cornerPosition ?? tower.cornerOrientation ?? (isCorner ? 'left' : 'none');
  const catalog = resolveCatalogForTower(
    tower.doorMode,
    tower.categoryCode,
    tower.depth,
    isCorner,
    position,
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
  catalog: ClosetCatalogEntry,
  cabinets: ClosetCabinetEntry[],
  width: number,
  height: number,
  boxCount: 1 | 2 = 2,
): ClosetCabinetEntry | null {
  console.log("selectCabinet called with", { cabinetsCount: cabinets?.length, width, height, boxCount });
  if (!cabinets || cabinets.length === 0) {
    // If we have a catalog but no cabinets, force a fallback so we NEVER return null.
    cabinets = [{
      id: 999000 + (catalog.catalogId || 0),
      code: (catalog.code || "NO_CODE") + "_FALLBACK_CAB",
      width: 30, height: 84, depth: 15,
      minW: 0, maxW: 100, minH: 0, maxH: 100, minD: 0, maxD: 100,
      boxOptions: [1, 2]
    } as any];
  }

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
  isCorner?: boolean,
  cornerPosition?: CornerPosition | 'left' | 'right',
): ClosetCabinetEntry | null {
  const catalog = resolveCatalogForTower(doorMode, categoryCode, depth, isCorner, cornerPosition);
  console.log("resolveCabinetForTower catalog found:", catalog?.code, "cabinets count:", catalog?.cabinets?.length);
  if (!catalog.cabinets || catalog.cabinets.length === 0) return null;
  return selectCabinet(catalog, catalog.cabinets, width, height, boxCount);
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

  const isCorner = tower.isCorner ?? (tower.cornerPosition === 'left' || tower.cornerPosition === 'right' || tower.cornerOrientation === 'left' || tower.cornerOrientation === 'right');
  const position = tower.cornerPosition ?? tower.cornerOrientation ?? (isCorner ? 'left' : 'none');

  // Map corner categories to their base counterparts for the main cabinet lookup
  let baseCategoryCode = tower.categoryCode;
  if (baseCategoryCode === 'CCS') baseCategoryCode = 'CAS';
  if (baseCategoryCode === 'CCH') baseCategoryCode = 'CDH';
  if (baseCategoryCode === 'CCL') baseCategoryCode = 'CLH';

  // Resolve the base catalog (ignoring isCorner so we get CAS/CDH/etc., not CRB)
  const baseCatalog = resolveCatalogForTower(
    tower.doorMode,
    baseCategoryCode,
    tower.depth,
    false,
    'none',
  );

  if (options?.catalogSwitched && baseCatalog.cabinets && baseCatalog.cabinets.length > 0) {
    const firstCabinet = baseCatalog.cabinets[0]!;
    tower.cabinetId = Number(firstCabinet.id ?? (firstCabinet as any).cabinet_id ?? 0);
    tower.cabinetCode = String(firstCabinet.code ?? (firstCabinet as any).cabinet_code ?? '');
    if (isCorner) {
      refreshBridgeCabinetForTower(tower);
    }
    return;
  }

  // 1. Resolve Base Cabinet
  let baseSearchWidth = tower.width;
  let baseSearchDepth = tower.depth;
  
  if (isCorner) {
    // The tower.width is the total footprint on the wall.
    // The main cabinet's physical width is the footprint minus the depth of the bridge.
    const bridgeDepth = tower.cornerBridgeDepth ?? tower.depth;
    baseSearchWidth = Math.max(0, tower.width - bridgeDepth);
  }
  
  const baseCabinet = selectCabinet(baseCatalog, baseCatalog.cabinets, baseSearchWidth, tower.height, tower.boxCount ?? 2);
  tower.cabinetId = baseCabinet?.id;
  tower.cabinetCode = baseCabinet?.code;
  // @ts-ignore
  tower.__debugInfo = baseCatalog.__debugInfo ?? 'Base resolved';

  // 2. Resolve Bridge Cabinet (if corner)
  if (isCorner) {
    refreshBridgeCabinetForTower(tower);
  } else {
    // Clear bridge info if not a corner
    ;(tower as any).bridgeCabinetId = undefined;
    ;(tower as any).bridgeCabinetCode = undefined;
    ;(tower as any).bridgeCatalogId = undefined;
    ;(tower as any).bridgeCatalogCode = undefined;
    ;(tower as any).bridgeDebug = undefined;
  }
}

// ---------------------------------------------------------------------------
// Corner Bridge helpers
// ---------------------------------------------------------------------------

/**
 * The minimum Total D (Main D + Bridge W) required for hanging corner cabinets
 * (CDH / CLH categories). Per the design spec this is 23 inches.
 */
export const MIN_CORNER_TOTAL_D_FOR_HANGING = 23;

/**
 * Valid bridge depth options (inches) for corner cabinet bridge pieces.
 * Must match CRB/CLB catalog depth ranges.
 */
export const CORNER_BRIDGE_DEPTH_OPTIONS = [15, 18] as const;
export type CornerBridgeDepth = (typeof CORNER_BRIDGE_DEPTH_OPTIONS)[number];

/**
 * Computes the combined depth footprint of a corner cabinet assembly.
 *   Total D = Main Cabinet Depth + Bridge Width
 */
export function getCornerTotalDepth(mainDepth: number, bridgeWidth: number): number {
  return mainDepth + bridgeWidth;
}

/**
 * Clamps a bridge depth value to the nearest valid option (15 or 18 inches).
 */
export function clampBridgeDepth(depth: number): CornerBridgeDepth {
  // Pick whichever valid option is closest
  return CORNER_BRIDGE_DEPTH_OPTIONS.reduce((best, opt) =>
    Math.abs(opt - depth) < Math.abs(best - depth) ? opt : best,
  );
}

/**
 * Resolves the CRB or CLB catalog entry for the bridge piece of a corner cabinet.
 *
 * @param cornerPosition - 'left' uses CLB catalogs, 'right' uses CRB catalogs
 * @param bridgeDepth    - depth of the bridge piece (15 or 18 inches)
 * @param categoryCode   - the category of the main cabinet (determines which category's
 *                         corner catalogs to use; defaults to CAS which holds them all)
 */
export function resolveBridgeCatalogForCorner(
  cornerPosition: 'left' | 'right',
  bridgeDepth: number,
  categoryCode: ClosetCatalogCategoryCode = 'CAS',
): ClosetCatalogEntry | null {
  try {
    const category = getCategoryByCode('without_doors', categoryCode);
    let list: ClosetCatalogEntry[] = [];
    let debugMethod = '';
    if (category.cornerCatalogIds && category.cornerCatalogIds.length > 0) {
      list = category.catalogs.filter((c) => category.cornerCatalogIds!.includes(c.catalogId));
      console.log('resolveBridgeCatalogForCorner: after cornerCatalogIds filter', list.map(c => c.catalogId));
      const prefix = cornerPosition === 'right' ? 'CRB' : 'CLB';
      list = list.filter((c) => c.code.startsWith(prefix));
      console.log('resolveBridgeCatalogForCorner: after prefix filter', list.map(c => c.code));
      debugMethod = `cornerIds+prefix(${prefix}): ` + list.map(c=>c.code).join(',');
    } else {
      const prefix = cornerPosition === 'right' ? 'CRB' : 'CLB';
      list = category.catalogs.filter((c) => c.code.startsWith(prefix));
      console.log('resolveBridgeCatalogForCorner: fallback prefix filter', list.map(c => c.code));
      debugMethod = `prefixOnly(${prefix}): ` + list.map(c=>c.code).join(',');
    }

    if (!list || list.length === 0) {
      console.log('resolveBridgeCatalogForCorner: list is empty, returning null');
      return { __debugInfo: `EMPTY LIST | ${debugMethod}` } as any;
    }

    const matched = list.find((c) => bridgeDepth >= c.minD && bridgeDepth <= c.maxD);
    console.log('resolveBridgeCatalogForCorner: matched by depth', bridgeDepth, matched?.code);
    const chosen = matched ?? list.find((c) => bridgeDepth <= c.maxD) ?? list[list.length - 1] ?? null;
    if (chosen) {
      return { ...chosen, __debugInfo: `MATCHED | ${debugMethod}` } as any;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolves the specific bridge cabinet record within the CRB/CLB catalog
 * for the given bridge width and height.
 */
export function resolveBridgeCabinetForCorner(
  cornerPosition: 'left' | 'right',
  bridgeWidth: number,
  bridgeHeight: number,
  bridgeDepth: number,
  categoryCode: ClosetCatalogCategoryCode = 'CAS',
): ClosetCabinetEntry | null {
  const catalog = resolveBridgeCatalogForCorner(cornerPosition, bridgeDepth, categoryCode);
  if (!catalog || !catalog.cabinets || catalog.cabinets.length === 0) return null;
  return selectCabinet(catalog, catalog.cabinets, bridgeWidth, bridgeHeight, 2);
}

/**
 * Refreshes the bridge cabinet ID/code on a corner tower based on its current
 * cornerBridgeWidth, cornerBridgeDepth, height, and cornerPosition.
 * No-op if the tower is not a corner tower.
 */
export function refreshBridgeCabinetForTower(tower: Tower): void {
  if (!tower.isCorner && tower.cornerPosition !== 'left' && tower.cornerPosition !== 'right') return;
  const position = (tower.cornerPosition === 'left' || tower.cornerPosition === 'right')
    ? tower.cornerPosition
    : 'left';

  const bridgeWidth = tower.cornerBridgeWidth ?? Math.max(0, 23 - tower.depth);
  const bridgeDepth = tower.cornerBridgeDepth ?? tower.depth;
  const categoryCode = tower.categoryCode ?? 'CAS';

  const catalog = resolveBridgeCatalogForCorner(position, bridgeDepth, categoryCode);
  ;(tower as any).bridgeCatalogId = catalog?.catalogId;
  ;(tower as any).bridgeCatalogCode = catalog?.code;
  ;(tower as any).bridgeDebug = (catalog as any)?.__debugInfo ?? 'NO_DEBUG';

  const cabinet = resolveBridgeCabinetForCorner(
    position,
    bridgeWidth,
    tower.height,
    bridgeDepth,
    categoryCode,
  );

  // Store bridge cabinet resolution metadata on the tower for export/quote
  ;(tower as any).bridgeCabinetId = cabinet?.id;
  ;(tower as any).bridgeCabinetCode = cabinet?.code;
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
  const isCorner = categoryCode === "CCS" || categoryCode === "CCH" || categoryCode === "CCL";
  
  let searchWidth = limits.minW;
  let searchDepth = limits.minD;
  
  if (isCorner) {
    searchWidth = Math.max(0, limits.minW - limits.minD);
  }

  const cabinet = resolveCabinetForTower(
    doorMode,
    categoryCode,
    searchWidth,
    limits.minH,
    searchDepth,
    boxCount,
    isCorner,
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
    isCorner,
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
      console.log('apiCategories', apiCategories);
      console.log(`[API Response] Catalog Categories for door mode "${doorMode}":`, apiCategories);
      console.log(`[closetCatalogs] Successfully fetched ${apiCategories.length} categories for ${doorMode}`);
      // Map API data to the hardcoded list to retain limits
      const mapped = apiCategories.map(apiCat => {
        const catDoorMode = (apiCat.doorMode ?? (apiCat as any).door_mode ?? doorMode) as ClosetDoorMode;
        const catCode = (apiCat.categoryCode ?? (apiCat as any).category_code ?? (apiCat as any).code ?? '') as ClosetCatalogCategoryCode;
        const catName = (apiCat.categoryName ?? (apiCat as any).category_name ?? (apiCat as any).name ?? catCode);

        
        const parseBoxOptions = (options: string | null | undefined): number[] => {
          if (!options) return [2]
          const lower = options.toLowerCase()
          if (lower.includes('single box')) return [1, 2]
          return [2]
        }

        const rawCatalogs: any[] = apiCat.catalogs ?? (apiCat as any).catalog_list ?? [];

        const mapCatalogList = (catalogList: any[]) => catalogList.map(catalog => {
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
              minW: catMinW > 0 ? catMinW : (cabMinW > 0 ? cabMinW : 20),
              maxW: catMaxW > 0 ? catMaxW : (cabMaxW > 0 ? cabMaxW : 200),
              minD: catMinD > 0 ? catMinD : (cabMinD > 0 ? cabMinD : 15),
              maxD: catMaxD > 0 ? catMaxD : (cabMaxD > 0 ? cabMaxD : 60),
              minH: catMinH > 0 ? catMinH : (cabMinH > 0 ? cabMinH : 84),
              maxH: catMaxH > 0 ? catMaxH : (cabMaxH > 0 ? cabMaxH : 250),
              cabinets: mappedCabinets,
            };
          });

        return {
          ...apiCat,
          doorMode: catDoorMode,
          categoryCode: catCode,
          categoryName: catName,
          catalogs: mapCatalogList(rawCatalogs),
          cornerLeftCatalogs: apiCat.cornerLeftCatalogs ? mapCatalogList(apiCat.cornerLeftCatalogs) : undefined,
          cornerRightCatalogs: apiCat.cornerRightCatalogs ? mapCatalogList(apiCat.cornerRightCatalogs) : undefined,
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

  // If API fails, we return an empty array instead of a static fallback
  return [];
}
