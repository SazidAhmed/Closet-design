// ---------------------------------------------------------------------------
// Closet store — v2 (towers, accessories, materials)
// ---------------------------------------------------------------------------

import { defineStore } from 'pinia'
import {
  createDefaultClosetState,
  exportForBackend,
  type ClosetStateV2,
  type CabinetDimensions,
} from '../features/closet/domain/schema'
import { validateCloset } from '../features/closet/domain/validateCloset'
import type { Tower, Accessory } from '../features/closet/domain/types/tower'
import { createDefaultTower } from '../features/closet/domain/types/tower'
import type { ClosetMaterials, ArchitecturalDoorOptions } from '../features/closet/domain/types/material'
import type { ClosetTypeName } from '../features/closet/domain/closetTypes'
import { getClosetType } from '../features/closet/domain/closetTypes'

type ClosetStoreState = ClosetStateV2

export const useClosetStore = defineStore('closet', {
  state: (): ClosetStoreState => createDefaultClosetState(),

  getters: {
    exportForBackend: (state) => exportForBackend(state),
    violations: (state) => validateCloset(state),
    towerById: (state) => (id: string) => state.towers.find((t) => t.id === id),
    totalTowerWidth: (state) => state.towers.reduce((sum, t) => sum + (Number(t.width) || 0), 0),
    innerCabinetWidth: (state) => Math.max(0, state.cabinet.width - state.cabinet.thickness * 2),
    /** @deprecated Backward compat: shelf count from first tower's shelf_set accessory. */
    shelves: (state): number => {
      const firstTower = state.towers[0]
      if (!firstTower) return 0
      const shelf = firstTower.accessories.find((a) => a.type === 'shelf_set')
      return shelf && shelf.type === 'shelf_set' ? shelf.count : 0
    },
  },

  actions: {
    // ── Closet type ───────────────────────────────────────────────────────
    setClosetType(name: ClosetTypeName) {
      const type = getClosetType(name)
      this.closetType = name
      this.cabinet = type.createCabinet()
      this.towers = type.createTowers()
    },

    // ── Cabinet dimensions ────────────────────────────────────────────────
    setCabinetDimensions(partial: Partial<CabinetDimensions>) {
      this.cabinet = { ...this.cabinet, ...partial }
    },

    // ── Tower management ──────────────────────────────────────────────────
    addTower() {
      const idx = this.towers.length + 1
      const innerW = this.innerCabinetWidth
      const usedW = this.totalTowerWidth
      const remainingW = Math.max(30, innerW - usedW)
      this.towers.push(createDefaultTower(remainingW, this.cabinet.depth, this.cabinet.height, idx))
    },

    removeTower(towerId: string) {
      const idx = this.towers.findIndex((t) => t.id === towerId)
      if (idx !== -1) this.towers.splice(idx, 1)
    },

    /** Move a tower left (-1) or right (+1) in the array. */
    moveTower(towerId: string, direction: -1 | 1) {
      const idx = this.towers.findIndex((t) => t.id === towerId)
      const target = idx + direction
      if (idx < 0 || target < 0 || target >= this.towers.length) return
      // Splice-based swap to avoid TS strict indexing issues
      const [removed] = this.towers.splice(idx, 1)
      if (removed) this.towers.splice(target, 0, removed)
    },

    updateTower(towerId: string, partial: Partial<Omit<Tower, 'id' | 'accessories'>>) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) Object.assign(tower, partial)
    },

    setTowerWidth(towerId: string, width: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) tower.width = width
    },

    setTowerDepth(towerId: string, depth: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) tower.depth = depth
    },

    setTowerHeight(towerId: string, height: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) tower.height = height
    },

    // ── Accessories ───────────────────────────────────────────────────────
    setTowerAccessories(towerId: string, accessories: Accessory[]) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) tower.accessories = accessories
    },

    addAccessory(towerId: string, accessory: Accessory) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower) tower.accessories.push(accessory)
    },

    removeAccessory(towerId: string, index: number) {
      const tower = this.towers.find((t) => t.id === towerId)
      if (tower && index >= 0 && index < tower.accessories.length) {
        tower.accessories.splice(index, 1)
      }
    },

    /** Replace all towers (e.g. when applying a preset). */
    setTowers(towers: Tower[]) {
      this.towers = towers
    },

    // ── Materials ─────────────────────────────────────────────────────────
    setMaterials(partial: Partial<ClosetMaterials>) {
      Object.assign(this.materials, partial)
    },

    setDoorOptions(partial: Partial<ArchitecturalDoorOptions>) {
      Object.assign(this.doorOptions, partial)
    },

    // ── Bulk reset ────────────────────────────────────────────────────────
    resetToDefaults() {
      this.$patch(createDefaultClosetState())
    },

    /** @deprecated Use tower accessories instead. Kept for Phase 1 sidebar compat. */
    setShelves(n: number) {
      const firstTower = this.towers[0]
      if (!firstTower) return
      const shelfIdx = firstTower.accessories.findIndex((a) => a.type === 'shelf_set')
      if (shelfIdx !== -1) {
        firstTower.accessories[shelfIdx] = { type: 'shelf_set', count: n }
      } else {
        firstTower.accessories.push({ type: 'shelf_set', count: n })
      }
    },
  },
})
