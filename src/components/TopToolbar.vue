<script setup lang="ts">
import { useRouter } from "vue-router";
import {
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  FilePlus,
  Share2,
  Maximize,
  Settings,
  HelpCircle,
  LogIn,
} from "lucide-vue-next";

const router = useRouter();

const emit = defineEmits<{
  (e: "new"): void;
  (e: "open"): void;
  (e: "save"): void;
  (e: "undo"): void;
  (e: "redo"): void;
  (e: "share"): void;
  (e: "fullscreen"): void;
  (e: "settings"): void;
  (e: "help"): void;
}>();

function handleNew() {
  emit("new");
  router.push("/closet/type");
}
</script>

<template>
  <header class="toolbar">
    <div class="toolbar-left">
      <div class="toolbar-logo" @click="router.push('/')">
        <span class="logo-text"
          >closet<span class="logo-accent">designer</span></span
        >
      </div>

      <div class="toolbar-divider" />

      <div class="toolbar-actions">
        <button class="toolbar-btn" title="New Design" @click="handleNew">
          <FilePlus :size="18" />
        </button>
        <button class="toolbar-btn" title="Open Design" @click="$emit('open')">
          <FolderOpen :size="18" />
        </button>
        <button class="toolbar-btn" title="Save Design" @click="$emit('save')">
          <Save :size="18" />
        </button>

        <div class="toolbar-divider" />

        <button
          class="toolbar-btn"
          title="Undo (Ctrl+Z)"
          @click="$emit('undo')"
        >
          <Undo2 :size="18" />
        </button>
        <button
          class="toolbar-btn"
          title="Redo (Ctrl+Shift+Z)"
          @click="$emit('redo')"
        >
          <Redo2 :size="18" />
        </button>

        <div class="toolbar-divider" />

        <button
          class="toolbar-btn"
          title="Share Design"
          @click="$emit('share')"
        >
          <Share2 :size="18" />
        </button>
      </div>
    </div>

    <div class="toolbar-center">
      <slot name="title" />
    </div>

    <div class="toolbar-right">
      <button
        class="toolbar-btn"
        title="Fullscreen"
        @click="$emit('fullscreen')"
      >
        <Maximize :size="18" />
      </button>
      <button class="toolbar-btn" title="Settings" @click="$emit('settings')">
        <Settings :size="18" />
      </button>
      <button class="toolbar-btn" title="Help" @click="$emit('help')">
        <HelpCircle :size="18" />
      </button>

      <div class="toolbar-divider" />

      <button class="toolbar-btn sign-in-btn" title="Sign In">
        <LogIn :size="18" />
        <span>Sign In</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 12px;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  gap: 8px;
  flex-shrink: 0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-center {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
  letter-spacing: 0.01em;
}

.toolbar-logo {
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}

.toolbar-logo:hover {
  background: rgba(255, 255, 255, 0.06);
}

.logo-text {
  font-size: 16px;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: -0.02em;
}

.logo-accent {
  color: #fbbf24;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 4px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: #94a3b8;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 13px;
}

.toolbar-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
}

.toolbar-btn:active {
  background: rgba(255, 255, 255, 0.12);
  transform: scale(0.96);
}

.sign-in-btn {
  padding: 6px 12px;
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
  font-weight: 500;
}

.sign-in-btn:hover {
  background: rgba(251, 191, 36, 0.2);
  color: #fcd34d;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
</style>
