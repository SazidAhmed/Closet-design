<script setup lang="ts">
import TopToolbar from "../../../components/TopToolbar.vue";
import FooterBar from "../../../components/FooterBar.vue";
import { useRoomStore } from "../../../stores/useRoomStore";
import { useClosetStore } from "../../../stores/useClosetStore";
import { useAppStore } from "../../../stores/useAppStore";
import { onMounted, computed } from "vue";
import {
  FLOOR_MATERIALS,
  WALL_COLORS,
  TRIM_COLORS,
  HANDLE_STYLES,
  DOOR_MATERIALS,
} from "../domain/materials/catalog";

const roomStore = useRoomStore();
const closet = useClosetStore();
const appStore = useAppStore();

/** Width of the room (wall 0) */
const roomW = computed(() => roomStore.walls[0]?.length ?? 244);
/** Depth of the room (wall 1) */
const roomD = computed(() => roomStore.walls[1]?.length ?? 244);

/** Darken the wall color slightly for the 2D wall stroke */
function darkenHex(hex: string, amount = 40): string {
  const c = hex.replace("#", "");
  const r = Math.max(0, parseInt(c.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(c.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(c.substring(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

const wallStroke = computed(() => darkenHex(roomStore.colors.wallColor, 50));

onMounted(() => {
  appStore.setStep("floorplan");
});
</script>

<template>
  <div class="floorplan-page">
    <TopToolbar>
      <template #title>Floor Plan</template>
    </TopToolbar>

    <div class="floorplan-body">
      <!-- Left Sidebar: Add Architecture -->
      <aside class="sidebar sidebar-left">
        <div class="sidebar-section">
          <h3 class="sidebar-heading">Add Architecture</h3>

          <button class="sidebar-action-btn">Change Room Height</button>

          <h4 class="sidebar-subheading">Add Door</h4>
          <div class="item-grid">
            <button
              class="item-card"
              v-for="door in [
                'Wall Opening',
                'Double Door',
                'Single Door',
                'Sliding Door',
                'Bi-Fold Door',
              ]"
              :key="door"
            >
              <div class="item-icon">🚪</div>
              <span class="item-label">{{ door }}</span>
            </button>
          </div>

          <h4 class="sidebar-subheading">Add Architecture</h4>
          <div class="item-grid">
            <button
              class="item-card"
              v-for="arch in [
                'Rectangular Column',
                'Round Column',
                'Interior Wall',
              ]"
              :key="arch"
            >
              <div class="item-icon">🏛️</div>
              <span class="item-label">{{ arch }}</span>
            </button>
          </div>

          <h4 class="sidebar-subheading">Add Wall Decorator</h4>
          <div class="item-grid">
            <button
              class="item-card"
              v-for="dec in [
                'Window',
                'Vent',
                'Outlet',
                'Light Switch',
                'Wall Photo',
                'Floor Photo',
              ]"
              :key="dec"
            >
              <div class="item-icon">🪟</div>
              <span class="item-label">{{ dec }}</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- Center: 2D Floor Plan Canvas -->
      <main class="floorplan-canvas-area">
        <div class="canvas-container">
          <!-- SVG Floor Plan -->
          <svg
            viewBox="-200 -200 400 400"
            class="floorplan-svg"
            xmlns="http://www.w3.org/2000/svg"
          >
            <!-- Room background -->
            <rect
              :x="-roomW / 2"
              :y="-roomD / 2"
              :width="roomW"
              :height="roomD"
              :fill="roomStore.colors.floorColor"
              :stroke="wallStroke"
              stroke-width="3"
              rx="2"
            />

            <!-- Walls as thick lines -->
            <template v-for="(wall, i) in roomStore.walls" :key="wall.id">
              <!-- Top wall -->
              <line
                v-if="i === 0"
                :x1="-(wall.length / 2)"
                :y1="-roomD / 2"
                :x2="wall.length / 2"
                :y2="-roomD / 2"
                :stroke="wallStroke"
                stroke-width="6"
              />
              <!-- Right wall -->
              <line
                v-if="i === 1"
                :x1="roomW / 2"
                :y1="-(wall.length / 2)"
                :x2="roomW / 2"
                :y2="wall.length / 2"
                :stroke="wallStroke"
                stroke-width="6"
              />
              <!-- Bottom wall -->
              <line
                v-if="i === 2"
                :x1="-(wall.length / 2)"
                :y1="roomD / 2"
                :x2="wall.length / 2"
                :y2="roomD / 2"
                :stroke="wallStroke"
                stroke-width="6"
              />
              <!-- Left wall -->
              <line
                v-if="i === 3"
                :x1="-roomW / 2"
                :y1="-(wall.length / 2)"
                :x2="-roomW / 2"
                :y2="wall.length / 2"
                :stroke="wallStroke"
                stroke-width="6"
              />
            </template>

            <!-- Dimension labels -->
            <!-- Top dimension -->
            <g>
              <line
                :x1="-roomW / 2"
                :y1="-roomD / 2 - 25"
                :x2="roomW / 2"
                :y2="-roomD / 2 - 25"
                stroke="#94a3b8"
                stroke-width="1"
                marker-start="url(#arrowL)"
                marker-end="url(#arrowR)"
              />
              <text
                x="0"
                :y="-roomD / 2 - 30"
                text-anchor="middle"
                fill="#e2e8f0"
                font-size="12"
                font-weight="600"
              >
                {{ Math.round(roomW / 2.54 / 12) }}'
                {{ Math.round((roomW / 2.54) % 12) }}"
              </text>
            </g>

            <!-- Right dimension -->
            <g>
              <line
                :x1="roomW / 2 + 25"
                :y1="-roomD / 2"
                :x2="roomW / 2 + 25"
                :y2="roomD / 2"
                stroke="#94a3b8"
                stroke-width="1"
                marker-start="url(#arrowU)"
                marker-end="url(#arrowD)"
              />
              <text
                :x="roomW / 2 + 35"
                y="4"
                text-anchor="start"
                fill="#e2e8f0"
                font-size="12"
                font-weight="600"
                transform="rotate(0)"
              >
                {{ Math.round(roomD / 2.54 / 12) }}'
                {{ Math.round((roomD / 2.54) % 12) }}"
              </text>
            </g>

            <!-- Resize handles (corners) -->
            <circle
              v-for="(pos, idx) in [
                [-roomW / 2, -roomD / 2],
                [roomW / 2, -roomD / 2],
                [roomW / 2, roomD / 2],
                [-roomW / 2, roomD / 2],
              ]"
              :key="idx"
              :cx="pos[0]"
              :cy="pos[1]"
              r="5"
              fill="#fbbf24"
              stroke="#0f172a"
              stroke-width="2"
              class="resize-handle"
            />

            <!-- Mid-wall resize handles -->
            <circle
              v-for="(pos, idx) in [
                [0, -roomD / 2],
                [roomW / 2, 0],
                [0, roomD / 2],
                [-roomW / 2, 0],
              ]"
              :key="'mid-' + idx"
              :cx="pos[0]"
              :cy="pos[1]"
              r="4"
              fill="#60a5fa"
              stroke="#0f172a"
              stroke-width="2"
              class="resize-handle"
            />

            <!-- Arrow marker definitions -->
            <defs>
              <marker
                id="arrowR"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="4"
                orient="auto"
              >
                <path
                  d="M0,0 L8,4 L0,8"
                  fill="none"
                  stroke="#94a3b8"
                  stroke-width="1"
                />
              </marker>
              <marker
                id="arrowL"
                markerWidth="8"
                markerHeight="8"
                refX="2"
                refY="4"
                orient="auto"
              >
                <path
                  d="M8,0 L0,4 L8,8"
                  fill="none"
                  stroke="#94a3b8"
                  stroke-width="1"
                />
              </marker>
              <marker
                id="arrowD"
                markerWidth="8"
                markerHeight="8"
                refX="4"
                refY="6"
                orient="auto"
              >
                <path
                  d="M0,0 L4,8 L8,0"
                  fill="none"
                  stroke="#94a3b8"
                  stroke-width="1"
                />
              </marker>
              <marker
                id="arrowU"
                markerWidth="8"
                markerHeight="8"
                refX="4"
                refY="2"
                orient="auto"
              >
                <path
                  d="M0,8 L4,0 L8,8"
                  fill="none"
                  stroke="#94a3b8"
                  stroke-width="1"
                />
              </marker>
            </defs>
          </svg>
        </div>

        <!-- Hint overlay -->
        <div class="canvas-hint">
          Drag corners or mid-points to resize the room
        </div>
      </main>

      <!-- Right Sidebar: Room Options -->
      <aside class="sidebar sidebar-right">
        <div class="sidebar-section">
          <h3 class="sidebar-heading">Room Options</h3>

          <div class="option-group">
            <label class="option-label">Floor Finish</label>
            <div class="swatch-row">
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
            <label class="option-label">Wall Color</label>
            <div class="swatch-row">
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
            <label class="option-label">Trim Color</label>
            <div class="swatch-row">
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

          <h4 class="sidebar-subheading">Architectural Door Options</h4>

          <div class="option-group">
            <label class="option-label">Door Handle</label>
            <div class="swatch-row">
              <button
                v-for="handle in HANDLE_STYLES"
                :key="handle.id"
                class="swatch-btn swatch-labeled"
                :class="{
                  active: closet.doorOptions.handleFinish === handle.id,
                }"
                :style="{
                  background:
                    handle.colorHex === 'transparent'
                      ? '#1e293b'
                      : handle.colorHex,
                }"
                :title="handle.label"
                @click="closet.setDoorOptions({ handleFinish: handle.id })"
              >
                <span
                  v-if="handle.id === 'handle-none'"
                  class="swatch-none-label"
                  >✕</span
                >
              </button>
            </div>
          </div>

          <div class="option-group">
            <label class="option-label">Door Finish</label>
            <div class="swatch-row">
              <button
                v-for="mat in DOOR_MATERIALS"
                :key="mat.id"
                class="swatch-btn"
                :class="{ active: closet.doorOptions.doorFinishId === mat.id }"
                :style="{ background: mat.colorHex }"
                :title="mat.label"
                @click="
                  closet.setDoorOptions({
                    doorFinishId: mat.id,
                    doorColor: mat.colorHex,
                  })
                "
              />
            </div>
          </div>
        </div>
      </aside>
    </div>

    <FooterBar
      back-label="Back to Select Closet Type"
      back-route="/closet/type"
      forward-label="Design Closet"
      forward-route="/closet/design"
      :show-view-toggle="true"
    />
  </div>
</template>

<style scoped>
.floorplan-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #0b1220;
  color: #e2e8f0;
}

.floorplan-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebars */
.sidebar {
  width: 200px;
  flex-shrink: 0;
  overflow-y: auto;
  border-color: rgba(255, 255, 255, 0.06);
  background: rgba(15, 23, 42, 0.6);
  padding: 16px 12px;
}

.sidebar-left {
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar-right {
  border-left: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-heading {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  margin: 0;
}

.sidebar-subheading {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin: 8px 0 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sidebar-action-btn {
  padding: 8px 12px;
  border: 1px solid rgba(251, 191, 36, 0.2);
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.08);
  color: #fbbf24;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.sidebar-action-btn:hover {
  background: rgba(251, 191, 36, 0.15);
  border-color: rgba(251, 191, 36, 0.35);
}

/* Item grid */
.item-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.item-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.4);
  cursor: pointer;
  transition: all 0.15s;
  color: inherit;
  font-family: inherit;
}

.item-card:hover {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(30, 41, 59, 0.7);
  transform: translateY(-1px);
}

.item-icon {
  font-size: 20px;
}

.item-label {
  font-size: 9px;
  color: #94a3b8;
  text-align: center;
  line-height: 1.2;
}

/* Canvas area */
.floorplan-canvas-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  background:
    radial-gradient(
      ellipse at center,
      rgba(15, 23, 42, 0) 0%,
      rgba(2, 6, 23, 0.5) 100%
    ),
    linear-gradient(180deg, #0f172a 0%, #0b1220 100%);
}

.canvas-container {
  width: 80%;
  max-width: 600px;
  aspect-ratio: 1;
}

.floorplan-svg {
  width: 100%;
  height: 100%;
}

.resize-handle {
  cursor: pointer;
  transition: all 0.15s;
}

.resize-handle:hover {
  r: 7;
  fill: #f59e0b;
}

.canvas-hint {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 14px;
  border-radius: 99px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 12px;
  color: #64748b;
  pointer-events: none;
}

/* Swatch UI */
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

.swatch-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.swatch-btn {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 2px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.15s;
}

.swatch-btn:hover {
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.08);
}

.swatch-btn.active {
  border-color: #fbbf24;
  box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.3);
}

.swatch-labeled {
  width: 28px;
  height: 28px;
}

.swatch-none-label {
  font-size: 14px;
  color: #64748b;
}
</style>
