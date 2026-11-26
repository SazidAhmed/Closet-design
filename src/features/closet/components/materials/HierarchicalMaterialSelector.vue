<script setup lang="ts">
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { MATERIAL_IDS } from '../../domain/materials/materialConstants';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown } from 'lucide-vue-next';
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    options: any[];
    label: string;
    modelValue?: any;
    parentItemId?: number;
    childrenIds?: number[];
  }>(),
  {
    modelValue: null,
    parentItemId: MATERIAL_IDS.HIERARCHICAL_PARENT_ID,
    childrenIds: () => MATERIAL_IDS.HIERARCHICAL_CHILDREN_IDS,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', item: any): void;
}>();

const open = ref(false);

const categorizedOptions = computed(() => {
  const parent = props.options.find((item) => item.id === props.parentItemId);
  const children = props.options.filter((item) => props.childrenIds.includes(item.id));
  const regular = props.options.filter(
    (item) => item.id !== props.parentItemId && !props.childrenIds.includes(item.id)
  );

  return { parent, children, regular };
});

const updateValue = (item: any) => {
  emit('update:modelValue', item);
  open.value = false;
};

const isSelected = (item: any) => {
  return props.modelValue?.id === item.id;
};
</script>

<template>
  <div class="w-full space-y-2">
    <Label :for="label.toLowerCase()" class="text-sm font-medium text-slate-200">{{ label }}</Label>

    <DropdownMenu v-model:open="open">
      <DropdownMenuTrigger as-child>
        <div
          :id="label.toLowerCase()"
          role="combobox"
          :aria-expanded="open"
          class="w-full min-h-[60px] transition-all duration-200 flex items-start justify-between border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 rounded-lg px-3 py-2 cursor-pointer text-slate-100"
        >
          <template v-if="modelValue">
            <div class="flex items-center gap-3 px-2">
              <img
                :src="modelValue.image || 'https://placehold.co/40x30'"
                :alt="modelValue.title"
                class="w-12 h-12 object-cover rounded-md shadow-sm transition-transform duration-200 hover:scale-105"
              />
              <div class="flex flex-col text-left h-12 justify-center">
                <span class="font-medium text-base text-sky-400">{{ modelValue.title }}</span>
                <span class="text-xs text-slate-400">Selected {{ label }}</span>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="flex items-center gap-3 px-2">
              <div class="w-12 h-12 rounded-md bg-slate-800/80 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="text-slate-500"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
              <div class="flex flex-col justify-center text-left h-12">
                <span class="font-medium text-base text-slate-300 leading-tight">Select {{ label }}</span>
                <span class="text-xs text-slate-500 mt-0.5 leading-tight"
                  >Choose your preferred {{ label.toLowerCase() }}</span
                >
              </div>
            </div>
          </template>
          <ChevronsUpDown class="h-4 w-4 shrink-0 opacity-50 self-center text-slate-400" />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        :style="{ width: 'var(--radix-dropdown-menu-trigger-width, var(--radix-popper-anchor-width))' }"
        class="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-[420px] overflow-y-auto border border-slate-700 bg-slate-900 text-slate-100 shadow-xl rounded-lg p-2.5 flex flex-col gap-2"
      >
        <!-- Regular items (non-hierarchical) -->
        <template v-for="item in categorizedOptions.regular" :key="item.id">
          <DropdownMenuItem
            @click="updateValue(item)"
            :class="[
              'w-full flex items-center gap-4 px-4 py-3 rounded-lg border cursor-pointer text-slate-200 transition-colors',
              isSelected(item)
                ? 'border-sky-500/50 bg-slate-800/80'
                : 'border-slate-800/60 bg-slate-900/40 hover:bg-slate-800 hover:border-slate-700'
            ]"
          >
            <img
              :src="item.image || 'https://placehold.co/40x30'"
              :alt="item.title"
              class="w-11 h-11 object-cover rounded-md flex-shrink-0 shadow-sm"
            />
            <span class="flex-1 text-sm font-medium">{{ item.title }}</span>
            <Check
              :class="cn('h-4 w-4 text-sky-400', isSelected(item) ? 'opacity-100' : 'opacity-0')"
            />
          </DropdownMenuItem>
        </template>

        <!-- Hierarchical parent item with submenu -->
        <template v-if="categorizedOptions.parent && categorizedOptions.children.length > 0">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger class="w-full flex items-center gap-4 px-4 py-3 rounded-lg border border-slate-800/60 bg-slate-900/40 hover:bg-slate-800 hover:border-slate-700 cursor-pointer text-slate-200 transition-colors">
              <img
                :src="categorizedOptions.parent.image || 'https://placehold.co/40x30'"
                :alt="categorizedOptions.parent.title"
                class="w-11 h-11 object-cover rounded-md flex-shrink-0 shadow-sm"
              />
              <span class="flex-1 text-sm font-medium">{{ categorizedOptions.parent.title }}</span>
              <span class="text-xs text-slate-400 mr-1">{{ categorizedOptions.children.length }} options</span>
            </DropdownMenuSubTrigger>

            <DropdownMenuSubContent class="w-72 max-h-[320px] overflow-y-auto border border-slate-700 bg-slate-900 text-slate-100 shadow-xl rounded-lg p-2 flex flex-col gap-1.5">
              <template v-for="child in categorizedOptions.children" :key="child.id">
                <DropdownMenuItem
                  @click="updateValue(child)"
                  :class="[
                    'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg border cursor-pointer text-slate-200 transition-colors',
                    isSelected(child)
                      ? 'border-sky-500/50 bg-slate-800/80'
                      : 'border-slate-800/60 bg-slate-900/40 hover:bg-slate-800 hover:border-slate-700'
                  ]"
                >
                  <img
                    :src="child.image || 'https://placehold.co/40x30'"
                    :alt="child.title"
                    class="w-9 h-9 object-cover rounded-md flex-shrink-0 shadow-sm"
                  />
                  <span class="flex-1 text-sm font-medium">{{ child.title }}</span>
                  <Check
                    :class="cn('h-4 w-4 text-sky-400', isSelected(child) ? 'opacity-100' : 'opacity-0')"
                  />
                </DropdownMenuItem>
              </template>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </template>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
