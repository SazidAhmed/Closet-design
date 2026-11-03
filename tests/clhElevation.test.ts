import { describe, it, expect } from "vitest";
import { getTwoBoxHeights, getStandardUpperShelfPositions } from "../src/features/closet/domain/closetCatalogs";

describe("CLH (Long Hanging) and CDH (Double Hanging) Alignment", () => {
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

  it("calculates standard upper shelf positions for 84\" and 90\" cabinets", () => {
    const shelves84 = getStandardUpperShelfPositions(84);
    expect(shelves84).toHaveLength(3);
    expect(shelves84[shelves84.length - 1]).toBeCloseTo(73.19, 2);

    const shelves90 = getStandardUpperShelfPositions(90);
    expect(shelves90).toHaveLength(3);
    expect(shelves90[shelves90.length - 1]).toBeCloseTo(78.44, 2);
  });
});
