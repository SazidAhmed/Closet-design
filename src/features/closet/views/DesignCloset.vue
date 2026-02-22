<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls } from "@tresjs/cientos";
import Cabinet3D from "../../../components/Cabinet3D.vue";
import Room3D from "../../../components/Room3D.vue";
import TopToolbar from "../../../components/TopToolbar.vue";
import FooterBar from "../../../components/FooterBar.vue";
import { useClosetStore } from "../../../stores/useClosetStore";
import { useAppStore } from "../../../stores/useAppStore";
import { useSelectionStore } from "../../../stores/useSelectionStore";
import { useRoomStore } from "../../../stores/useRoomStore";
import { useQuoteStore } from "../stores/useQuoteStore";
import { Slider } from "@/components/ui/slider";
import {
  FINISH_MATERIALS,
  BACKING_MATERIALS,
  HANDLE_STYLES,
  FLOOR_MATERIALS,
  WALL_COLORS,
  TRIM_COLORS,
} from "../domain/materials/catalog";
import { AUTO_CREATE_PRESETS } from "../domain/closetTypes";
import { Plus, Trash2 } from "lucide-vue-next";
import type { Accessory } from "../domain/types/tower";

const closet = useClosetStore();
const appStore = useAppStore();
const selection = useSelectionStore();
const roomStore = useRoomStore();
const quote = useQuoteStore();

onMounted(() => {
  appStore.setStep("design");
  if (closet.towers.length > 0 && !selection.selectedTowerId) {
    selection.selectTower(closet.towers[0]?.id ?? "");
  }
});

// ── Tab state ─────────────────────────────────────────────────────────────
const activeTab = ref<"auto" | "towers" | "edit">("towers");

// ── Selected tower ────────────────────────────────────────────────────────
const selectedTower = computed(
  () => closet.towers.find((t) => t.id === selection.selectedTowerId) ?? null,
);

// ── Quote watcher ─────────────────────────────────────────────────────────
const hasBlockingErrors = computed(() =>
  closet.violations.some((v) => v.severity === "error"),
);

watch(
  () => closet.exportForBackend,
  (payload) => {
    if (hasBlockingErrors.value) {
      quote.clear();
      return;
    }
    quote.scheduleQuote(payload, 350);
  },
  { deep: true, immediate: true },
);

// ── Camera per view mode ──────────────────────────────────────────────────
const cameraPos = computed<[number, number, number]>(() => {
  const w = Number(closet.cabinet.width) || 60;
  const h = Number(closet.cabinet.height) || 200;
  const d = Number(closet.cabinet.depth) || 60;
  const maxDim = Math.max(w, h, d);

  switch (appStore.viewMode) {
    case "wall":
      // Front-on elevation: look straight at the cabinet face
      return [0, h * 0.2, maxDim * 1.6];
    case "overhead":
      // Top-down: look straight down
      return [0, maxDim * 2, 0];
    default:
      // 3D perspective orbit
      return [maxDim * 0.9, maxDim * 0.6, maxDim * 1.1];
  }
});

const cameraUp = computed<[number, number, number]>(() => {
  // For overhead view, "up" should be along -Z so the view isn't flipped
  return appStore.viewMode === "overhead" ? [0, 0, -1] : [0, 1, 0];
});

const enableOrbit = computed(() => appStore.viewMode === "3d");

const viewportHint = computed(() => {
  switch (appStore.viewMode) {
    case "wall":
      return "Front elevation view";
    case "overhead":
      return "Top-down overhead view";
    default:
      return "Drag to orbit · Scroll to zoom";
  }
});

// ── Auto-create preset apply ──────────────────────────────────────────────
function applyPreset(presetId: string) {
  const preset = AUTO_CREATE_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;
  const towers = preset.createTowers(
    closet.innerCabinetWidth,
    closet.cabinet.depth,
    closet.cabinet.height,
  );
  closet.setTowers(towers);
  if (towers.length > 0) selection.selectTower(towers[0]?.id ?? "");
}

// ── Accessory level helpers ───────────────────────────────────────────────
function getRodLevel(): string {
  if (!selectedTower.value) return "None";
  const rods = selectedTower.value.accessories.filter((a) => a.type === "rod");
  if (rods.length === 0) return "None";
  return rods.length === 1 ? "Medium" : "High";
}

function getShelfCount(): number {
  if (!selectedTower.value) return 0;
  const shelf = selectedTower.value.accessories.find(
    (a) => a.type === "shelf_set",
  );
  return shelf && shelf.type === "shelf_set" ? shelf.count : 0;
}

function getDrawerCount(): number {
  if (!selectedTower.value) return 0;
  const drawer = selectedTower.value.accessories.find(
    (a) => a.type === "drawer",
  );
  return drawer && drawer.type === "drawer" ? drawer.count : 0;
}

function getShoeShelfCount(): number {
  if (!selectedTower.value) return 0;
  const shoe = selectedTower.value.accessories.find(
    (a) => a.type === "shoe_shelf",
  );
  return shoe && shoe.type === "shoe_shelf" ? shoe.count : 0;
}

function setShelfCount(n: number) {
  if (!selectedTower.value) return;
  const accs: Accessory[] = selectedTower.value.accessories.filter(
    (a) => a.type !== "shelf_set",
  );
  if (n > 0) accs.push({ type: "shelf_set", count: n });
  closet.setTowerAccessories(selectedTower.value.id, accs);
}

function setDrawerCount(n: number) {
  if (!selectedTower.value) return;
  const accs: Accessory[] = selectedTower.value.accessories.filter(
    (a) => a.type !== "drawer",
  );
  if (n > 0) accs.push({ type: "drawer", count: n, drawerHeight: 15 });
  closet.setTowerAccessories(selectedTower.value.id, accs);
}

function setShoeShelfCount(n: number) {
  if (!selectedTower.value) return;
  const accs: Accessory[] = selectedTower.value.accessories.filter(
    (a) => a.type !== "shoe_shelf",
  );
  if (n > 0) accs.push({ type: "shoe_shelf", count: n });
  closet.setTowerAccessories(selectedTower.value.id, accs);
}
</script>

<template>
  <div class="design-page">
    <TopToolbar>
      <template #title>Design Closet</template>
    </TopToolbar>

    <div class="design-body">
      <!-- ── Left Sidebar ────────────────────────────────────────────── -->
      <aside class="sidebar sidebar-left">
        <!-- Tab bar -->
        <div class="tab-bar">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'auto' }"
            @click="activeTab = 'auto'"
          >
            Auto Create
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'towers' }"
            @click="activeTab = 'towers'"
          >
            Towers
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'edit' }"
            @click="activeTab = 'edit'"
          >
            Edit Components
          </button>
        </div>

        <!-- Auto Create Tab -->
        <div v-if="activeTab === 'auto'" class="tab-content">
          <div class="preset-list">
            <button
              v-for="preset in AUTO_CREATE_PRESETS"
              :key="preset.id"
              class="preset-card"
              @click="applyPreset(preset.id)"
            >
              <div class="preset-name">{{ preset.label }}</div>
              <div class="preset-desc">{{ preset.description }}</div>
            </button>
          </div>
          <button class="action-btn danger" @click="closet.setTowers([])">
            Clear Room
          </button>
        </div>

        <!-- Towers Tab -->
        <div v-if="activeTab === 'towers'" class="tab-content">
          <div class="tower-list">
            <button
              v-for="(tower, tIdx) in closet.towers"
              :key="tower.id"
              class="tower-card"
              :class="{ selected: selection.selectedTowerId === tower.id }"
              @click="selection.selectTower(tower.id)"
            >
              <div class="tower-card-header">
                <span class="tower-label">{{ tower.label }}</span>
                <div class="tower-card-actions">
                  <button
                    class="tower-move-btn"
                    :disabled="tIdx === 0"
                    @click.stop="closet.moveTower(tower.id, -1)"
                    title="Move left"
                  >
                    ◀
                  </button>
                  <button
                    class="tower-move-btn"
                    :disabled="tIdx === closet.towers.length - 1"
                    @click.stop="closet.moveTower(tower.id, 1)"
                    title="Move right"
                  >
                    ▶
                  </button>
                  <button
                    class="tower-delete-btn"
                    @click.stop="closet.removeTower(tower.id)"
                    title="Remove tower"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>
              <div class="tower-dims">
                {{ Math.round(tower.width) }} × {{ Math.round(tower.depth) }} cm
              </div>
            </button>
          </div>

          <button class="action-btn" @click="closet.addTower()">
            <Plus :size="16" />
            Add Tower
          </button>

          <!-- Selected tower dimensions -->
          <div v-if="selectedTower" class="tower-config">
            <div class="config-row">
              <label>Tower Depth</label>
              <select
                class="config-select"
                :value="selectedTower.depth"
                @change="
                  closet.setTowerDepth(
                    selectedTower!.id,
                    Number(($event.target as HTMLSelectElement).value),
                  )
                "
              >
                <option
                  v-for="opt in [35.5, 40.6, 50.8, 61]"
                  :key="opt"
                  :value="opt"
                >
                  {{ opt }} cm
                </option>
              </select>
            </div>
            <div class="config-row">
              <label>Tower Height</label>
              <select
                class="config-select"
                :value="selectedTower.height"
                @change="
                  closet.setTowerHeight(
                    selectedTower!.id,
                    Number(($event.target as HTMLSelectElement).value),
                  )
                "
              >
                <option v-for="opt in [213.4, 243.8]" :key="opt" :value="opt">
                  {{ opt }} cm
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Edit Components Tab -->
        <div v-if="activeTab === 'edit'" class="tab-content">
          <div v-if="!selectedTower" class="empty-state">
            Select a tower to edit its components
          </div>

          <div v-else class="component-editor">
            <h4 class="editor-tower-name">{{ selectedTower.label }}</h4>

            <div class="slider-group">
              <div class="slider-header">
                <label>Rods</label>
                <span class="slider-value">{{ getRodLevel() }}</span>
              </div>
              <div class="rod-info">
                Configure hanging rods in the Towers tab
              </div>
            </div>

            <div class="slider-group">
              <div class="slider-header">
                <label>Shelves</label>
                <span class="slider-value">{{ getShelfCount() }}</span>
              </div>
              <Slider
                :model-value="getShelfCount()"
                @update:model-value="setShelfCount"
                :min="0"
                :max="8"
                :step="1"
              />
            </div>

            <div class="slider-group">
              <div class="slider-header">
                <label>Drawers</label>
                <span class="slider-value">{{ getDrawerCount() }}</span>
              </div>
              <Slider
                :model-value="getDrawerCount()"
                @update:model-value="setDrawerCount"
                :min="0"
                :max="6"
                :step="1"
              />
            </div>

            <div class="slider-group">
              <div class="slider-header">
                <label>Shoe Shelves</label>
                <span class="slider-value">{{ getShoeShelfCount() }}</span>
              </div>
              <Slider
                :model-value="getShoeShelfCount()"
                @update:model-value="setShoeShelfCount"
                :min="0"
                :max="6"
                :step="1"
              />
            </div>

            <div class="action-btns">
              <button
                class="action-btn danger"
                @click="closet.setTowerAccessories(selectedTower!.id, [])"
              >
                Clear Components
              </button>
            </div>
          </div>
        </div>

        <!-- Validation panel -->
        <div v-if="closet.violations.length" class="validation-panel">
          <div class="validation-title">Validation</div>
          <ul class="validation-list">
            <li
              v-for="(violation, idx) in closet.violations"
              :key="idx"
              class="validation-item"
            >
              <span class="violation-badge" :class="violation.severity">
                {{ violation.severity }}
              </span>
              <span>{{ violation.message }}</span>
            </li>
          </ul>
        </div>
      </aside>

      <!-- ── 3D Viewport ─────────────────────────────────────────────── -->
      <main class="viewport">
        <TresCanvas
          clear-color="#0b1220"
          :antialias="true"
          :shadows="false"
          class="h-full w-full"
        >
          <TresPerspectiveCamera
            :position="cameraPos"
            :up="cameraUp"
            :fov="45"
            :near="0.1"
            :far="5000"
          />
          <OrbitControls
            :enabled="enableOrbit"
            :enable-damping="true"
            :damping-factor="0.08"
          />
          <TresAmbientLight :intensity="0.8" />
          <TresDirectionalLight :position="[200, 300, 200]" :intensity="1.2" />

          <Room3D />
          <Cabinet3D />
        </TresCanvas>

        <div class="viewport-hint">{{ viewportHint }}</div>
      </main>

      <!-- ── Right Sidebar ───────────────────────────────────────────── -->
      <aside class="sidebar sidebar-right">
        <div class="sidebar-section">
          <h3 class="sidebar-heading">Options</h3>

          <div class="option-group">
            <label class="option-label">Finish</label>
            <div class="swatch-grid">
              <button
                v-for="mat in FINISH_MATERIALS"
                :key="mat.id"
                class="swatch-btn"
                :class="{ active: closet.materials.finishId === mat.id }"
                :style="{ background: mat.colorHex }"
                :title="mat.label"
                @click="closet.setMaterials({ finishId: mat.id })"
              />
            </div>
          </div>

          <div class="option-group">
            <label class="option-label">Backing</label>
            <div class="swatch-grid">
              <button
                v-for="mat in BACKING_MATERIALS"
                :key="mat.id"
                class="swatch-btn"
                :class="{ active: closet.materials.backingId === mat.id }"
                :style="{ background: mat.colorHex }"
                :title="mat.label"
                @click="closet.setMaterials({ backingId: mat.id })"
              />
            </div>
          </div>

          <div class="option-group">
            <label class="option-label">Handle Style</label>
            <div class="swatch-grid">
              <button
                v-for="handle in HANDLE_STYLES"
                :key="handle.id"
                class="swatch-btn swatch-small"
                :class="{
                  active: closet.materials.handleStyleId === handle.id,
                }"
                :style="{
                  background:
                    handle.colorHex === 'transparent'
                      ? '#1e293b'
                      : handle.colorHex,
                }"
                :title="handle.label"
                @click="closet.setMaterials({ handleStyleId: handle.id })"
              >
                <span
                  v-if="handle.id === 'handle-none'"
                  class="swatch-none-label"
                  >✕</span
                >
              </button>
            </div>
          </div>
        </div>

        <div class="sidebar-section">
          <h3 class="sidebar-heading">Room Options</h3>

          <div class="option-group">
            <label class="option-label">Wall Color</label>
            <div class="swatch-grid">
              <button
                v-for="swatch in WALL_COLORS"
                :key="swatch.id"
                class="swatch-btn"
                :class="{
                  active: roomStore.colors.wallColor === swatch.colorHex,
                }"
                :style="{ background: swatch.colorHex }"
                :title="swatch.label"
                @click="roomStore.setColors({ wallColor: swatch.colorHex })"
              />
            </div>
          </div>

          <div class="option-group">
            <label class="option-label">Floor Finish</label>
            <div class="swatch-grid">
              <button
                v-for="mat in FLOOR_MATERIALS"
                :key="mat.id"
                class="swatch-btn"
                :class="{ active: roomStore.colors.floorFinishId === mat.id }"
                :style="{ background: mat.colorHex }"
                :title="mat.label"
                @click="
                  roomStore.setColors({
                    floorFinishId: mat.id,
                    floorColor: mat.colorHex,
                  })
                "
              />
            </div>
          </div>

          <div class="option-group">
            <label class="option-label">Trim Color</label>
            <div class="swatch-grid">
              <button
                v-for="swatch in TRIM_COLORS"
                :key="swatch.id"
                class="swatch-btn"
                :class="{
                  active: roomStore.colors.trimColor === swatch.colorHex,
                }"
                :style="{ background: swatch.colorHex }"
                :title="swatch.label"
                @click="roomStore.setColors({ trimColor: swatch.colorHex })"
              />
            </div>
          </div>
        </div>

        <!-- Quote -->
        <div class="quote-panel">
          <div class="quote-header">
            <span class="quote-title">Quote</span>
            <span class="quote-status">
              <span v-if="hasBlockingErrors">Fix errors</span>
              <span v-else-if="quote.isLoading">Loading…</span>
              <span v-else-if="quote.error">Error</span>
              <span v-else-if="quote.result">Ready</span>
              <span v-else>Idle</span>
            </span>
          </div>
          <div v-if="quote.result" class="quote-total">
            <span>Total</span>
            <strong
              >{{ quote.result.total }} {{ quote.result.currency }}</strong
            >
          </div>
          <div v-else class="quote-waiting">
            Waiting for quote at <code>/api/quote</code>
          </div>
        </div>
      </aside>
    </div>

    <FooterBar
      back-label="Back to Floor Plan"
      back-route="/closet/floorplan"
      forward-label="Continue to Review"
      forward-route="/closet/review"
      :price="quote.result?.total ?? 0"
      :show-view-toggle="true"
      :show-share="true"
    />
  </div>
</template>

<style scoped>
.design-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0b1220;
  color: #e2e8f0;
}

.design-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebars */
.sidebar {
  width: 300px;
  flex-shrink: 0;
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-left {
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar-right {
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  padding: 16px 14px;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-heading {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  margin: 0;
}

/* Tab bar */
.tab-bar {
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  padding: 10px 4px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: all 0.15s;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover {
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.03);
}

.tab-btn.active {
  color: #fbbf24;
  border-bottom-color: #fbbf24;
}

.tab-content {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}

/* Preset list */
.preset-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-card {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.3);
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  color: inherit;
  font-family: inherit;
}

.preset-card:hover {
  border-color: rgba(251, 191, 36, 0.25);
  background: rgba(30, 41, 59, 0.5);
}

.preset-name {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 4px;
}

.preset-desc {
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}

/* Tower list */
.tower-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tower-card {
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.3);
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  color: inherit;
  font-family: inherit;
}

.tower-card:hover {
  border-color: rgba(255, 255, 255, 0.15);
}

.tower-card.selected {
  border-color: rgba(251, 191, 36, 0.4);
  background: rgba(251, 191, 36, 0.06);
}

.tower-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tower-label {
  font-size: 13px;
  font-weight: 600;
}

.tower-card-actions {
  display: flex;
  gap: 2px;
  align-items: center;
}

.tower-move-btn {
  padding: 2px 5px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  border-radius: 4px;
  font-size: 10px;
  transition: all 0.15s;
}

.tower-move-btn:not(:disabled):hover {
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.1);
}

.tower-move-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.tower-delete-btn {
  padding: 4px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}

.tower-delete-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.tower-dims {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.tower-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.config-row label {
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
}

.config-select {
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: rgba(30, 41, 59, 0.6);
  color: #e2e8f0;
  font-size: 12px;
  cursor: pointer;
}

/* Action buttons */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.4);
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  background: rgba(30, 41, 59, 0.7);
  border-color: rgba(255, 255, 255, 0.2);
}

.action-btn.danger {
  border-color: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.4);
}

/* Component editor */
.component-editor {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.editor-tower-name {
  font-size: 14px;
  font-weight: 700;
  color: #fbbf24;
  margin: 0;
}

.slider-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.slider-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.slider-header label {
  font-size: 13px;
  font-weight: 500;
}

.slider-value {
  font-size: 12px;
  color: #94a3b8;
}

.rod-info {
  font-size: 11px;
  color: #475569;
  font-style: italic;
}

.action-btns {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.empty-state {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: #475569;
}

/* Validation */
.validation-panel {
  margin-top: auto;
  padding: 12px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.validation-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  margin-bottom: 8px;
}

.validation-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.validation-item {
  display: flex;
  gap: 8px;
  font-size: 12px;
  align-items: flex-start;
}

.violation-badge {
  display: inline-flex;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  flex-shrink: 0;
}

.violation-badge.error {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}

.violation-badge.warning {
  background: rgba(245, 158, 11, 0.15);
  color: #fcd34d;
}

/* Viewport */
.viewport {
  flex: 1;
  position: relative;
}

.viewport-hint {
  position: absolute;
  left: 16px;
  top: 16px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 12px;
  color: #64748b;
  pointer-events: none;
}

/* Swatch grid */
.option-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.option-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.swatch-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.swatch-btn {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 2px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}

.swatch-btn:hover {
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.08);
}

.swatch-btn.active {
  border-color: #fbbf24;
  box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.3);
}

.swatch-small {
  width: 28px;
  height: 28px;
}

.swatch-none-label {
  font-size: 14px;
  color: #64748b;
}

/* Quote panel */
.quote-panel {
  margin-top: auto;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.3);
}

.quote-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.quote-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
}

.quote-status {
  font-size: 11px;
  color: #64748b;
}

.quote-total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 13px;
}

.quote-total span {
  color: #94a3b8;
}

.quote-total strong {
  color: #e2e8f0;
  font-weight: 700;
}

.quote-waiting {
  font-size: 12px;
  color: #475569;
}

.quote-waiting code {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(30, 41, 59, 0.6);
  font-size: 11px;
}
</style>
