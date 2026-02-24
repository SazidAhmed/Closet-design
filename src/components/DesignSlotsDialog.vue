<script setup lang="ts">
import { ref, computed } from "vue";
import { useHistoryStore } from "../stores/useHistoryStore";
import { X, Save, Trash2, FolderOpen } from "lucide-vue-next";

const props = defineProps<{
  open: boolean;
  initialMode: "save" | "load";
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const historyStore = useHistoryStore();
const designName = ref("");
const mode = ref<"save" | "load">(props.initialMode);

const sortedSlots = computed(() => {
  return [...historyStore.slots].sort((a, b) => b.timestamp - a.timestamp);
});

function formatDate(ts: number) {
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function handleSave() {
  if (!designName.value.trim()) return;
  historyStore.saveNamedDesign(designName.value.trim());
  designName.value = "";
  emit("close");
}

function handleLoad(id: string) {
  historyStore.loadNamedDesign(id);
  emit("close");
}

function handleDelete(id: string) {
  if (confirm("Are you sure you want to delete this design?")) {
    historyStore.deleteNamedDesign(id);
  }
}

function selectSlotForSaving(name: string) {
  designName.value = name;
}
</script>

<template>
  <div v-if="open" class="dialog-overlay" @click.self="emit('close')">
    <div class="dialog-content">
      <div class="dialog-header">
        <h2 class="dialog-title">
          {{ mode === "save" ? "Save Design" : "Open Design" }}
        </h2>
        <button class="close-btn" @click="emit('close')">
          <X :size="20" />
        </button>
      </div>

      <div class="dialog-tabs">
        <button
          class="tab-btn"
          :class="{ active: mode === 'load' }"
          @click="mode = 'load'"
        >
          My Designs
        </button>
        <button
          class="tab-btn"
          :class="{ active: mode === 'save' }"
          @click="mode = 'save'"
        >
          Save New
        </button>
      </div>

      <div class="dialog-body">
        <!-- Load Mode -->
        <template v-if="mode === 'load'">
          <div v-if="sortedSlots.length === 0" class="empty-state">
            <FolderOpen :size="48" class="empty-icon" />
            <p>No saved designs found.</p>
            <button class="action-btn mt-4" @click="mode = 'save'">
              Save Current Design
            </button>
          </div>
          <div v-else class="slots-list">
            <div
              v-for="slot in sortedSlots"
              :key="slot.id"
              class="slot-card"
              :class="{ active: historyStore.activeSlotId === slot.id }"
            >
              <div class="slot-info" @click="handleLoad(slot.id)">
                <div class="slot-name">{{ slot.name }}</div>
                <div class="slot-date">{{ formatDate(slot.timestamp) }}</div>
              </div>
              <div class="slot-actions">
                <button
                  class="icon-btn delete"
                  title="Delete"
                  @click.stop="handleDelete(slot.id)"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- Save Mode -->
        <template v-else>
          <div class="save-form">
            <label class="input-label">Design Name</label>
            <div class="input-row">
              <input
                v-model="designName"
                type="text"
                class="name-input"
                placeholder="e.g. Master Bedroom"
                @keyup.enter="handleSave"
                autofocus
              />
              <button
                class="save-btn"
                :disabled="!designName.trim()"
                @click="handleSave"
              >
                <Save :size="18" />
                <span>Save</span>
              </button>
            </div>

            <div v-if="sortedSlots.length > 0" class="recent-names">
              <p class="text-xs text-slate-400 mb-2">Or overwrite existing:</p>
              <div class="name-chips">
                <button
                  v-for="slot in sortedSlots"
                  :key="slot.id"
                  class="name-chip"
                  @click="selectSlotForSaving(slot.name)"
                >
                  {{ slot.name }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.dialog-content {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}

.dialog-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  transition: all 0.15s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}

.dialog-tabs {
  display: flex;
  padding: 4px;
  background: rgba(15, 23, 42, 0.5);
  margin: 16px 20px 0;
  border-radius: 8px;
}

.tab-btn {
  flex: 1;
  padding: 8px;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn.active {
  background: #fbbf24;
  color: #0f172a;
}

.dialog-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #64748b;
  text-align: center;
}

.empty-icon {
  margin-bottom: 12px;
  opacity: 0.3;
}

.slots-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slot-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  transition: all 0.15s;
}

.slot-card:hover {
  border-color: rgba(251, 191, 36, 0.3);
  background: rgba(15, 23, 42, 0.5);
}

.slot-card.active {
  border-color: #fbbf24;
  background: rgba(251, 191, 36, 0.05);
}

.slot-info {
  flex: 1;
  cursor: pointer;
}

.slot-name {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
}

.slot-date {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.slot-actions {
  display: flex;
  gap: 4px;
}

.icon-btn {
  background: transparent;
  border: none;
  color: #64748b;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
}

.icon-btn.delete:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.save-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-label {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.input-row {
  display: flex;
  gap: 10px;
}

.name-input {
  flex: 1;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 14px;
  color: #f1f5f9;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.name-input:focus {
  border-color: #fbbf24;
}

.save-btn {
  background: #fbbf24;
  color: #0f172a;
  border: none;
  border-radius: 8px;
  padding: 0 16px;
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.save-btn:hover:not(:disabled) {
  background: #fcd34d;
  transform: translateY(-1px);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn {
  background: #fbbf24;
  color: #0f172a;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}

.recent-names {
  margin-top: 20px;
}

.name-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.name-chip {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 100px;
  padding: 4px 12px;
  font-size: 12px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
}

.name-chip:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}
</style>
