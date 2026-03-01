// ---------------------------------------------------------------------------
// Build closet parts from v2 state — multi-tower with accessories
// ---------------------------------------------------------------------------

import type { ClosetStateV2 } from "./schema";
import type { ClosetPart } from "./parts";
import type { Tower } from "./types/tower";

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

  // ── Carcass panels ──────────────────────────────────────────────────────

  // Left panel
  parts.push({
    id: "panel_left",
    type: "panel_left",
    dims: { x: T, y: H, z: D },
    transform: { pos: [-W / 2 + T / 2, 0, 0], rot: [0, 0, 0] },
    materialId: finishId,
  });

  // Right panel
  parts.push({
    id: "panel_right",
    type: "panel_right",
    dims: { x: T, y: H, z: D },
    transform: { pos: [W / 2 - T / 2, 0, 0], rot: [0, 0, 0] },
    materialId: finishId,
  });

  // Bottom panel
  parts.push({
    id: "panel_bottom",
    type: "panel_bottom",
    dims: { x: iW, y: T, z: D },
    transform: { pos: [0, -H / 2 + T / 2, 0], rot: [0, 0, 0] },
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
    dims: { x: iW, y: iH, z: T },
    transform: { pos: [0, 0, -D / 2 + T / 2], rot: [0, 0, 0] },
    materialId: backingId,
  });

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
        dims: { x: T, y: iH, z: iD },
        transform: { pos: [currentX, 0, T / 2], rot: [0, 0, 0] },
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
        );
        break;
      case "rod":
        buildRods(parts, tower, acc, centerX, towerInnerWidth, T, H, D, iD, iH);
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
) {
  if (count <= 0) return;

  const bottomInnerY = -H / 2 + T;
  const gap = iH / (count + 1);

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
  _T: number,
  H: number,
  _D: number,
  iD: number,
  iH: number,
) {
  // Position the rod at a fraction of inner height
  const positionFractions: Record<string, number> = {
    high: 0.8,
    medium: 0.5,
    low: 0.25,
  };

  const fraction = positionFractions[rod.position] ?? 0.5;
  const baseY = -H / 2 + iH * fraction;
  const rodRadius = 1.2; // cm

  for (let r = 0; r < rod.count; r++) {
    const y = baseY - r * 40; // stack rods 40cm apart vertically
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
) {
  if (count <= 0) return;

  const bottomInnerY = -H / 2 + T;
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
) {
  if (count <= 0) return;

  const bottomInnerY = -H / 2 + T;
  const shelfSpacing = Math.min(20, iH / (count + 1)); // max 20cm between shoe shelves

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
