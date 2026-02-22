<script setup lang="ts">
import { computed } from 'vue'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'radix-vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    class?: string
  }>(),
  {
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', v: number): void
  (e: 'valueCommit', v: number): void
}>()

const internal = computed<number[]>({
  get: () => [props.modelValue],
  set: (v) => emit('update:modelValue', v?.[0] ?? props.min),
})

function onCommit(v: number[]) {
  emit('valueCommit', v?.[0] ?? props.modelValue)
}
</script>

<template>
  <SliderRoot
    v-model="internal"
    :min="props.min"
    :max="props.max"
    :step="props.step"
    :disabled="props.disabled"
    :class="cn('relative flex w-full touch-none select-none items-center', props.class)"
    @valueCommit="onCommit"
  >
    <SliderTrack class="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-800">
      <SliderRange class="absolute h-full bg-slate-100" />
    </SliderTrack>
    <SliderThumb
      class="block h-5 w-5 rounded-full border border-slate-200/30 bg-slate-50 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
    />
  </SliderRoot>
</template>

