<script setup lang="ts">
import { computed } from "vue";
import { Html } from "@tresjs/cientos";
import { useRoomStore } from "../stores/useRoomStore";
import { useClosetStore } from "../stores/useClosetStore";

const roomStore = useRoomStore();
const closet = useClosetStore();

// ── Room & cabinet dimensions ─────────────────────────────────────────────
const roomW = computed(() => roomStore.walls[0]?.length ?? 244);
const roomD = computed(() => roomStore.walls[1]?.length ?? 244);
const roomH = computed(() => roomStore.height ?? 244);
const cabW = computed(() => Number(closet.cabinet.width) || 60);
const cabH = computed(() => Number(closet.cabinet.height) || 200);

const ox = computed(() => roomStore.closetOffsetX);
const oy = computed(() => roomStore.closetOffsetY);
const oz = computed(() => roomStore.closetOffsetZ);

// ── Key reference points ──────────────────────────────────────────────────
// Floor Y (world)
const floorY = computed(() => -roomH.value / 2);
// Back wall Z (world)
const backZ = computed(() => -roomD.value / 2);
// Left wall X (world)
const leftX = computed(() => -roomW.value / 2);

// Cabinet left edge X
const cabLeftX = computed(() => ox.value - cabW.value / 2);
// Cabinet bottom Y (world); = floorY when oy=0
const cabBottomY = computed(() => floorY.value + oy.value);
// Cabinet TOP Y (world)
const cabTopY = computed(() => floorY.value + oy.value + cabH.value);
// Cabinet back face Z (world); = backZ when oz=0
const cabBackZ = computed(() => backZ.value + oz.value);

// ── Visibility ────────────────────────────────────────────────────────────
const showH = computed(() => cabLeftX.value - leftX.value > 0); // left-wall gap
const showV = computed(() => oy.value > 0); // floor gap
const showD = computed(() => oz.value > 0); // back-wall gap

// ── Ruler geometry helpers ────────────────────────────────────────────────
const T = 1.2; // line thickness
const CAP = 6; // cap length

// Horizontal ruler: from left wall → left face of cabinet, just above floor, at back face Z
const hLen = computed(() => cabLeftX.value - leftX.value);
const hCX = computed(() => leftX.value + hLen.value / 2);
const hY = computed(() => floorY.value + 4);
const hZ = computed(() => cabBackZ.value); // sits at the back face

// Vertical ruler: from floor → cabinet bottom, left of cabinet, at back face Z
const vLen = computed(() => oy.value);
const vCY = computed(() => floorY.value + vLen.value / 2);
const vX = computed(() => cabLeftX.value - 10);
const vZ = computed(() => cabBackZ.value);

// Depth ruler: from back wall → cabinet back face, at cabinet center X, near floor
const dLen = computed(() => oz.value);
const dCZ = computed(() => backZ.value + dLen.value / 2);
const dX = computed(() => ox.value);
const dY = computed(() => floorY.value + 4);

// ── Label strings ─────────────────────────────────────────────────────────
const hLabel = computed(() => `${Math.round(hLen.value)} cm`);
const vLabel = computed(() => `${Math.round(vLen.value)} cm`);
const dLabel = computed(() => `${Math.round(dLen.value)} cm`);

// Purple label X: to the right of cabinet's right edge
const dLabelX = computed(() => dX.value + cabW.value / 2 + 14);
</script>

<template>
  <TresGroup>
    <!-- ── Horizontal ruler (left wall → cabinet left edge) ────────────── -->
    <TresGroup v-if="showH">
      <!-- Main line -->
      <TresMesh :position="[hCX, hY, hZ]">
        <TresBoxGeometry :args="[hLen, T, T]" />
        <TresMeshBasicMaterial color="#f59e0b" />
      </TresMesh>
      <!-- Left cap (at left wall) -->
      <TresMesh :position="[leftX, hY, hZ]">
        <TresBoxGeometry :args="[T, CAP, T]" />
        <TresMeshBasicMaterial color="#f59e0b" />
      </TresMesh>
      <!-- Right cap (at cabinet left edge) -->
      <TresMesh :position="[cabLeftX, hY, hZ]">
        <TresBoxGeometry :args="[T, CAP, T]" />
        <TresMeshBasicMaterial color="#f59e0b" />
      </TresMesh>
      <!-- Label: amber floats above the TOP of the cabinet, centred on the ruler span -->
      <Html :position="[hCX, cabTopY + 8, hZ]" center :occlude="false">
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
      <TresMesh :position="[vX, floorY, vZ]">
        <TresBoxGeometry :args="[CAP, T, T]" />
        <TresMeshBasicMaterial color="#34d399" />
      </TresMesh>
      <!-- Top cap (at cabinet bottom) -->
      <TresMesh :position="[vX, cabBottomY, vZ]">
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
      <TresMesh :position="[dX, dY, backZ]">
        <TresBoxGeometry :args="[CAP, CAP, T]" />
        <TresMeshBasicMaterial color="#a78bfa" />
      </TresMesh>
      <!-- Front cap (at cabinet back face) -->
      <TresMesh :position="[dX, dY, cabBackZ]">
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
