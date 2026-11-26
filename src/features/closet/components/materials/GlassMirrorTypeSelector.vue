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
import { useGlassMirrorSelector } from '@/composables/useGlassMirrorSelector';
import { UI_CONSTANTS } from '../../domain/materials/materialConstants';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { toast } from 'vue-sonner';

const props = withDefaults(
  defineProps<{
    modelGlass?: any;
    modelType?: any;
    label?: string;
    doorFinishMaterial?: any;
    allowBoth?: boolean;
    roomComponents?: any;
  }>(),
  {
    modelGlass: null,
    modelType: null,
    label: 'Glass or Mirror',
    doorFinishMaterial: null,
    allowBoth: false,
    roomComponents: null,
  }
);

const emit = defineEmits<{
  (e: 'update:glass', val: any): void;
  (e: 'update:type', val: any): void;
  (e: 'checkParent'): void;
}>();

const open = ref(false);

const { getParentOptions, getChildrenMap, validateChildSelection } = useGlassMirrorSelector(props.roomComponents);

const parents = computed(() => getParentOptions(props.allowBoth));
const childrenMap = computed(() => getChildrenMap());

function selectChild(child: any) {
  const validation = validateChildSelection(child, props.allowBoth);

  if (!validation.valid) {
    toast.warning(validation.error || 'Invalid selection', { position: UI_CONSTANTS.TOAST_POSITION });
    return;
  }

  emit('update:glass', validation.parent);
  emit('update:type', validation.child);
  open.value = false;
}

function handleTriggerClick() {
  if (!props.doorFinishMaterial) {
    emit('checkParent');
    toast.warning('Please select Door Material first', { position: UI_CONSTANTS.TOAST_POSITION });
    return;
  }
}
</script>

<template>
  <div class="w-full space-y-2">
    <Label class="text-sm font-medium text-slate-200">{{ label }}</Label>
    <DropdownMenu v-model:open="open">
      <DropdownMenuTrigger as-child @click="handleTriggerClick">
        <div
          role="combobox"
          :aria-expanded="open"
          class="w-full min-h-[60px] flex items-start justify-between border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 rounded-lg px-3 py-2 cursor-pointer text-slate-100"
        >
          <div class="flex items-center gap-3 px-2 text-left">
            <div class="flex flex-col h-12 justify-center">
              <span class="font-medium text-base text-sky-400">
                {{ modelGlass ? modelGlass.title : 'Select ' + label }}
                <template v-if="modelType"> - {{ modelType.title }}</template>
              </span>
              <span class="text-xs text-slate-400">
                <template v-if="modelGlass && !modelType">Choose type</template>
                <template v-else-if="modelGlass && modelType">Selected {{ modelGlass.title }} / {{ modelType.title }}</template>
                <template v-else>Select {{ label }}</template>
              </span>
            </div>
          </div>
          <ChevronsUpDown class="h-4 w-4 opacity-50 self-center text-slate-400" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        v-if="doorFinishMaterial"
        align="start"
        :style="{ width: 'var(--radix-dropdown-menu-trigger-width, var(--radix-popper-anchor-width))' }"
        class="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-[420px] overflow-y-auto border border-slate-700 bg-slate-900 text-slate-100 shadow-xl rounded-lg p-2.5 flex flex-col gap-2"
      >
        <template v-for="parent in parents" :key="parent.id">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger class="w-full flex items-center gap-4 px-4 py-3 rounded-lg border border-slate-800/60 bg-slate-900/40 hover:bg-slate-800 hover:border-slate-700 cursor-pointer text-slate-200 transition-colors">
              <img :src="parent.image" :alt="parent.title" class="w-10 h-10 rounded-md object-cover shadow-sm" />
              <span class="flex-1 text-sm font-medium">{{ parent.title }}</span>
              <Check :class="cn('h-4 w-4 text-sky-400', modelGlass?.id === parent.id ? 'opacity-100' : 'opacity-0')" />
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent class="w-64 border border-slate-700 bg-slate-900 text-slate-100 shadow-xl rounded-lg p-2 flex flex-col gap-1.5">
              <DropdownMenuItem
                v-for="child in (childrenMap as any)[parent.key]"
                :key="child.id"
                :class="[
                  'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg border cursor-pointer text-slate-200 transition-colors',
                  modelType?.id === child.id
                    ? 'border-sky-500/50 bg-slate-800/80'
                    : 'border-slate-800/60 bg-slate-900/40 hover:bg-slate-800 hover:border-slate-700'
                ]"
                @click.stop="selectChild(child)"
              >
                <span class="flex-1 text-sm">{{ child.title }}</span>
                <Check :class="cn('h-4 w-4 text-sky-400', modelType?.id === child.id ? 'opacity-100' : 'opacity-0')" />
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </template>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
