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
});

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
}

function moveTowerRight() {
  const tower = selectedTower.value;
  const wall = selectedTowerWall.value;
  if (!tower || !wall) return;
  closet.moveTowerAlongWall(tower.id, 0.05, wall.length);
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

  closet.setTowerHeight(tower.id, valueCm);
}

function removeTower(towerId: string) {
  closet.removeTower(towerId);
  if (selection.selectedTowerId === towerId) {
    selection.selectTower(closet.towers[0]?.id ?? null);
  }
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
              :max="fromCmDisplay(selectedTowerLimits.maxH)"
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
