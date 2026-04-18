// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import FloorPlan from '../src/features/closet/views/FloorPlan.vue'
import { useRoomStore } from '../src/stores/useRoomStore'

const CM_PER_INCH = 2.54

function roundToTenth(v: number): number {
  return Math.round(v * 10) / 10
}

function findButtonByText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper
    .findAll('button')
    .find((button) => button.text().includes(text))
}

describe('FloorPlan add item selection behavior', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('auto-selects newly added door and window so size controls are visible', async () => {
    setActivePinia(createPinia())
    const roomStore = useRoomStore()

    const wrapper = mount(FloorPlan, {
      attachTo: document.body,
      global: {
        stubs: {
          TopToolbar: true,
          FooterBar: true,
        },
      },
    })

    const addDoorButton = findButtonByText(wrapper, 'Add Door')
    expect(addDoorButton).toBeTruthy()

    await addDoorButton!.trigger('click')
    await nextTick()

    expect(roomStore.items.length).toBe(1)
    expect(wrapper.text()).toContain('Selected Door')
    expect(wrapper.text()).toContain('Width')
    expect(wrapper.text()).toContain('Height')
    expect(wrapper.text()).toContain('Left Position')
    expect(wrapper.text()).toContain('Right Position')
    expect(wrapper.text()).toContain('Elevation')
    expect(roomStore.items[0]?.type).toBe('wall_opening')
    expect(roomStore.items[0]?.width).toBeCloseTo(27 * 2.54, 5)
    expect(roomStore.items[0]?.height).toBeCloseTo(72 * 2.54, 5)
    const door = roomStore.items[0]!
    const doorWall = roomStore.walls.find((wall) => wall.id === door.wallId)!
    const doorWallLengthIn = doorWall.length / CM_PER_INCH
    const doorWidthIn = door.width / CM_PER_INCH

    expect(door.leftPosition).toBe(roundToTenth((doorWallLengthIn - doorWidthIn) / 2))
    expect(door.rightPosition).toBe(roundToTenth((doorWallLengthIn - doorWidthIn) / 2))
    expect(roomStore.items[0]?.elevation).toBe(0) // Door default elevation is 0

    const firstItemId = door.id
    roomStore.moveItem(firstItemId, 0.2)
    await nextTick()

    const movedDoor = roomStore.items[0]!
    const movedCenterIn = 0.2 * doorWallLengthIn
    expect(movedDoor.leftPosition).toBe(roundToTenth(movedCenterIn - doorWidthIn / 2))
    expect(movedDoor.rightPosition).toBe(
      roundToTenth(doorWallLengthIn - (movedCenterIn + doorWidthIn / 2)),
    )

    roomStore.moveItem(firstItemId, 0)
    await nextTick()

    const startClampedDoor = roomStore.items[0]!
    expect(startClampedDoor.leftPosition).toBe(0)
    expect(startClampedDoor.rightPosition).toBe(roundToTenth(doorWallLengthIn - doorWidthIn))

    roomStore.moveItem(firstItemId, 1)
    await nextTick()

    const endClampedDoor = roomStore.items[0]!
    expect(endClampedDoor.leftPosition).toBe(roundToTenth(doorWallLengthIn - doorWidthIn))
    expect(endClampedDoor.rightPosition).toBe(0)

    const leftPositionInput = wrapper.find('[data-testid="left-position-input"]')
    expect(leftPositionInput.exists()).toBe(true)
    await leftPositionInput.setValue('10')
    await nextTick()

    const leftEditedDoor = roomStore.items[0]!
    expect(leftEditedDoor.leftPosition).toBe(10)
    expect(leftEditedDoor.rightPosition).toBe(roundToTenth(doorWallLengthIn - (10 + doorWidthIn)))

    const rightPositionInput = wrapper.find('[data-testid="right-position-input"]')
    expect(rightPositionInput.exists()).toBe(true)
    await rightPositionInput.setValue('20')
    await nextTick()

    const rightEditedDoor = roomStore.items[0]!
    expect(rightEditedDoor.rightPosition).toBe(20)
    expect(rightEditedDoor.leftPosition).toBe(roundToTenth(doorWallLengthIn - (20 + doorWidthIn)))

    const addWindowButton = findButtonByText(wrapper, 'Add Window')
    expect(addWindowButton).toBeTruthy()

    await addWindowButton!.trigger('click')
    await nextTick()

    expect(roomStore.items.length).toBe(2)
    expect(wrapper.text()).toContain('Selected Window')
    expect(roomStore.items[1]?.type).toBe('window')
    expect(roomStore.items[1]?.width).toBeCloseTo(36 * 2.54, 5)
    expect(roomStore.items[1]?.height).toBeCloseTo(42 * 2.54, 5)
    const window = roomStore.items[1]!
    const windowWall = roomStore.walls.find((wall) => wall.id === window.wallId)!
    const windowWallLengthIn = windowWall.length / CM_PER_INCH
    const windowWidthIn = window.width / CM_PER_INCH

    expect(window.leftPosition).toBe(roundToTenth((windowWallLengthIn - windowWidthIn) / 2))
    expect(window.rightPosition).toBe(roundToTenth((windowWallLengthIn - windowWidthIn) / 2))
    expect(roomStore.items[1]?.elevation).toBe(42) // Window default elevation is 42

    roomStore.moveItem(window.id, 0)
    await nextTick()

    const startClampedWindow = roomStore.items[1]!
    expect(startClampedWindow.leftPosition).toBe(0)
    expect(startClampedWindow.rightPosition).toBe(roundToTenth(windowWallLengthIn - windowWidthIn))

    roomStore.moveItem(window.id, 1)
    await nextTick()

    const endClampedWindow = roomStore.items[1]!
    expect(endClampedWindow.leftPosition).toBe(roundToTenth(windowWallLengthIn - windowWidthIn))
    expect(endClampedWindow.rightPosition).toBe(0)

    wrapper.unmount()
  })

  it('opens and closes wall elevation overlay from right wall panel without losing floor plan', async () => {
    setActivePinia(createPinia())
    const roomStore = useRoomStore()

    const wrapper = mount(FloorPlan, {
      attachTo: document.body,
      global: {
        stubs: {
          TopToolbar: true,
          FooterBar: true,
        },
      },
    })

    const selectedWall = roomStore.walls[0]!
    const otherWall = roomStore.walls[1]!

    roomStore.addItem({
      type: 'wall_opening',
      category: 'door',
      wallId: selectedWall.id,
      positionAlongWall: 0.35,
      width: 27 * CM_PER_INCH,
      height: 72 * CM_PER_INCH,
      leftPosition: 0,
      rightPosition: 0,
      elevation: 0,
    })

    roomStore.addItem({
      type: 'window',
      category: 'wall_decorator',
      wallId: otherWall.id,
      positionAlongWall: 0.65,
      width: 36 * CM_PER_INCH,
      height: 42 * CM_PER_INCH,
      leftPosition: 0,
      rightPosition: 0,
      elevation: 42,
    })
    await nextTick()

    expect(wrapper.find('[data-testid="open-elevation-btn"]').exists()).toBe(false)

    const wallSegments = wrapper.findAll('polygon.wall-segment')
    expect(wallSegments.length).toBeGreaterThan(0)
    await wallSegments[0]!.trigger('click')
    await nextTick()

    const elevationButton = wrapper.find('[data-testid="open-elevation-btn"]')
    expect(elevationButton.exists()).toBe(true)
    await elevationButton.trigger('click')
    await nextTick()

    const overlay = wrapper.find('[data-testid="elevation-overlay"]')
    expect(overlay.exists()).toBe(true)
    expect(wrapper.find('.sidebar.sidebar-left').exists()).toBe(true)
    expect(wrapper.find('.sidebar.sidebar-right').exists()).toBe(true)

    const elevationItems = wrapper.findAll('[data-testid^="elevation-item-"]')
    expect(elevationItems.length).toBe(1)

    expect(wrapper.findAll('.elevation-handle').length).toBe(0)
    await elevationItems[0]!.trigger('click')
    await nextTick()
    expect(wrapper.findAll('.elevation-handle').length).toBe(3)

    const drawCanvas = wrapper.find('svg.draw-canvas')
    expect(drawCanvas.attributes('style') ?? '').toContain('display: none')

    const closeButton = wrapper.find('[data-testid="close-elevation-btn"]')
    expect(closeButton.exists()).toBe(true)
    await closeButton.trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="elevation-overlay"]').exists()).toBe(false)
    expect(drawCanvas.attributes('style') ?? '').not.toContain('display: none')

    wrapper.unmount()
  })
})
