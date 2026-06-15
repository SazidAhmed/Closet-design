// ---------------------------------------------------------------------------
// Selection store — UI-level selection state
// ---------------------------------------------------------------------------

import { defineStore } from 'pinia'

export const useSelectionStore = defineStore('selection', {
  state: () => ({
    /** Currently selected tower ID (in Design Closet). */
    selectedTowerId: null as string | null,
    /** Currently selected placed item ID (in Floor Plan). */
    selectedItemId: null as string | null,
    /** Currently selected wall ID (in Floor Plan). */
    selectedWallId: null as string | null,
  }),
  actions: {
    selectTower(id: string | null) {
      this.selectedTowerId = id
      // Selecting a tower clears any directly-selected wall
      if (id !== null) this.selectedWallId = null
    },
    selectItem(id: string | null) {
      this.selectedItemId = id
    },
    selectWall(id: string | null) {
      this.selectedWallId = id
      // Selecting a wall clears any selected tower
      if (id !== null) this.selectedTowerId = null
    },
    clearAll() {
      this.selectedTowerId = null
      this.selectedItemId = null
      this.selectedWallId = null
    },
  },
})
