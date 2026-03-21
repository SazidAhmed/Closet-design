<script setup lang="ts">
import { computed } from "vue";
import { Html } from "@tresjs/cientos";
import { useRoomStore } from "../stores/useRoomStore";
import { useClosetStore } from "../stores/useClosetStore";

const roomStore = useRoomStore();
const closet = useClosetStore();

// ── Room & cabinet dimensions ─────────────────────────────────────────────
const roomBounds = computed(() => roomStore.planBounds);
const roomH = computed(() => roomStore.height ?? 244);
const cabW = computed(() => Number(closet.cabinet.width) || 60);
const cabH = computed(() => Number(closet.cabinet.height) || 200);
const cabD = computed(() => Number(closet.cabinet.depth) || 60);
const closetWall = computed(() => roomStore.closetWall);

const ox = computed(() => roomStore.closetOffsetX);
const oy = computed(() => roomStore.closetOffsetY);
const oz = computed(() => roomStore.closetOffsetZ);

function polygonOrientationSign() {
  const walls = roomStore.walls;
  if (walls.length < 2) return 1;
  const points: [number, number][] = walls.map((w) => [w.position[0], w.position[1]]);
  const last = walls[walls.length - 1];
  if (last) {
    points.push([
      last.position[0] + Math.cos(last.angle) * last.length,
      last.position[1] + Math.sin(last.angle) * last.length,
    ]);
  }
  let twiceArea = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    twiceArea += a[0] * b[1] - b[0] * a[1];
  }
  return twiceArea >= 0 ? 1 : -1;
}

const closetFrame = computed(() => {
  const wall = closetWall.value;
  if (!wall) {
    return {
      centerX: roomBounds.value.centerX + ox.value,
      centerZ: roomBounds.value.minY + cabD.value / 2 + oz.value,
      yaw: 0,
      wallLength: roomBounds.value.width,
    };
  }

  const tx = Math.cos(wall.angle);
  const tz = Math.sin(wall.angle);
  const sign = polygonOrientationSign();
  const leftNx = -tz;
  const leftNz = tx;
  const nx = sign >= 0 ? leftNx : -leftNx;
  const nz = sign >= 0 ? leftNz : -leftNz;

  const along = wall.length / 2 + ox.value;
  const px = wall.position[0] + tx * along;
  const pz = wall.position[1] + tz * along;
  const depth = cabD.value / 2 + oz.value;

  return {
    centerX: px + nx * depth,
    centerZ: pz + nz * depth,
    yaw: wall.angle,
    wallLength: wall.length,
  };
});

const closetCenterY = computed(
  () => -roomH.value / 2 + cabH.value / 2 + oy.value,
);

// ── Visibility ────────────────────────────────────────────────────────────
const showH = computed(() => wallStartGap.value > 0);
const showV = computed(() => oy.value > 0);
const showD = computed(() => oz.value > 0);

// ── Ruler geometry helpers ────────────────────────────────────────────────
const T = 1.2;
const CAP = 6;

// Local frame distances relative to cabinet center
const wallStartGap = computed(() => {
  const leftEdgeAlong = closetFrame.value.wallLength / 2 + ox.value - cabW.value / 2;
  return Math.max(0, leftEdgeAlong);
});
const floorRelY = computed(() => -cabH.value / 2 - oy.value);
const hY = computed(() => floorRelY.value + 4);
const hZ = computed(() => -cabD.value / 2);
const hCX = computed(() => -cabW.value / 2 - wallStartGap.value / 2);

const vLen = computed(() => oy.value);
const vCY = computed(() => floorRelY.value + vLen.value / 2);
const vX = computed(() => -cabW.value / 2 - 10);
const vZ = computed(() => -cabD.value / 2);

const dLen = computed(() => oz.value);
const dCZ = computed(() => -cabD.value / 2 - dLen.value / 2);
const dX = computed(() => 0);
const dY = computed(() => floorRelY.value + 4);

// ── Label strings ─────────────────────────────────────────────────────────
const hLabel = computed(() => `${Math.round(wallStartGap.value)} cm`);
const vLabel = computed(() => `${Math.round(vLen.value)} cm`);
const dLabel = computed(() => `${Math.round(dLen.value)} cm`);

const dLabelX = computed(() => cabW.value / 2 + 14);
</script>

<template>
  <TresGroup :position="[closetFrame.centerX, closetCenterY, closetFrame.centerZ]" :rotation="[0, closetFrame.yaw, 0]">
    <!-- ── Horizontal ruler (left wall → cabinet left edge) ────────────── -->
    <TresGroup v-if="showH">
      <!-- Main line -->
      <TresMesh :position="[hCX, hY, hZ]">
        <TresBoxGeometry :args="[wallStartGap, T, T]" />
        <TresMeshBasicMaterial color="#f59e0b" />
      </TresMesh>
      <!-- Left cap (at left wall) -->
      <TresMesh :position="[-cabW / 2 - wallStartGap, hY, hZ]">
        <TresBoxGeometry :args="[T, CAP, T]" />
        <TresMeshBasicMaterial color="#f59e0b" />
      </TresMesh>
      <!-- Right cap (at cabinet left edge) -->
      <TresMesh :position="[-cabW / 2, hY, hZ]">
        <TresBoxGeometry :args="[T, CAP, T]" />
        <TresMeshBasicMaterial color="#f59e0b" />
      </TresMesh>
      <!-- Label: amber floats above the TOP of the cabinet, centred on the ruler span -->
      <Html :position="[hCX, cabH / 2 + 8, hZ]" center :occlude="false">
        <div class="measure-label yellow">↔ {{ hLabel }}</div>
      </Html>
    </TresGroup>

    <!-- ── Vertical ruler (floor → cabinet bottom) ─────────────────────── -->
    <TresGroup v-if="showV">
      <!-- Main line -->
      <TresMesh :position="[vX, vCY, vZ]">
        <TresBoxGeometry :args="[T, vLen, T]" />
        <TresMeshBasicMaterial color="#34d399" />
      </TresMesh>
      <!-- Bottom cap (at floor) -->
      <TresMesh :position="[vX, floorRelY, vZ]">
        <TresBoxGeometry :args="[CAP, T, T]" />
        <TresMeshBasicMaterial color="#34d399" />
      </TresMesh>
      <!-- Top cap (at cabinet bottom) -->
      <TresMesh :position="[vX, -cabH / 2, vZ]">
        <TresBoxGeometry :args="[CAP, T, T]" />
        <TresMeshBasicMaterial color="#34d399" />
      </TresMesh>
      <!-- Label: green on the LEFT side of cabinet at mid-height -->
      <Html :position="[vX - 8, vCY, vZ]" center :occlude="false">
        <div class="measure-label green">↕ {{ vLabel }}</div>
      </Html>
    </TresGroup>

    <!-- ── Depth ruler (back wall → cabinet back face) ─────────────────── -->
    <TresGroup v-if="showD">
      <!-- Main line -->
      <TresMesh :position="[dX, dY, dCZ]">
        <TresBoxGeometry :args="[T, T, dLen]" />
        <TresMeshBasicMaterial color="#a78bfa" />
      </TresMesh>
      <!-- Back cap (at back wall) -->
      <TresMesh :position="[dX, dY, -cabD / 2 - dLen]">
        <TresBoxGeometry :args="[CAP, CAP, T]" />
        <TresMeshBasicMaterial color="#a78bfa" />
      </TresMesh>
      <!-- Front cap (at cabinet back face) -->
      <TresMesh :position="[dX, dY, -cabD / 2]">
        <TresBoxGeometry :args="[CAP, CAP, T]" />
        <TresMeshBasicMaterial color="#a78bfa" />
      </TresMesh>
      <!-- Label: purple at mid-depth, lifted to a clear height beside the cabinet -->
      <Html :position="[dLabelX, dY + 20, dCZ]" center :occlude="false">
        <div class="measure-label purple">⇔ {{ dLabel }}</div>
      </Html>
    </TresGroup>
  </TresGroup>
</template>

<style>
/* Global so they render inside the Html portal */
.measure-label {
  font-family: "Inter", system-ui, sans-serif;
  font-size: 14px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 6px;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
  backdrop-filter: blur(4px);
  letter-spacing: 0.01em;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
.measure-label.yellow {
  background: rgba(245, 158, 11, 0.85);
  color: #1c1400;
}
.measure-label.green {
  background: rgba(52, 211, 153, 0.85);
  color: #001c10;
}
.measure-label.purple {
  background: rgba(167, 139, 250, 0.85);
  color: #1a0040;
}
</style>
