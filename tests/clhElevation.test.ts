import { describe, it, expect } from "vitest";
import { getTwoBoxHeights, getStandardUpperShelfPositions } from "../src/features/closet/domain/closetCatalogs";

describe("CLH (Long Hanging) Shelf and Rod Alignment", () => {
  it("aligns 96\" CLH lower box height with 2nd shelf of standard shelving cabinet", () => {
    const clhHeights = getTwoBoxHeights(96, "CLH");
    expect(clhHeights.lowerBoxHeight).toBeCloseTo(74.95, 2);
    expect(clhHeights.upperBoxHeight).toBeCloseTo(21.05, 2);
  });

  it("calculates standard upper shelf positions for 96\" matching CAS cabinet", () => {
    const shelves = getStandardUpperShelfPositions(96);
    expect(shelves).toHaveLength(4);
    // Top shelf
    expect(shelves[shelves.length - 1]).toBeCloseTo(85.10, 2);
    // Shelf below top (where hanger goes)
    expect(shelves[shelves.length - 2]).toBeCloseTo(74.95, 2);
  });
});

