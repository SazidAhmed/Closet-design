// ---------------------------------------------------------------------------
// App-level store — current step, view mode, units
// ---------------------------------------------------------------------------

import { defineStore } from 'pinia'

export type AppStep = 'type' | 'floorplan' | 'design' | 'review'
export type ViewMode = 'overhead' | 'wall' | '3d'

export const useAppStore = defineStore('app', {
  state: () => ({
    currentStep: 'type' as AppStep,
    viewMode: '3d' as ViewMode,
    units: 'cm' as 'cm' | 'in',
  }),
  actions: {
    setStep(step: AppStep) {
      this.currentStep = step
    },
    setViewMode(mode: ViewMode) {
      this.viewMode = mode
    },
    toggleUnits() {
      this.units = this.units === 'cm' ? 'in' : 'cm'
    },
  },
})
