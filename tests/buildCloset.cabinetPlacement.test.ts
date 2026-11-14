// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import BuildCloset from '../src/features/closet/views/BuildCloset.vue'
import FloorPlan from '../src/features/closet/views/FloorPlan.vue'
import { useRoomStore } from '../src/stores/useRoomStore'
import { useClosetStore } from '../src/stores/useClosetStore'
import { useSelectionStore } from '../src/stores/useSelectionStore'
import { setActiveCategories } from '../src/features/closet/domain/closetCatalogs'

describe('BuildCloset cabinet placement & elevation wall selection', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function setupStores() {
    setActivePinia(createPinia())
    const room = useRoomStore()
    const closet = useClosetStore()
    const selection = useSelectionStore()

    // Mock catalogCategories
    closet.catalogCategories = [
      {
        doorMode: 'without_doors',
        categoryCode: 'CAS',
        categoryName: 'Shelves',
        catalogs: [
          {
            catalogId: 101,
            code: 'CAS128416',
            depth: 16,
            minW: 12,
            maxW: 48,
            minH: 72,
            maxH: 96,
            minD: 16,
            maxD: 16,
            cabinets: [],
          },
        ],
      } as any,
    ]
    setActiveCategories(closet.catalogCategories)

    // Setup 4 walls
    room.walls = [
      { id: 'wall-1', label: '1', position: [0, 0], length: 100, angle: 0 },
      { id: 'wall-2', label: '2', position: [100, 0], length: 100, angle: Math.PI / 2 },
      { id: 'wall-3', label: '3', position: [100, 100], length: 100, angle: Math.PI },
      { id: 'wall-4', label: '4', position: [0, 100], length: 100, angle: -Math.PI / 2 },
    ] as any

    closet.towers = []
    selection.clearAll()

    return { room, closet, selection }
  }

  it('shows "Select a wall or a cabinet" popup when no wall or cabinet is selected (outside elevation view)', async () => {
    const { closet, selection } = setupStores()

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

    // Ensure nothing is selected
    selection.clearAll()
    expect(selection.selectedWallId).toBeNull()
    expect(selection.selectedTowerId).toBeNull()

    // Click the category card (cabinet: Shelves)
    const categoryCard = wrapper.find('.category-card')
    expect(categoryCard.exists()).toBe(true)
    expect(categoryCard.text()).toContain('Shelves')

    await categoryCard.trigger('click')
    await nextTick()

    // Should NOT add any tower
    expect(closet.towers.length).toBe(0)

    // Should show popup with "Select a wall or a cabinet"
    expect(wrapper.text()).toContain('Select a wall or a cabinet')

    // Click OK to dismiss
    const okBtn = wrapper.findAll('button').find((b) => b.text() === 'OK')
    expect(okBtn).toBeTruthy()
    await okBtn!.trigger('click')
    await nextTick()

    expect(wrapper.text()).not.toContain('Select a wall or a cabinet')
  })

  it('adds cabinet to the selected wall and deselects wall and newly added cabinet', async () => {
    const { closet, selection } = setupStores()

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

    // Select wall-2
    selection.selectWall('wall-2')
    expect(selection.selectedWallId).toBe('wall-2')

    // Click category card
    const categoryCard = wrapper.find('.category-card')
    await categoryCard.trigger('click')
    await nextTick()

    // Should add tower to wall-2
    expect(closet.towers.length).toBe(1)
    expect(closet.towers[0].wallId).toBe('wall-2')

    // Newly added cabinet and wall must be deselected
    expect(selection.selectedTowerId).toBeNull()
    expect(selection.selectedWallId).toBeNull()
  })

  it('adds cabinet to the selected cabinet\'s wall and deselects all', async () => {
    const { closet, selection } = setupStores()

    // Pre-populate with a tower on wall-3 with valid catalogId
    closet.towers = [
      {
        id: 'tower-existing',
        catalogId: 101,
        label: 'Existing Tower',
        wallId: 'wall-3',
        width: 24,
        depth: 16,
        height: 84,
        doorMode: 'without_doors',
        categoryCode: 'CAS',
        categoryName: 'Shelves',
      } as any,
    ]

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

    // Select existing tower on wall-3
    selection.selectTower('tower-existing')
    expect(selection.selectedWallId).toBeNull()
    expect(selection.selectedTowerId).toBe('tower-existing')

    // Click category card
    const categoryCard = wrapper.find('.category-card')
    expect(categoryCard.text()).toContain('Shelves')
    await categoryCard.trigger('click')
    await nextTick()

    // Should add new tower to wall-3
    expect(closet.towers.length).toBe(2)
    expect(closet.towers[1].wallId).toBe('wall-3')

    // Selected cabinet and newly added cabinet must both be deselected
    expect(selection.selectedTowerId).toBeNull()
    expect(selection.selectedWallId).toBeNull()
  })

  it('adds cabinet to the opened elevation view wall and deselects cabinet', async () => {
    const { closet, selection } = setupStores()

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

    // Open elevation view
    const elevationBtn = wrapper.find('.elevation-open-btn')
    expect(elevationBtn.exists()).toBe(true)
    await elevationBtn.trigger('click')
    await nextTick()

    // Simulate FloorPlan emitting wallChange to wall-4
    const floorPlanComponent = wrapper.findComponent(FloorPlan)
    expect(floorPlanComponent.exists()).toBe(true)
    floorPlanComponent.vm.$emit('wallChange', 'wall-4')
    await nextTick()

    // Click category card in elevation view
    const categoryCard = wrapper.find('.category-card')
    await categoryCard.trigger('click')
    await nextTick()

    // Should add tower to wall-4, without showing warning
    expect(wrapper.text()).not.toContain('Select a wall or a cabinet')
    expect(closet.towers.length).toBe(1)
    expect(closet.towers[0].wallId).toBe('wall-4')

    // Deselected
    expect(selection.selectedTowerId).toBeNull()
    expect(selection.selectedWallId).toBeNull()
  })

  it('adds new cabinets sequentially in free area of the wall rather than centering at 0.5', async () => {
    const { closet, selection } = setupStores()

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

    // Select wall-1 (length = 100)
    selection.selectWall('wall-1')

    const categoryCard = wrapper.find('.category-card')
    // Add first cabinet (Shelves, width = 12)
    await categoryCard.trigger('click')
    await nextTick()

    expect(closet.towers.length).toBe(1)
    expect(closet.towers[0].wallId).toBe('wall-1')
    expect(closet.towers[0].width).toBe(12)
    // Placed in free space starting at 0: center = 6 -> positionAlongWall = 0.06
    expect(closet.towers[0].positionAlongWall).toBeCloseTo(0.06, 3)

    // Select wall-1 again to add a second cabinet
    selection.selectWall('wall-1')
    await categoryCard.trigger('click')
    await nextTick()

    expect(closet.towers.length).toBe(2)
    expect(closet.towers[1].wallId).toBe('wall-1')
    expect(closet.towers[1].width).toBe(12)
    // Placed immediately adjacent in free space [12, 100]: center = 18 -> positionAlongWall = 0.18
    expect(closet.towers[1].positionAlongWall).toBeCloseTo(0.18, 3)
  })

  it('adjusts cabinet width to available space when free space is less than cabinet default width', async () => {
    const { closet, selection } = setupStores()

    // Add a wide existing cabinet on wall-1 that leaves 8" free space at the end
    // Wall 1 length is 100", existing cabinet takes [0, 92]
    closet.towers = [
      {
        id: 'tower-1',
        catalogId: 101,
        label: 'Shelves 1',
        wallId: 'wall-1',
        width: 92,
        depth: 16,
        height: 84,
        doorMode: 'without_doors',
        categoryCode: 'CAS',
        categoryName: 'Shelves',
        positionAlongWall: 46 / 100, // center = 46, interval [0, 92], remaining = 8"
      } as any,
    ]

    // Set catalog category with default width 12, minW 6
    closet.catalogCategories = [
      {
        doorMode: 'without_doors',
        categoryCode: 'CAS',
        categoryName: 'Shelves',
        catalogs: [
          {
            catalogId: 101,
            code: 'CAS128416',
            depth: 16,
            minW: 6,
            maxW: 48,
            minH: 72,
            maxH: 96,
            minD: 16,
            maxD: 16,
            cabinets: [],
          },
        ],
      } as any,
    ]
    setActiveCategories(closet.catalogCategories)

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

    selection.selectWall('wall-1')
    const categoryCard = wrapper.find('.category-card')
    await categoryCard.trigger('click')
    await nextTick()

    // Second cabinet should be added with adjusted width = 8 (since remaining space is 8 < default 12, but >= minW 6)
    expect(closet.towers.length).toBe(2)
    const addedTower = closet.towers[1]
    expect(addedTower.wallId).toBe('wall-1')
    expect(addedTower.width).toBeCloseTo(8, 2)
    // Placed in [92, 100]: center = 96 -> positionAlongWall = 0.96
    expect(addedTower.positionAlongWall).toBeCloseTo(0.96, 3)
  })

  it('shows "Not enough space" popup and does not add cabinet when free space is less than minimum cabinet width', async () => {
    const { closet, selection } = setupStores()

    // Add existing cabinet that consumes almost the entire wall, leaving only 6"
    closet.towers = [
      {
        id: 'tower-1',
        catalogId: 101,
        label: 'Shelves 1',
        wallId: 'wall-1',
        width: 94,
        depth: 16,
        height: 84,
        doorMode: 'without_doors',
        categoryCode: 'CAS',
        categoryName: 'Shelves',
        positionAlongWall: 47 / 100, // center = 47, interval [0, 94], remaining = 6"
      } as any,
    ]

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

    selection.selectWall('wall-1')
    const categoryCard = wrapper.find('.category-card')
    await categoryCard.trigger('click')
    await nextTick()

    // Should NOT add any new cabinet (remains 1)
    expect(closet.towers.length).toBe(1)

    // Should show popup with "Not enough space"
    expect(wrapper.text()).toContain('Not enough space')

    // Click OK to dismiss
    const okBtn = wrapper.findAll('button').find((b) => b.text() === 'OK')
    expect(okBtn).toBeTruthy()
    await okBtn!.trigger('click')
    await nextTick()

    expect(wrapper.text()).not.toContain('Not enough space')
  })

  it('adjusts position and prevents overlap when increasing cabinet width against wall edge or other cabinets', async () => {
    const { closet, selection } = setupStores()

    // Tower 1 (Drawers) at left boundary: width = 10, center = 5 (interval [0, 10])
    // Tower 2 at interval [22.3125, 34.3125] (center = 28.3125, width = 12)
    closet.towers = [
      {
        id: 'tower-1',
        catalogId: 101,
        label: 'Drawers 8',
        wallId: 'wall-1',
        width: 10,
        depth: 15,
        height: 84,
        doorMode: 'without_doors',
        categoryCode: 'CAS',
        categoryName: 'Shelves',
        accessories: [],
        positionAlongWall: 5 / 100, // [0, 10]
      } as any,
      {
        id: 'tower-2',
        catalogId: 101,
        label: 'Shelves 2',
        wallId: 'wall-1',
        width: 12,
        depth: 15,
        height: 84,
        doorMode: 'without_doors',
        categoryCode: 'CAS',
        categoryName: 'Shelves',
        accessories: [],
        positionAlongWall: 28.3125 / 100, // [22.3125, 34.3125]
      } as any,
    ]

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

    // Select tower-1
    selection.selectTower('tower-1')
    await nextTick()

    // Find the Width input field
    const widthInput = wrapper.findAll('.dimension-control input').at(0)
    expect(widthInput).toBeTruthy()
    expect(widthInput!.element).toBeInstanceOf(HTMLInputElement)

    // User increases width from 10 to 22.3125
    await widthInput!.setValue('22.3125')
    await widthInput!.trigger('change')
    await nextTick()

    const tower1 = closet.towers.find((t) => t.id === 'tower-1')!
    expect(tower1.width).toBeCloseTo(22.3125, 3)
    // Left edge must stay at 0 (not negative/overlapping left edge!)
    // Center must shift to 11.15625 -> positionAlongWall = 0.1115625
    expect(tower1.positionAlongWall).toBeCloseTo(0.1115625, 4)

    const leftEdge = (tower1.positionAlongWall! * 100) - (tower1.width / 2)
    const rightEdge = (tower1.positionAlongWall! * 100) + (tower1.width / 2)
    expect(leftEdge).toBeCloseTo(0, 3)
    expect(rightEdge).toBeCloseTo(22.3125, 3)

    // Right edge must not overlap tower-2 (which starts at 22.3125)
    expect(rightEdge).toBeLessThanOrEqual(22.3125 + 0.001)

    // If user tries to increase width further to 30 (exceeding available space 22.3125)
    await widthInput!.setValue('30')
    await widthInput!.trigger('change')
    await nextTick()

    // Width should be clamped to 22.3125
    expect(tower1.width).toBeCloseTo(22.3125, 3)
    expect(tower1.positionAlongWall).toBeCloseTo(0.1115625, 4)
  })

  it('calculates the blocked area in the elevation view based on Total Depth when cabinet is a corner cabinet', async () => {
    const { room, closet, selection } = setupStores()

    // Add a corner cabinet on Wall 1 (start connects to Wall 4 at [0, 0])
    // Depth: 15", Total Depth: 23" (cornerBridgeWidth: 8")
    closet.towers = [
      {
        id: 'corner-tower-1',
        name: 'Shelves 1',
        wallId: 'wall-1',
        width: 30,
        height: 84,
        depth: 15,
        elevation: 0,
        outset: 0,
        isCorner: true,
        cornerPosition: 'right',
        cornerBridgeWidth: 8,
        cornerBridgeDepth: 15,
        positionAlongWall: 0.15, // center at 15", left edge at 0" (at corner with wall-4)
        accessories: [],
      } as any,
    ]

    // Mount FloorPlan with elevation open for Wall 4
    selection.selectWall('wall-4')

    const wrapper = mount(FloorPlan, {
      attachTo: document.body,
      props: {
        elevationOnly: true,
        initialWallId: 'wall-4',
      },
      global: {
        stubs: {
          TopToolbar: true,
          FooterBar: true,
        },
      },
    })

    await nextTick()

    // Verify adjacent blocked zone in elevation view
    const blockedZone = wrapper.find('.adj-tower-blocked-zone')
    expect(blockedZone.exists()).toBe(true)

    // The text inside the blocked zone should reflect Total Depth (23")
    expect(blockedZone.text()).toContain('Blocked')
    expect(blockedZone.text()).toContain('23.0000"')
  })

  it('allows calculation in dimension input fields based on "+" and "-" between 2 numbers', async () => {
    const { room, closet, selection } = setupStores()

    closet.towers = [
      {
        id: 'tower-calc-1',
        name: 'Shelves 1',
        wallId: 'wall-1',
        partType: 'filler',
        width: 6,
        height: 84,
        depth: 15,
        elevation: 0,
        outset: 0,
        positionAlongWall: 0.5,
        accessories: [],
      } as any,
    ]

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
    selection.selectTower('tower-calc-1')
    await nextTick()

    const widthInput = wrapper.findAll('.dimension-control input').at(0)
    expect(widthInput).toBeTruthy()
    expect(widthInput!.element).toBeInstanceOf(HTMLInputElement)

    // User types "4+4" and presses Enter
    await widthInput!.setValue('4+4')
    await widthInput!.trigger('keyup.enter')
    await nextTick()

    const tower = closet.towers.find((t) => t.id === 'tower-calc-1')!
    expect(tower.width).toBe(8)
    expect((widthInput!.element as HTMLInputElement).value).toBe('8.0000')

    // User types "10-2" and triggers change
    await widthInput!.setValue('10-2')
    await widthInput!.trigger('change')
    await nextTick()

    expect(tower.width).toBe(8)
    expect((widthInput!.element as HTMLInputElement).value).toBe('8.0000')

    // User types "12.5 + 3.5" and triggers blur
    await widthInput!.setValue('12.5 + 3.5')
    await widthInput!.trigger('blur')
    await nextTick()

    expect(tower.width).toBe(16)
    expect((widthInput!.element as HTMLInputElement).value).toBe('16.0000')
  })
})
