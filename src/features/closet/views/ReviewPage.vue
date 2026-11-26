<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import TopToolbar from '../../../components/TopToolbar.vue';
import OpenDesignModal from '../../../components/OpenDesignModal.vue';
import FooterBar from '../../../components/FooterBar.vue';
import MaterialSelectionForm from '../components/materials/MaterialSelectionForm.vue';
import { useClosetStore } from '../../../stores/useClosetStore';
import { useAppStore } from '../../../stores/useAppStore';
import { useSaveCloset } from '../../../composables/useSaveCloset';
import { validateFormCompleteness } from '../../../composables/useMaterialHelpers';
import { Pencil, Settings } from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const closet = useClosetStore();
const appStore = useAppStore();
const { saveStatus, handleSaveDesign, isOpenModalOpen, openDesignModal, closeDesignModal } = useSaveCloset();

const isEditingName = ref(false);
const editedClosetName = ref('');

const orderId = computed(() => closet.currentClosetId || 'new-order');
const displayName = computed(() => closet.currentClosetName || 'Closet Order');

const isFormValid = computed(() => {
  return validateFormCompleteness(closet.materials);
});

onMounted(async () => {
  appStore.setStep('review');
  await closet.loadRoomComponents();
});

function startRename() {
  editedClosetName.value = displayName.value;
  isEditingName.value = true;
}

function saveRename() {
  const name = editedClosetName.value.trim();
  if (!name || name.length < 2) {
    toast.warning('Closet name must be at least 2 characters long');
    return;
  }
  closet.currentClosetName = name;
  closet.syncCurrentCloset();
  isEditingName.value = false;
}

function cancelRename() {
  isEditingName.value = false;
}

function onMaterialUpdate(key: string, value: any) {
  closet.updateMaterial(key, value);
}

async function handleProceedToOrder() {
  if (!isFormValid.value) {
    toast.warning('Form Incomplete', {
      description: 'Please select all required materials before submitting.',
    });
    return;
  }

  try {
    closet.syncCurrentCloset();
    await handleSaveDesign();
    toast.success('Order Saved', {
      description: 'Material selections and closet configuration saved successfully!',
    });
  } catch (err: any) {
    toast.error('Error saving order', {
      description: err?.message || 'Please try again',
    });
  }
}
</script>

<template>
  <div class="review-page">
    <TopToolbar :save-status="saveStatus" @save="handleSaveDesign" @open="openDesignModal">
      <template #title>Material Selection</template>
    </TopToolbar>
    <OpenDesignModal :open="isOpenModalOpen" @close="closeDesignModal" />

    <div class="review-body">
      <div class="material-container">
        <!-- Order Header Card (matches Dia-Website layout) -->
        <div class="order-header-card">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <div v-if="!isEditingName" class="flex items-center gap-3">
                <h1 class="text-3xl font-bold tracking-tight text-white">
                  {{ displayName }}
                </h1>
                <button
                  type="button"
                  @click="startRename"
                  class="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Rename order"
                >
                  <Pencil class="h-4 w-4" />
                </button>
              </div>
              <div v-else class="flex items-center gap-2 max-w-md">
                <input
                  v-model="editedClosetName"
                  type="text"
                  class="flex-1 text-2xl font-semibold bg-slate-900 border-b-2 border-sky-400 text-white px-2 py-1 focus:outline-none rounded-t"
                  @keyup.enter="saveRename"
                  @keyup.esc="cancelRename"
                  autofocus
                />
                <button
                  type="button"
                  @click="saveRename"
                  class="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-md text-sm transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  @click="cancelRename"
                  class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 mt-4 text-sm text-slate-400">
            <Settings class="w-4 h-4 text-slate-500" />
            <span>Order ID: <strong class="text-slate-300 font-medium">{{ orderId }}</strong></span>
          </div>

          <div class="h-px w-full bg-slate-800/80 my-4" />

          <p class="text-sm text-slate-400 flex items-center gap-2">
            <Settings class="w-4 h-4 text-slate-500" />
            Configure your order specifications below
          </p>
        </div>

        <!-- Room Tab (Active Room / Closet indicator) -->
        <div class="room-tab-pill">
          <div class="tab-item active">
            <span class="truncate">{{ displayName }}</span>
          </div>
        </div>

        <!-- Material Selection Form -->
        <div class="materials-form-wrapper">
          <div v-if="closet.roomComponentsLoading" class="py-12 text-center text-slate-400">
            Loading materials catalog...
          </div>
          <MaterialSelectionForm
            v-else
            :materials="closet.materials"
            :room-components="closet.roomComponents"
            @update:material="onMaterialUpdate"
          />
        </div>

        <!-- Bottom Proceed Action Button -->
        <div class="flex justify-center pt-6 pb-12">
          <button
            type="button"
            :class="[
              'w-full max-w-sm py-3.5 text-base font-semibold tracking-wide transition-all duration-200 shadow-lg rounded-xl',
              'bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700/80 hover:border-slate-600',
              !isFormValid && 'opacity-50 cursor-not-allowed hover:bg-slate-800/90 hover:border-slate-700/80',
            ]"
            @click="handleProceedToOrder"
          >
            Proceed to Order
          </button>
        </div>
      </div>
    </div>

    <FooterBar
      back-label="Back to Build Closet"
      back-route="/closet/build"
      forward-label="Proceed to Order"
      forward-route=""
      :show-view-toggle="false"
      @forward="handleProceedToOrder"
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
  padding: 32px 16px;
}

.material-container {
  max-width: 760px;
  width: 100%;
}

.order-header-card {
  padding: 24px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.room-tab-pill {
  display: flex;
  width: 100%;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 4px;
  margin-bottom: 20px;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #94a3b8;
  transition: all 0.2s ease;
}

.tab-item.active {
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  font-weight: 600;
  border: 1px solid rgba(56, 189, 248, 0.25);
}

.materials-form-wrapper {
  margin-bottom: 24px;
}
</style>
