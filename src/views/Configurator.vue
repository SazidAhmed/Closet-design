<script setup>
import { computed } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import Cabinet3D from '../components/Cabinet3D.vue'
import { useClosetStore } from '../stores/useClosetStore'

const closet = useClosetStore()

const width = computed({
  get: () => closet.cabinet.width,
  set: (v) => (closet.cabinet.width = Number(v)),
})

const height = computed({
  get: () => closet.cabinet.height,
  set: (v) => (closet.cabinet.height = Number(v)),
})

const depth = computed({
  get: () => closet.cabinet.depth,
  set: (v) => (closet.cabinet.depth = Number(v)),
})

const shelves = computed({
  get: () => closet.shelves,
  set: (v) => (closet.shelves = Math.max(0, Math.min(8, Math.round(Number(v))))),
})

function exportState() {
  // Clean JSON payload for backend pricing/BOM services
  console.log(closet.exportForBackend)
}

// A camera distance that scales with cabinet size (simple heuristic).
const cameraPos = computed(() => {
  const w = Number(closet.cabinet.width) || 60
  const h = Number(closet.cabinet.height) || 200
  const d = Number(closet.cabinet.depth) || 60
  const maxDim = Math.max(w, h, d)
  return [maxDim * 0.9, maxDim * 0.6, maxDim * 1.1]
})
</script>

<template>
  <div class="h-screen w-screen bg-slate-950 text-slate-100">
    <div class="flex h-full">
      <!-- Left: 2D Controls -->
      <aside class="w-[360px] shrink-0 border-r border-slate-800 bg-slate-900/60 p-5">
        <div class="mb-4">
          <h1 class="text-lg font-semibold tracking-tight">Closet Configurator (MVP)</h1>
          <p class="mt-1 text-sm text-slate-300">
            Parametric cabinet carcass + evenly spaced shelves.
          </p>
        </div>

        <div class="space-y-5">
          <div>
            <div class="flex items-baseline justify-between">
              <label class="text-sm font-medium">Width</label>
              <span class="text-xs text-slate-300">{{ width }} cm</span>
            </div>
            <input v-model.number="width" type="range" min="30" max="120" step="1" class="w-full" />
          </div>

          <div>
            <div class="flex items-baseline justify-between">
              <label class="text-sm font-medium">Height</label>
              <span class="text-xs text-slate-300">{{ height }} cm</span>
            </div>
            <input
              v-model.number="height"
              type="range"
              min="100"
              max="240"
              step="1"
              class="w-full"
            />
          </div>

          <div>
            <div class="flex items-baseline justify-between">
              <label class="text-sm font-medium">Depth</label>
              <span class="text-xs text-slate-300">{{ depth }} cm</span>
            </div>
            <input v-model.number="depth" type="range" min="30" max="80" step="1" class="w-full" />
          </div>

          <div>
            <div class="flex items-baseline justify-between">
              <label class="text-sm font-medium">Shelves</label>
              <span class="text-xs text-slate-300">{{ shelves }}</span>
            </div>
            <input v-model.number="shelves" type="range" min="0" max="8" step="1" class="w-full" />
          </div>

          <div class="pt-2">
            <button
              type="button"
              class="w-full rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
              @click="exportState"
            >
              Export JSON (console)
            </button>
          </div>
        </div>
      </aside>

      <!-- Right: 3D Canvas -->
      <main class="relative flex-1">
        <TresCanvas
          clear-color="#0b1220"
          :antialias="true"
          :shadows="false"
          class="h-full w-full"
        >
          <TresPerspectiveCamera :position="cameraPos" :fov="45" :near="0.1" :far="5000" />

          <OrbitControls :enable-damping="true" :damping-factor="0.08" />

          <TresAmbientLight :intensity="0.8" />
          <TresDirectionalLight :position="[200, 300, 200]" :intensity="1.2" />

          <!-- Ground reference (optional, helps depth perception) -->
          <TresMesh :position="[0, -120, 0]" :rotation="[-Math.PI / 2, 0, 0]">
            <TresPlaneGeometry :args="[2000, 2000]" />
            <TresMeshStandardMaterial color="#0f172a" :roughness="1" />
          </TresMesh>

          <Cabinet3D />
        </TresCanvas>

        <div class="pointer-events-none absolute left-4 top-4 rounded-md bg-slate-900/70 px-3 py-2 text-xs text-slate-200">
          Drag to orbit • Scroll to zoom
        </div>
      </main>
    </div>
  </div>
</template>

