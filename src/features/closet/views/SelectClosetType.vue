<script setup lang="ts">
import { useRouter } from "vue-router";
import { useClosetStore } from "../../../stores/useClosetStore";
import { useRoomStore } from "../../../stores/useRoomStore";
import { useAppStore } from "../../../stores/useAppStore";
import { CLOSET_TYPES, type ClosetTypeName } from "../domain/closetTypes";
import { DoorOpen, Warehouse, PenTool } from "lucide-vue-next";

const router = useRouter();
const closetStore = useClosetStore();
const roomStore = useRoomStore();
const appStore = useAppStore();

const icons: Record<ClosetTypeName, typeof DoorOpen> = {
  reach_in: DoorOpen,
  walk_in: Warehouse,
  custom: PenTool,
};

function selectType(name: ClosetTypeName) {
  const type = CLOSET_TYPES.find((t) => t.name === name)!;

  // Apply closet type to stores
  closetStore.setClosetType(name);
  roomStore.setRoom(type.createRoom());
  appStore.setStep("floorplan");

  router.push("/closet/floorplan");
}
</script>

<template>
  <div class="type-page">
    <!-- Background gradient layers -->
    <div class="bg-gradient" />
    <div class="bg-grid" />

    <div class="type-content">
      <div class="type-header">
        <h1 class="type-title">Design Your Dream Closet</h1>
        <p class="type-subtitle">
          Choose a closet type to get started. You can customize everything in
          the next steps.
        </p>
      </div>

      <div class="type-cards">
        <button
          v-for="ct in CLOSET_TYPES"
          :key="ct.name"
          class="type-card"
          @click="selectType(ct.name)"
        >
          <div class="card-icon-wrapper">
            <component :is="icons[ct.name]" :size="40" class="card-icon" />
          </div>
          <h2 class="card-title">{{ ct.label }}</h2>
          <p class="card-desc">{{ ct.description }}</p>
          <div class="card-meta">
            <span class="card-dim">
              {{ Math.round(ct.roomWidth / 2.54 / 12) }}' ×
              {{ Math.round(ct.roomDepth / 2.54 / 12) }}' ×
              {{ Math.round(ct.roomHeight / 2.54 / 12) }}'
            </span>
          </div>
          <div class="card-cta">Select &amp; Continue →</div>
        </button>
      </div>

      <p class="type-footer-text">
        You can always change your layout later in the floor plan editor.
      </p>
    </div>
  </div>
</template>

<style scoped>
.type-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  overflow: hidden;
  background: #020617;
}

.bg-gradient {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse at 30% 20%,
      rgba(59, 130, 246, 0.08) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse at 70% 80%,
      rgba(251, 191, 36, 0.06) 0%,
      transparent 50%
    );
  pointer-events: none;
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}

.type-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px;
  max-width: 1200px;
  width: 100%;
}

.type-header {
  text-align: center;
  margin-bottom: 48px;
}

.type-title {
  font-size: 40px;
  font-weight: 800;
  color: #f1f5f9;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin: 0 0 16px;
  background: linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.type-subtitle {
  font-size: 17px;
  color: #64748b;
  max-width: 500px;
  margin: 0 auto;
  line-height: 1.6;
}

.type-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  width: 100%;
  max-width: 960px;
}

.type-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 28px 28px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  background: linear-gradient(
    180deg,
    rgba(15, 23, 42, 0.6) 0%,
    rgba(15, 23, 42, 0.4) 100%
  );
  backdrop-filter: blur(12px);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: center;
  color: inherit;
  font-family: inherit;
}

.type-card:hover {
  border-color: rgba(251, 191, 36, 0.3);
  background: linear-gradient(
    180deg,
    rgba(30, 41, 59, 0.8) 0%,
    rgba(15, 23, 42, 0.6) 100%
  );
  transform: translateY(-4px);
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.3),
    0 0 60px rgba(251, 191, 36, 0.06);
}

.type-card:active {
  transform: translateY(-2px);
}

.card-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: linear-gradient(
    135deg,
    rgba(251, 191, 36, 0.1) 0%,
    rgba(251, 191, 36, 0.04) 100%
  );
  border: 1px solid rgba(251, 191, 36, 0.15);
  margin-bottom: 24px;
  transition: all 0.3s;
}

.type-card:hover .card-icon-wrapper {
  background: linear-gradient(
    135deg,
    rgba(251, 191, 36, 0.18) 0%,
    rgba(251, 191, 36, 0.08) 100%
  );
  border-color: rgba(251, 191, 36, 0.3);
  transform: scale(1.05);
}

.card-icon {
  color: #fbbf24;
}

.card-title {
  font-size: 20px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 10px;
  letter-spacing: -0.01em;
}

.card-desc {
  font-size: 14px;
  color: #64748b;
  line-height: 1.6;
  margin: 0 0 20px;
  flex: 1;
}

.card-meta {
  margin-bottom: 16px;
}

.card-dim {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  letter-spacing: 0.02em;
}

.card-cta {
  font-size: 13px;
  font-weight: 600;
  color: #fbbf24;
  opacity: 0;
  transform: translateY(4px);
  transition: all 0.25s;
}

.type-card:hover .card-cta {
  opacity: 1;
  transform: translateY(0);
}

.type-footer-text {
  margin-top: 40px;
  font-size: 13px;
  color: #475569;
}

/* Responsive */
@media (max-width: 768px) {
  .type-cards {
    grid-template-columns: 1fr;
    max-width: 400px;
  }

  .type-title {
    font-size: 28px;
  }
}
</style>
