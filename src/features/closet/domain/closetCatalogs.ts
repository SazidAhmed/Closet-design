import type { Accessory, Tower } from "./types/tower";
import { createTowerId } from "./types/tower";

const CM_PER_INCH = 2.54;

function inch(value: number): number {
  return Math.round(value * CM_PER_INCH * 10) / 10;
}

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
    minW: inch(minWIn),
    maxW: inch(maxWIn),
    minD: inch(minDIn),
    maxD: inch(maxDIn),
    minH: inch(minHIn),
    maxH: inch(maxHIn),
  };
}

export const CLOSET_CATALOG_CATEGORIES: ClosetCatalogCategory[] = [
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

export function getCategoriesForDoorMode(
  doorMode: ClosetDoorMode,
): ClosetCatalogCategory[] {
  return CLOSET_CATALOG_CATEGORIES.filter(
    (category) => category.doorMode === doorMode,
  );
}

export function getCategoryByCode(
  doorMode: ClosetDoorMode,
  categoryCode: ClosetCatalogCategoryCode,
): ClosetCatalogCategory {
  const category = CLOSET_CATALOG_CATEGORIES.find(
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
      return [{ type: "drawer", count: 4, drawerHeight: inch(8) }];
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
