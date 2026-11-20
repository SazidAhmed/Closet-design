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
    units: 'in' as 'cm' | 'in',
    token: (typeof window !== 'undefined' ? (localStorage.getItem('access_token') || '') : '') as string,
  }),
  actions: {
    setToken(token: string) {
      this.token = token
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', token)
      }
    },
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
