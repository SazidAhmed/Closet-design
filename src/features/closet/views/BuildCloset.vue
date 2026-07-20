<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import TopToolbar from "../../../components/TopToolbar.vue";
import FooterBar from "../../../components/FooterBar.vue";
import RoomPlanPreview from "../../../components/RoomPlanPreview.vue";
import FloorPlan from "./FloorPlan.vue";
import { useAppStore } from "../../../stores/useAppStore";
import { useClosetStore } from "../../../stores/useClosetStore";
import { useRoomStore } from "../../../stores/useRoomStore";
import { useSelectionStore } from "../../../stores/useSelectionStore";
import { useUnit } from "../../../composables/useUnit";
import {
  getCategoriesForDoorMode,
  getCategoryLimits,
  type ClosetCatalogCategory,
  type ClosetCatalogCategoryCode,
  type ClosetCatalogLimits,
  type ClosetDoorMode,
} from "../domain/closetCatalogs";
import { Plus, Trash2 } from "lucide-vue-next";

const appStore = useAppStore();
const closet = useClosetStore();
const room = useRoomStore();
const selection = useSelectionStore();
const { fmt, fromCm } = useUnit();

/** Format a number to 4 decimal places (using rounding for precision). */
function truncTo4(value: number): string {
  const truncated = Math.round(value * 10000) / 10000;
  return truncated.toFixed(4);
}

const selectedDoorMode = ref<ClosetDoorMode>("without_doors");
const showElevation = ref(false);
const pendingCustomPart = ref<'panel' | 'filler' | null>(null);

const visibleCategories = computed(() =>
  getCategoriesForDoorMode(selectedDoorMode.value),
);

const selectedTower = computed(
  () =>
    closet.towers.find((tower) => tower.id === selection.selectedTowerId) ??
    null,
);

const selectedTowerLimits = computed<ClosetCatalogLimits | null>(() => {
  const tower = selectedTower.value;
  if (!tower?.doorMode || !tower.categoryCode) return null;
  return getCategoryLimits(tower.doorMode, tower.categoryCode);
});

/**
 * Maximum elevation (in display units) — the tower must stay fully inside
 * the room height, so max = roomHeight - towerHeight (min 0).
 */
const maxElevationIn = computed(() => {
  const tower = selectedTower.value;
  if (!tower) return 0;
  return Math.max(0, room.height - tower.height);
});

const maxHeightIn = computed(() => {
  const tower = selectedTower.value;
  const wall = selectedTowerWall.value;
  if (!tower) return Infinity;

  // 1. Room-height ceiling (tower bottom + height ≤ room height)
  const towerElevationIn =
    typeof tower.elevation === "number" && !isNaN(tower.elevation)
      ? Math.max(0, tower.elevation)
      : 0;
  let maxH = Math.max(0, room.height - towerElevationIn);

  // 2. Window constraint — only when the tower is placed on a wall
  if (wall) {
    const pos = tower.positionAlongWall ?? 0.5;
    const centerIn = pos * wall.length;
    const halfW = tower.width / 2;
    const towerLeft = centerIn - halfW;
    const towerRight = centerIn + halfW;

    for (const item of room.items) {
      if (item.wallId !== wall.id) continue;
      if (item.type !== "window") continue;

      const itemLeft = item.leftPosition ?? 0;
      const itemRight = itemLeft + item.width;

      // Does the window horizontally overlap the tower?
      const hOverlap = itemLeft < towerRight && itemRight > towerLeft;
      if (!hOverlap) continue;

      const defaultElevationIn = 42;
      const windowBottomIn =
        typeof item.elevation === "number" && !isNaN(item.elevation)
          ? Math.max(0, item.elevation)
          : defaultElevationIn;

      // Tower height must not cause the tower top to exceed the window bottom
      const allowedHeight = Math.max(0, windowBottomIn - towerElevationIn);
      maxH = Math.min(maxH, allowedHeight);
    }
  }

  return maxH;
});

/**
 * Clearance left (cm) — usable wall space to the left of the tower's left edge.
 * Clearance right (cm) — usable wall space to the right of the tower's right edge.
 *
 * Accounts for:
 *  1. Corner margins — full wall thickness is consumed by connected walls.
 *     Mirrors the elevation view's elevationHorizontalBoundsForWall logic so that
 *     clearance reads 0 when the tower is flush with the usable wall boundary.
 *  2. Placed doors/windows — any opening whose interval overlaps the clearance
 *     zone further restricts the available space.
 *  3. Other towers on the same wall.
 */
const clearances = computed(() => {
  const tower = selectedTower.value;
  const wall = selectedTowerWall.value;
  if (!tower || !wall) return null;

  // Tower left/right edges in wall-axis
  const pos = tower.positionAlongWall ?? 0.5;
  const centerIn = pos * wall.length;
  const halfW = tower.width / 2;
  const towerLeft = centerIn - halfW;
  const towerRight = centerIn + halfW;

  // ── 1. Corner margins — wall thickness consumed by perpendicular connected walls.
  //    Walls are drawn on centerlines, so the perpendicular wall's inner face is
  //    at wall.thickness/2 from the corner — use half-thickness as the margin.
  const wallThickness =
    typeof wall.thickness === "number" && wall.thickness > 0
      ? wall.thickness
      : 0;

  const CONN_TOL = 1; // cm — same tolerance used in FloorPlan wallConnectivityForWall
  const wallStartPt: [number, number] = [wall.position[0], wall.position[1]];
  const wallEndPt: [number, number] = [
    wall.position[0] + Math.cos(wall.angle) * wall.length,
    wall.position[1] + Math.sin(wall.angle) * wall.length,
  ];

  let startConnected = false;
  let endConnected = false;
  const startConnectedWalls: typeof room.walls = [];
  const endConnectedWalls: typeof room.walls = [];
  // Track the depth of any adjacent-corner tower blocking start/end.
  // 0 means no adjacent tower blocks that corner.
  let startAdjacentDepth = 0;
  let endAdjacentDepth = 0;

  for (const other of room.walls) {
    if (other.id === wall.id) continue;
    const oStart: [number, number] = [other.position[0], other.position[1]];
    const oEnd: [number, number] = [
      other.position[0] + Math.cos(other.angle) * other.length,
      other.position[1] + Math.sin(other.angle) * other.length,
    ];
    const hit = (a: [number, number], b: [number, number]) =>
      Math.hypot(a[0] - b[0], a[1] - b[1]) <= CONN_TOL;

    if (hit(wallStartPt, oStart) || hit(wallStartPt, oEnd)) {
      startConnected = true;
      startConnectedWalls.push(other);
    }
    if (hit(wallEndPt, oStart) || hit(wallEndPt, oEnd)) {
      endConnected = true;
      endConnectedWalls.push(other);
    }
  }

  const halfThickness = wallThickness / 2;
  const startMargin = startConnected ? Math.min(halfThickness, wall.length) : 0;
  const endMargin = endConnected ? Math.min(halfThickness, wall.length) : 0;

  // Usable wall boundaries (matches elevationHorizontalBoundsForWall with wall.thickness/2)
  let effectiveLeft = startMargin;
  let effectiveRight = Math.max(startMargin, wall.length - endMargin);

  const towerElevationIn =
    typeof tower.elevation === "number" && !isNaN(tower.elevation)
      ? Math.max(0, tower.elevation)
      : 0;
  const towerTopIn = towerElevationIn + tower.height;

  // ── 2. Door / window obstructions ───────────────────────────────────────
  const epsilon = 0.0001; // tolerance to handle floating point rounding when flush

  for (const item of room.items) {
    if (item.wallId !== wall.id) continue;
    if (item.category !== "door" && item.type !== "window") continue;

    const defaultElevation = item.type === "window" ? 42 : 0;
    const itemBottomIn = Math.max(
      0,
      typeof item.elevation === "number" && !isNaN(item.elevation)
        ? item.elevation
        : defaultElevation,
    );
    const itemTopIn = itemBottomIn + item.height;

    const verticalOverlap =
      itemBottomIn < towerTopIn && itemTopIn > towerElevationIn;
    if (!verticalOverlap) continue;

    const itemLeft = item.leftPosition;
    const itemRight = itemLeft + item.width;

    // Item is entirely to the LEFT of the tower (or flush against it) → left boundary
    if (itemRight <= towerLeft + epsilon) {
      effectiveLeft = Math.max(effectiveLeft, itemRight);
    }
    // Item is entirely to the RIGHT of the tower (or flush against it) → right boundary
    if (itemLeft >= towerRight - epsilon) {
      effectiveRight = Math.min(effectiveRight, itemLeft);
    }
  }

  // ── 3. Towers on adjacent connected walls ──────────────────────────────────
  // If a tower on an adjacent wall is close to the corner, its depth protrudes
  // along our current wall and can block the corner space.
  for (const otherTower of closet.towers) {
    if (otherTower.id === tower.id) continue;

    const isAtStart = startConnectedWalls.some(
      (w) => w.id === otherTower.wallId,
    );
    const isAtEnd = endConnectedWalls.some((w) => w.id === otherTower.wallId);
    if (!isAtStart && !isAtEnd) continue;

    const otherWall = room.walls.find((w) => w.id === otherTower.wallId);
    if (!otherWall) continue;

    const otherElevationIn =
      typeof otherTower.elevation === "number" && !isNaN(otherTower.elevation)
        ? Math.max(0, otherTower.elevation)
        : 0;
    const otherTopIn = otherElevationIn + otherTower.height;

    const verticalOverlap =
      otherElevationIn < towerTopIn && otherTopIn > towerElevationIn;
    if (!verticalOverlap) continue;

    const otherPos = otherTower.positionAlongWall ?? 0.5;
    const otherCenterIn = otherPos * otherWall.length;
    const otherHalfW = otherTower.width / 2;
    const otherLeft = otherCenterIn - otherHalfW;
    const otherRight = otherCenterIn + otherHalfW;

    if (isAtStart) {
      const oStart: [number, number] = [
        otherWall.position[0],
        otherWall.position[1],
      ];
      const oEnd: [number, number] = [
        otherWall.position[0] + Math.cos(otherWall.angle) * otherWall.length,
        otherWall.position[1] + Math.sin(otherWall.angle) * otherWall.length,
      ];
      const hit = (a: [number, number], b: [number, number]) =>
        Math.hypot(a[0] - b[0], a[1] - b[1]) <= CONN_TOL;

      let distFromCorner = Infinity;
      if (hit(wallStartPt, oStart)) {
        distFromCorner = Math.max(0, otherLeft);
      } else if (hit(wallStartPt, oEnd)) {
        distFromCorner = Math.max(0, otherWall.length - otherRight);
      }

      const otherHalfThickness =
        typeof otherWall.thickness === "number" && otherWall.thickness > 0
          ? otherWall.thickness / 2
          : 0;
      let oStartMargin = 0,
        oEndMargin = 0;
      for (const w of room.walls) {
        if (w.id === otherWall.id) continue;
        const wStart: [number, number] = [w.position[0], w.position[1]];
        const wEnd: [number, number] = [
          w.position[0] + Math.cos(w.angle) * w.length,
          w.position[1] + Math.sin(w.angle) * w.length,
        ];
        if (hit(oStart, wStart) || hit(oStart, wEnd))
          oStartMargin = otherHalfThickness;
        if (hit(oEnd, wStart) || hit(oEnd, wEnd))
          oEndMargin = otherHalfThickness;
      }
      const totalOtherWidth = closet.towers
        .filter((t) => t.wallId === otherWall.id)
        .reduce(
          (sum, t) => sum + (typeof t.width === "number" ? t.width : 0),
          0,
        );
      const oPhysUsable = Math.max(
        0,
        otherWall.length - oStartMargin - oEndMargin,
      );
      const oPhysGap = Math.max(0, oPhysUsable - totalOtherWidth);
      const oNomGap = Math.max(0, otherWall.length - totalOtherWidth);
      const oGapScale = oPhysGap > 0.1 ? oNomGap / oPhysGap : 1;

      let uiClearance =
        Math.max(
          0,
          distFromCorner -
            (hit(wallStartPt, oStart) ? oStartMargin : oEndMargin),
        ) * oGapScale;

      if (uiClearance < tower.depth - epsilon) {
        // The adjacent wall's tower footprint starts at otherWall.thickness/2
        // from the centerline and extends otherTower.depth into the room.
        // Both offsets consume space along our wall's axis from the corner.
        const otherHalfThickness =
          typeof otherWall.thickness === "number" && otherWall.thickness > 0
            ? otherWall.thickness / 2
            : 0;
        const newEffLeft = otherTower.depth + otherHalfThickness;
        if (newEffLeft > effectiveLeft) {
          effectiveLeft = newEffLeft;
          // Track the depth that should appear in the nominal display
          startAdjacentDepth = Math.max(startAdjacentDepth, otherTower.depth);
        }
      }
    }

    if (isAtEnd) {
      const oStart: [number, number] = [
        otherWall.position[0],
        otherWall.position[1],
      ];
      const oEnd: [number, number] = [
        otherWall.position[0] + Math.cos(otherWall.angle) * otherWall.length,
        otherWall.position[1] + Math.sin(otherWall.angle) * otherWall.length,
      ];
      const hit = (a: [number, number], b: [number, number]) =>
        Math.hypot(a[0] - b[0], a[1] - b[1]) <= CONN_TOL;

      let distFromCorner = Infinity;
      if (hit(wallEndPt, oStart)) {
        distFromCorner = Math.max(0, otherLeft);
      } else if (hit(wallEndPt, oEnd)) {
        distFromCorner = Math.max(0, otherWall.length - otherRight);
      }

      const otherHalfThickness =
        typeof otherWall.thickness === "number" && otherWall.thickness > 0
          ? otherWall.thickness / 2
          : 0;
      let oStartMargin = 0,
        oEndMargin = 0;
      for (const w of room.walls) {
        if (w.id === otherWall.id) continue;
        const wStart: [number, number] = [w.position[0], w.position[1]];
        const wEnd: [number, number] = [
          w.position[0] + Math.cos(w.angle) * w.length,
          w.position[1] + Math.sin(w.angle) * w.length,
        ];
        if (hit(oStart, wStart) || hit(oStart, wEnd))
          oStartMargin = otherHalfThickness;
        if (hit(oEnd, wStart) || hit(oEnd, wEnd))
          oEndMargin = otherHalfThickness;
      }
      const totalOtherWidth = closet.towers
        .filter((t) => t.wallId === otherWall.id)
        .reduce(
          (sum, t) => sum + (typeof t.width === "number" ? t.width : 0),
          0,
        );
      const oPhysUsable = Math.max(
        0,
        otherWall.length - oStartMargin - oEndMargin,
      );
      const oPhysGap = Math.max(0, oPhysUsable - totalOtherWidth);
      const oNomGap = Math.max(0, otherWall.length - totalOtherWidth);
      const oGapScale = oPhysGap > 0.1 ? oNomGap / oPhysGap : 1;

      let uiClearance =
        Math.max(
          0,
          distFromCorner - (hit(wallEndPt, oStart) ? oStartMargin : oEndMargin),
        ) * oGapScale;

      if (uiClearance < tower.depth - epsilon) {
        // Symmetric: account for the adjacent wall's half-thickness on the right.
        const otherHalfThickness =
          typeof otherWall.thickness === "number" && otherWall.thickness > 0
            ? otherWall.thickness / 2
            : 0;
        const newEffRight =
          wall.length - (otherTower.depth + otherHalfThickness);
        if (newEffRight < effectiveRight) {
          effectiveRight = newEffRight;
          // Track the depth that should appear in the nominal display
          endAdjacentDepth = Math.max(endAdjacentDepth, otherTower.depth);
        }
      }
    }
  }

  // Save the global boundaries before same-wall towers restrict it further
  const globalEffectiveLeft = effectiveLeft;
  const globalEffectiveRight = effectiveRight;

  // ── 4. Other towers on the same wall ──────────────────────────────────────
  for (const otherTower of closet.towers) {
    if (otherTower.id === tower.id) continue;
    if (otherTower.wallId !== wall.id) continue;

    const otherElevationIn =
      typeof otherTower.elevation === "number" && !isNaN(otherTower.elevation)
        ? Math.max(0, otherTower.elevation)
        : 0;
    const otherTopIn = otherElevationIn + otherTower.height;

    const verticalOverlap =
      otherElevationIn < towerTopIn && otherTopIn > towerElevationIn;
    if (!verticalOverlap) continue;

    const otherPos = otherTower.positionAlongWall ?? 0.5;
    const otherCenterIn = otherPos * wall.length;
    const otherHalfW = otherTower.width / 2;
    const otherLeft = otherCenterIn - otherHalfW;
    const otherRight = otherCenterIn + otherHalfW;

    // Other tower is to the left of our tower
    if (otherRight <= towerLeft + epsilon) {
      effectiveLeft = Math.max(effectiveLeft, otherRight);
    }
    // Other tower is to the right of our tower
    if (otherLeft >= towerRight - epsilon) {
      effectiveRight = Math.min(effectiveRight, otherLeft);
    }
  }

  const rawLeft = towerLeft - effectiveLeft;
  const rawRight = effectiveRight - towerRight;

  // ── 5. Consistent gap scale (global, not per-tower) ───────────────────────
  // The physical usable range considers corner margins and corner blockages.
  // We satisfy the user invariant: LeftClearance + TowerWidth + RightClearance = WallDisplayWidth
  const totalTowerWidthIn = closet.towers
    .filter((t) => t.wallId === wall.id)
    .reduce((sum, t) => sum + t.width, 0);

  const isLeftWallOnly =
    Math.abs(globalEffectiveLeft - startMargin) < 0.1 &&
    startAdjacentDepth === 0;
  const isRightWallOnly =
    Math.abs(globalEffectiveRight - (wall.length - endMargin)) < 0.1 &&
    endAdjacentDepth === 0;

  const nominalGlobalLeft = isLeftWallOnly ? 0 : startAdjacentDepth;
  const nominalGlobalRight = isRightWallOnly
    ? wall.length
    : wall.length - endAdjacentDepth;

  const physicalUsable = globalEffectiveRight - globalEffectiveLeft;
  const nominalUsable = nominalGlobalRight - nominalGlobalLeft;

  const totalPhysicalGap = Math.max(0, physicalUsable - totalTowerWidthIn);
  
  const nominalTowerWidthIn = closet.towers
    .filter((t) => t.wallId === wall.id && t.partType !== 'panel' && t.partType !== 'filler')
    .reduce((sum, t) => sum + t.width, 0);
  const totalNominalGap = Math.max(0, nominalUsable - nominalTowerWidthIn);
  const gapScale =
    totalPhysicalGap > 0.1 ? totalNominalGap / totalPhysicalGap : 1;

  let uiLeft = rawLeft * gapScale;
  let uiRight = rawRight * gapScale;

  return {
    left: uiLeft < epsilon ? 0 : Math.max(0, uiLeft),
    right: uiRight < epsilon ? 0 : Math.max(0, uiRight),
    effectiveLeft,
    effectiveRight,
    gapScale,
  };
});

/** Wall the selected tower is placed on */
const selectedTowerWall = computed(() => {
  const tower = selectedTower.value;
  if (!tower?.wallId) return null;
  return room.walls.find((w) => w.id === tower.wallId) ?? null;
});

onMounted(async () => {
  appStore.setStep("design");
  
  await closet.loadCatalogs();

  if (
    closet.towers.length > 0 &&
    closet.towers.every((tower) => !tower.catalogId)
  ) {
    closet.setTowers([]);
    selection.selectTower(null);
    return;
  }

  if (!selection.selectedTowerId && closet.towers[0]) {
    selection.selectTower(closet.towers[0].id);
  }

  // Clamp any towers whose stored position falls outside the usable wall boundary.
  // This can happen when positions were saved before wall-thickness margins were enforced.
  sanitizeAllTowerPositions();
});

/**
 * For every tower on a wall, clamp its positionAlongWall so the tower stays
 * within the usable span [startMargin, wall.length - endMargin] where each
 * margin equals wall.thickness when that endpoint is connected to another wall.
 */
function sanitizeAllTowerPositions() {
  const CONN_TOL = 1;
  for (const tower of closet.towers) {
    if (!tower.wallId) continue;
    const wall = room.walls.find((w) => w.id === tower.wallId);
    if (!wall) continue;

    const wallThickness =
      typeof wall.thickness === "number" && wall.thickness > 0
        ? wall.thickness
        : 0;

    const wallStartPt: [number, number] = [wall.position[0], wall.position[1]];
    const wallEndPt: [number, number] = [
      wall.position[0] + Math.cos(wall.angle) * wall.length,
      wall.position[1] + Math.sin(wall.angle) * wall.length,
    ];

    let startConnected = false;
    let endConnected = false;
    for (const other of room.walls) {
      if (other.id === wall.id) continue;
      const oStart: [number, number] = [other.position[0], other.position[1]];
      const oEnd: [number, number] = [
        other.position[0] + Math.cos(other.angle) * other.length,
        other.position[1] + Math.sin(other.angle) * other.length,
      ];
      const hit = (a: [number, number], b: [number, number]) =>
        Math.hypot(a[0] - b[0], a[1] - b[1]) <= CONN_TOL;
      if (
        !startConnected &&
        (hit(wallStartPt, oStart) || hit(wallStartPt, oEnd))
      )
        startConnected = true;
      if (!endConnected && (hit(wallEndPt, oStart) || hit(wallEndPt, oEnd)))
        endConnected = true;
      if (startConnected && endConnected) break;
    }

    const halfThickness = wallThickness / 2;
    const startMargin = startConnected
      ? Math.min(halfThickness, wall.length)
      : 0;
    const endMargin = endConnected ? Math.min(halfThickness, wall.length) : 0;
    const usableLeft = startMargin;
    const usableRight = Math.max(startMargin, wall.length - endMargin);

    const halfW = tower.width / 2;
    const minCenterIn = usableLeft + halfW;
    const maxCenterIn = Math.max(minCenterIn, usableRight - halfW);

    const currentCenterIn = (tower.positionAlongWall ?? 0.5) * wall.length;
    const clampedCenterIn = Math.max(
      minCenterIn,
      Math.min(maxCenterIn, currentCenterIn),
    );

    if (Math.abs(clampedCenterIn - currentCenterIn) > 0.001) {
      closet.updateTower(tower.id, {
        positionAlongWall: clampedCenterIn / wall.length,
      });
    }
  }
}

function addCategoryTower(category: ClosetCatalogCategory) {
  closet.addTowerFromCatalog(category.doorMode, category.categoryCode);
  const added = closet.towers[closet.towers.length - 1];
  if (!added) return;

  // Capture the selected wall ID BEFORE selectTower() clears it
  // (selectTower clears selectedWallId per the selection store contract)
  const wallId = selection.selectedWallId ?? room.closetWall?.id ?? null;

  selection.selectTower(added.id);

  // Place on the selected wall, or fall back to the closet wall
  if (wallId) {
    closet.setTowerWall(added.id, wallId, 0.5);
  }
}

function nudgeTowerLeft() {
  const tower = selectedTower.value;
  const wall = selectedTowerWall.value;
  if (!tower || !wall) return;
  closet.moveTowerAlongWall(tower.id, -0.05, wall.length);
  clampSelectedTowerToUsableBounds();
}

function nudgeTowerRight() {
  const tower = selectedTower.value;
  const wall = selectedTowerWall.value;
  if (!tower || !wall) return;
  closet.moveTowerAlongWall(tower.id, 0.05, wall.length);
  clampSelectedTowerToUsableBounds();
}

/**
 * After any positional change, ensure the selected tower's centre stays within
 * the usable wall bounds [effectiveLeft + halfW, effectiveRight - halfW].
 * This mirrors the clamping in the elevation-view's clampTowerCenter() so that
 * the ← → buttons can never push a tower into a connected wall's thickness zone.
 */
function clampSelectedTowerToUsableBounds() {
  const tower = selectedTower.value;
  const wall = selectedTowerWall.value;
  const c = clearances.value;
  if (!tower || !wall || !c) return;

  const halfW = tower.width / 2;
  const minCenterIn = c.effectiveLeft + halfW;
  const maxCenterIn = Math.max(minCenterIn, c.effectiveRight - halfW);

  const currentCenterIn = (tower.positionAlongWall ?? 0.5) * wall.length;
  const clampedCenterIn = Math.max(
    minCenterIn,
    Math.min(maxCenterIn, currentCenterIn),
  );

  if (Math.abs(clampedCenterIn - currentCenterIn) > 0.001) {
    closet.updateTower(tower.id, {
      positionAlongWall: clampedCenterIn / wall.length,
    });
  }
}

function setDoorMode(mode: ClosetDoorMode) {
  selectedDoorMode.value = mode;
}

function onDimensionInput(
  dimension: "width" | "depth" | "height" | "outset" | "elevation",
  event: Event,
) {
  const tower = selectedTower.value;
  if (!tower) return;
  const value = Number((event.target as HTMLInputElement).value);
  if (!Number.isFinite(value)) return;

  if (dimension === "width") {
    const wall = selectedTowerWall.value;
    closet.setTowerWidth(tower.id, value, wall?.length);
    return;
  }

  if (dimension === "depth") {
    closet.setTowerDepth(tower.id, value);
    return;
  }

  if (dimension === "outset") {
    closet.setTowerOutset(tower.id, value);
    return;
  }

  if (dimension === "elevation") {
    const maxIn = maxElevationIn.value;
    closet.setTowerElevation(tower.id, Math.min(value, maxIn));
    return;
  }

  closet.setTowerHeight(tower.id, Math.min(value, maxHeightIn.value));
  return;
}

function onClearanceInput(side: "left" | "right", event: Event) {
  const tower = selectedTower.value;
  const wall = selectedTowerWall.value;
  const c = clearances.value;
  if (!tower || !wall || !c) return;

  const valueIn = Number((event.target as HTMLInputElement).value);
  if (!Number.isFinite(valueIn)) return;

  const halfW = tower.width / 2;

  let newCenterIn = 0;

  // Reverse the same global gap scale used for display.
  const gapScale = c.gapScale;
  const rawValueIn = gapScale > 0.01 ? valueIn / gapScale : valueIn;

  if (side === "left") {
    newCenterIn = c.effectiveLeft + rawValueIn + halfW;
  } else {
    newCenterIn = c.effectiveRight - rawValueIn - halfW;
  }

  // Ensure center stays within raw wall bounds
  newCenterIn = Math.max(halfW, Math.min(wall.length - halfW, newCenterIn));

  const positionAlongWall = newCenterIn / wall.length;
  closet.updateTower(tower.id, { positionAlongWall });
}

function removeTower(towerId: string) {
  closet.removeTower(towerId);
  if (selection.selectedTowerId === towerId) {
    selection.selectTower(closet.towers[0]?.id ?? null);
  }
}

function distributeTowers() {
  const tower = selectedTower.value;
  const wall = selectedTowerWall.value;
  const c = clearances.value;
  if (!tower || !wall || !c) return;

  // Center the selected tower within its available gap [effectiveLeft, effectiveRight].
  // effectiveLeft and effectiveRight already account for neighboring towers,
  // doors, windows, and wall boundaries — so other towers stay untouched.
  const availableSpace = c.effectiveRight - c.effectiveLeft;
  const newCenter = c.effectiveLeft + availableSpace / 2;
  const positionAlongWall = Math.max(
    tower.width / 2 / wall.length,
    Math.min(
      (wall.length - tower.width / 2) / wall.length,
      newCenter / wall.length,
    ),
  );
  closet.updateTower(tower.id, { positionAlongWall });
}

/**
 * Move the selected tower all the way to the left boundary.
 * The left edge of the tower will be flush against the nearest obstacle on the
 * left: a wall corner margin, a door/window, or another tower.
 */
function moveTowerLeft() {
  const tower = selectedTower.value;
  const wall = selectedTowerWall.value;
  const c = clearances.value;
  if (!tower || !wall || !c) return;

  // Place the tower's left edge at effectiveLeft.
  const newCenter = c.effectiveLeft + tower.width / 2;
  const positionAlongWall = Math.max(
    tower.width / 2 / wall.length,
    Math.min(
      (wall.length - tower.width / 2) / wall.length,
      newCenter / wall.length,
    ),
  );
  closet.updateTower(tower.id, { positionAlongWall });
}

/**
 * Move the selected tower all the way to the right boundary.
 * The right edge of the tower will be flush against the nearest obstacle on the
 * right: a wall corner margin, a door/window, or another tower.
 */
function moveTowerRight() {
  const tower = selectedTower.value;
  const wall = selectedTowerWall.value;
  const c = clearances.value;
  if (!tower || !wall || !c) return;

  // Place the tower's right edge at effectiveRight.
  const newCenter = c.effectiveRight - tower.width / 2;
  const positionAlongWall = Math.max(
    tower.width / 2 / wall.length,
    Math.min(
      (wall.length - tower.width / 2) / wall.length,
      newCenter / wall.length,
    ),
  );
  closet.updateTower(tower.id, { positionAlongWall });
}

function categoryTitle(category: ClosetCatalogCategory): string {
  return `${category.categoryName} (${category.categoryCode})`;
}

function categoryDepthRange(category: ClosetCatalogCategory): string {
  const limits = getCategoryLimits(category.doorMode, category.categoryCode);
  return `${fmt(limits.minD)} - ${fmt(limits.maxD)}`;
}

function towerSubtitle(tower: {
  categoryName?: string;
  categoryCode?: ClosetCatalogCategoryCode;
  catalogId?: number;
  partType?: "cabinet" | "panel" | "filler";
}): string {
  if (tower.partType === "panel") return "Panel";
  if (tower.partType === "filler") return "Filler";
  if (!tower.categoryName || !tower.categoryCode) return "Legacy tower";
  return `${tower.categoryName} (${tower.categoryCode})`;
}

function addCustomPartHandler(type: 'panel' | 'filler') {
  const tower = selectedTower.value;
  if (tower && (!tower.partType || tower.partType === 'cabinet')) {
    pendingCustomPart.value = type;
  } else {
    const wallId = selection.selectedWallId ?? room.closetWall?.id ?? null;
    const newPart = closet.addCustomPart(type);
    selection.selectTower(newPart.id);
    if (wallId) {
      closet.setTowerWall(newPart.id, wallId, 0.5);
    }
  }
}

function addPanel() {
  addCustomPartHandler('panel');
}

function addFiller() {
  addCustomPartHandler('filler');
}

function confirmCustomPartSide(side: 'left' | 'right') {
  if (!pendingCustomPart.value) return;
  const attachedId = selection.selectedTowerId ?? undefined;
  const newPart = closet.addCustomPart(
    pendingCustomPart.value,
    attachedId,
    selectedTowerWall.value?.length,
    side
  );
  selection.selectTower(newPart.id);
  pendingCustomPart.value = null;
}

function cancelCustomPartSide() {
  pendingCustomPart.value = null;
}
</script>

<template>
  <div class="build-page">
    <TopToolbar>
      <template #title>Build Closet</template>
    </TopToolbar>

    <div class="build-body">
      <aside class="builder-panel catalog-panel">
        <section class="panel-section">
          <h2 class="section-title">Door Mode</h2>
          <div class="segmented-control">
            <button
              class="segment-btn"
              :class="{ active: selectedDoorMode === 'without_doors' }"
              @click="setDoorMode('without_doors')"
            >
              Without Doors
            </button>
            <button
              class="segment-btn"
              :class="{ active: selectedDoorMode === 'with_doors' }"
              @click="setDoorMode('with_doors')"
            >
              With Doors
            </button>
          </div>
        </section>

        <section class="panel-section">
          <h2 class="section-title">Categories</h2>
          <div class="category-list">
            <button
              v-for="category in visibleCategories"
              :key="`${category.doorMode}-${category.categoryCode}`"
              class="category-card"
              @click="addCategoryTower(category)"
            >
              <div>
                <strong>{{ categoryTitle(category) }}</strong>
                <span>{{ categoryDepthRange(category) }} depth</span>
              </div>
              <Plus :size="16" />
            </button>
          </div>
        </section>

        <section class="panel-section">
          <h2 class="section-title">Custom Parts</h2>
          <div class="category-list">
            <button class="category-card" @click="addPanel">
              <div>
                <strong>Panel</strong>
                <span>W: 0.7500"</span>
              </div>
              <Plus :size="16" />
            </button>
            <button class="category-card" @click="addFiller">
              <div>
                <strong>Filler</strong>
                <span>D: 0.7500"</span>
              </div>
              <Plus :size="16" />
            </button>
          </div>
        </section>
      </aside>

      <main class="builder-workspace">
        <div class="workspace-header">
          <div>
            <h1>Closet Towers</h1>
            <p>
              {{ closet.towers.length }} tower{{
                closet.towers.length === 1 ? "" : "s"
              }}
              configured
            </p>
          </div>
          <button
            v-if="!showElevation"
            class="elevation-open-btn"
            @click="showElevation = true"
          >
            Elevation
          </button>
        </div>

        <div
          v-if="showElevation"
          class="elevation-inline-container"
          style="
            flex: 1;
            display: flex;
            flex-direction: column;
            position: relative;
          "
        >
          <FloorPlan
            :elevation-only="true"
            :initial-wall-id="
              selectedTower?.wallId ?? selection.selectedWallId ?? undefined
            "
            @close="showElevation = false"
          />
        </div>
        <div
          v-show="!showElevation"
          class="preview-section"
          style="
            flex: 1;
            min-height: 200px;
            display: flex;
            flex-direction: column;
            margin-bottom: 24px;
          "
        >
          <RoomPlanPreview />
        </div>
      </main>

      <aside class="builder-panel edit-panel">
        <section
          v-if="
            selectedTower && (selectedTowerLimits || selectedTower.partType)
          "
          class="panel-section"
        >
          <h2 class="section-title">Selected Tower</h2>
          <div class="selected-summary">
            <div class="selected-summary-header">
              <strong>{{ selectedTower.label }}</strong>
              <button
                class="icon-btn delete-btn-large"
                title="Remove tower"
                @click="removeTower(selectedTower.id)"
              >
                <Trash2 :size="20" />
              </button>
            </div>
            <span>{{ towerSubtitle(selectedTower) }}</span>
          </div>

          <div class="dimension-control">
            <div class="dimension-head">
              <label>Width</label>
              <span>{{ fmt(selectedTower.width) }}</span>
            </div>
            <input
              class="number-input"
              type="number"
              step="0.0001"
              :min="
                selectedTower.partType === 'filler'
                  ? 1.5
                  : selectedTowerLimits
                    ? selectedTowerLimits.minW
                    : 0
              "
              :max="
                selectedTowerLimits
                  ? selectedTowerLimits.maxW
                  : undefined
              "
              :value="truncTo4(selectedTower.width)"
              :disabled="selectedTower.partType === 'panel'"
              @change="onDimensionInput('width', $event)"
            />
          </div>

          <div class="dimension-control">
            <div class="dimension-head">
              <label>Height</label>
              <span>{{ fmt(selectedTower.height) }}</span>
            </div>
            <input
              class="number-input"
              type="number"
              step="0.0001"
              :min="
                selectedTowerLimits
                  ? selectedTowerLimits.minH
                  : 0
              "
              :max="
                Math.min(selectedTowerLimits?.maxH ?? Infinity, maxHeightIn)
              "
              :value="truncTo4(selectedTower.height)"
              :disabled="false"
              @change="onDimensionInput('height', $event)"
            />
          </div>

          <div class="dimension-control">
            <div class="dimension-head">
              <label>Depth</label>
              <span>{{ fmt(selectedTower.depth) }}</span>
            </div>
            <input
              class="number-input"
              type="number"
              step="0.0001"
              :min="
                selectedTowerLimits
                  ? selectedTowerLimits.minD
                  : 0
              "
              :max="
                selectedTowerLimits
                  ? selectedTowerLimits.maxD
                  : undefined
              "
              :value="truncTo4(selectedTower.depth)"
              :disabled="selectedTower.partType === 'filler'"
              @change="onDimensionInput('depth', $event)"
            />
          </div>

          <div class="dimension-control">
            <div class="dimension-head">
              <label>Outset</label>
              <span>{{ fmt(selectedTower.outset ?? 0) }}</span>
            </div>
            <input
              id="tower-outset-input"
              class="number-input"
              type="number"
              step="0.0001"
              min="0"
              :value="truncTo4(selectedTower.outset ?? 0)"
              @change="onDimensionInput('outset', $event)"
            />
          </div>

          <div class="dimension-control">
            <div class="dimension-head">
              <label>Elevation</label>
              <span>{{ fmt(selectedTower.elevation ?? 0) }}</span>
            </div>
            <input
              id="tower-elevation-input"
              class="number-input"
              type="number"
              step="0.0001"
              min="0"
              :max="maxElevationIn"
              :value="truncTo4(selectedTower.elevation ?? 0)"
              @change="onDimensionInput('elevation', $event)"
            />
          </div>

          <!-- Clearance display -->
          <div v-if="clearances" class="clearance-section">
            <h2 class="section-title">Clearance</h2>

            <div class="clearance-grid">
              <div class="dimension-control">
                <div class="dimension-head">
                  <label>Left</label>
                  <span>{{ fmt(clearances.left) }}</span>
                </div>
                <input
                  class="number-input"
                  type="number"
                  step="0.0001"
                  min="0"
                  :max="fromCm(clearances.left + clearances.right)"
                  :value="truncTo4(fromCm(clearances.left))"
                  @change="onClearanceInput('left', $event)"
                />
              </div>

              <div class="dimension-control">
                <div class="dimension-head">
                  <label>Right</label>
                  <span>{{ fmt(clearances.right) }}</span>
                </div>
                <input
                  class="number-input"
                  type="number"
                  step="0.0001"
                  min="0"
                  :max="fromCm(clearances.left + clearances.right)"
                  :value="truncTo4(fromCm(clearances.right))"
                  @change="onClearanceInput('right', $event)"
                />
              </div>
              <div
                class="dimension-control snap-btn-row"
                style="grid-column: span 2; margin-top: 4px"
              >
                <button class="center-btn snap-btn" @click="moveTowerLeft">
                  ← Left
                </button>
                <button
                  class="center-btn snap-btn center-btn-sm"
                  @click="distributeTowers"
                >
                  Center
                </button>
                <button class="center-btn snap-btn" @click="moveTowerRight">
                  Right →
                </button>
              </div>
            </div>
          </div>
        </section>

        <section v-else class="panel-section muted-section">
          <h2 class="section-title">Selected Tower</h2>
          <p>Select a catalog-driven tower to edit dimensions.</p>
        </section>
      </aside>
    </div>

    <FooterBar
      back-label="Back to Floor Plan"
      back-route="/closet/floorplan"
      forward-label="Continue to Review"
      forward-route="/closet/review"
      :show-view-toggle="false"
    />

    <div v-if="pendingCustomPart" class="modal-overlay">
      <div class="modal-dialog">
        <h3 class="modal-title">Select position of the part</h3>
        <div class="modal-actions">
          <button class="modal-btn" @click="confirmCustomPartSide('left')">Left</button>
          <button class="modal-btn" @click="confirmCustomPartSide('right')">Right</button>
          <button class="modal-btn secondary" @click="cancelCustomPartSide()">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.build-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #07111f;
  color: #e2e8f0;
}

.build-body {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 320px;
  flex: 1;
  min-height: 0;
}

.builder-panel {
  overflow-y: auto;
  padding: 18px 14px;
  background: rgba(15, 23, 42, 0.72);
}

.catalog-panel {
  border-right: 1px solid rgba(255, 255, 255, 0.07);
}

.edit-panel {
  border-left: 1px solid rgba(255, 255, 255, 0.07);
}

.panel-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 22px;
}

.section-title {
  margin: 0;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.segmented-control {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(2, 6, 23, 0.42);
}

.segment-btn,
.category-card,
.tower-card,
.icon-btn {
  font: inherit;
}

.segment-btn {
  border: none;
  border-radius: 6px;
  padding: 8px 6px;
  background: transparent;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.segment-btn.active {
  background: rgba(251, 191, 36, 0.16);
  color: #fbbf24;
}

.category-list,
.tower-grid {
  display: grid;
  gap: 8px;
}

.category-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.45);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.category-card:hover {
  border-color: rgba(251, 191, 36, 0.34);
  background: rgba(51, 65, 85, 0.62);
}

.category-card strong,
.category-card span {
  display: block;
}

.category-card strong {
  color: #f1f5f9;
  font-size: 13px;
}

.category-card span {
  margin-top: 3px;
  color: #94a3b8;
  font-size: 11px;
}

.builder-workspace {
  min-width: 0;
  padding: 28px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.workspace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.workspace-header h1 {
  margin: 0 0 4px;
  color: #f8fafc;
  font-size: 24px;
}

.workspace-header p,
.muted-section p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}

.empty-state {
  display: grid;
  min-height: 260px;
  place-items: center;
  border: 1px dashed rgba(148, 163, 184, 0.28);
  border-radius: 8px;
  color: #94a3b8;
  text-align: center;
}

.tower-grid {
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.tower-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.65);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.tower-card.selected {
  border-color: rgba(251, 191, 36, 0.58);
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.16);
}

.tower-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tower-card span {
  color: #94a3b8;
  font-size: 12px;
}

.tower-dims {
  color: #cbd5e1;
  font-size: 12px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.icon-btn:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
}

.delete-btn-large {
  color: #ef4444;
  width: 32px;
  height: 32px;
}

.delete-btn-large:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.selected-summary {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.46);
}

.selected-summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.selected-summary span {
  color: #94a3b8;
  font-size: 12px;
}

.dimension-control {
  display: grid;
  gap: 7px;
}

.dimension-head {
  display: flex;
  justify-content: space-between;
  color: #cbd5e1;
  font-size: 12px;
  font-weight: 700;
}

.dimension-control input[type="range"] {
  width: 100%;
  accent-color: #fbbf24;
}

.number-input {
  width: 100%;
  padding: 7px 9px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 7px;
  background: rgba(2, 6, 23, 0.56);
  color: #e2e8f0;
}

.clearance-section {
  padding: 12px;
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.46);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.clearance-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.clearance-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.clearance-label {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
}

.clearance-value {
  color: #fbbf24;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.center-btn {
  padding: 10px 16px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 6px;
  color: #fbbf24;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  width: 100%;
}

.center-btn:hover {
  background: rgba(251, 191, 36, 0.2);
  border-color: rgba(251, 191, 36, 0.5);
}

.snap-btn-row {
  display: flex;
  gap: 6px;
  align-items: stretch;
}

.snap-btn {
  flex: 1;
}

.center-btn-sm {
  flex: 0 0 auto;
  width: 56px;
  padding-left: 4px;
  padding-right: 4px;
  font-size: 11px;
}

@media (max-width: 1100px) {
  .build-body {
    grid-template-columns: 1fr;
  }

  .catalog-panel,
  .edit-panel {
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }
}

.elevation-open-btn {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
}

.elevation-open-btn:hover {
  background: #2563eb;
}

/* ── Wall placement controls ──────────────────────────────────────────────── */

.wall-placement-section {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.46);
  border: 1px solid rgba(251, 191, 36, 0.18);
}

.wall-placement-section.muted {
  border-color: rgba(255, 255, 255, 0.06);
}

.wall-placement-section.muted span {
  color: #64748b;
  font-size: 12px;
}

.wall-placement-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wall-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.3);
  color: #fbbf24;
  font-size: 11px;
  font-weight: 700;
}

.placement-hint {
  color: #64748b;
  font-size: 11px;
}

.move-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.move-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(251, 191, 36, 0.3);
  border-radius: 6px;
  background: rgba(251, 191, 36, 0.1);
  color: #fbbf24;
  font-size: 16px;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.15s,
    border-color 0.15s;
  font: inherit;
}

.move-btn:hover {
  background: rgba(251, 191, 36, 0.22);
  border-color: rgba(251, 191, 36, 0.55);
}

.move-btn:active {
  background: rgba(251, 191, 36, 0.32);
}

.position-bar {
  position: relative;
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  overflow: visible;
}

.position-thumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fbbf24;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.5);
  pointer-events: none;
  transition: left 0.1s;
}

/* ── Modal overlay ──────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(2, 6, 23, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-dialog {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 24px;
  min-width: 320px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
}

.modal-title {
  margin: 0 0 20px;
  color: #f1f5f9;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.modal-btn {
  padding: 10px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.modal-btn:hover {
  background: #2563eb;
}

.modal-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
}

.modal-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>
