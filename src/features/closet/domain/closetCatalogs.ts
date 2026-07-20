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

export type ClosetCatalogEntry = {
  catalogId: number;
  code: string;
  minW: number;
  maxW: number;
  minD: number;
  maxD: number;
  minH: number;
  maxH: number;
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
      entry.doorMode === doorMode && entry.categoryCode === categoryCode,
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

export function refreshTowerCatalog(tower: Tower): void {
  if (!tower.doorMode || !tower.categoryCode) return;
  const catalog = resolveCatalogForTower(
    tower.doorMode,
    tower.categoryCode,
    tower.depth,
  );
  tower.catalogId = catalog.catalogId;
  tower.catalogCode = catalog.code;
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

  return {
    id: createTowerId(),
    label: `${category.categoryName} ${index}`,
    width: limits.minW,
    depth: limits.minD,
    height: limits.minH,
    doorMode,
    categoryCode,
    categoryName: category.categoryName,
    catalogId: catalog.catalogId,
    catalogCode: catalog.code,
    isCorner: categoryCode === "CCS" || categoryCode === "CCH" || categoryCode === "CCL",
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
      // Map API data to the hardcoded list to retain limits
      const mapped = apiCategories.map(apiCat => {
        const staticCat = CLOSET_CATALOG_CATEGORIES.find(c => c.categoryCode === apiCat.categoryCode && c.doorMode === apiCat.doorMode);
        if (staticCat) {
          return {
            ...apiCat,
            catalogs: apiCat.catalogs.map(catalog => {
              const staticCatalog = staticCat.catalogs.find(c => c.code === catalog.code);
              return {
                ...catalog,
                minW: catalog.minW > 0 ? catalog.minW : (staticCatalog ? staticCatalog.minW : 0),
                maxW: catalog.maxW > 0 ? catalog.maxW : (staticCatalog ? staticCatalog.maxW : 0),
                minD: catalog.minD > 0 ? catalog.minD : (staticCatalog ? staticCatalog.minD : 0),
                maxD: catalog.maxD > 0 ? catalog.maxD : (staticCatalog ? staticCatalog.maxD : 0),
                minH: catalog.minH > 0 ? catalog.minH : (staticCatalog ? staticCatalog.minH : 0),
                maxH: catalog.maxH > 0 ? catalog.maxH : (staticCatalog ? staticCatalog.maxH : 0),
              };
            })
          };
        }
        return apiCat;
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
    console.warn(
      `[closetCatalogs] Failed to fetch catalog categories from API; using static fallback.`,
      err,
    );
  }

  // Static fallback — always available, no network required.
  return CLOSET_CATALOG_CATEGORIES.filter((c) => c.doorMode === doorMode);
}
