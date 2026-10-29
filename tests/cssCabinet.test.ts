import { describe, expect, it } from "vitest";
import {
  createTowerFromCategory,
  refreshTowerCabinet,
  resolveShelfCount,
  setActiveCategories,
  type ClosetCatalogCategory,
} from "../src/features/closet/domain/closetCatalogs";
import type { ShoeShelfAccessory, Tower } from "../src/features/closet/domain/types/tower";

describe("CSS (Shoe Shelves) Cabinet domain and elevation layout", () => {
  it("resolves shelf count from the API cabinet record (9 shelves)", () => {
    const mockCabinet = {
      id: 4371,
      code: "CSS128415",
      width: 12,
      height: 84,
      depth: 15,
      minW: 12,
      maxW: 13,
      minH: 80,
      maxH: 85,
      minD: 13,
      maxD: 16,
      boxOptions: [1, 2],
      numberOfShelves: 9,
      numOfDrawers: 0,
      numOfRollouts: 0,
      basePrice: "468.00",
    };

    expect(resolveShelfCount("CSS", mockCabinet)).toBe(9);
  });

  it("creates a CSS tower with shoe shelves count from API", () => {
    const mockCategory: ClosetCatalogCategory = {
      doorMode: "without_doors",
      categoryCode: "CSS",
      categoryName: "Shoe Shelves",
      catalogs: [
        {
          catalogId: 213,
          code: "CSS128415-459615",
          minW: 12,
          maxW: 49,
          minD: 13,
          maxD: 16,
          minH: 80,
          maxH: 107.5,
          cabinets: [
            {
              id: 4371,
              code: "CSS128415",
              width: 12,
              height: 84,
              depth: 15,
              minW: 12,
              maxW: 13,
              minH: 80,
              maxH: 85,
              minD: 13,
              maxD: 16,
              boxOptions: [1, 2],
              numberOfShelves: 9,
              numOfDrawers: 0,
              numOfRollouts: 0,
              basePrice: "468.00",
            },
          ],
        },
      ],
    };

    setActiveCategories([mockCategory]);

    const tower = createTowerFromCategory("without_doors", "CSS", 1);
    expect(tower.categoryCode).toBe("CSS");

    const shoeAcc = tower.accessories.find((a): a is ShoeShelfAccessory => a.type === "shoe_shelf");
    expect(shoeAcc).toBeDefined();
    expect(shoeAcc?.count).toBe(9);
  });

  it("refreshTowerCabinet updates shoe shelf count from resolved cabinet", () => {
    const tower: Tower = {
      id: "tower_css_test",
      label: "Shoe Shelves 1",
      width: 12,
      depth: 15,
      height: 84,
      doorMode: "without_doors",
      categoryCode: "CSS",
      accessories: [{ type: "shoe_shelf", count: 5 }],
    };

    refreshTowerCabinet(tower);

    const shoeAcc = tower.accessories.find((a): a is ShoeShelfAccessory => a.type === "shoe_shelf");
    expect(shoeAcc?.count).toBe(9);
  });

  it("buildCabinetParts generates 8 shoe shelves and 1 fixed divider shelf for 2-box CSS cabinet", async () => {
    const { buildCabinetParts } = await import("../src/features/closet/domain/buildCabinetParts");
    const tower: Tower = {
      id: "tower_css_3d",
      label: "Shoe Shelves 1",
      width: 12,
      depth: 15,
      height: 84,
      boxCount: 2,
      doorMode: "without_doors",
      categoryCode: "CSS",
      accessories: [{ type: "shoe_shelf", count: 9 }],
    };

    const state = {
      cabinet: {
        width: 12,
        height: 84,
        depth: 15,
        thickness: 0.75,
        bottomGap: 2,
        hasDoors: false,
      },
      towers: [tower],
      materials: {
        cabinetFinish: "white",
        doorStyle: "flat",
      },
    } as any;

    const parts = buildCabinetParts(state);
    const dividerShelves = parts.filter((p) => p.id.includes("div"));
    expect(dividerShelves.length).toBe(1);

    const shoeShelves = parts.filter((p) => p.type === "shoe_shelf");
    expect(shoeShelves.length).toBe(8);

    const lowerShelves = shoeShelves.filter((p) => p.id.includes("lower"));
    const upperShelves = shoeShelves.filter((p) => p.id.includes("upper"));
    expect(lowerShelves.length).toBe(4);
    expect(upperShelves.length).toBe(4);

    // Verify shelves are angled (~15 deg, rot[0] ≈ 0.26 rad)
    for (const shelf of shoeShelves) {
      expect(shelf.transform.rot[0]).toBeCloseTo(0.26, 2);
    }
  });
});

