// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import {
  isBlindCornerCabinet,
  isCornerCabinet,
  hasTowerElevationSplit,
  getTowerBlindLayout,
  type Tower,
} from '../src/features/closet/domain/types/tower'
import { useClosetStore } from '../src/stores/useClosetStore'
import { useRoomStore } from '../src/stores/useRoomStore'
import { useSelectionStore } from '../src/stores/useSelectionStore'
import FloorPlan from '../src/features/closet/views/FloorPlan.vue'

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

  describe('Corner Cabinet split based on Bridge Depth', () => {
    it('identifies corner cabinet and activates elevation split', () => {
      const tower: Tower = {
        id: 'corner-1',
        label: 'Shelves 1',
        width: 30,
        height: 84,
        depth: 15,
        doorMode: 'without_doors',
        categoryCode: 'CAS',
        cornerPosition: 'left',
        cornerBridgeDepth: 16,
        isCorner: true,
        accessories: [],
      }
      expect(isCornerCabinet(tower)).toBe(true)
      expect(hasTowerElevationSplit(tower)).toBe(true)
    })

    it('computes Left Corner layout based on Bridge Depth with panelLabel "Bridge"', () => {
      const tower: Tower = {
        id: 'corner-left-1',
        label: 'Shelves 1',
        width: 30,
        height: 84,
        depth: 15,
        doorMode: 'without_doors',
        categoryCode: 'CAS',
        cornerPosition: 'left',
        cornerBridgeDepth: 16,
        isCorner: true,
        accessories: [],
      }

      const layout = getTowerBlindLayout(tower)
      expect(layout.orientation).toBe('left')
      expect(layout.blindWidth).toBe(16) // Bridge depth
      expect(layout.doorWidth).toBe(14) // 30 - 16
      expect(layout.blindOffsetFromLeft).toBe(0)
      expect(layout.splitOffsetFromLeft).toBe(16)
      expect(layout.doorOffsetFromLeft).toBe(16)
      expect(layout.panelLabel).toBe('Bridge')
      expect(layout.isCorner).toBe(true)
    })

    it('computes Right Corner layout based on Bridge Depth', () => {
      const tower: Tower = {
        id: 'corner-right-1',
        label: 'Shelves 1',
        width: 30,
        height: 84,
        depth: 15,
        doorMode: 'without_doors',
        categoryCode: 'CAS',
        cornerPosition: 'right',
        cornerBridgeDepth: 16,
        isCorner: true,
        accessories: [],
      }

      const layout = getTowerBlindLayout(tower)
      expect(layout.orientation).toBe('right')
      expect(layout.blindWidth).toBe(16) // Bridge depth
      expect(layout.doorWidth).toBe(14) // 30 - 16
      expect(layout.doorOffsetFromLeft).toBe(0)
      expect(layout.splitOffsetFromLeft).toBe(14)
      expect(layout.blindOffsetFromLeft).toBe(14)
      expect(layout.panelLabel).toBe('Bridge')
      expect(layout.isCorner).toBe(true)
    })

    it('falls back to tower.depth if cornerBridgeDepth is not provided', () => {
      const tower: Tower = {
        id: 'corner-fallback',
        label: 'Shelves 1',
        width: 30,
        height: 84,
        depth: 18,
        doorMode: 'without_doors',
        categoryCode: 'CAS',
        cornerPosition: 'left',
        isCorner: true,
        accessories: [],
      }

      const layout = getTowerBlindLayout(tower)
      expect(layout.blindWidth).toBe(18) // Falls back to depth
      expect(layout.doorWidth).toBe(12) // 30 - 18
      expect(layout.panelLabel).toBe('Bridge')
    })

    it('does not split standard non-corner cabinets without doors', () => {
      const tower: Tower = {
        id: 'standard-tower',
        label: 'Shelves 1',
        width: 30,
        height: 84,
        depth: 15,
        doorMode: 'without_doors',
        categoryCode: 'CAS',
        accessories: [],
      }
      expect(isCornerCabinet(tower)).toBe(false)
      expect(hasTowerElevationSplit(tower)).toBe(false)
    })

    it('sets doorHinge to right when switching to right corner in store', () => {
      const closet = useClosetStore()
      closet.towers = [
        {
          id: 'corner-store-test',
          label: 'Shelves 1',
          width: 30,
          height: 84,
          depth: 15,
          doorMode: 'without_doors',
          categoryCode: 'CAS',
          doorHinge: 'left',
          accessories: [],
        },
      ]

      closet.setTowerCornerPosition('corner-store-test', 'right')
      const updated = closet.towers[0]
      expect(updated.cornerPosition).toBe('right')
      expect(updated.doorHinge).toBe('right')
    })

    it('renders shelves and no door face or hinge lines for corner cabinets without doors in elevation view', async () => {
      const room = useRoomStore()
      const closet = useClosetStore()
      const selection = useSelectionStore()

      room.walls = [
        { id: 'wall-1', label: '1', position: [0, 0], length: 100, angle: 0 },
        { id: 'wall-2', label: '2', position: [100, 0], length: 100, angle: Math.PI / 2 },
      ] as any

      closet.towers = [
        {
          id: 'corner-without-doors',
          label: 'Shelves 1',
          wallId: 'wall-1',
          width: 30,
          height: 84,
          depth: 15,
          positionAlongWall: 0.5,
          doorMode: 'without_doors',
          categoryCode: 'CAS',
          cornerPosition: 'right',
          cornerBridgeDepth: 15,
          isCorner: true,
          accessories: [
            { type: 'shelf_set', count: 4 },
          ],
        },
      ]

      selection.selectWall('wall-1')

      const wrapper = mount(FloorPlan, {
        attachTo: document.body,
        props: {
          elevationOnly: true,
          initialWallId: 'wall-1',
        },
        global: {
          stubs: {
            TopToolbar: true,
            FooterBar: true,
          },
        },
      })

      await nextTick()

      // The blind/bridge panel should exist (covering the bridge into the corner)
      const blindPanel = wrapper.find('.elevation-blind-panel')
      expect(blindPanel.exists()).toBe(true)

      // The door face should NOT exist for corner cabinets without doors
      const doorFaces = wrapper.findAll('.elevation-door-face:not(.elevation-blind-panel)')
      expect(doorFaces.length).toBe(0)

      // The diagonal hinge lines should NOT exist
      const hingeLines = wrapper.findAll('.elevation-door-hinge-line')
      expect(hingeLines.length).toBe(0)

      // Shelves SHOULD be visible
      const shelves = wrapper.findAll('.elevation-shelf, .elevation-shelf-fixed')
      expect(shelves.length).toBeGreaterThan(0)
    })

    it('renders door face and hinge lines for corner cabinets with doors in elevation view', async () => {
      const room = useRoomStore()
      const closet = useClosetStore()
      const selection = useSelectionStore()

      room.walls = [
        { id: 'wall-1', label: '1', position: [0, 0], length: 100, angle: 0 },
        { id: 'wall-2', label: '2', position: [100, 0], length: 100, angle: Math.PI / 2 },
      ] as any

      closet.towers = [
        {
          id: 'corner-with-doors',
          label: 'Corner Shelves 1',
          wallId: 'wall-1',
          width: 40,
          height: 84,
          depth: 23,
          positionAlongWall: 0.5,
          doorMode: 'with_doors',
          categoryCode: 'CCS',
          cornerPosition: 'right',
          isCorner: true,
          doorHinge: 'right',
          accessories: [
            { type: 'shelf_set', count: 4 },
          ],
        },
      ]

      selection.selectWall('wall-1')

      const wrapper = mount(FloorPlan, {
        attachTo: document.body,
        props: {
          elevationOnly: true,
          initialWallId: 'wall-1',
        },
        global: {
          stubs: {
            TopToolbar: true,
            FooterBar: true,
          },
        },
      })

      await nextTick()

      // The blind/bridge panel should exist
      const blindPanel = wrapper.find('.elevation-blind-panel')
      expect(blindPanel.exists()).toBe(true)

      // The door face SHOULD exist for corner cabinets with doors
      const doorFaces = wrapper.findAll('.elevation-door-face:not(.elevation-blind-panel)')
      expect(doorFaces.length).toBeGreaterThan(0)

      // The diagonal hinge lines SHOULD exist
      const hingeLines = wrapper.findAll('.elevation-door-hinge-line')
      expect(hingeLines.length).toBeGreaterThan(0)
    })
  })
})
