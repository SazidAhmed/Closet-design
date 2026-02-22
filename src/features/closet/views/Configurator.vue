<script setup lang="ts">
import { computed, watch } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import Cabinet3D from '../../../components/Cabinet3D.vue'
import { useClosetStore } from '../../../stores/useClosetStore'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useQuoteStore } from '../stores/useQuoteStore'

const closet = useClosetStore()
const quote = useQuoteStore()

const width = computed({
  get: () => closet.cabinet.width,
  set: (v: number) => closet.setCabinetDimensions({ width: v }),
})

const height = computed({
  get: () => closet.cabinet.height,
  set: (v: number) => closet.setCabinetDimensions({ height: v }),
})

const depth = computed({
  get: () => closet.cabinet.depth,
  set: (v: number) => closet.setCabinetDimensions({ depth: v }),
})

const shelves = computed({
  get: () => closet.shelves,
  set: (v: number) => closet.setShelves(v),
})

function exportState() {
  console.log(closet.exportForBackend)
}

const hasBlockingErrors = computed(() => closet.violations.some((v) => v.severity === 'error'))

watch(
  () => closet.exportForBackend,
  (payload) => {
    if (hasBlockingErrors.value) {
      quote.clear()
      return
    }
    quote.scheduleQuote(payload, 350)
  },
  { deep: true, immediate: true },
)

const cameraPos = computed(() => {
  const w = Number(closet.cabinet.width) || 60
  const h = Number(closet.cabinet.height) || 200
  const d = Number(closet.cabinet.depth) || 60
  const maxDim = Math.max(w, h, d)
  return [maxDim * 0.9, maxDim * 0.6, maxDim * 1.1] as [number, number, number]
})
</script>

<template>
  <div class="h-screen w-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
    <div class="flex h-full">
      <aside class="w-[380px] shrink-0 border-r border-slate-800 bg-slate-950/40 p-5">
        <div class="mb-5">
          <h1 class="text-lg font-semibold tracking-tight">Closet Configurator</h1>
          <p class="mt-1 text-sm text-slate-300">Phase 1 MVP: carcass + evenly spaced shelves</p>
        </div>

        <div class="space-y-6">
          <div class="space-y-2">
            <div class="flex items-baseline justify-between">
              <label class="text-sm font-medium">Width</label>
              <span class="text-xs text-slate-300">{{ width }} cm</span>
            </div>
            <Slider v-model="width" :min="30" :max="120" :step="1" />
          </div>

          <div class="space-y-2">
            <div class="flex items-baseline justify-between">
              <label class="text-sm font-medium">Height</label>
              <span class="text-xs text-slate-300">{{ height }} cm</span>
            </div>
            <Slider v-model="height" :min="100" :max="240" :step="1" />
          </div>

          <div class="space-y-2">
            <div class="flex items-baseline justify-between">
              <label class="text-sm font-medium">Depth</label>
              <span class="text-xs text-slate-300">{{ depth }} cm</span>
            </div>
            <Slider v-model="depth" :min="30" :max="80" :step="1" />
          </div>

          <div class="space-y-2">
            <div class="flex items-baseline justify-between">
              <label class="text-sm font-medium">Shelves</label>
              <span class="text-xs text-slate-300">{{ shelves }}</span>
            </div>
            <Slider v-model="shelves" :min="0" :max="8" :step="1" />
          </div>

          <Button class="w-full" @click="exportState">Export JSON (console)</Button>

          <div v-if="closet.violations.length" class="rounded-md border border-slate-800 bg-slate-950/50 p-3">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Validation</div>
            <ul class="space-y-2 text-sm">
              <li v-for="(violation, idx) in closet.violations" :key="idx" class="flex gap-2">
                <span
                  class="mt-0.5 inline-flex h-5 items-center rounded px-2 text-xs"
                  :class="
                    violation.severity === 'error'
                      ? 'bg-red-500/15 text-red-200'
                      : 'bg-amber-500/15 text-amber-200'
                  "
                >
                  {{ violation.severity }}
                </span>
                <span class="text-slate-200">{{ violation.message }}</span>
              </li>
            </ul>
          </div>

          <div class="rounded-md border border-slate-800 bg-slate-950/50 p-3">
            <div class="mb-2 flex items-center justify-between">
              <div class="text-xs font-semibold uppercase tracking-wide text-slate-300">Quote</div>
              <div class="text-xs text-slate-300">
                <span v-if="hasBlockingErrors">Fix errors to quote</span>
                <span v-else-if="quote.isLoading">Loading…</span>
                <span v-else-if="quote.error">Error</span>
                <span v-else-if="quote.result">Ready</span>
                <span v-else>Idle</span>
              </div>
            </div>

            <div v-if="quote.error" class="text-sm text-red-200">
              {{ quote.error }}
            </div>
            <div v-else-if="quote.result" class="space-y-2 text-sm">
              <div class="flex items-baseline justify-between">
                <span class="text-slate-300">Total</span>
                <span class="font-semibold">{{ quote.result.total }} {{ quote.result.currency }}</span>
              </div>
              <div v-if="quote.result.lineItems?.length" class="space-y-1">
                <div class="text-xs font-semibold uppercase tracking-wide text-slate-300">Line items</div>
                <div
                  v-for="(item, idx) in quote.result.lineItems"
                  :key="idx"
                  class="flex items-baseline justify-between gap-2"
                >
                  <span class="truncate text-slate-200">{{ item.description }}</span>
                  <span class="shrink-0 text-slate-300">{{ item.total }}</span>
                </div>
              </div>
            </div>
            <div v-else class="text-sm text-slate-300">
              Waiting for backend response at <code class="rounded bg-slate-900 px-1">/api/quote</code>.
            </div>
          </div>
        </div>
      </aside>

      <main class="relative flex-1">
        <TresCanvas clear-color="#0b1220" :antialias="true" :shadows="false" class="h-full w-full">
          <TresPerspectiveCamera :position="cameraPos" :fov="45" :near="0.1" :far="5000" />
          <OrbitControls :enable-damping="true" :damping-factor="0.08" />
          <TresAmbientLight :intensity="0.8" />
          <TresDirectionalLight :position="[200, 300, 200]" :intensity="1.2" />

          <TresMesh :position="[0, -120, 0]" :rotation="[-Math.PI / 2, 0, 0]">
            <TresPlaneGeometry :args="[2000, 2000]" />
            <TresMeshStandardMaterial color="#0f172a" :roughness="1" />
          </TresMesh>

          <Cabinet3D />
        </TresCanvas>

        <div
          class="pointer-events-none absolute left-4 top-4 rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-200"
        >
          Drag to orbit • Scroll to zoom
        </div>
      </main>
    </div>
  </div>
</template>

