<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import TopToolbar from "../../../components/TopToolbar.vue";
import FooterBar from "../../../components/FooterBar.vue";
import RoomPlanPreview from "../../../components/RoomPlanPreview.vue";
import { useAppStore } from "../../../stores/useAppStore";
import { useClosetStore } from "../../../stores/useClosetStore";
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
const selection = useSelectionStore();
const { fmt } = useUnit();

const selectedDoorMode = ref<ClosetDoorMode>("without_doors");

const visibleCategories = computed(() =>
  getCategoriesForDoorMode(selectedDoorMode.value),
);

const selectedTower = computed(
  () => closet.towers.find((tower) => tower.id === selection.selectedTowerId) ?? null,
);

const selectedTowerLimits = computed<ClosetCatalogLimits | null>(() => {
  const tower = selectedTower.value;
  if (!tower?.doorMode || !tower.categoryCode) return null;
  return getCategoryLimits(tower.doorMode, tower.categoryCode);
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
  selection.selectTower(added?.id ?? null);
}

function setDoorMode(mode: ClosetDoorMode) {
  selectedDoorMode.value = mode;
}

function onDimensionInput(
  dimension: "width" | "depth" | "height",
  event: Event,
) {
  const tower = selectedTower.value;
  if (!tower) return;
  const value = Number((event.target as HTMLInputElement).value);
  if (!Number.isFinite(value)) return;

  if (dimension === "width") {
    closet.setTowerWidth(tower.id, value);
    return;
  }

  if (dimension === "depth") {
    closet.setTowerDepth(tower.id, value);
    return;
  }

  closet.setTowerHeight(tower.id, value);
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
            <p>{{ closet.towers.length }} tower{{ closet.towers.length === 1 ? "" : "s" }} configured</p>
          </div>
        </div>

        <div class="preview-section" style="flex: 1; min-height: 200px; display: flex; flex-direction: column; margin-bottom: 24px;">
          <RoomPlanPreview />
        </div>

        <div v-if="closet.towers.length > 0" class="tower-grid">
          <button
            v-for="tower in closet.towers"
            :key="tower.id"
            class="tower-card"
            :class="{ selected: selection.selectedTowerId === tower.id }"
            @click="selection.selectTower(tower.id)"
          >
            <div class="tower-card-top">
              <strong>{{ tower.label }}</strong>
              <button
                class="icon-btn"
                title="Remove tower"
                @click.stop="removeTower(tower.id)"
              >
                <Trash2 :size="14" />
              </button>
            </div>
            <span>{{ towerSubtitle(tower) }}</span>
            <div class="tower-dims">
              {{ fmt(tower.width) }} W x {{ fmt(tower.depth) }} D x {{ fmt(tower.height) }} H
            </div>
          </button>
        </div>
      </main>

      <aside class="builder-panel edit-panel">
        <section v-if="selectedTower && selectedTowerLimits" class="panel-section">
          <h2 class="section-title">Selected Tower</h2>
          <div class="selected-summary">
            <strong>{{ selectedTower.label }}</strong>
            <span>{{ towerSubtitle(selectedTower) }}</span>
          </div>

          <div class="dimension-control">
            <div class="dimension-head">
              <label>Width</label>
              <span>{{ fmt(selectedTower.width) }}</span>
            </div>
            <input
              type="range"
              :min="selectedTowerLimits.minW"
              :max="selectedTowerLimits.maxW"
              step="0.1"
              :value="selectedTower.width"
              @input="onDimensionInput('width', $event)"
            />
            <input
              class="number-input"
              type="number"
              step="0.1"
              :min="selectedTowerLimits.minW"
              :max="selectedTowerLimits.maxW"
              :value="selectedTower.width"
              @change="onDimensionInput('width', $event)"
            />
          </div>

          <div class="dimension-control">
            <div class="dimension-head">
              <label>Depth</label>
              <span>{{ fmt(selectedTower.depth) }}</span>
            </div>
            <input
              type="range"
              :min="selectedTowerLimits.minD"
              :max="selectedTowerLimits.maxD"
              step="0.1"
              :value="selectedTower.depth"
              @input="onDimensionInput('depth', $event)"
            />
            <input
              class="number-input"
              type="number"
              step="0.1"
              :min="selectedTowerLimits.minD"
              :max="selectedTowerLimits.maxD"
              :value="selectedTower.depth"
              @change="onDimensionInput('depth', $event)"
            />
          </div>

          <div class="dimension-control">
            <div class="dimension-head">
              <label>Height</label>
              <span>{{ fmt(selectedTower.height) }}</span>
            </div>
            <input
              type="range"
              :min="selectedTowerLimits.minH"
              :max="selectedTowerLimits.maxH"
              step="0.1"
              :value="selectedTower.height"
              @input="onDimensionInput('height', $event)"
            />
            <input
              class="number-input"
              type="number"
              step="0.1"
              :min="selectedTowerLimits.minH"
              :max="selectedTowerLimits.maxH"
              :value="selectedTower.height"
              @change="onDimensionInput('height', $event)"
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

.selected-summary {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.46);
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
</style>
