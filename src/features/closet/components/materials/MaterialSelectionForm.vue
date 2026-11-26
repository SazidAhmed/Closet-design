<script setup lang="ts">
import { toast } from 'vue-sonner';
import HierarchicalMaterialSelector from './HierarchicalMaterialSelector.vue';
import SelectComponent from './SelectComponent.vue';
import GlassMirrorTypeSelector from './GlassMirrorTypeSelector.vue';
import MultiLevelSelectComponent from './MultiLevelSelectComponent.vue';

import {
  allowsBothGlassAndMirror,
  areDrawerPrerequisitesMet,
  getDrawerValidationMessage,
  getFilteredBoxMaterialColors,
  getFilteredDrawerTypes,
  getFilteredGrainOptions,
  getGrainValidationMessage,
  hasBoxMaterialColors,
  isDrawerTypeValid,
  isGlassDoorType,
  isValidGrainSelection,
} from '@/composables/useMaterialHelpers';
import { UI_CONSTANTS, VALIDATION_MESSAGES } from '../../domain/materials/materialConstants';

const props = defineProps<{
  materials: any;
  roomComponents: any;
}>();

const emit = defineEmits<{
  (e: 'update:material', key: string, value: any): void;
}>();

function update(key: string, value: any) {
  emit('update:material', key, value);
}

function handleBoxMaterialUpdate(boxMaterial: any) {
  const currentDoorFinishMaterial = props.materials?.door_finish_materials;
  const currentDrawerType = props.materials?.drawer_types;

  update('box_materials', boxMaterial);
  update('box_material_colors', null);

  // Validate drawer type compatibility
  if (
    currentDrawerType &&
    !isDrawerTypeValid(
      currentDrawerType,
      boxMaterial,
      currentDoorFinishMaterial,
      props.roomComponents?.drawer_types
    )
  ) {
    update('drawer_types', null);
    update('drawer_materials', null);
    toast.info('Drawer selection reset', {
      description: VALIDATION_MESSAGES.INFO_MESSAGES.DRAWER_RESET_BOX,
    });
  }
}

function handleDoorFinishMaterialUpdate(doorFinishMaterial: any) {
  const currentDoorFinishMaterial = props.materials?.door_finish_materials;
  const boxMaterial = props.materials?.box_materials;
  const currentDrawerType = props.materials?.drawer_types;

  update('door_finish_materials', doorFinishMaterial);
  update('door_finish_material_colors', null);

  if (currentDoorFinishMaterial?.id !== doorFinishMaterial?.id) {
    update('glass_or_mirror', null);
    update('glass_mirror_type', null);

    if (
      currentDrawerType &&
      !isDrawerTypeValid(
        currentDrawerType,
        boxMaterial,
        doorFinishMaterial,
        props.roomComponents?.drawer_types
      )
    ) {
      update('drawer_types', null);
      update('drawer_materials', null);
      toast.info('Drawer selection reset', {
        description: VALIDATION_MESSAGES.INFO_MESSAGES.DRAWER_RESET_DOOR,
      });
    }
  }
}

function handleDoorFinishMaterialColorUpdate(color: any) {
  const currentGrain = props.materials?.grains;

  update('door_finish_material_colors', color);

  if (currentGrain && color) {
    const isValid = isValidGrainSelection(
      currentGrain,
      color,
      props.roomComponents?.grains || []
    );

    if (!isValid) {
      update('grains', null);
      toast.info('Grain selection reset', {
        description: VALIDATION_MESSAGES.GRAIN_SELECTION.GRAIN_RESET,
      });
    }
  }
}

function handleDrawerMaterialUpdate(values: any[]) {
  const [drawerType, drawerMaterial] = values || [];
  update('drawer_types', drawerType || null);
  update('drawer_materials', drawerMaterial || null);
}
</script>

<template>
  <div class="space-y-4 pt-2">
    <!-- Box Material -->
    <HierarchicalMaterialSelector
      :model-value="materials?.box_materials"
      @update:model-value="handleBoxMaterialUpdate"
      :options="roomComponents?.box_materials || []"
      label="Box Material"
    />

    <!-- Box Material Color (dependent: only show if box material has colors) -->
    <SelectComponent
      v-if="hasBoxMaterialColors(materials?.box_materials)"
      :model-value="materials?.box_material_colors"
      @update:model-value="(val) => update('box_material_colors', val)"
      :options="getFilteredBoxMaterialColors(materials?.box_materials, roomComponents?.box_material_colors)"
      label="Box Material Color"
    />

    <!-- Door Type -->
    <SelectComponent
      :model-value="materials?.door_types"
      @update:model-value="(val) => {
        const currentDoorType = materials?.door_types;
        update('door_types', val);

        if (currentDoorType?.id !== val?.id) {
          update('door_finish_materials', null);
          update('door_finish_material_colors', null);
          update('glass_or_mirror', null);
          update('glass_mirror_type', null);
        }
      }"
      :options="roomComponents?.door_types || []"
      label="Door Type"
    />

    <!-- Door Material (dependent: only show if door type is selected) -->
    <SelectComponent
      v-if="materials?.door_types"
      :model-value="materials?.door_finish_materials"
      @update:model-value="handleDoorFinishMaterialUpdate"
      :options="(roomComponents?.door_finish_materials || []).filter(
        (m: any) => m.door_type_id === materials?.door_types?.id
      )"
      label="Door Material"
      :is-child="true"
      :parent-selected="!!materials?.door_types"
    />

    <!-- Glass / Mirror & Type (dependent: only show if glass door type is selected) -->
    <GlassMirrorTypeSelector
      v-if="isGlassDoorType(materials?.door_types)"
      :model-glass="materials?.glass_or_mirror"
      :model-type="materials?.glass_mirror_type"
      :allow-both="allowsBothGlassAndMirror(materials?.door_finish_materials)"
      :room-components="roomComponents"
      :door-finish-material="materials?.door_finish_materials"
      @update:glass="(val) => update('glass_or_mirror', val)"
      @update:type="(val) => update('glass_mirror_type', val)"
      @check-parent="
        () => {
          if (!materials?.door_finish_materials) {
            toast.warning('Please select Door Material first', { position: UI_CONSTANTS.TOAST_POSITION });
          }
        }
      "
    />

    <!-- Door Color (dependent: only show if door material is selected) -->
    <SelectComponent
      v-if="materials?.door_finish_materials"
      :model-value="materials?.door_finish_material_colors"
      @update:model-value="handleDoorFinishMaterialColorUpdate"
      :options="(roomComponents?.door_finish_material_colors || roomComponents?.door_material_colors || []).filter(
        (c: any) => c.door_finish_material_id === materials?.door_finish_materials?.id || c.door_material_id === materials?.door_finish_materials?.id
      )"
      label="Door Color"
      :is-child="true"
      :parent-selected="!!materials?.door_finish_materials"
    />

    <!-- Door Grain (dependent: only show if door color is selected) -->
    <div v-if="materials?.door_finish_material_colors" class="space-y-2">
      <div
        v-if="getGrainValidationMessage(materials?.door_finish_material_colors)"
        class="text-xs text-sky-300 bg-sky-950/40 border border-sky-800/60 p-2.5 rounded-md"
      >
        {{ getGrainValidationMessage(materials.door_finish_material_colors) }}
      </div>

      <SelectComponent
        :model-value="materials?.grains"
        @update:model-value="(val) => update('grains', val)"
        :options="getFilteredGrainOptions(materials?.door_finish_material_colors, roomComponents?.grains || [])"
        label="Door Grain"
        :is-child="true"
        :parent-selected="!!materials?.door_finish_material_colors"
      />
    </div>

    <!-- Drawer Section -->
    <div class="space-y-2">
      <!-- Prerequisite Warning Message -->
      <div
        v-if="!areDrawerPrerequisitesMet(materials?.box_materials, materials?.door_finish_materials)"
        class="p-3 bg-amber-950/30 border border-amber-800/50 rounded-lg text-amber-200 text-sm flex items-center gap-2"
      >
        <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <span>{{ getDrawerValidationMessage(materials?.box_materials, materials?.door_finish_materials) }}</span>
      </div>

      <!-- Drawer Multilevel Select -->
      <MultiLevelSelectComponent
        v-if="areDrawerPrerequisitesMet(materials?.box_materials, materials?.door_finish_materials)"
        :levels="[
          {
            value: materials?.drawer_types,
            options: getFilteredDrawerTypes(materials?.box_materials, materials?.door_finish_materials, roomComponents?.drawer_types || []),
            label: 'Drawer Type',
          },
          {
            value: materials?.drawer_materials,
            options: roomComponents?.drawer_materials || [],
            label: 'Drawer Material',
            relationKey: 'drawer_type_id',
          },
        ]"
        @update="handleDrawerMaterialUpdate"
      />

      <!-- Placeholder when prerequisites not met -->
      <div v-else class="space-y-4">
        <div class="relative">
          <label class="block text-sm font-medium text-slate-400 mb-2">Drawer Type</label>
          <div class="w-full p-3 border border-slate-800 rounded-lg bg-slate-900/40 text-slate-500 cursor-not-allowed">
            Select Box Material and Door Material first
          </div>
        </div>
        <div class="relative">
          <label class="block text-sm font-medium text-slate-400 mb-2">Drawer Material</label>
          <div class="w-full p-3 border border-slate-800 rounded-lg bg-slate-900/40 text-slate-500 cursor-not-allowed">
            Select Drawer Type first
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
