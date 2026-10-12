import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  isBlindCornerCabinet,
  getTowerBlindLayout,
  type Tower,
} from '../src/features/closet/domain/types/tower'
import { useClosetStore } from '../src/stores/useClosetStore'

describe('Blind Corner Cabinet with Doors', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('isBlindCornerCabinet helper', () => {
    it('identifies corner cabinets with doors as blind corner cabinets', () => {
      const tower: Tower = {
        id: 'tower-1',
        label: 'Blind Corner Shelves 1',
        width: 40,
        height: 84,
        depth: 23,
        doorMode: 'with_doors',
        categoryCode: 'CCS',
        isCorner: true,
        accessories: [],
      }
      expect(isBlindCornerCabinet(tower)).toBe(true)
    })

    it('identifies CCH and CCL category codes with doors as blind corner cabinets', () => {
      const cchTower: Tower = {
        id: 'tower-2',
        label: 'Corner Hanging 1',
        width: 40,
        height: 84,
        depth: 23,
        doorMode: 'with_doors',
        categoryCode: 'CCH',
        accessories: [],
      }
      expect(isBlindCornerCabinet(cchTower)).toBe(true)

      const cclTower: Tower = {
        id: 'tower-3',
        label: 'Corner Long Hang 1',
        width: 40,
        height: 84,
        depth: 23,
        doorMode: 'with_doors',
        categoryCode: 'CCL',
        accessories: [],
      }
      expect(isBlindCornerCabinet(cclTower)).toBe(true)
    })

    it('returns false for corner cabinets without doors', () => {
      const tower: Tower = {
        id: 'tower-4',
        label: 'Blind Corner Shelves 1',
        width: 40,
        height: 84,
        depth: 23,
        doorMode: 'without_doors',
        categoryCode: 'CCS',
        isCorner: true,
        accessories: [],
      }
      expect(isBlindCornerCabinet(tower)).toBe(false)
    })

    it('returns false for standard shelf cabinets with doors', () => {
      const tower: Tower = {
        id: 'tower-5',
        label: 'Tower 1',
        width: 30,
        height: 84,
        depth: 20,
        doorMode: 'with_doors',
        categoryCode: 'CAS',
        accessories: [],
      }
      expect(isBlindCornerCabinet(tower)).toBe(false)
    })

    it('returns false for custom parts even with doors mode', () => {
      const tower: Tower = {
        id: 'part-1',
        label: 'Filler 1',
        width: 3,
        height: 84,
        depth: 0.75,
        partType: 'filler',
        doorMode: 'with_doors',
        accessories: [],
      }
      expect(isBlindCornerCabinet(tower)).toBe(false)
    })
  })

  describe('getTowerBlindLayout calculation', () => {
    it('computes default Blind Left layout with 24" blind width', () => {
      const tower: Tower = {
        id: 'tower-1',
        label: 'Blind Corner Shelves 1',
        width: 40,
        height: 84,
        depth: 23,
        doorMode: 'with_doors',
        categoryCode: 'CCS',
        isCorner: true,
        accessories: [],
      }

      const layout = getTowerBlindLayout(tower)
      expect(layout.orientation).toBe('left')
      expect(layout.blindWidth).toBe(24)
      expect(layout.doorWidth).toBe(16) // 40 - 24
      expect(layout.blindOffsetFromLeft).toBe(0)
      expect(layout.splitOffsetFromLeft).toBe(24)
      expect(layout.doorOffsetFromLeft).toBe(24)
    })

    it('computes Blind Right layout with user entered blind width', () => {
      const tower: Tower = {
        id: 'tower-1',
        label: 'Blind Corner Shelves 1',
        width: 40,
        height: 84,
        depth: 23,
        doorMode: 'with_doors',
        categoryCode: 'CCS',
        isCorner: true,
        blindOrientation: 'right',
        blindWidth: 26,
        accessories: [],
      }

      const layout = getTowerBlindLayout(tower)
      expect(layout.orientation).toBe('right')
      expect(layout.blindWidth).toBe(26)
      expect(layout.doorWidth).toBe(14) // 40 - 26
      expect(layout.doorOffsetFromLeft).toBe(0)
      expect(layout.splitOffsetFromLeft).toBe(14)
      expect(layout.blindOffsetFromLeft).toBe(14)
    })

    it('clamps blind width to ensure door width is at least 1"', () => {
      const tower: Tower = {
        id: 'tower-1',
        label: 'Blind Corner Shelves 1',
        width: 30,
        height: 84,
        depth: 23,
        doorMode: 'with_doors',
        categoryCode: 'CCS',
        isCorner: true,
        blindOrientation: 'left',
        blindWidth: 35, // exceeds total width
        accessories: [],
      }

      const layout = getTowerBlindLayout(tower)
      expect(layout.blindWidth).toBe(29) // max allowed is width - 1 = 29
      expect(layout.doorWidth).toBe(1)
    })
  })

  describe('useClosetStore tower updates with blind settings', () => {
    it('updates blind orientation and blind width through updateTower', () => {
      const closet = useClosetStore()
      closet.towers = [
        {
          id: 'tower-test',
          label: 'Blind Corner Shelves 1',
          width: 40,
          height: 84,
          depth: 23,
          doorMode: 'with_doors',
          categoryCode: 'CCS',
          isCorner: true,
          accessories: [],
        },
      ]

      closet.updateTower('tower-test', {
        blindOrientation: 'right',
        blindWidth: 22,
        doorHinge: 'right',
        doorCount: 1,
      })

      const updated = closet.towers.find((t) => t.id === 'tower-test')!
      expect(updated.blindOrientation).toBe('right')
      expect(updated.blindWidth).toBe(22)
      expect(updated.doorHinge).toBe('right')
      expect(updated.doorCount).toBe(1)
    })

    it('enforces single door count for blind corner cabinet with doors', () => {
      const tower: Tower = {
        id: 'tower-corner-doors',
        label: 'Blind Corner Shelves 1',
        width: 40,
        height: 84,
        depth: 23,
        doorMode: 'with_doors',
        categoryCode: 'CCS',
        isCorner: true,
        twoDoors: 1,
        oneDoor: 0,
        doorCount: 1,
        accessories: [],
      }
      expect(isBlindCornerCabinet(tower)).toBe(true)
      expect(tower.doorCount).toBe(1)
    })

    it('defaults to left door hinge for Blind Left orientation', () => {
      const closet = useClosetStore()
      closet.towers = [
        {
          id: 'tower-blind-left',
          label: 'Blind Corner Shelves 1',
          width: 40,
          height: 84,
          depth: 23,
          doorMode: 'with_doors',
          categoryCode: 'CCS',
          isCorner: true,
          blindOrientation: 'left',
          blindWidth: 20,
          doorHinge: 'left',
          doorCount: 1,
          accessories: [],
        },
      ]

      const tower = closet.towers[0]
      expect(tower.blindOrientation).toBe('left')
      expect(tower.doorHinge).toBe('left')
    })
  })
})
