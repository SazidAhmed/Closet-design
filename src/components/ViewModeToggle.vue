<script setup lang="ts">
import { useAppStore, type ViewMode } from "../stores/useAppStore";

const appStore = useAppStore();

const modes: { value: ViewMode; label: string }[] = [
  { value: "overhead", label: "Overhead" },
  { value: "wall", label: "Wall" },
  { value: "3d", label: "3D" },
];
</script>

<template>
  <div class="view-mode-toggle">
    <button
      v-for="mode in modes"
      :key="mode.value"
      class="view-mode-btn"
      :class="{ active: appStore.viewMode === mode.value }"
      @click="appStore.setViewMode(mode.value)"
    >
      {{ mode.label }}
    </button>
  </div>
</template>

<style scoped>
.view-mode-toggle {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.view-mode-btn {
  padding: 6px 20px;
  border: none;
  background: rgba(15, 23, 42, 0.8);
  color: #94a3b8;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.01em;
}

.view-mode-btn:not(:last-child) {
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.view-mode-btn:hover {
  background: rgba(30, 41, 59, 0.9);
  color: #e2e8f0;
}

.view-mode-btn.active {
  background: #334155;
  color: #ffffff;
  font-weight: 600;
}
</style>
