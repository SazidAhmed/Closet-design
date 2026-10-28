import { describe, expect, it } from "vitest";
import {
  createTowerFromCategory,
  refreshTowerCabinet,
  resolveCrdSplitHeight,
  resolveDrawerCount,
  resolveShelfCount,
  setActiveCategories,
  type ClosetCatalogCategory,
} from "../src/features/closet/domain/closetCatalogs";
import { buildParts } from "../src/features/closet/domain/buildCabinetParts";
import type { ClosetStateV2 } from "../src/features/closet/domain/schema";
import type { DrawerAccessory, ShelfSetAccessory, Tower } from "../src/features/closet/domain/types/tower";

describe("CRD Cabinet domain and rendering", () => {
  it("resolves split height and default counts for CRD", () => {
    // 84" cabinet has 42 5/8" (42.625") lower section
    const split84 = resolveCrdSplitHeight(null, 84);
    expect(split84).toBeCloseTo(42.625, 3);

    // 90" cabinet has 45 5/8" (45.625") lower section
    const split90 = resolveCrdSplitHeight(null, 90);
    expect(split90).toBeCloseTo(45.625, 3);

    // 96" cabinet has 44 1/8" (44.125") lower section
    const split96 = resolveCrdSplitHeight(null, 96);
    expect(split96).toBeCloseTo(44.125, 3);

    // Default drawer count is 5
    expect(resolveDrawerCount("CRD", null)).toBe(5);

    // Default shelf count is 4
    expect(resolveShelfCount("CRD", null)).toBe(4);
  });

  it("creates a CRD tower with drawers in lower section and shelves in upper section", () => {
    // Mock category for CRD
    const mockCategory: ClosetCatalogCategory = {
      doorMode: "without_doors",
      categoryCode: "CRD",
      categoryName: "Drawers",
      catalogs: [
        {
          catalogId: 211,
          code: "CRD128415-429615",
          minW: 10,
          maxW: 42,
          minD: 13,
          maxD: 16,
          minH: 80,
          maxH: 107.5,
          cabinets: [
            {
              id: 4302,
              code: "CRD128415",
              width: 12,
              height: 84,
              depth: 15,
              minW: 10,
              maxW: 13,
              minH: 80,
              maxH: 85,
              minD: 13,
              maxD: 16,
              boxOptions: [1, 2],
              numberOfShelves: 4,
              numOfDrawers: 5,
              numOfRollouts: 0,
              horLine: 2.0, // database indicator
              basePrice: "303.00",
            },
          ],
        },
      ],
    };

    setActiveCategories([mockCategory]);

    const tower = createTowerFromCategory("without_doors", "CRD", 1);
    expect(tower.categoryCode).toBe("CRD");
    expect(tower.crdSplitHeight).toBeCloseTo(42.625, 3);

    const drawerAcc = tower.accessories.find((a): a is DrawerAccessory => a.type === "drawer");
    const shelfAcc = tower.accessories.find((a): a is ShelfSetAccessory => a.type === "shelf_set");

    expect(drawerAcc).toBeDefined();
    expect(drawerAcc?.count).toBe(5);

    expect(shelfAcc).toBeDefined();
    expect(shelfAcc?.count).toBe(4);
  });

  it("refreshTowerCabinet syncs drawer and shelf counts on CRD tower", () => {
    const tower: Tower = {
      id: "tower_crd_sync",
      label: "Drawers 1",
      width: 12,
      depth: 15,
      height: 84,
      doorMode: "without_doors",
      categoryCode: "CRD",
      accessories: [],
    };

    refreshTowerCabinet(tower);

    expect(tower.crdSplitHeight).toBeCloseTo(42.625, 3);
    const drawerAcc = tower.accessories.find((a): a is DrawerAccessory => a.type === "drawer");
    const shelfAcc = tower.accessories.find((a): a is ShelfSetAccessory => a.type === "shelf_set");

    expect(drawerAcc?.count).toBe(5);
    expect(shelfAcc?.count).toBe(4);
  });

  it("builds 3D parts with 5 drawers in lower zone and shelves in upper zone", () => {
    const tower: Tower = {
      id: "tower_crd_test",
      label: "Drawers 1",
      width: 24,
      depth: 15,
      height: 84,
      doorMode: "without_doors",
      categoryCode: "CRD",
      crdSplitHeight: 42.625,
      accessories: [
        { type: "drawer", count: 5, drawerHeight: 8 },
        { type: "shelf_set", count: 4 },
      ],
    };

    const state: ClosetStateV2 = {
      schemaVersion: 2,
      cabinet: {
        width: 24,
        height: 84,
        depth: 15,
        thickness: 0.75,
      },
      materials: {
        finishId: "white",
        backingId: "white",
      },
      doors: {
        doorStyle: "slab",
        handleStyle: "modern",
      },
      towers: [tower],
    };

    const parts = buildParts(state);

    const drawerBoxes = parts.filter((p) => p.type === "drawer_box");
    expect(drawerBoxes.length).toBe(5);

    const shelves = parts.filter((p) => p.type === "shelf");
    // 1 fixed divider shelf + 3 adjustable shelves in upper section = 4 shelves
    expect(shelves.length).toBe(4);

    // The fixed divider shelf should be at divY (-H/2 + bottomGap + crdSplitHeight)
    // -42 + 2 + 42.625 = 2.625
    const divShelf = shelves.find((s) => s.meta?.isFixed);
    expect(divShelf).toBeDefined();
    expect(divShelf?.transform.pos[1]).toBeCloseTo(2.625, 2);

    // All drawers should be BELOW the divider shelf
    for (const drawer of drawerBoxes) {
      expect(drawer.transform.pos[1]).toBeLessThan(divShelf!.transform.pos[1]);
    }

    // All adjustable shelves should be ABOVE the divider shelf
    const adjShelves = shelves.filter((s) => !s.meta?.isFixed);
    expect(adjShelves.length).toBe(3);
    for (const shelf of adjShelves) {
      expect(shelf.transform.pos[1]).toBeGreaterThan(divShelf!.transform.pos[1]);
    }
  });
});
