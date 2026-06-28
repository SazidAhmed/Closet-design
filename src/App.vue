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
  // Check for token passed via URL from the Website project.
  // Use URLSearchParams directly — route.query may not be ready yet during
  // the initial navigation when onMounted fires.
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    // Save the token for API authentication
    localStorage.setItem("access_token", token);

    // Remove the token from the URL for security (so it isn't copied/shared)
    params.delete("token");
    const newSearch = params.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
    window.history.replaceState({}, "", newUrl);
  }

  // Try to restore a previously saved design
  history.loadFromLocalStorage();
  // Start recording undo history + auto-saving
  history.startWatching();
  // Sync state from other open tabs in real-time
  history.startCrossTabSync();
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <RouterView />
</template>

