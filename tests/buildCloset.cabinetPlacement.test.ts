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
})
