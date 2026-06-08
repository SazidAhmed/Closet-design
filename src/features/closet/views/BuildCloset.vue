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
const { fmt, fromCm, toCm } = useUnit();

function fromCmDisplay(cm: number): number {
  return Math.round(fromCm(cm) * 10) / 10;
}

const selectedDoorMode = ref<ClosetDoorMode>("without_doors");
const showElevation = ref(false);

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
const maxElevationCm = computed(() => {
  const tower = selectedTower.value;
  if (!tower) return 0;
  return Math.max(0, room.height - tower.height);
});

/**
 * Maximum height (cm) for the selected tower.
 *
 * The tower height is limited by:
 *  1. The catalog's maxH limit.
 *  2. The room height minus the tower's elevation.
 *  3. For any window on the same wall that horizontally overlaps the tower,
 *     the window's bottom edge — so the tower cannot grow into the window.
 *
 * Window elevation is stored in inches; tower dimensions are in cm.
 */
const CM_PER_INCH = 2.54;

const maxHeightCm = computed(() => {
  const tower = selectedTower.value;
  const wall = selectedTowerWall.value;
  if (!tower) return Infinity;

  // 1. Room-height ceiling (tower bottom + height ≤ room height)
  const towerElevationCm =
    typeof tower.elevation === "number" && !isNaN(tower.elevation)
      ? Math.max(0, tower.elevation)
      : 0;
  let maxH = Math.max(0, room.height - towerElevationCm);

  // 2. Window constraint — only when the tower is placed on a wall
  if (wall) {
    const pos = tower.positionAlongWall ?? 0.5;
    const centerCm = pos * wall.length;
    const halfW = tower.width / 2;
    const towerLeft = centerCm - halfW;
    const towerRight = centerCm + halfW;

    for (const item of room.items) {
      if (item.wallId !== wall.id) continue;
      if (item.type !== "window") continue;

      // Window horizontal extent (leftPosition stored in inches)
      const itemLeft = (item.leftPosition ?? 0) * CM_PER_INCH;
      const itemRight = itemLeft + item.width;

      // Does the window horizontally overlap the tower?
      const hOverlap = itemLeft < towerRight && itemRight > towerLeft;
      if (!hOverlap) continue;

      // Window bottom elevation in cm (elevation stored in inches; default 42 in for windows)
      const defaultElevationIn = 42;
      const itemElevationIn =
        typeof item.elevation === "number" && !isNaN(item.elevation)
          ? item.elevation
          : defaultElevationIn;
      const windowBottomCm = Math.max(0, itemElevationIn) * CM_PER_INCH;

      // Tower height must not cause the tower top to exceed the window bottom
      const allowedHeight = Math.max(0, windowBottomCm - towerElevationCm);
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

  // Tower left/right edges in wall-axis cm
  const pos = tower.positionAlongWall ?? 0.5;
  const centerCm = pos * wall.length;
  const halfW = tower.width / 2;
  const towerLeft = centerCm - halfW;
  const towerRight = centerCm + halfW;

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
  for (const other of room.walls) {
    if (other.id === wall.id) continue;
    const oStart: [number, number] = [other.position[0], other.position[1]];
    const oEnd: [number, number] = [
      other.position[0] + Math.cos(other.angle) * other.length,
      other.position[1] + Math.sin(other.angle) * other.length,
    ];
    const hit = (a: [number, number], b: [number, number]) =>
      Math.hypot(a[0] - b[0], a[1] - b[1]) <= CONN_TOL;
    if (!startConnected && (hit(wallStartPt, oStart) || hit(wallStartPt, oEnd)))
      startConnected = true;
    if (!endConnected && (hit(wallEndPt, oStart) || hit(wallEndPt, oEnd)))
      endConnected = true;
    if (startConnected && endConnected) break;
  }

  const halfThickness = wallThickness / 2;
  const startMargin = startConnected ? Math.min(halfThickness, wall.length) : 0;
  const endMargin = endConnected ? Math.min(halfThickness, wall.length) : 0;

  // Usable wall boundaries (matches elevationHorizontalBoundsForWall with wall.thickness/2)
  let effectiveLeft = startMargin;
  let effectiveRight = Math.max(startMargin, wall.length - endMargin);

  const towerElevationCm =
    typeof tower.elevation === "number" && !isNaN(tower.elevation)
      ? Math.max(0, tower.elevation)
      : 0;
  const towerTopCm = towerElevationCm + tower.height;

  // ── 2. Door / window obstructions ───────────────────────────────────────
  const CM_PER_INCH = 2.54;
  const epsilon = 0.5; // tolerance to handle floating point rounding when flush

  for (const item of room.items) {
    if (item.wallId !== wall.id) continue;
    if (item.category !== "door" && item.type !== "window") continue;

    const defaultElevation = item.type === "window" ? 42 : 0;
    const itemElevation =
      typeof item.elevation === "number" && !isNaN(item.elevation)
        ? item.elevation
        : defaultElevation;
    const itemBottomCm = Math.max(0, itemElevation * CM_PER_INCH);
    const itemTopCm = itemBottomCm + item.height;

    const verticalOverlap =
      itemBottomCm < towerTopCm && itemTopCm > towerElevationCm;
    if (!verticalOverlap) continue;

    // Use leftPosition * CM_PER_INCH to exactly match elevation view's geometry,
    // rather than positionAlongWall which can suffer from round-trip precision loss.
    const itemLeft = item.leftPosition * CM_PER_INCH;
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

  // ── 3. Other towers on the same wall ──────────────────────────────────────
  for (const otherTower of closet.towers) {
    if (otherTower.id === tower.id) continue;
    if (otherTower.wallId !== wall.id) continue;

    const otherElevationCm =
      typeof otherTower.elevation === "number" && !isNaN(otherTower.elevation)
        ? Math.max(0, otherTower.elevation)
        : 0;
    const otherTopCm = otherElevationCm + otherTower.height;

    const verticalOverlap =
      otherElevationCm < towerTopCm && otherTopCm > towerElevationCm;
    if (!verticalOverlap) continue;

    const otherPos = otherTower.positionAlongWall ?? 0.5;
    const otherCenterCm = otherPos * wall.length;
    const otherHalfW = otherTower.width / 2;
    const otherLeft = otherCenterCm - otherHalfW;
    const otherRight = otherCenterCm + otherHalfW;

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

  // To satisfy user expectation that Left + Width + Right = Wall Length,
  // we map the physical usable bounds back to the nominal bounds (0 to wall.length).
  // The hidden physical margins (startMargin and endMargin) are subtracted from the physical space.
  // We restore the nominal bounds by subtracting startMargin from effectiveLeft
  // and adding endMargin to effectiveRight.
  const nominalEffectiveLeft = Math.max(0, effectiveLeft - startMargin);
  const nominalEffectiveRight = Math.min(
    wall.length,
    effectiveRight + endMargin,
  );

  const actualUsable = effectiveRight - effectiveLeft;
  const nominalUsable = nominalEffectiveRight - nominalEffectiveLeft;

  let uiLeft = rawLeft;
  let uiRight = rawRight;

  if (actualUsable >= tower.width) {
    const slideRange = actualUsable - tower.width;
    const nominalSlideRange = Math.max(0, nominalUsable - tower.width);
    if (slideRange > 0.1) {
      uiLeft = (rawLeft / slideRange) * nominalSlideRange;
      uiRight = (rawRight / slideRange) * nominalSlideRange;
    } else {
      uiLeft = nominalSlideRange / 2;
      uiRight = nominalSlideRange / 2;
    }
  }

  return {
    left: uiLeft < epsilon ? 0 : Math.max(0, uiLeft),
    right: uiRight < epsilon ? 0 : Math.max(0, uiRight),
    effectiveLeft,
    effectiveRight,
    nominalEffectiveLeft,
    nominalEffectiveRight,
  };
});

/** Wall the selected tower is placed on */
const selectedTowerWall = computed(() => {
  const tower = selectedTower.value;
  if (!tower?.wallId) return null;
  return room.walls.find((w) => w.id === tower.wallId) ?? null;
});

onMounted(() => {
  appStore.setStep("design");
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
    const minCenterCm = usableLeft + halfW;
    const maxCenterCm = Math.max(minCenterCm, usableRight - halfW);

    const currentCenterCm = (tower.positionAlongWall ?? 0.5) * wall.length;
    const clampedCenterCm = Math.max(
      minCenterCm,
      Math.min(maxCenterCm, currentCenterCm),
    );

    if (Math.abs(clampedCenterCm - currentCenterCm) > 0.001) {
      closet.updateTower(tower.id, {
        positionAlongWall: clampedCenterCm / wall.length,
      });
    }
  }
}

function addCategoryTower(category: ClosetCatalogCategory) {
  closet.addTowerFromCatalog(category.doorMode, category.categoryCode);
  const added = closet.towers[closet.towers.length - 1];
  if (!added) return;
  selection.selectTower(added.id);

  // Place on the selected wall, or fall back to the closet wall
  const wallId = selection.selectedWallId ?? room.closetWall?.id ?? null;
  if (wallId) {
    closet.setTowerWall(added.id, wallId, 0.5);
  }
}

function moveTowerLeft() {
  const tower = selectedTower.value;
  const wall = selectedTowerWall.value;
  if (!tower || !wall) return;
  closet.moveTowerAlongWall(tower.id, -0.05, wall.length);
  clampSelectedTowerToUsableBounds();
}

function moveTowerRight() {
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
  const minCenterCm = c.effectiveLeft + halfW;
  const maxCenterCm = Math.max(minCenterCm, c.effectiveRight - halfW);

  const currentCenterCm = (tower.positionAlongWall ?? 0.5) * wall.length;
  const clampedCenterCm = Math.max(
    minCenterCm,
    Math.min(maxCenterCm, currentCenterCm),
  );

  if (Math.abs(clampedCenterCm - currentCenterCm) > 0.001) {
    closet.updateTower(tower.id, {
      positionAlongWall: clampedCenterCm / wall.length,
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

  const valueCm = toCm(value);

  if (dimension === "width") {
    closet.setTowerWidth(tower.id, valueCm);
    return;
  }

  if (dimension === "depth") {
    closet.setTowerDepth(tower.id, valueCm);
    return;
  }

  if (dimension === "outset") {
    closet.setTowerOutset(tower.id, valueCm);
    return;
  }

  if (dimension === "elevation") {
    const maxCm = maxElevationCm.value;
    closet.setTowerElevation(tower.id, Math.min(valueCm, maxCm));
    return;
  }

  closet.setTowerHeight(tower.id, Math.min(valueCm, maxHeightCm.value));
  return;
}

function onClearanceInput(side: "left" | "right", event: Event) {
  const tower = selectedTower.value;
  const wall = selectedTowerWall.value;
  const c = clearances.value;
  if (!tower || !wall || !c) return;

  const value = Number((event.target as HTMLInputElement).value);
  if (!Number.isFinite(value)) return;

  const valueCm = toCm(value);
  const halfW = tower.width / 2;

  let newCenterCm = 0;

  const actualUsable = c.effectiveRight - c.effectiveLeft;
  const nominalUsable = c.nominalEffectiveRight - c.nominalEffectiveLeft;

  if (actualUsable >= tower.width) {
    const slideRange = actualUsable - tower.width;
    const nominalSlideRange = Math.max(0.1, nominalUsable - tower.width);

    // Reverse the scale from UI value to raw physical value
    const rawValueCm = (valueCm / nominalSlideRange) * slideRange;

    if (side === "left") {
      newCenterCm = c.effectiveLeft + rawValueCm + halfW;
    } else {
      newCenterCm = c.effectiveRight - rawValueCm - halfW;
    }
  } else {
    // Fallback if no sliding space
    if (side === "left") {
      newCenterCm = c.effectiveLeft + valueCm + halfW;
    } else {
      newCenterCm = c.effectiveRight - valueCm - halfW;
    }
  }

  // Ensure center stays within raw wall bounds
  newCenterCm = Math.max(halfW, Math.min(wall.length - halfW, newCenterCm));

  const positionAlongWall = newCenterCm / wall.length;
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
}): string {
  if (!tower.categoryName || !tower.categoryCode) return "Legacy tower";
  return `${tower.categoryName} (${tower.categoryCode}) - Catalog ${tower.catalogId ?? "N/A"}`;
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
          <FloorPlan :elevation-only="true" @close="showElevation = false" />
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
          v-if="selectedTower && selectedTowerLimits"
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
              step="0.1"
              :min="fromCmDisplay(selectedTowerLimits.minW)"
              :max="fromCmDisplay(selectedTowerLimits.maxW)"
              :value="fromCmDisplay(selectedTower.width)"
              @change="onDimensionInput('width', $event)"
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
              step="0.1"
              :min="fromCmDisplay(selectedTowerLimits.minD)"
              :max="fromCmDisplay(selectedTowerLimits.maxD)"
              :value="fromCmDisplay(selectedTower.depth)"
              @change="onDimensionInput('depth', $event)"
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
              step="0.1"
              :min="fromCmDisplay(selectedTowerLimits.minH)"
              :max="
                fromCmDisplay(Math.min(selectedTowerLimits.maxH, maxHeightCm))
              "
              :value="fromCmDisplay(selectedTower.height)"
              @change="onDimensionInput('height', $event)"
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
              step="0.1"
              min="0"
              :value="fromCmDisplay(selectedTower.outset ?? 0)"
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
              step="0.1"
              min="0"
              :max="fromCmDisplay(maxElevationCm)"
              :value="fromCmDisplay(selectedTower.elevation ?? 0)"
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
                  step="0.1"
                  min="0"
                  :max="fromCmDisplay(clearances.left + clearances.right)"
                  :value="fromCmDisplay(clearances.left)"
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
                  step="0.1"
                  min="0"
                  :max="fromCmDisplay(clearances.left + clearances.right)"
                  :value="fromCmDisplay(clearances.right)"
                  @change="onClearanceInput('right', $event)"
                />
              </div>
              <div
                class="dimension-control"
                style="grid-column: span 2; margin-top: 4px"
              >
                <button class="center-btn" @click="distributeTowers">
                  Distribute Evenly
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
</style>
