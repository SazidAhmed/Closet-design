<script setup lang="ts">
import { computed } from "vue";
import { useClosetStore } from "../stores/useClosetStore";
import { buildParts } from "../features/closet/domain/buildCabinetParts";
import type { ClosetPart } from "../features/closet/domain/parts";
import { getMaterial } from "../features/closet/domain/materials/catalog";

const closet = useClosetStore();

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
</script>

<template>
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
      />
    </TresMesh>
  </TresGroup>
</template>
