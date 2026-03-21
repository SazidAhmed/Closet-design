<script setup lang="ts">
import { computed } from "vue";
import { useRoomStore } from "../stores/useRoomStore";
import { getMaterial } from "../features/closet/domain/materials/catalog";
import {
  getTexture,
  scaleTexture,
  textureVersion,
} from "../composables/useTextureCache";

const roomStore = useRoomStore();

// Room dimensions from walls
const roomW = computed(() => roomStore.walls[0]?.length ?? 244);
const roomD = computed(() => roomStore.walls[1]?.length ?? 244);
const roomH = computed(() => roomStore.height ?? 244);

// Use actual floor-plan wall segments so custom drawn rooms are reflected in 3D.
const wallSegments = computed(() =>
  roomStore.walls
    .filter((w) => w.visible !== false)
    .map((w) => {
      const sx = w.position[0];
      const sz = w.position[1];
      const ex = sx + Math.cos(w.angle) * w.length;
      const ez = sz + Math.sin(w.angle) * w.length;
      return {
        id: w.id,
        length: Math.max(1, Number(w.length) || 1),
        angle: w.angle,
        midX: (sx + ex) / 2,
        midZ: (sz + ez) / 2,
      };
    }),
);

const openWallId = computed(() => {
  const segs = wallSegments.value;
  if (segs.length === 0) return null;
  return segs.reduce((front, current) =>
    current.midZ > front.midZ ? current : front,
  ).id;
});

const renderedWalls = computed(() =>
  wallSegments.value.filter((seg) => seg.id !== openWallId.value),
);

const roomBounds = computed(() => {
  const segs = wallSegments.value;
  if (segs.length === 0) {
    return {
      width: roomW.value,
      depth: roomD.value,
      centerX: 0,
      centerZ: 0,
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const wall of roomStore.walls) {
    const sx = wall.position[0];
    const sz = wall.position[1];
    const ex = sx + Math.cos(wall.angle) * wall.length;
    const ez = sz + Math.sin(wall.angle) * wall.length;

    minX = Math.min(minX, sx, ex);
    maxX = Math.max(maxX, sx, ex);
    minZ = Math.min(minZ, sz, ez);
    maxZ = Math.max(maxZ, sz, ez);
  }

  const width = Math.max(1, maxX - minX);
  const depth = Math.max(1, maxZ - minZ);
  return {
    width,
    depth,
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
  };
});

// Half-sizes for centering
const hh = computed(() => roomH.value / 2);

const wallThickness = 3;

// ── Floor texture ────────────────────────────────────────────────────────
const floorTexture = computed(() => {
  void textureVersion.value;
  const floorMatId = roomStore.colors.floorFinishId;
  if (!floorMatId) return null;

  const mat = getMaterial(floorMatId);
  if (!mat?.textureUrl) return null;

  const tex = getTexture(mat.textureUrl);
  if (tex) {
    scaleTexture(tex, roomBounds.value.width, roomBounds.value.depth, 100);
  }
  return tex;
});
</script>

<template>
  <TresGroup>
    <!-- Floor -->
    <TresMesh
      :position="[roomBounds.centerX, -hh, roomBounds.centerZ]"
      :rotation="[-Math.PI / 2, 0, 0]"
    >
      <TresPlaneGeometry :args="[roomBounds.width, roomBounds.depth]" />
      <TresMeshStandardMaterial
        :color="roomStore.colors.floorColor"
        :roughness="0.9"
        :metalness="0"
        :map="floorTexture"
      />
    </TresMesh>

    <!-- Render all room walls except the front-most one to keep the design open -->
    <TresMesh
      v-for="seg in renderedWalls"
      :key="seg.id"
      :position="[seg.midX, 0, seg.midZ]"
      :rotation="[0, seg.angle, 0]"
    >
      <TresPlaneGeometry :args="[seg.length, roomH]" />
      <TresMeshStandardMaterial
        :color="roomStore.colors.wallColor"
        :roughness="0.95"
        :metalness="0"
      />
    </TresMesh>

    <TresMesh
      v-for="seg in renderedWalls"
      :key="`trim-${seg.id}`"
      :position="[seg.midX, -hh + wallThickness / 2, seg.midZ]"
      :rotation="[0, seg.angle, 0]"
    >
      <TresBoxGeometry :args="[seg.length, wallThickness, wallThickness]" />
      <TresMeshStandardMaterial
        :color="roomStore.colors.trimColor"
        :roughness="0.85"
        :metalness="0"
      />
    </TresMesh>
  </TresGroup>
</template>
