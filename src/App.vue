<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useHistoryStore } from "./stores/useHistoryStore";

const history = useHistoryStore();

function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    e.preventDefault();
    if (e.shiftKey) {
      history.redo();
    } else {
      history.undo();
    }
  }
  // Ctrl+S to save
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    history.saveToLocalStorage();
  }
}

onMounted(() => {
  // Try to restore a previously saved design
  history.loadFromLocalStorage();
  // Start recording undo history + auto-saving
  history.startWatching();
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <RouterView />
</template>
