// ---------------------------------------------------------------------------
// Build closet parts from v2 state — multi-tower with accessories
// ---------------------------------------------------------------------------

import type { ClosetStateV2 } from "./schema";
import type { ClosetPart } from "./parts";
import type { Tower } from "./types/tower";
import { isTwoBoxCabinet, getTwoBoxHeights } from "./closetCatalogs";

// ---- Derived dimensions ---------------------------------------------------

export type CabinetDerivedDims = Readonly<{
  width: number;
  height: number;
  depth: number;
  thickness: number;
  innerWidth: number;
  innerHeight: number;
  innerDepth: number;
}>;

export function getCabinetDerivedDims(
  state: ClosetStateV2,
): CabinetDerivedDims {
  const width = Number(state.cabinet.width) || 0;
  const height = Number(state.cabinet.height) || 0;
  const depth = Number(state.cabinet.depth) || 0;
  const thickness = Number(state.cabinet.thickness) || 0;

  const innerWidth = Math.max(0, width - thickness * 2);
  const innerHeight = Math.max(0, height - thickness * 2);
  const innerDepth = Math.max(0, depth - thickness);

  return {
    width,
    height,
    depth,
    thickness,
    innerWidth,
    innerHeight,
    innerDepth,
  };
}

// ---- Main builder ---------------------------------------------------------

/**
 * Build a JSON-serializable list of parts from the v2 closet state.
 *
 * Coordinate system:
 * - X: left(-) to right(+)
 * - Y: bottom(-) to top(+)
 * - Z: back(-) to front(+)
 */
export function buildParts(state: ClosetStateV2): ClosetPart[] {
  const {
    width: W,
    height: H,
    depth: D,
    thickness: T,
    innerWidth: iW,
    innerHeight: iH,
    innerDepth: iD,
  } = getCabinetDerivedDims(state);

  const parts: ClosetPart[] = [];
  const finishId = state.materials.finishId;
  const backingId = state.materials.backingId;

  const isWithDoors = state.towers.some(
    (t) => t.doorMode === "with_doors" && (!t.partType || t.partType === "cabinet")
  );
  const isCabinet = state.towers.length === 0 || state.towers.some(
    (t) => !t.partType || t.partType === "cabinet"
  );
  const bottomGap = isWithDoors ? 4.5 : (isCabinet ? 2 : 0);
  const hasLegs = isWithDoors;

  // ── Carcass panels ──────────────────────────────────────────────────────

  // Left panel
  parts.push({
    id: "panel_left",
    type: "panel_left",
    dims: { x: T, y: H - bottomGap, z: D },
    transform: { pos: [-W / 2 + T / 2, bottomGap / 2, 0], rot: [0, 0, 0] },
    materialId: finishId,
  });

  // Right panel
  parts.push({
    id: "panel_right",
    type: "panel_right",
    dims: { x: T, y: H - bottomGap, z: D },
    transform: { pos: [W / 2 - T / 2, bottomGap / 2, 0], rot: [0, 0, 0] },
    materialId: finishId,
  });

  // Bottom panel
  parts.push({
    id: "panel_bottom",
    type: "panel_bottom",
    dims: { x: iW, y: T, z: D },
    transform: { pos: [0, -H / 2 + bottomGap + T / 2, 0], rot: [0, 0, 0] },
    materialId: finishId,
  });

  // Top panel
  parts.push({
    id: "panel_top",
    type: "panel_top",
    dims: { x: iW, y: T, z: D },
    transform: { pos: [0, H / 2 - T / 2, 0], rot: [0, 0, 0] },
    materialId: finishId,
  });

  // Back panel
  parts.push({
    id: "panel_back",
    type: "panel_back",
    dims: { x: iW, y: iH - bottomGap, z: T },
    transform: { pos: [0, bottomGap / 2, -D / 2 + T / 2], rot: [0, 0, 0] },
    materialId: backingId,
  });

  // Legs (only for cabinets with doors)
  if (hasLegs) {
    parts.push({
      id: "leg_left",
      type: "leg",
      dims: { x: 2, y: 4.5, z: D - 2 },
      transform: { pos: [-W / 2 + 2 + 1, -H / 2 + 2.25, 0], rot: [0, 0, 0] },
      materialId: finishId,
    });
    parts.push({
      id: "leg_right",
      type: "leg",
      dims: { x: 2, y: 4.5, z: D - 2 },
      transform: { pos: [W / 2 - 2 - 1, -H / 2 + 2.25, 0], rot: [0, 0, 0] },
      materialId: finishId,
    });
  }

  // ── Tower-based internals ───────────────────────────────────────────────

  if (state.towers.length === 0) return parts;

  // Calculate tower X positions (left-to-right, starting from inner left edge)
  const innerLeftX = -W / 2 + T;
  let currentX = innerLeftX;

  for (let ti = 0; ti < state.towers.length; ti++) {
    const tower = state.towers[ti]!;
    const tw = Number(tower.width) || 0;
    const towerCenterX = currentX + tw / 2;

    // ── Divider (vertical panel between towers, skip before first tower) ──
    if (ti > 0) {
      // Divider is centred on the boundary between the previous and current tower
      parts.push({
        id: `divider_${ti}`,
        type: "divider",
        dims: { x: T, y: iH - bottomGap, z: iD },
        transform: { pos: [currentX, bottomGap / 2, T / 2], rot: [0, 0, 0] },
        materialId: finishId,
        towerId: tower.id,
      });
    }

    // ── Generate accessories for this tower ────────────────────────────────
    buildTowerAccessories(
      parts,
      tower,
      towerCenterX,
      tw,
      T,
      H,
      D,
      iD,
      iH,
      finishId,
      bottomGap,
    );

    currentX += tw;
  }

  return parts;
}

// ---- Tower accessory builder ──────────────────────────────────────────────

function buildTowerAccessories(
  parts: ClosetPart[],
  tower: Tower,
  centerX: number,
  towerWidth: number,
  T: number,
  H: number,
  D: number,
  iD: number,
  iH: number,
  finishId: string,
  bottomGap: number,
) {
  const towerInnerWidth = towerWidth - T; // account for one divider side

  for (const acc of tower.accessories) {
    switch (acc.type) {
      case "shelf_set":
        buildShelves(
          parts,
          tower,
          acc.count,
          centerX,
          towerInnerWidth,
          T,
          H,
          D,
          iD,
          iH,
          finishId,
          bottomGap,
        );
        break;
      case "rod":
        buildRods(parts, tower, acc, centerX, towerInnerWidth, T, H, D, iD, iH, bottomGap);
        break;
      case "drawer":
        buildDrawers(
          parts,
          tower,
          acc.count,
          acc.drawerHeight,
          centerX,
          towerInnerWidth,
          T,
          H,
          D,
          iD,
          finishId,
          bottomGap,
        );
        break;
      case "shoe_shelf":
        buildShoeShelves(
          parts,
          tower,
          acc.count,
          centerX,
          towerInnerWidth,
          T,
          H,
          D,
          iD,
          iH,
          finishId,
          bottomGap,
        );
        break;
      // props are cosmetic — handled separately in 3D renderer
    }
  }
}

function buildShelves(
  parts: ClosetPart[],
  tower: Tower,
  count: number,
  centerX: number,
  innerW: number,
  T: number,
  H: number,
  _D: number,
  iD: number,
  iH: number,
  finishId: string,
  bottomGap: number,
) {
  if (count <= 0 && tower.categoryCode !== "CRD") return;

  const bottomInnerY = -H / 2 + bottomGap + T;

  if (tower.categoryCode === "CRD") {
    // In CRD: shelves are in the upper box above the split line
    const splitHeight = tower.crdSplitHeight ?? (H * (42.625 / 84));
    const divY = -H / 2 + bottomGap + splitHeight;

    // Fixed divider shelf at the split line
    parts.push({
      id: `shelf_${tower.id}_div`,
      type: "shelf",
      dims: { x: innerW, y: T, z: iD },
      transform: { pos: [centerX, divY, T / 2], rot: [0, 0, 0] },
      materialId: finishId,
      towerId: tower.id,
      meta: { isFixed: true },
    });

    // Adjustable shelves in upper zone
    const adjCount = count >= 4 ? count - 1 : count;
    const topInnerY = H / 2 - T;
    const upperAvailable = Math.max(0, topInnerY - (divY + T / 2));
    if (adjCount > 0 && upperAvailable > 0) {
      const gap = upperAvailable / (adjCount + 1);
      for (let i = 0; i < adjCount; i++) {
        const y = (divY + T / 2) + gap * (i + 1);
        parts.push({
          id: `shelf_${tower.id}_${i + 1}`,
          type: "shelf",
          dims: { x: innerW, y: T, z: iD },
          transform: { pos: [centerX, y, T / 2], rot: [0, 0, 0] },
          materialId: finishId,
          towerId: tower.id,
          meta: { index: i + 1 },
        });
      }
    }
    return;
  }

  if (count <= 0) return;
  const gap = (iH - bottomGap) / (count + 1);

  for (let i = 0; i < count; i++) {
    const y = bottomInnerY + gap * (i + 1);
    parts.push({
      id: `shelf_${tower.id}_${i + 1}`,
      type: "shelf",
      dims: { x: innerW, y: T, z: iD },
      transform: { pos: [centerX, y, T / 2], rot: [0, 0, 0] },
      materialId: finishId,
      towerId: tower.id,
      meta: { index: i + 1 },
    });
  }
}

function buildRods(
  parts: ClosetPart[],
  tower: Tower,
  rod: { position: "high" | "medium" | "low"; count: 1 | 2 },
  centerX: number,
  innerW: number,
  T: number,
  H: number,
  _D: number,
  iD: number,
  iH: number,
  bottomGap: number,
) {
  const isCDH = tower.categoryCode === "CDH" || tower.categoryCode === "CCH";
  const isCLH = tower.categoryCode === "CLH" || tower.categoryCode === "CCL";
  const isTwoBox = isTwoBoxCabinet(tower);
  const rodRadius = 1.0;
  const GAP_ABOVE = 2.5;

  if (isCDH && isTwoBox) {
    const { lowerBoxHeight } = getTwoBoxHeights(H);
    const dividerY = -H / 2 + bottomGap + lowerBoxHeight;

    // Middle divider shelf (if not yet added)
    if (!parts.some((p) => p.id === `shelf_${tower.id}_div`)) {
      parts.push({
        id: `shelf_${tower.id}_div`,
        type: "shelf",
        dims: { x: innerW, y: T, z: iD },
        transform: { pos: [centerX, dividerY, T / 2], rot: [0, 0, 0] },
        materialId: "classic-white",
        towerId: tower.id,
        meta: { isFixed: true },
      });
    }

    const isUpper = rod.position === "high";
    const sectionTop = isUpper ? H / 2 - T : dividerY - T / 2;
    const shelfY = sectionTop - GAP_ABOVE - T / 2;
    const rodY = sectionTop - GAP_ABOVE - T - rodRadius - 0.2;

    // Fixed shelf above the rod (creating the 2.5" gap)
    parts.push({
      id: `shelf_${tower.id}_cdh_${rod.position}`,
      type: "shelf",
      dims: { x: innerW, y: T, z: iD },
      transform: { pos: [centerX, shelfY, T / 2], rot: [0, 0, 0] },
      materialId: "classic-white",
      towerId: tower.id,
      meta: { isFixed: true },
    });

    // Hanging rod
    parts.push({
      id: `rod_${tower.id}_${rod.position}`,
      type: "rod",
      dims: { x: innerW, y: rodRadius * 2, z: rodRadius * 2 },
      transform: { pos: [centerX, rodY, iD / 2], rot: [0, 0, Math.PI / 2] },
      materialId: "polished-chrome",
      towerId: tower.id,
      meta: { position: rod.position, index: 1 },
    });
    return;
  }

  if (isCLH) {
    const sectionTop = H / 2 - T;
    const shelfY = sectionTop - GAP_ABOVE - T / 2;
    const rodY = sectionTop - GAP_ABOVE - T - rodRadius - 0.2;

    parts.push({
      id: `shelf_${tower.id}_clh`,
      type: "shelf",
      dims: { x: innerW, y: T, z: iD },
      transform: { pos: [centerX, shelfY, T / 2], rot: [0, 0, 0] },
      materialId: "classic-white",
      towerId: tower.id,
      meta: { isFixed: true },
    });

    parts.push({
      id: `rod_${tower.id}_${rod.position}`,
      type: "rod",
      dims: { x: innerW, y: rodRadius * 2, z: rodRadius * 2 },
      transform: { pos: [centerX, rodY, iD / 2], rot: [0, 0, Math.PI / 2] },
      materialId: "polished-chrome",
      towerId: tower.id,
      meta: { position: rod.position, index: 1 },
    });
    return;
  }

  // Generic fallback rod placement
  const positionFractions: Record<string, number> = {
    high: 0.8,
    medium: 0.5,
    low: 0.25,
  };

  const fraction = positionFractions[rod.position] ?? 0.5;
  const baseY = -H / 2 + bottomGap + (iH - bottomGap) * fraction;

  for (let r = 0; r < rod.count; r++) {
    const y = baseY - r * 40;
    parts.push({
      id: `rod_${tower.id}_${rod.position}_${r + 1}`,
      type: "rod",
      dims: { x: innerW, y: rodRadius * 2, z: rodRadius * 2 },
      transform: { pos: [centerX, y, iD / 2], rot: [0, 0, Math.PI / 2] },
      materialId: "polished-chrome",
      towerId: tower.id,
      meta: { position: rod.position, index: r + 1 },
    });
  }
}

function buildDrawers(
  parts: ClosetPart[],
  tower: Tower,
  count: number,
  drawerHeight: number,
  centerX: number,
  innerW: number,
  T: number,
  H: number,
  _D: number,
  iD: number,
  finishId: string,
  bottomGap: number,
) {
  if (count <= 0) return;

  const bottomInnerY = -H / 2 + bottomGap + T;

  if (tower.categoryCode === "CRD") {
    // In CRD: drawers fill the lower box below the split line
    const splitHeight = tower.crdSplitHeight ?? (H * (42.625 / 84));
    const divY = -H / 2 + bottomGap + splitHeight;
    const drawerZoneH = Math.max(0, (divY - T / 2) - bottomInnerY);
    const gap = 0.25;
    const singleH = Math.max(1, (drawerZoneH - (count - 1) * gap) / count);

    for (let i = 0; i < count; i++) {
      const y = bottomInnerY + singleH / 2 + i * (singleH + gap);
      parts.push({
        id: `drawer_${tower.id}_${i + 1}`,
        type: "drawer_box",
        dims: { x: innerW - 2, y: singleH, z: iD - 2 },
        transform: { pos: [centerX, y, T / 2 + 1], rot: [0, 0, 0] },
        materialId: finishId,
        towerId: tower.id,
        meta: { index: i + 1 },
      });
    }
    return;
  }

  const gap = 1; // 1cm gap between drawers

  for (let i = 0; i < count; i++) {
    const y = bottomInnerY + drawerHeight / 2 + i * (drawerHeight + gap);
    parts.push({
      id: `drawer_${tower.id}_${i + 1}`,
      type: "drawer_box",
      dims: { x: innerW - 2, y: drawerHeight, z: iD - 2 },
      transform: { pos: [centerX, y, T / 2 + 1], rot: [0, 0, 0] },
      materialId: finishId,
      towerId: tower.id,
      meta: { index: i + 1 },
    });
  }
}

function buildShoeShelves(
  parts: ClosetPart[],
  tower: Tower,
  count: number,
  centerX: number,
  innerW: number,
  T: number,
  H: number,
  _D: number,
  iD: number,
  iH: number,
  finishId: string,
  bottomGap: number,
) {
  if (count <= 0) return;

  const isTwoBox = isTwoBoxCabinet(tower);
  if (isTwoBox && count >= 8) {
    const { lowerBoxHeight } = getTwoBoxHeights(H);
    const divY = -H / 2 + bottomGap + lowerBoxHeight;

    // Fixed divider shelf at the split line
    parts.push({
      id: `shelf_${tower.id}_div`,
      type: "shelf",
      dims: { x: innerW, y: T, z: iD },
      transform: { pos: [centerX, divY, T / 2], rot: [0, 0, 0] },
      materialId: finishId,
      towerId: tower.id,
      meta: { isFixed: true },
    });

    const shoeCount = count >= 9 ? count - 1 : count;
    const lowerCount = Math.floor(shoeCount / 2);
    const upperCount = shoeCount - lowerCount;

    // Lower box shoe shelves: 9" down from divider shelf, then 7 1/8" (7.125") step
    for (let i = 0; i < lowerCount; i++) {
      const drop = 9 + i * 7.125;
      const y = divY - T / 2 - drop;
      parts.push({
        id: `shoe_shelf_${tower.id}_lower_${i + 1}`,
        type: "shoe_shelf",
        dims: { x: innerW, y: T, z: iD * 0.75 },
        transform: { pos: [centerX, y, T / 2 + iD * 0.12], rot: [0.26, 0, 0] },
        materialId: finishId,
        towerId: tower.id,
        meta: { index: i + 1 },
      });
    }

    // Upper box shoe shelves: 9" down from top inside, then 7 1/8" (7.125") step
    const topInnerY = H / 2 - T;
    for (let i = 0; i < upperCount; i++) {
      const drop = 9 + i * 7.125;
      const y = topInnerY - drop;
      parts.push({
        id: `shoe_shelf_${tower.id}_upper_${i + 1}`,
        type: "shoe_shelf",
        dims: { x: innerW, y: T, z: iD * 0.75 },
        transform: { pos: [centerX, y, T / 2 + iD * 0.12], rot: [0.26, 0, 0] },
        materialId: finishId,
        towerId: tower.id,
        meta: { index: lowerCount + i + 1 },
      });
    }
    return;
  }

  const bottomInnerY = -H / 2 + bottomGap + T;
  const shelfSpacing = Math.min(20, (iH - bottomGap) / (count + 1)); // max 20cm between shoe shelves

  for (let i = 0; i < count; i++) {
    const y = bottomInnerY + shelfSpacing * (i + 1);
    parts.push({
      id: `shoe_shelf_${tower.id}_${i + 1}`,
      type: "shoe_shelf",
      dims: { x: innerW, y: T, z: iD * 0.7 },
      // Angled ~15 degrees for shoe display
      transform: { pos: [centerX, y, T / 2 + iD * 0.15], rot: [0.26, 0, 0] },
      materialId: finishId,
      towerId: tower.id,
      meta: { index: i + 1 },
    });
  }
}

// Re-export the old function name for backward compatibility
export { buildParts as buildCabinetParts };
