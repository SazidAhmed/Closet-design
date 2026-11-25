<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { X, FolderOpen, AlertTriangle, Loader2 } from "lucide-vue-next";
import { useClosetStore } from "../stores/useClosetStore";
import { useAppStore } from "../stores/useAppStore";
import type { ClosetRecord } from "../features/closet/domain/schema";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "opened", design: ClosetRecord): void;
}>();

const closet = useClosetStore();
const appStore = useAppStore();

const isLoading = ref(false);
const isOpening = ref(false);
const errorMessage = ref("");
const pendingDesign = ref<ClosetRecord | null>(null);
const remoteDesigns = ref<ClosetRecord[]>([]);

const hasAuthToken = computed(() => {
  return (
    (typeof localStorage !== "undefined" &&
      Boolean(localStorage.getItem("access_token"))) ||
    Boolean(appStore.token)
  );
});

const sortedDesigns = computed(() => {
  return [...remoteDesigns.value].sort((a, b) => {
    const tA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const tB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return tB - tA;
  });
});

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) {
      pendingDesign.value = null;
      errorMessage.value = "";
      return;
    }

    pendingDesign.value = null;
    errorMessage.value = "";
    remoteDesigns.value = [];

    if (hasAuthToken.value) {
      isLoading.value = true;
      try {
        const { default: ClosetService } = await import(
          "../services/ClosetService"
        );
        const rows = await ClosetService.getClosets();
        remoteDesigns.value = Array.isArray(rows)
          ? rows.map((r: any) => ({
              id: r.id,
              name: r.name,
              createdAt: r.created_at || r.createdAt || "",
              updatedAt: r.updated_at || r.updatedAt || "",
              shelves: r.shelves || r.towers || [],
              towers: r.shelves || r.towers || [],
              room: r.room,
              cabinet: r.cabinet,
              materials: r.materials,
            }))
          : [];
      } catch {
        errorMessage.value = "Could not load saved designs from the database.";
      } finally {
        isLoading.value = false;
      }
    }
  },
  { immediate: true }
);

function getCabinetCount(design: ClosetRecord): number {
  const list = design.shelves || design.towers || [];
  return Array.isArray(list) ? list.length : 0;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function requestOpenDesign(design: ClosetRecord) {
  pendingDesign.value = design;
}

function cancelConfirmation() {
  pendingDesign.value = null;
}

async function confirmOpenDesign() {
  if (!pendingDesign.value || isOpening.value) return;
  const target = pendingDesign.value;
  isOpening.value = true;
  errorMessage.value = "";

  try {
    let fullRecord: any = target;
    if (hasAuthToken.value && target.id) {
      try {
        const { default: ClosetService } = await import(
          "../services/ClosetService"
        );
        const remote = await ClosetService.getClosetById(target.id);
        if (remote) {
          fullRecord = remote;
        }
      } catch {
        // Fall back to the already-loaded record if single fetch fails
      }
    }

    await closet.openClosetDesign(fullRecord);
    emit("opened", target);
    pendingDesign.value = null;
    emit("close");
  } catch {
    errorMessage.value = "Failed to load the selected design.";
  } finally {
    isOpening.value = false;
  }
}
</script>

<template>
  <div v-if="open" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-card" role="dialog" aria-modal="true" aria-label="Open Saved Design">
      <div class="modal-header">
        <div class="modal-title-wrap">
          <FolderOpen :size="18" class="title-icon" />
          <h2 class="modal-title">Open Saved Design</h2>
        </div>
        <button class="close-btn" title="Close" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>

      <div class="modal-body">
        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>

        <!-- Confirmation view -->
        <div v-if="pendingDesign" class="confirm-box">
          <div class="confirm-icon-wrap">
            <AlertTriangle :size="28" class="confirm-icon" />
          </div>
          <h3 class="confirm-title">Replace Existing Design?</h3>
          <p class="confirm-message">
            Opening this design will replace the existing design in the room.
          </p>
          <p class="confirm-target">
            Selected design: <strong>{{ pendingDesign.name }}</strong>
          </p>
          <div class="confirm-actions">
            <button
              class="btn-secondary"
              :disabled="isOpening"
              @click="cancelConfirmation"
            >
              Cancel
            </button>
            <button
              class="btn-primary"
              data-testid="confirm-open-yes"
              :disabled="isOpening"
              @click="confirmOpenDesign"
            >
              {{ isOpening ? "Opening..." : "Yes" }}
            </button>
          </div>
        </div>

        <!-- Loading state -->
        <div v-else-if="isLoading" class="state-box">
          <Loader2 :size="28" class="spin-icon" />
          <p>Loading your saved designs...</p>
        </div>

        <!-- Empty state -->
        <div v-else-if="sortedDesigns.length === 0" class="state-box">
          <FolderOpen :size="36" class="empty-icon" />
          <p>No saved designs found.</p>
          <span v-if="!hasAuthToken" class="state-hint">
            Sign in to view designs saved to your account.
          </span>
        </div>

        <!-- Saved designs list -->
        <div v-else class="designs-list">
          <div
            v-for="design in sortedDesigns"
            :key="design.id"
            class="design-row"
            :class="{ active: design.id === closet.currentClosetId }"
          >
            <div class="design-info">
              <div class="design-name-row">
                <span class="design-name">{{ design.name }}</span>
                <span
                  v-if="design.id === closet.currentClosetId"
                  class="active-badge"
                >
                  Current
                </span>
              </div>
              <div class="design-meta">
                <span>{{ getCabinetCount(design) }} cabinet{{ getCabinetCount(design) === 1 ? "" : "s" }}</span>
                <span v-if="formatDate(design.updatedAt || design.createdAt)">
                  • {{ formatDate(design.updatedAt || design.createdAt) }}
                </span>
              </div>
            </div>
            <button
              class="open-btn"
              :data-testid="`open-design-btn-${design.id}`"
              @click="requestOpenDesign(design)"
            >
              Open
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.78);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  color: #e2e8f0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: #0f172a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  color: #fbbf24;
}

.modal-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #f8fafc;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  background: transparent;
  color: #94a3b8;
  border-radius: 6px;
  cursor: pointer;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
}

.modal-body {
  padding: 16px 18px;
  overflow-y: auto;
}

.error-banner {
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.16);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #fca5a5;
  font-size: 13px;
}

.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 36px 16px;
  color: #94a3b8;
  text-align: center;
  font-size: 14px;
}

.state-hint {
  font-size: 12px;
  color: #64748b;
}

.spin-icon {
  animation: spin 1s linear infinite;
  color: #fbbf24;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.designs-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.design-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  transition: border-color 0.15s ease;
}

.design-row.active {
  border-color: rgba(251, 191, 36, 0.45);
}

.design-info {
  min-width: 0;
  flex: 1;
}

.design-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.design-name {
  font-size: 14px;
  font-weight: 600;
  color: #f1f5f9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.active-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 9999px;
  background: rgba(251, 191, 36, 0.16);
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.35);
}

.design-meta {
  margin-top: 3px;
  font-size: 12px;
  color: #94a3b8;
}

.open-btn {
  padding: 6px 14px;
  border-radius: 7px;
  border: 1px solid rgba(251, 191, 36, 0.45);
  background: rgba(251, 191, 36, 0.14);
  color: #fbbf24;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.open-btn:hover {
  background: #fbbf24;
  color: #0f172a;
}

.confirm-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 12px 8px;
}

.confirm-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 9999px;
  background: rgba(251, 191, 36, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.confirm-icon {
  color: #fbbf24;
}

.confirm-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #f8fafc;
}

.confirm-message {
  margin: 0 0 8px;
  font-size: 14px;
  color: #cbd5e1;
  line-height: 1.5;
}

.confirm-target {
  margin: 0 0 18px;
  font-size: 13px;
  color: #94a3b8;
}

.confirm-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn-secondary,
.btn-primary {
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
}

.btn-primary {
  background: #fbbf24;
  color: #0f172a;
}

.btn-primary:hover:not(:disabled) {
  background: #f59e0b;
}

.btn-secondary:disabled,
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
