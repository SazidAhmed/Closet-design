<script setup lang="ts">
import { computed } from 'vue';
import { toast } from 'vue-sonner';
import SelectComponent from './SelectComponent.vue';

const props = defineProps<{
  levels: Array<{
    value: any;
    options: any[];
    label: string;
    relationKey?: string;
  }>;
}>();

const emit = defineEmits<{
  (e: 'update', values: any[]): void;
}>();

const filteredOptions = computed(() => {
  return props.levels.map((level, index) => {
    if (index === 0) return level.options || [];

    const parentLevel = props.levels[index - 1];
    if (!parentLevel || !parentLevel.value) return [];

    return (level.options || []).filter(
      (option: any) => level.relationKey && option[level.relationKey] === parentLevel.value.id
    );
  });
});

const handleUpdate = (value: any, levelIndex: number) => {
  const prevLevel = props.levels[levelIndex - 1];
  if (levelIndex > 0 && (!prevLevel || !prevLevel.value)) {
    toast.warning(`Please select ${prevLevel?.label || 'previous option'} first`, {
      position: 'top-right',
    });
    return;
  }

  const updates = props.levels.map((level, index) => {
    if (index === levelIndex) return value;
    if (index > levelIndex) return null;
    return level.value;
  });

  emit('update', updates);
};
</script>

<template>
  <div class="space-y-4">
    <SelectComponent
      v-for="(level, index) in levels"
      :key="level.label"
      :model-value="level.value"
      @update:model-value="(val) => handleUpdate(val, index)"
      :options="filteredOptions[index] || []"
      :label="level.label"
      :is-child="index > 0"
      :parent-selected="index === 0 || !!levels[index - 1]?.value"
      @check-parent="
        () => {
          const prev = levels[index - 1];
          if (index > 0 && (!prev || !prev.value)) {
            toast.warning(`Please select ${prev?.label || 'previous option'} first`, {
              position: 'top-right',
            });
          }
        }
      "
    />
  </div>
</template>
