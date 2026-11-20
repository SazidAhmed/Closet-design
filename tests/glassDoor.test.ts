// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { useClosetStore } from '../src/stores/useClosetStore'
import { useRoomStore } from '../src/stores/useRoomStore'
import { useSelectionStore } from '../src/stores/useSelectionStore'
import BuildCloset from '../src/features/closet/views/BuildCloset.vue'
import FloorPlan from '../src/features/closet/views/FloorPlan.vue'
import { exportForBackend } from '../src/features/closet/domain/schema'
import { createDefaultClosetState } from '../src/features/closet/domain/schema'

describe('Glass Door Feature', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('Store and persistence', () => {
    it('sets and updates isGlassDoor on a tower via setTowerGlassDoor and updateTower', () => {
      const closet = useClosetStore()
      closet.towers = [
        {
          id: 'tower-1',
          label: 'Shelves 1',
          width: 24,
          height: 84,
          depth: 23,
          doorMode: 'with_doors',
          categoryCode: 'CAS',
          accessories: [],
        },
      ]

      expect(closet.towers[0].isGlassDoor).toBeUndefined()

      closet.setTowerGlassDoor('tower-1', true)
      expect(closet.towers[0].isGlassDoor).toBe(true)

      closet.setTowerGlassDoor('tower-1', false)
      expect(closet.towers[0].isGlassDoor).toBe(false)

      closet.updateTower('tower-1', { isGlassDoor: true })
      expect(closet.towers[0].isGlassDoor).toBe(true)
    })

    it('persists isGlassDoor in exportForBackend', () => {
      const state = createDefaultClosetState()
      state.towers = [
        {
          id: 't-glass-1',
          label: 'Glass Cabinet',
          width: 30,
          height: 84,
          depth: 23,
          doorMode: 'with_doors',
          categoryCode: 'CAS',
          isGlassDoor: true,
          accessories: [],
        },
        {
          id: 't-wood-2',
          label: 'Wood Cabinet',
          width: 30,
          height: 84,
          depth: 23,
          doorMode: 'with_doors',
          categoryCode: 'CAS',
          isGlassDoor: false,
          accessories: [],
        },
      ]

      const payload = exportForBackend(state)
      expect(payload.towers[0].isGlassDoor).toBe(true)
      expect(payload.towers[1].isGlassDoor).toBe(false)
    })
  })

  describe('UI Checkbox in BuildCloset', () => {
    function setupStores() {
      const room = useRoomStore()
      const closet = useClosetStore()
      const selection = useSelectionStore()

      room.walls = [
        { id: 'wall-1', label: '1', position: [0, 0], length: 100, angle: 0 },
        { id: 'wall-2', label: '2', position: [100, 0], length: 100, angle: Math.PI / 2 },
      ] as any

      closet.catalogCategories = [
        {
          doorMode: 'with_doors',
          categoryCode: 'CAS',
          categoryName: 'Shelves',
          catalogs: [],
        } as any,
      ]

      return { room, closet, selection }
    }

    it('displays the Glass Door checkbox for cabinets with doors below Door Hinge', async () => {
      const { closet, selection } = setupStores()

      closet.towers = [
        {
          id: 'tower-with-doors',
          label: 'Shelves 1',
          wallId: 'wall-1',
          width: 12,
          height: 84,
          depth: 23,
          doorMode: 'with_doors',
          categoryCode: 'CAS',
          doorHinge: 'left',
          accessories: [],
        },
      ]

      selection.selectTower('tower-with-doors')

      const wrapper = mount(BuildCloset, {
        attachTo: document.body,
        global: {
          stubs: {
            TopToolbar: true,
            FooterBar: true,
            RoomPlanPreview: true,
            FloorPlan: true,
          },
        },
      })

      await nextTick()

      // The Glass Door checkbox section should exist
      const glassSection = wrapper.find('.glass-door-toggle-section')
      expect(glassSection.exists()).toBe(true)
      expect(glassSection.text()).toContain('Glass Door')

      // Verify the checkbox is unchecked initially
      const checkbox = wrapper.find<HTMLInputElement>('.glass-door-checkbox')
      expect(checkbox.exists()).toBe(true)
      expect(checkbox.element.checked).toBe(false)

      // Clicking / checking the checkbox updates the store
      await checkbox.setValue(true)
      expect(closet.towers[0].isGlassDoor).toBe(true)

      // Unchecking updates store back to false
      await checkbox.setValue(false)
      expect(closet.towers[0].isGlassDoor).toBe(false)
    })

    it('does not display the Glass Door checkbox for cabinets without doors', async () => {
      const { closet, selection } = setupStores()

      closet.towers = [
        {
          id: 'tower-without-doors',
          label: 'Shelves 1',
          wallId: 'wall-1',
          width: 30,
          height: 84,
          depth: 15,
          doorMode: 'without_doors',
          categoryCode: 'CAS',
          accessories: [],
        },
      ]

      selection.selectTower('tower-without-doors')

      const wrapper = mount(BuildCloset, {
        attachTo: document.body,
        global: {
          stubs: {
            TopToolbar: true,
            FooterBar: true,
            RoomPlanPreview: true,
            FloorPlan: true,
          },
        },
      })

      await nextTick()

      const glassSection = wrapper.find('.glass-door-toggle-section')
      expect(glassSection.exists()).toBe(false)
    })
  })

  describe('Elevation view rendering in FloorPlan', () => {
    it('renders inner rectangle inside the door and preserves door hinge arrow for single door', async () => {
      const room = useRoomStore()
      const closet = useClosetStore()
      const selection = useSelectionStore()

      room.walls = [
        { id: 'wall-1', label: '1', position: [0, 0], length: 100, angle: 0 },
      ] as any

      closet.towers = [
        {
          id: 'tower-glass-single',
          label: 'Glass Tower',
          wallId: 'wall-1',
          width: 24,
          height: 84,
          depth: 23,
          positionAlongWall: 0.5,
          doorMode: 'with_doors',
          categoryCode: 'CAS',
          doorHinge: 'right',
          isGlassDoor: true,
          accessories: [],
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

      // Outer door face exists
      const doorFaces = wrapper.findAll('.elevation-door-face')
      expect(doorFaces.length).toBeGreaterThan(0)

      // Inner glass pane rectangle exists inside the door
      const glassPanes = wrapper.findAll('.elevation-glass-door-pane')
      expect(glassPanes.length).toBe(1)

      // The door hinge arrow lines remain visible
      const hingeLines = wrapper.findAll('.elevation-door-hinge-line')
      expect(hingeLines.length).toBeGreaterThan(0)
    })

    it('renders 2 inner rectangles for a 2-door cabinet with glass doors', async () => {
      const room = useRoomStore()
      const closet = useClosetStore()
      const selection = useSelectionStore()

      room.walls = [
        { id: 'wall-1', label: '1', position: [0, 0], length: 100, angle: 0 },
      ] as any

      closet.towers = [
        {
          id: 'tower-glass-double',
          label: 'Double Glass Tower',
          wallId: 'wall-1',
          width: 36,
          height: 84,
          depth: 23,
          positionAlongWall: 0.5,
          doorMode: 'with_doors',
          categoryCode: 'CAS',
          doorCount: 2,
          isGlassDoor: true,
          accessories: [],
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

      // 2 inner glass pane rectangles for the two door leaves
      const glassPanes = wrapper.findAll('.elevation-glass-door-pane')
      expect(glassPanes.length).toBe(2)

      // Center split line exists
      const splitLine = wrapper.find('.elevation-door-center-split')
      expect(splitLine.exists()).toBe(true)

      // Hinge lines remain visible
      const hingeLines = wrapper.findAll('.elevation-door-hinge-line')
      expect(hingeLines.length).toBeGreaterThan(0)
    })

    it('renders inner rectangle inside the door of a blind corner cabinet with glass door', async () => {
      const room = useRoomStore()
      const closet = useClosetStore()
      const selection = useSelectionStore()

      room.walls = [
        { id: 'wall-1', label: '1', position: [0, 0], length: 100, angle: 0 },
      ] as any

      closet.towers = [
        {
          id: 'blind-glass-tower',
          label: 'Blind Glass Tower',
          wallId: 'wall-1',
          width: 40,
          height: 84,
          depth: 23,
          positionAlongWall: 0.5,
          doorMode: 'with_doors',
          categoryCode: 'CCS',
          cornerPosition: 'right',
          isCorner: true,
          isGlassDoor: true,
          accessories: [],
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

      // Inner glass pane rectangle exists inside the door section
      const glassPanes = wrapper.findAll('.elevation-glass-door-pane')
      expect(glassPanes.length).toBe(1)

      // Blind panel exists
      const blindPanel = wrapper.find('.elevation-blind-panel')
      expect(blindPanel.exists()).toBe(true)

      // Hinge lines remain visible
      const hingeLines = wrapper.findAll('.elevation-door-hinge-line')
      expect(hingeLines.length).toBeGreaterThan(0)
    })
  })
})
