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
})
