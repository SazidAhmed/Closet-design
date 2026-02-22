<script setup lang="ts">
import { onMounted } from "vue";
import TopToolbar from "../../../components/TopToolbar.vue";
import FooterBar from "../../../components/FooterBar.vue";
import { useClosetStore } from "../../../stores/useClosetStore";
import { useRoomStore } from "../../../stores/useRoomStore";
import { useAppStore } from "../../../stores/useAppStore";
import { getMaterial, getHandle } from "../domain/materials/catalog";
import { Download, Share2, Send } from "lucide-vue-next";

const closet = useClosetStore();
const roomStore = useRoomStore();
const appStore = useAppStore();

onMounted(() => {
  appStore.setStep("review");
});

function getFinishLabel(): string {
  return (
    getMaterial(closet.materials.finishId)?.label ?? closet.materials.finishId
  );
}

function getBackingLabel(): string {
  return (
    getMaterial(closet.materials.backingId)?.label ?? closet.materials.backingId
  );
}

function getHandleLabel(): string {
  return (
    getHandle(closet.materials.handleStyleId)?.label ??
    closet.materials.handleStyleId
  );
}

function downloadJSON() {
  const json = JSON.stringify(closet.exportForBackend, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "closet-design.json";
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="review-page">
    <TopToolbar>
      <template #title>Review Design</template>
    </TopToolbar>

    <div class="review-body">
      <div class="review-content">
        <h1 class="review-title">Your Closet Design</h1>
        <p class="review-subtitle">
          Review your design below. You can go back to make changes or
          export/share your design.
        </p>

        <!-- Design Summary -->
        <div class="summary-grid">
          <!-- Closet Info -->
          <div class="summary-card">
            <h3 class="card-heading">Closet Overview</h3>
            <div class="info-rows">
              <div class="info-row">
                <span>Type</span>
                <strong>{{ closet.closetType }}</strong>
              </div>
              <div class="info-row">
                <span>Cabinet Size</span>
                <strong
                  >{{ closet.cabinet.width }} × {{ closet.cabinet.height }} ×
                  {{ closet.cabinet.depth }} cm</strong
                >
              </div>
              <div class="info-row">
                <span>Towers</span>
                <strong>{{ closet.towers.length }}</strong>
              </div>
              <div class="info-row">
                <span>Finish</span>
                <strong>{{ getFinishLabel() }}</strong>
              </div>
              <div class="info-row">
                <span>Backing</span>
                <strong>{{ getBackingLabel() }}</strong>
              </div>
              <div class="info-row">
                <span>Handle Style</span>
                <strong>{{ getHandleLabel() }}</strong>
              </div>
            </div>
          </div>

          <!-- Tower Details -->
          <div class="summary-card">
            <h3 class="card-heading">Tower Details</h3>
            <div
              v-for="tower in closet.towers"
              :key="tower.id"
              class="tower-summary"
            >
              <div class="tower-summary-header">
                <strong>{{ tower.label }}</strong>
                <span
                  >{{ Math.round(tower.width) }} ×
                  {{ Math.round(tower.depth) }} cm</span
                >
              </div>
              <ul class="accessory-list">
                <li v-for="(acc, i) in tower.accessories" :key="i">
                  <span v-if="acc.type === 'shelf_set'"
                    >{{ acc.count }} shelves</span
                  >
                  <span v-else-if="acc.type === 'rod'"
                    >{{ acc.position }} rod (×{{ acc.count }})</span
                  >
                  <span v-else-if="acc.type === 'drawer'"
                    >{{ acc.count }} drawers</span
                  >
                  <span v-else-if="acc.type === 'shoe_shelf'"
                    >{{ acc.count }} shoe shelves</span
                  >
                  <span v-else>{{ acc.type }}</span>
                </li>
                <li v-if="tower.accessories.length === 0" class="empty-acc">
                  No accessories
                </li>
              </ul>
            </div>
          </div>

          <!-- Room Info -->
          <div class="summary-card">
            <h3 class="card-heading">Room</h3>
            <div class="info-rows">
              <div class="info-row">
                <span>Shape</span>
                <strong>{{ roomStore.shape }}</strong>
              </div>
              <div class="info-row">
                <span>Ceiling Height</span>
                <strong>{{ roomStore.height }} cm</strong>
              </div>
              <div class="info-row">
                <span>Walls</span>
                <strong>{{ roomStore.walls.length }}</strong>
              </div>
              <div class="info-row">
                <span>Placed Items</span>
                <strong>{{ roomStore.items.length }}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="review-actions">
          <button class="review-btn primary" @click="downloadJSON">
            <Download :size="18" />
            Download Design (JSON)
          </button>
          <button class="review-btn outline">
            <Share2 :size="18" />
            Share Design
          </button>
          <button class="review-btn accent">
            <Send :size="18" />
            Submit for Quote
          </button>
        </div>
      </div>
    </div>

    <FooterBar
      back-label="Back to Design Closet"
      back-route="/closet/design"
      forward-label="Start Over"
      forward-route="/closet/type"
      :show-view-toggle="false"
    />
  </div>
</template>

<style scoped>
.review-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #020617;
  color: #e2e8f0;
}

.review-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  justify-content: center;
}

.review-content {
  max-width: 900px;
  width: 100%;
  padding: 48px 24px;
}

.review-title {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0 0 8px;
  background: linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.review-subtitle {
  font-size: 15px;
  color: #64748b;
  margin: 0 0 32px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.summary-card {
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(8px);
}

.card-heading {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  margin: 0 0 16px;
}

.info-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 13px;
}

.info-row span {
  color: #94a3b8;
}

.info-row strong {
  color: #e2e8f0;
  font-weight: 600;
}

.tower-summary {
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.tower-summary:last-child {
  border-bottom: none;
}

.tower-summary-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 6px;
}

.tower-summary-header span {
  color: #64748b;
  font-size: 12px;
}

.accessory-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.accessory-list li {
  font-size: 12px;
  color: #94a3b8;
  padding-left: 12px;
  position: relative;
}

.accessory-list li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: #475569;
}

.empty-acc {
  font-style: italic;
  color: #475569 !important;
}

.review-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.review-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.review-btn.primary {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  color: #0f172a;
  border-color: transparent;
}

.review-btn.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(251, 191, 36, 0.25);
}

.review-btn.outline {
  background: transparent;
  border-color: rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
}

.review-btn.outline:hover {
  border-color: rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.04);
}

.review-btn.accent {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;
}

.review-btn.accent:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.25);
}
</style>
