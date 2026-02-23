<script setup lang="ts">
import { useAppStore, type ViewMode } from "../stores/useAppStore";
import { Eye, Square, Box } from "lucide-vue-next";

defineProps<{
  transitioning?: boolean;
}>();

const appStore = useAppStore();

const modes: { value: ViewMode; label: string; icon: any }[] = [
  { value: "overhead", label: "Overhead", icon: Eye },
  { value: "wall", label: "Wall", icon: Square },
  { value: "3d", label: "3D", icon: Box },
];
</script>

<template>
  <div class="view-mode-toggle" :class="{ transitioning }">
    <button
      v-for="mode in modes"
      :key="mode.value"
      class="view-mode-btn"
      :class="{ active: appStore.viewMode === mode.value }"
      @click="appStore.setViewMode(mode.value)"
    >
      <component :is="mode.icon" :size="14" />
      {{ mode.label }}
    </button>
    <div v-if="transitioning" class="transition-bar" />
  </div>
</template>

<style scoped>
.view-mode-toggle {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
}

.view-mode-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 18px;
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

/* Animated transition bar */
.transition-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24);
  background-size: 200% 100%;
  width: 100%;
  animation: shimmer 0.7s ease-in-out;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
    opacity: 1;
  }
  100% {
    background-position: -200% 0;
    opacity: 0;
  }
}
</style>
