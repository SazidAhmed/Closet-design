<script setup lang="ts">
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown } from 'lucide-vue-next';
import { ref } from 'vue';

const props = withDefaults(
  defineProps<{
    options: any[];
    label: string;
    modelValue?: any;
    isChild?: boolean;
    parentSelected?: boolean;
  }>(),
  {
    modelValue: null,
    isChild: false,
    parentSelected: true,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: any): void;
  (e: 'checkParent'): void;
}>();

const open = ref(false);

const displayTitle = (item: any) => item?.title || item?.color || item?.name || item?.label || '';

const updateValue = (item: any) => {
  if (!item) return;
  if (!item.title) {
    item = { ...item, title: displayTitle(item) };
  }
  emit('update:modelValue', item);
  open.value = false;
};

const handleClick = () => {
  if (props.isChild && !props.parentSelected) {
    emit('checkParent');
    return;
  }
  open.value = !open.value;
};
</script>

<template>
  <div class="w-full space-y-2">
    <Label :for="label.toLowerCase()" class="text-sm font-medium text-slate-200">{{ label }}</Label>
    <Popover v-model:open="open">
      <PopoverTrigger
        :id="label.toLowerCase()"
        :class="[
          'w-full min-h-[60px] transition-all duration-200 flex items-start justify-between border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 rounded-lg px-3 py-2 text-slate-100',
          {
            'cursor-pointer': !isChild || parentSelected,
            'opacity-60 cursor-not-allowed': isChild && !parentSelected,
          },
        ]"
        @click="handleClick"
      >
        <template v-if="modelValue">
          <div class="flex items-center gap-3 px-2">
            <img
              v-if="modelValue.image"
              :src="modelValue.image"
              :alt="displayTitle(modelValue)"
              class="w-12 h-12 object-cover rounded-md shadow-sm transition-transform duration-200 hover:scale-105"
            />
            <div v-else class="w-12 h-12 rounded-md bg-slate-800 flex items-center justify-center flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400"><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
            </div>
            <div class="flex flex-col text-left h-12 justify-center">
              <span class="font-medium text-base text-sky-400">{{ displayTitle(modelValue) }}</span>
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
      </PopoverTrigger>
      <PopoverContent
        v-if="!isChild || parentSelected"
        align="start"
        :style="{ width: 'var(--radix-popover-trigger-width, var(--radix-popper-anchor-width))' }"
        class="w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] p-2.5 border border-slate-700 bg-slate-900 text-slate-100 shadow-xl rounded-lg"
      >
        <Command class="w-full bg-slate-900 text-slate-100">
          <CommandInput :placeholder="`Search ${label}...`" class="w-full h-10 px-3 border-b border-slate-800 text-slate-100 placeholder:text-slate-500 mb-2" />
          <CommandEmpty class="py-6 text-center text-sm text-slate-400">No {{ label.toLowerCase() }} found.</CommandEmpty>
          <CommandList class="w-full max-h-[350px] overflow-y-auto p-1">
            <CommandGroup class="w-full flex flex-col gap-2">
              <CommandItem
                v-for="item in options"
                :key="displayTitle(item)"
                :value="displayTitle(item)"
                @select="() => updateValue(item)"
                :class="[
                  'w-full flex items-center gap-4 px-4 py-3 rounded-lg border cursor-pointer text-slate-200 transition-colors',
                  displayTitle(modelValue) === displayTitle(item)
                    ? 'border-sky-500/50 bg-slate-800/80 data-[highlighted]:bg-slate-800'
                    : 'border-slate-800/60 bg-slate-900/40 hover:bg-slate-800 data-[highlighted]:bg-slate-800 hover:border-slate-700'
                ]"
              >
                <img
                  v-if="item.image"
                  :src="item.image"
                  :alt="displayTitle(item)"
                  class="w-11 h-11 object-cover rounded-md flex-shrink-0 shadow-sm"
                />
                <div v-else class="w-11 h-11 rounded-md bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400"><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                </div>
                <span class="flex-1 text-sm font-medium">{{ displayTitle(item) }}</span>
                <Check :class="cn('ml-auto h-4 w-4 text-sky-400', displayTitle(modelValue) === displayTitle(item) ? 'opacity-100' : 'opacity-0')" />
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  </div>
</template>
