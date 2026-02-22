<script setup lang="ts">
import { useRouter } from "vue-router";
import ViewModeToggle from "./ViewModeToggle.vue";
import { ChevronLeft, ChevronRight, Share2 } from "lucide-vue-next";
import { useUnit } from "../composables/useUnit";

const router = useRouter();
const { unitLabel, toggleUnits } = useUnit();

defineProps<{
  backLabel: string;
  backRoute: string;
  forwardLabel: string;
  forwardRoute: string;
  price?: number;
  showViewToggle?: boolean;
  showShare?: boolean;
}>();

const emit = defineEmits<{
  (e: "share"): void;
}>();

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(price);
}
</script>

<template>
  <footer class="footer-bar">
    <div class="footer-left">
      <button class="footer-nav-btn" @click="router.push(backRoute)">
        <ChevronLeft :size="16" />
        <span>{{ backLabel }}</span>
      </button>
    </div>

    <div class="footer-center">
      <ViewModeToggle v-if="showViewToggle !== false" />
      <button
        class="unit-toggle-btn"
        @click="toggleUnits"
        :title="`Switch units (currently ${unitLabel})`"
      >
        {{ unitLabel }}
      </button>
    </div>

    <div class="footer-right">
      <div class="footer-price">
        Estimated List Price: <strong>{{ formatPrice(price ?? 0) }}</strong>
      </div>

      <button v-if="showShare" class="footer-share-btn" @click="$emit('share')">
        <Share2 :size="14" />
        Share Design
      </button>

      <button class="footer-nav-btn forward" @click="router.push(forwardRoute)">
        <span>{{ forwardLabel }}</span>
        <ChevronRight :size="16" />
      </button>
    </div>
  </footer>
</template>

<style scoped>
.footer-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 16px;
  background: linear-gradient(180deg, #0f172a 0%, #020617 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.footer-left,
.footer-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.footer-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.unit-toggle-btn {
  padding: 4px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
  letter-spacing: 0.05em;
}

.unit-toggle-btn:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.footer-nav-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border-radius: 6px;
}

.footer-nav-btn:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.06);
}

.footer-nav-btn.forward {
  background: rgba(251, 191, 36, 0.12);
  color: #fbbf24;
  font-weight: 600;
}

.footer-nav-btn.forward:hover {
  background: rgba(251, 191, 36, 0.2);
  color: #fcd34d;
}

.footer-price {
  font-size: 13px;
  color: #94a3b8;
}

.footer-price strong {
  color: #e2e8f0;
  font-weight: 600;
}

.footer-share-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.1);
  color: #60a5fa;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.footer-share-btn:hover {
  background: rgba(59, 130, 246, 0.18);
  border-color: rgba(59, 130, 246, 0.5);
}
</style>
