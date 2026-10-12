// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import BuildCloset from '../src/features/closet/views/BuildCloset.vue'
import { useClosetStore } from '../src/stores/useClosetStore'
import { useRoomStore } from '../src/stores/useRoomStore'
import { useSelectionStore } from '../src/stores/useSelectionStore'

describe('L Shape Vertical custom part', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('creates L Shape Vertical with user specified defaults (unattached)', () => {
    const closet = useClosetStore()
    const part = closet.addCustomPart('l shape vertical')

    expect(part.partType).toBe('l shape vertical')
    expect(part.width).toBe(3)
    expect(part.depth).toBe(3)
    expect(part.height).toBe(84)
    expect(part.outset).toBe(20.875)
    expect(part.elevation).toBe(0)
    expect(part.orientation).toBe('left')
  })

  it('places L Shape Vertical on attached cabinet with independent properties', () => {
    const closet = useClosetStore()
    closet.towers.push({
      id: 'tower-1',
      label: 'Cabinet 1',
      width: 30,
      depth: 23.875,
      height: 90,
      elevation: 5,
      outset: 2,
      doorMode: 'with_doors',
      doorGap: 0.125,
      doorThickness: 0.75,
      positionAlongWall: 0.5,
      accessories: [],
      wallId: 'wall-1',
    })

    const part = closet.addCustomPart('l shape vertical', 'tower-1', 100, 'right', 'right')

    expect(part.partType).toBe('l shape vertical')
    expect(part.width).toBe(3)
    expect(part.height).toBe(84)
    expect(part.depth).toBe(3)
    expect(part.outset).toBe(20.875)
    expect(part.elevation).toBe(0)
    expect(part.orientation).toBe('right')
    expect(part.attachedToTowerId).toBe('tower-1')
  })

  it('does not inherit cabinet depth, height, or outset changes', () => {
    const closet = useClosetStore()
    closet.towers.push({
      id: 'tower-1',
      label: 'Cabinet 1',
      width: 30,
      depth: 23.875,
      height: 84,
      outset: 0,
      doorMode: 'with_doors',
      doorGap: 0.125,
      doorThickness: 0.75,
      positionAlongWall: 0.5,
      accessories: [],
      wallId: 'wall-1',
    })

    const part = closet.addCustomPart('l shape vertical', 'tower-1', 100, 'right', 'right')
    expect(part.depth).toBe(3)
    expect(part.height).toBe(84)
    expect(part.outset).toBe(20.875)

    // Cabinet depth changes to 20
    closet.setTowerDepth('tower-1', 20)
    const afterDepth = closet.towers.find((t) => t.id === part.id)!
    expect(afterDepth.depth).toBe(3)

    // Cabinet height changes to 96
    closet.setTowerHeight('tower-1', 96)
    const afterHeight = closet.towers.find((t) => t.id === part.id)!
    expect(afterHeight.height).toBe(84)

    // Cabinet outset changes to 5
    closet.setTowerOutset('tower-1', 5)
    const afterOutset = closet.towers.find((t) => t.id === part.id)!
    expect(afterOutset.outset).toBe(20.875)
  })

  describe('clearance calculations', () => {
    it('calculates clearance as cabinet-to-cabinet when corner wall has cabinets, and cabinet-to-wall when empty', async () => {
      const closet = useClosetStore()
      const room = useRoomStore()
      const selection = useSelectionStore()

      room.walls = [
        { id: 'wall-1', length: 100, position: [0, 0], angle: 0, hasCloset: false, thickness: 5.0, label: '1', visible: true },
        { id: 'wall-4', length: 100, position: [0, 0], angle: Math.PI / 2, hasCloset: false, thickness: 5.0, label: '4', visible: true },
      ]

      // Corner cabinet on wall-1: width 40, depth 23, starts at corner (distFromCorner = 0)
      closet.towers = [
        {
          id: 'corner-cab',
          label: 'Blind Corner Shelves 1',
          catalogId: 100,
          width: 40,
          depth: 23,
          height: 84,
          wallId: 'wall-1',
          positionAlongWall: 0.2, // center at 20 => [0, 40]
          accessories: [],
        },
        {
          id: 'l-shape-1',
          label: 'L Shape Vertical 1',
          partType: 'l shape vertical',
          width: 3,
          depth: 3,
          height: 84,
          outset: 20.875,
          wallId: 'wall-4',
          positionAlongWall: 0.5, // center at 50 => left edge at 48.5
          accessories: [],
        },
      ]

      selection.selectTower('l-shape-1')

      const wrapper = mount(BuildCloset, {
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
      selection.selectTower('l-shape-1')
      await nextTick()

      // When corner cabinet exists on wall-1 (depth 23):
      // Clearance Left should be measured cabinet-to-cabinet: 48.5 - 23 = 25.5"
      const clearanceInputs = wrapper.findAll('.clearance-section .number-input')
      expect(clearanceInputs.length).toBe(2)
      expect(parseFloat((clearanceInputs[0]!.element as HTMLInputElement).value)).toBeCloseTo(25.5, 2)

      // When moved all the way left against corner cabinet (moveTowerLeft):
      // Clearance should be 0.8750 instead of 0
      const snapButtons = wrapper.findAll('.snap-btn')
      const moveLeftBtn = snapButtons[0]!
      await moveLeftBtn.trigger('click')
      await nextTick()

      expect(parseFloat((clearanceInputs[0]!.element as HTMLInputElement).value)).toBeCloseTo(0.875, 4)

      // When corner cabinet is removed (no cabinets on corner wall):
      // Moving all the way left against wall yields clearance 0
      closet.towers = closet.towers.filter((t) => t.id !== 'corner-cab')
      await nextTick()
      await moveLeftBtn.trigger('click')
      await nextTick()

      expect(parseFloat((clearanceInputs[0]!.element as HTMLInputElement).value)).toBeCloseTo(0, 4)
    })
  })
})


