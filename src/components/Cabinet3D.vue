<script setup lang="ts">
import { computed } from "vue";
import { useClosetStore } from "../stores/useClosetStore";
import { useRoomStore } from "../stores/useRoomStore";
import { buildParts } from "../features/closet/domain/buildCabinetParts";
import type { ClosetPart } from "../features/closet/domain/parts";
import { getMaterial } from "../features/closet/domain/materials/catalog";
import {
  getTexture,
  scaleTexture,
  textureVersion,
} from "../composables/useTextureCache";
import type * as THREE from "three";

const closet = useClosetStore();
const roomStore = useRoomStore();

const parts = computed(() => buildParts(closet.$state));

const panelParts = computed(() =>
  parts.value.filter((p) =>
    [
      "panel_left",
      "panel_right",
      "panel_top",
      "panel_bottom",
      "panel_back",
      "divider",
    ].includes(p.type),
  ),
);

const shelfParts = computed(() =>
  parts.value.filter((p) => p.type === "shelf" || p.type === "shoe_shelf"),
);

const rodParts = computed(() => parts.value.filter((p) => p.type === "rod"));

const drawerParts = computed(() =>
  parts.value.filter((p) => p.type === "drawer_box"),
);

function partColor(part: ClosetPart): string {
  const mat = getMaterial(part.materialId);
  if (mat) return mat.colorHex;

  // Fallback colors
  if (part.type === "panel_back") return "#c9c3b9";
  if (part.type === "rod") return "#c0c0c0";
  if (part.type === "drawer_box") return "#b8a99a";
  return "#d7d1c7";
}

function partRoughness(part: ClosetPart): number {
  const mat = getMaterial(part.materialId);
  if (mat) return mat.roughness;

  if (part.type === "panel_back") return 0.95;
  if (part.type === "shelf" || part.type === "shoe_shelf") return 0.85;
  if (part.type === "rod") return 0.3;
  if (part.type === "drawer_box") return 0.88;
  return 0.9;
}

function partMetalness(part: ClosetPart): number {
  const mat = getMaterial(part.materialId);
  if (mat) return mat.metalness;

  if (part.type === "rod") return 0.8;
  return 0;
}

/** Get texture for a part (returns null if no texture or not yet loaded) */
function partTexture(part: ClosetPart): THREE.Texture | null {
  // Touch reactive version to re-render when URL-based textures load
  void textureVersion.value;

  const mat = getMaterial(part.materialId);
  if (!mat?.textureUrl) return null;

  const tex = getTexture(mat.textureUrl);
  if (tex) {
    // Scale texture repeat based on part dimensions
    scaleTexture(tex, part.dims.x, part.dims.y, 80);
  }
  return tex;
}

// ── Measurement dimension lines ──────────────────────────────────────────
const cabW = computed(() => Number(closet.cabinet.width) || 60);
const cabH = computed(() => Number(closet.cabinet.height) || 200);
const cabD = computed(() => Number(closet.cabinet.depth) || 60);

// ── Closet position inside room ─────────────────────────────────────────
// offsetX: horizontal (left/right), offsetY: vertical lift from floor.
// The room is centred at origin; floor is at -roomH/2. When offsetY = 0
// the cabinet sits on the floor: its centre is at floor + cabH/2.
const roomH = computed(() => roomStore.height ?? 244);
const roomD = computed(() => roomStore.walls[1]?.length ?? 244);
const closetPosX = computed(() => roomStore.closetOffsetX);
// Y in 3D: floor = -roomH/2, cabinet centre when on floor = -roomH/2 + cabH/2
const closetPosY = computed(
  () => -roomH.value / 2 + cabH.value / 2 + roomStore.closetOffsetY,
);
// Z in 3D: back wall = -roomD/2, cabinet front face when against back wall = -roomD/2 + cabD/2
const closetPosZ = computed(
  () => -roomD.value / 2 + cabD.value / 2 + roomStore.closetOffsetZ,
);
const closetPosition = computed<[number, number, number]>(() => [
  closetPosX.value,
  closetPosY.value,
  closetPosZ.value,
]);

// ── Decorative props: hangers on rods ────────────────────────────────────
const hangerProps = computed(() => {
  const hangers: {
    pos: [number, number, number];
    rot: [number, number, number];
  }[] = [];
  for (const rod of rodParts.value) {
    const rodLen = rod.dims.x;
    const count = Math.min(Math.floor(rodLen / 12), 6); // ~12cm apart, max 6
    for (let i = 0; i < count; i++) {
      const offset = -rodLen / 2 + (i + 1) * (rodLen / (count + 1));
      hangers.push({
        pos: [
          rod.transform.pos[0] + offset,
          rod.transform.pos[1] - 12,
          rod.transform.pos[2],
        ],
        rot: [0, Math.random() * 0.4 - 0.2, 0],
      });
    }
  }
  return hangers;
});
</script>

<template>
  <!-- Outer group positions the entire closet inside the room -->
  <TresGroup :position="closetPosition">
    <TresGroup>
      <!-- Carcass panels + dividers -->
      <TresMesh
        v-for="part in panelParts"
        :key="part.id"
        :position="part.transform.pos"
        :rotation="part.transform.rot"
      >
        <TresBoxGeometry :args="[part.dims.x, part.dims.y, part.dims.z]" />
        <TresMeshStandardMaterial
          :color="partColor(part)"
          :roughness="partRoughness(part)"
          :metalness="partMetalness(part)"
          :map="partTexture(part)"
        />
      </TresMesh>

      <!-- Shelves + Shoe shelves -->
      <TresMesh
        v-for="part in shelfParts"
        :key="part.id"
        :position="part.transform.pos"
        :rotation="part.transform.rot"
      >
        <TresBoxGeometry :args="[part.dims.x, part.dims.y, part.dims.z]" />
        <TresMeshStandardMaterial
          :color="partColor(part)"
          :roughness="partRoughness(part)"
          :metalness="partMetalness(part)"
          :map="partTexture(part)"
        />
      </TresMesh>

      <!-- Rods (cylinders) -->
      <TresMesh
        v-for="part in rodParts"
        :key="part.id"
        :position="part.transform.pos"
        :rotation="part.transform.rot"
      >
        <TresCylinderGeometry
          :args="[part.dims.y / 2, part.dims.y / 2, part.dims.x, 16]"
        />
        <TresMeshStandardMaterial
          :color="partColor(part)"
          :roughness="partRoughness(part)"
          :metalness="partMetalness(part)"
        />
      </TresMesh>

      <!-- Drawers (boxes with slightly different style) -->
      <TresMesh
        v-for="part in drawerParts"
        :key="part.id"
        :position="part.transform.pos"
        :rotation="part.transform.rot"
      >
        <TresBoxGeometry :args="[part.dims.x, part.dims.y, part.dims.z]" />
        <TresMeshStandardMaterial
          :color="partColor(part)"
          :roughness="partRoughness(part)"
          :metalness="partMetalness(part)"
          :map="partTexture(part)"
        />
      </TresMesh>

      <!-- ── Measurement dimension lines ─────────────────────────── -->
      <!-- Width line (bottom, front) -->
      <TresGroup>
        <TresMesh :position="[0, -cabH / 2 - 12, cabD / 2 + 5]">
          <TresBoxGeometry :args="[cabW, 0.8, 0.8]" />
          <TresMeshBasicMaterial color="#fbbf24" />
        </TresMesh>
        <!-- Left cap -->
        <TresMesh :position="[-cabW / 2, -cabH / 2 - 12, cabD / 2 + 5]">
          <TresBoxGeometry :args="[0.8, 8, 0.8]" />
          <TresMeshBasicMaterial color="#fbbf24" />
        </TresMesh>
        <!-- Right cap -->
        <TresMesh :position="[cabW / 2, -cabH / 2 - 12, cabD / 2 + 5]">
          <TresBoxGeometry :args="[0.8, 8, 0.8]" />
          <TresMeshBasicMaterial color="#fbbf24" />
        </TresMesh>
      </TresGroup>

      <!-- Height line (left, front) -->
      <TresGroup>
        <TresMesh :position="[-cabW / 2 - 12, 0, cabD / 2 + 5]">
          <TresBoxGeometry :args="[0.8, cabH, 0.8]" />
          <TresMeshBasicMaterial color="#60a5fa" />
        </TresMesh>
        <!-- Top cap -->
        <TresMesh :position="[-cabW / 2 - 12, cabH / 2, cabD / 2 + 5]">
          <TresBoxGeometry :args="[8, 0.8, 0.8]" />
          <TresMeshBasicMaterial color="#60a5fa" />
        </TresMesh>
        <!-- Bottom cap -->
        <TresMesh :position="[-cabW / 2 - 12, -cabH / 2, cabD / 2 + 5]">
          <TresBoxGeometry :args="[8, 0.8, 0.8]" />
          <TresMeshBasicMaterial color="#60a5fa" />
        </TresMesh>
      </TresGroup>

      <!-- Depth line (bottom, right side) -->
      <TresGroup>
        <TresMesh :position="[cabW / 2 + 12, -cabH / 2 - 12, 0]">
          <TresBoxGeometry :args="[0.8, 0.8, cabD]" />
          <TresMeshBasicMaterial color="#34d399" />
        </TresMesh>
        <!-- Front cap -->
        <TresMesh :position="[cabW / 2 + 12, -cabH / 2 - 12, cabD / 2]">
          <TresBoxGeometry :args="[0.8, 8, 0.8]" />
          <TresMeshBasicMaterial color="#34d399" />
        </TresMesh>
        <!-- Back cap -->
        <TresMesh :position="[cabW / 2 + 12, -cabH / 2 - 12, -cabD / 2]">
          <TresBoxGeometry :args="[0.8, 8, 0.8]" />
          <TresMeshBasicMaterial color="#34d399" />
        </TresMesh>
      </TresGroup>

      <!-- ── Decorative hangers on rods ──────────────────────────── -->
      <TresMesh
        v-for="(hanger, hIdx) in hangerProps"
        :key="'hanger-' + hIdx"
        :position="hanger.pos"
        :rotation="hanger.rot"
      >
        <TresBoxGeometry :args="[1, 22, 8]" />
        <TresMeshStandardMaterial
          color="#8b7e6e"
          :roughness="0.7"
          :metalness="0"
        />
      </TresMesh>
    </TresGroup>
  </TresGroup>
</template>
