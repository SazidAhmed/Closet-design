<script setup lang="ts">
import { computed } from "vue";
import { useRoomStore } from "../stores/useRoomStore";

const roomStore = useRoomStore();

// Room dimensions from walls
const roomW = computed(() => roomStore.walls[0]?.length ?? 244);
const roomD = computed(() => roomStore.walls[1]?.length ?? 244);
const roomH = computed(() => roomStore.height ?? 244);

// Half-sizes for centering
const hw = computed(() => roomW.value / 2);
const hd = computed(() => roomD.value / 2);
const hh = computed(() => roomH.value / 2);

const wallThickness = 3;
</script>

<template>
  <TresGroup>
    <!-- Floor -->
    <TresMesh :position="[0, -hh, 0]" :rotation="[-Math.PI / 2, 0, 0]">
      <TresPlaneGeometry :args="[roomW, roomD]" />
      <TresMeshStandardMaterial
        :color="roomStore.colors.floorColor"
        :roughness="0.9"
        :metalness="0"
      />
    </TresMesh>

    <!-- Back wall (behind closet, Z = -hd) -->
    <TresMesh :position="[0, 0, -hd]">
      <TresPlaneGeometry :args="[roomW, roomH]" />
      <TresMeshStandardMaterial
        :color="roomStore.colors.wallColor"
        :roughness="0.95"
        :metalness="0"
      />
    </TresMesh>

    <!-- Left wall (X = -hw) -->
    <TresMesh :position="[-hw, 0, 0]" :rotation="[0, Math.PI / 2, 0]">
      <TresPlaneGeometry :args="[roomD, roomH]" />
      <TresMeshStandardMaterial
        :color="roomStore.colors.wallColor"
        :roughness="0.95"
        :metalness="0"
      />
    </TresMesh>

    <!-- Right wall (X = +hw) -->
    <TresMesh :position="[hw, 0, 0]" :rotation="[0, -Math.PI / 2, 0]">
      <TresPlaneGeometry :args="[roomD, roomH]" />
      <TresMeshStandardMaterial
        :color="roomStore.colors.wallColor"
        :roughness="0.95"
        :metalness="0"
      />
    </TresMesh>

    <!-- Bottom trim strip (along back wall floor edge) -->
    <TresMesh :position="[0, -hh + wallThickness / 2, -hd + wallThickness / 2]">
      <TresBoxGeometry :args="[roomW, wallThickness, wallThickness]" />
      <TresMeshStandardMaterial
        :color="roomStore.colors.trimColor"
        :roughness="0.85"
        :metalness="0"
      />
    </TresMesh>

    <!-- Left trim strip (along left wall floor edge) -->
    <TresMesh :position="[-hw + wallThickness / 2, -hh + wallThickness / 2, 0]">
      <TresBoxGeometry :args="[wallThickness, wallThickness, roomD]" />
      <TresMeshStandardMaterial
        :color="roomStore.colors.trimColor"
        :roughness="0.85"
        :metalness="0"
      />
    </TresMesh>

    <!-- Right trim strip (along right wall floor edge) -->
    <TresMesh :position="[hw - wallThickness / 2, -hh + wallThickness / 2, 0]">
      <TresBoxGeometry :args="[wallThickness, wallThickness, roomD]" />
      <TresMeshStandardMaterial
        :color="roomStore.colors.trimColor"
        :roughness="0.85"
        :metalness="0"
      />
    </TresMesh>
  </TresGroup>
</template>
