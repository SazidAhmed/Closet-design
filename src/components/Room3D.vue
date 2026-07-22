<script setup lang="ts">
import { computed, ref } from "vue";
import { DoubleSide } from "three";
import { useLoop, useTresContext } from "@tresjs/core";
import { Html } from "@tresjs/cientos";
import { useRoomStore } from "../stores/useRoomStore";
import { getMaterial } from "../features/closet/domain/materials/catalog";
import {
  getTexture,
  scaleTexture,
  textureVersion,
} from "../composables/useTextureCache";

const roomStore = useRoomStore();
const ctx = useTresContext();
const { onBeforeRender } = useLoop();

// Room dimensions from walls
const roomW = computed(() => roomStore.walls[0]?.length ?? 96);
const roomD = computed(() => roomStore.walls[1]?.length ?? 96);
const roomH = computed(() => roomStore.height ?? 96);

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
        label: w.label,
        length: Math.max(1, Number(w.length) || 1),
        angle: w.angle,
        midX: (sx + ex) / 2,
        midZ: (sz + ez) / 2,
      };
    }),
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

const cameraDirXZ = ref<[number, number]>([0, 1]);

onBeforeRender(() => {
  const camera = ctx.camera.activeCamera.value;
  if (!camera) return;

  const dx = camera.position.x - roomBounds.value.centerX;
  const dz = camera.position.z - roomBounds.value.centerZ;
  const len = Math.hypot(dx, dz);
  if (len < 1e-4) return;

  cameraDirXZ.value = [dx / len, dz / len];
});

const openWallId = computed(() => {
  const segs = wallSegments.value;
  if (segs.length === 0) return null;

  const [vx, vz] = cameraDirXZ.value;
  const centerX = roomBounds.value.centerX;
  const centerZ = roomBounds.value.centerZ;

  return segs.reduce((front, current) => {
    const frontScore =
      (front.midX - centerX) * vx + (front.midZ - centerZ) * vz;
    const currentScore =
      (current.midX - centerX) * vx + (current.midZ - centerZ) * vz;
    return currentScore > frontScore ? current : front;
  }).id;
});

const renderedWalls = computed(() =>
  wallSegments.value.filter((seg) => seg.id !== openWallId.value),
);

const polygonOrientation = computed(() => {
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
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    twiceArea += a[0] * b[1] - b[0] * a[1];
  }

  return twiceArea >= 0 ? 1 : -1;
});

const wallLabelAnchors = computed(() => {
  const offset = 6;
  const sign = polygonOrientation.value;
  const labelY = roomH.value / 2 - 16;

  return renderedWalls.value.map((seg) => {
    const leftNx = -Math.sin(seg.angle);
    const leftNz = Math.cos(seg.angle);
    const nx = sign >= 0 ? leftNx : -leftNx;
    const nz = sign >= 0 ? leftNz : -leftNz;

    return {
      id: seg.id,
      label: seg.label || "?",
      x: seg.midX + nx * offset,
      y: labelY,
      z: seg.midZ + nz * offset,
    };
  });
});

// Half-sizes for centering
const hh = computed(() => roomH.value / 2);

const wallThickness = 3;

const wallOpenings = computed(() =>
  roomStore.items
    .filter(
      (item) =>
        !!item.wallId &&
        (item.category === "door" || item.type === "window"),
    )
    .map((item) => {
      const wall = roomStore.walls.find(
        (w) =>
          w.id === item.wallId &&
          w.visible !== false &&
          renderedWalls.value.some((seg) => seg.id === w.id),
      );
      if (!wall) return null;

      const endX = wall.position[0] + Math.cos(wall.angle) * wall.length;
      const endZ = wall.position[1] + Math.sin(wall.angle) * wall.length;
      const t = Math.max(0.05, Math.min(0.95, item.positionAlongWall));

      const baseX = wall.position[0] + (endX - wall.position[0]) * t;
      const baseZ = wall.position[1] + (endZ - wall.position[1]) * t;

      const openingWidth = Math.max(10, item.width);
      const openingHeight = Math.max(10, item.height);
      const floorY = -hh.value;
      const sillHeight = 90;
      const rawCenterY =
        item.category === "door"
          ? floorY + openingHeight / 2
          : floorY + sillHeight + openingHeight / 2;

      const minCenterY = floorY + openingHeight / 2;
      const maxCenterY = hh.value - openingHeight / 2 - 2;
      const centerY = Math.max(minCenterY, Math.min(maxCenterY, rawCenterY));
      const depth = item.category === "door" ? 2.2 : 1.6;

      return {
        id: item.id,
        isDoor: item.category === "door",
        width: openingWidth,
        height: openingHeight,
        depth,
        yaw: wall.angle,
        x: baseX,
        y: centerY,
        z: baseZ,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => !!entry),
);

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

    <!-- Render room walls except the front-most side (open view) -->
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
        :side="DoubleSide"
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

    <TresGroup
      v-for="anchor in wallLabelAnchors"
      :key="`wall-label-${anchor.id}`"
      :position="[anchor.x, anchor.y, anchor.z]"
    >
      <Html center :occlude="false">
        <div class="wall-number-label">{{ anchor.label }}</div>
      </Html>
    </TresGroup>

    <TresGroup
      v-for="opening in wallOpenings"
      :key="opening.id"
      :position="[opening.x, opening.y, opening.z]"
      :rotation="[0, opening.yaw, 0]"
    >
      <TresMesh>
        <TresBoxGeometry :args="[opening.width, opening.height, opening.depth]" />
        <TresMeshStandardMaterial
          :color="opening.isDoor ? '#9a7b4f' : '#7dd3fc'"
          :roughness="opening.isDoor ? 0.92 : 0.35"
          :metalness="opening.isDoor ? 0.05 : 0"
          :opacity="opening.isDoor ? 1 : 0.55"
          :transparent="!opening.isDoor"
          :side="DoubleSide"
        />
      </TresMesh>

      <TresMesh :position="[0, opening.height / 2 - 1.5, opening.depth / 2 + 0.25]">
        <TresBoxGeometry :args="[opening.width, 3, 0.5]" />
        <TresMeshStandardMaterial color="#e2e8f0" :roughness="0.8" :metalness="0" />
      </TresMesh>
      <TresMesh :position="[0, -opening.height / 2 + 1.5, opening.depth / 2 + 0.25]">
        <TresBoxGeometry :args="[opening.width, 3, 0.5]" />
        <TresMeshStandardMaterial color="#e2e8f0" :roughness="0.8" :metalness="0" />
      </TresMesh>
      <TresMesh :position="[-opening.width / 2 + 1.5, 0, opening.depth / 2 + 0.25]">
        <TresBoxGeometry :args="[3, opening.height, 0.5]" />
        <TresMeshStandardMaterial color="#e2e8f0" :roughness="0.8" :metalness="0" />
      </TresMesh>
      <TresMesh :position="[opening.width / 2 - 1.5, 0, opening.depth / 2 + 0.25]">
        <TresBoxGeometry :args="[3, opening.height, 0.5]" />
        <TresMeshStandardMaterial color="#e2e8f0" :roughness="0.8" :metalness="0" />
      </TresMesh>

      <TresMesh :position="[0, opening.height / 2 - 1.5, -opening.depth / 2 - 0.25]">
        <TresBoxGeometry :args="[opening.width, 3, 0.5]" />
        <TresMeshStandardMaterial color="#e2e8f0" :roughness="0.8" :metalness="0" />
      </TresMesh>
      <TresMesh :position="[0, -opening.height / 2 + 1.5, -opening.depth / 2 - 0.25]">
        <TresBoxGeometry :args="[opening.width, 3, 0.5]" />
        <TresMeshStandardMaterial color="#e2e8f0" :roughness="0.8" :metalness="0" />
      </TresMesh>
      <TresMesh :position="[-opening.width / 2 + 1.5, 0, -opening.depth / 2 - 0.25]">
        <TresBoxGeometry :args="[3, opening.height, 0.5]" />
        <TresMeshStandardMaterial color="#e2e8f0" :roughness="0.8" :metalness="0" />
      </TresMesh>
      <TresMesh :position="[opening.width / 2 - 1.5, 0, -opening.depth / 2 - 0.25]">
        <TresBoxGeometry :args="[3, opening.height, 0.5]" />
        <TresMeshStandardMaterial color="#e2e8f0" :roughness="0.8" :metalness="0" />
      </TresMesh>
    </TresGroup>
  </TresGroup>
</template>

<style scoped>
.wall-number-label {
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.9);
  background: #f59e0b;
  color: #0f172a;
  font-size: 12px;
  font-weight: 800;
  line-height: 18px;
  text-align: center;
  padding: 0 6px;
  box-shadow: 0 2px 8px rgba(2, 6, 23, 0.5);
  user-select: none;
}
</style>
