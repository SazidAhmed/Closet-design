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

    wrapper.unmount()
  })
})
