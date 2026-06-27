// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import FloorPlan from '../src/features/closet/views/FloorPlan.vue'
import { useRoomStore } from '../src/stores/useRoomStore'
import { useClosetStore } from '../src/stores/useClosetStore'

const CM_PER_INCH = 2.54

function roundToTenth(v: number): number {
  return Math.round(v * 10) / 10
}

function findButtonByText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper
    .findAll('button')
    .find((button) => button.text().includes(text))
}

function installSvgPointerPolyfill() {
  const proto = SVGSVGElement.prototype as unknown as {
    createSVGPoint?: () => {
      x: number
      y: number
      matrixTransform: (_matrix: unknown) => { x: number; y: number }
    }
    getScreenCTM?: () => { inverse: () => unknown }
  }

  if (!proto.createSVGPoint) {
    proto.createSVGPoint = function () {
      return {
        x: 0,
        y: 0,
        matrixTransform(_matrix: unknown) {
          return { x: this.x, y: this.y }
        },
      }
    }
  }

  if (!proto.getScreenCTM) {
    proto.getScreenCTM = function () {
      return {
        inverse() {
          return {}
        },
      }
    }
  }
}

function createPointerLikeEvent(type: string, x: number, y: number, pointerId = 1): Event {
  const evt = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(evt, 'clientX', { value: x })
  Object.defineProperty(evt, 'clientY', { value: y })
  Object.defineProperty(evt, 'pointerId', { value: pointerId })
  return evt
}

function dispatchPointerLikeEvent(type: 'pointermove' | 'pointerup', x: number, y: number) {
  const evt = createPointerLikeEvent(type, x, y)
  document.dispatchEvent(evt)
}

function dispatchPointerDown(target: Element, x: number, y: number, pointerId: number) {
  target.dispatchEvent(createPointerLikeEvent('pointerdown', x, y, pointerId))
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

    expect(door.leftPosition).toBeCloseTo((doorWallLengthIn - doorWidthIn) / 2, 2)
    expect(door.rightPosition).toBeCloseTo((doorWallLengthIn - doorWidthIn) / 2, 2)
    expect(roomStore.items[0]?.elevation).toBe(0) // Door default elevation is 0

    const firstItemId = door.id
    roomStore.moveItem(firstItemId, 0.2)
    await nextTick()

    const movedDoor = roomStore.items[0]!
    const movedCenterIn = 0.2 * doorWallLengthIn
    expect(movedDoor.leftPosition).toBeCloseTo(movedCenterIn - doorWidthIn / 2, 2)
    expect(movedDoor.rightPosition).toBeCloseTo(
      doorWallLengthIn - (movedCenterIn + doorWidthIn / 2), 2,
    )

    roomStore.moveItem(firstItemId, 0)
    await nextTick()

    const startClampedDoor = roomStore.items[0]!
    expect(startClampedDoor.leftPosition).toBe(0)
    expect(startClampedDoor.rightPosition).toBeCloseTo(doorWallLengthIn - doorWidthIn, 2)

    roomStore.moveItem(firstItemId, 1)
    await nextTick()

    const endClampedDoor = roomStore.items[0]!
    expect(endClampedDoor.leftPosition).toBeCloseTo(doorWallLengthIn - doorWidthIn, 2)
    expect(endClampedDoor.rightPosition).toBe(0)

    const leftPositionInput = wrapper.find('[data-testid="left-position-input"]')
    expect(leftPositionInput.exists()).toBe(true)
    await leftPositionInput.setValue('10')
    await nextTick()

    const leftEditedDoor = roomStore.items[0]!
    expect(leftEditedDoor.leftPosition).toBe(10)
    expect(leftEditedDoor.rightPosition).toBeCloseTo(doorWallLengthIn - (10 + doorWidthIn), 2)

    const rightPositionInput = wrapper.find('[data-testid="right-position-input"]')
    expect(rightPositionInput.exists()).toBe(true)
    await rightPositionInput.setValue('20')
    await nextTick()

    const rightEditedDoor = roomStore.items[0]!
    expect(rightEditedDoor.rightPosition).toBe(20)
    expect(rightEditedDoor.leftPosition).toBeCloseTo(doorWallLengthIn - (20 + doorWidthIn), 2)

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

    expect(window.leftPosition).toBeCloseTo((windowWallLengthIn - windowWidthIn) / 2, 2)
    expect(window.rightPosition).toBeCloseTo((windowWallLengthIn - windowWidthIn) / 2, 2)
    expect(roomStore.items[1]?.elevation).toBe(42) // Window default elevation is 42

    roomStore.moveItem(window.id, 0)
    await nextTick()

    const startClampedWindow = roomStore.items[1]!
    expect(startClampedWindow.leftPosition).toBe(0)
    expect(startClampedWindow.rightPosition).toBeCloseTo(windowWallLengthIn - windowWidthIn, 2)

    roomStore.moveItem(window.id, 1)
    await nextTick()

    const endClampedWindow = roomStore.items[1]!
    expect(endClampedWindow.leftPosition).toBeCloseTo(windowWallLengthIn - windowWidthIn, 2)
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
    expect(wrapper.find('[data-testid="elevation-measurements-panel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Opening Measurements')

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

  it('adds a closet unit in elevation and shows ordering measurements', async () => {
    setActivePinia(createPinia())
    const closetStore = useClosetStore()
    closetStore.setCabinetDimensions({ width: 12 * CM_PER_INCH, height: 80 * CM_PER_INCH })

    const wrapper = mount(FloorPlan, {
      attachTo: document.body,
      global: {
        stubs: {
          TopToolbar: true,
          FooterBar: true,
        },
      },
    })

    const wallSegments = wrapper.findAll('polygon.wall-segment')
    expect(wallSegments.length).toBeGreaterThan(0)
    await wallSegments[0]!.trigger('click')
    await nextTick()

    const addClosetButton = wrapper.find('[data-testid="add-elevation-closet-btn"]')
    expect(addClosetButton.exists()).toBe(true)
    expect(addClosetButton.attributes('disabled')).toBeUndefined()
    await addClosetButton.trigger('click')
    await nextTick()

    const elevationButton = wrapper.find('[data-testid="open-elevation-btn"]')
    expect(elevationButton.exists()).toBe(true)
    await elevationButton.trigger('click')
    await nextTick()

    const closets = wrapper.findAll('[data-testid^="elevation-closet-"]')
    expect(closets.length).toBe(1)
    expect(wrapper.findAll('.elevation-connected-band').length).toBe(2)
    expect(wrapper.text()).toContain('Order Measurements')

    wrapper.unmount()
  })

  it('blocks closet drag and resize when movement would overlap a door opening', async () => {
    installSvgPointerPolyfill()
    setActivePinia(createPinia())
    const roomStore = useRoomStore()
    const closetStore = useClosetStore()

    closetStore.setCabinetDimensions({ width: 12 * CM_PER_INCH, height: 80 * CM_PER_INCH })

    const wrapper = mount(FloorPlan, {
      attachTo: document.body,
      global: {
        stubs: {
          TopToolbar: true,
          FooterBar: true,
        },
      },
    })

    const wallSegments = wrapper.findAll('polygon.wall-segment')
    expect(wallSegments.length).toBeGreaterThan(0)
    await wallSegments[0]!.trigger('click')
    await nextTick()

    const selectedWall = roomStore.walls[0]!
    roomStore.addItem({
      type: 'wall_opening',
      category: 'door',
      wallId: selectedWall.id,
      positionAlongWall: 0.5,
      width: 14 * CM_PER_INCH,
      height: 80 * CM_PER_INCH,
      leftPosition: 0,
      rightPosition: 0,
      elevation: 0,
    })
    await nextTick()

    const addClosetButton = wrapper.find('[data-testid="add-elevation-closet-btn"]')
    expect(addClosetButton.exists()).toBe(true)
    await addClosetButton.trigger('click')
    await nextTick()

    const elevationButton = wrapper.find('[data-testid="open-elevation-btn"]')
    await elevationButton.trigger('click')
    await nextTick()

    const closetRect = wrapper.find('[data-testid^="elevation-closet-"]')
    expect(closetRect.exists()).toBe(true)
    const openingRect = wrapper.find('[data-testid^="elevation-item-"]')
    expect(openingRect.exists()).toBe(true)

    const startX = Number(closetRect.attributes('x'))
    const startY = Number(closetRect.attributes('y'))
    const startWidth = Number(closetRect.attributes('width'))
    const openingX = Number(openingRect.attributes('x'))
    const openingY = Number(openingRect.attributes('y'))

    dispatchPointerDown(closetRect.element, startX + 2, startY + 2, 1)
    await nextTick()

    // Move toward middle where door opening sits; invalid overlap should be rejected.
    dispatchPointerLikeEvent('pointermove', openingX + 2, openingY + 2)
    dispatchPointerLikeEvent('pointerup', openingX + 2, openingY + 2)
    await nextTick()

    const afterBlockedMove = wrapper.find('[data-testid^="elevation-closet-"]')
    expect(Number(afterBlockedMove.attributes('x'))).toBe(startX)

    await afterBlockedMove.trigger('click')
    await nextTick()

    const widthHandle = wrapper.find('.elevation-closet-handle-width')
    expect(widthHandle.exists()).toBe(true)
    const handleX = Number(widthHandle.attributes('cx'))
    const handleY = Number(widthHandle.attributes('cy'))

    dispatchPointerDown(widthHandle.element, handleX, handleY, 2)
    await nextTick()

    // Expanding width into the opening is invalid and should be rejected.
    dispatchPointerLikeEvent('pointermove', openingX + startWidth, handleY)
    dispatchPointerLikeEvent('pointerup', openingX + startWidth, handleY)
    await nextTick()

    const afterBlockedResize = wrapper.find('[data-testid^="elevation-closet-"]')
    expect(Number(afterBlockedResize.attributes('width'))).toBe(startWidth)

    wrapper.unmount()
  })

  it('keeps door and closet inside connected-wall side boundaries in elevation', async () => {
    installSvgPointerPolyfill()
    setActivePinia(createPinia())
    const roomStore = useRoomStore()
    const closetStore = useClosetStore()

    closetStore.setCabinetDimensions({ width: 12 * CM_PER_INCH, height: 80 * CM_PER_INCH })

    const wrapper = mount(FloorPlan, {
      attachTo: document.body,
      global: {
        stubs: {
          TopToolbar: true,
          FooterBar: true,
        },
      },
    })

    const wallSegments = wrapper.findAll('polygon.wall-segment')
    expect(wallSegments.length).toBeGreaterThan(0)
    await wallSegments[0]!.trigger('click')
    await nextTick()

    const selectedWall = roomStore.walls[0]!
    roomStore.addItem({
      type: 'wall_opening',
      category: 'door',
      wallId: selectedWall.id,
      positionAlongWall: 0.5,
      width: 27 * CM_PER_INCH,
      height: 72 * CM_PER_INCH,
      leftPosition: 0,
      rightPosition: 0,
      elevation: 0,
    })
    await nextTick()

    const addClosetButton = wrapper.find('[data-testid="add-elevation-closet-btn"]')
    expect(addClosetButton.exists()).toBe(true)
    await addClosetButton.trigger('click')
    await nextTick()

    const elevationButton = wrapper.find('[data-testid="open-elevation-btn"]')
    expect(elevationButton.exists()).toBe(true)
    await elevationButton.trigger('click')
    await nextTick()

    const connectedBands = wrapper.findAll('.elevation-connected-band')
    expect(connectedBands.length).toBeGreaterThanOrEqual(1)
    const leftBand = connectedBands[0]!
    const leftBoundaryX = Number(leftBand.attributes('x')) + Number(leftBand.attributes('width'))

    const doorRect = wrapper.find('[data-testid^="elevation-item-"]')
    expect(doorRect.exists()).toBe(true)
    const doorStartY = Number(doorRect.attributes('y'))

    dispatchPointerDown(doorRect.element, Number(doorRect.attributes('x')) + 4, doorStartY + 4, 21)
    await nextTick()

    dispatchPointerLikeEvent('pointermove', leftBoundaryX - 200, doorStartY + 4)
    dispatchPointerLikeEvent('pointerup', leftBoundaryX - 200, doorStartY + 4)
    await nextTick()

    const doorAfterMove = wrapper.find('[data-testid^="elevation-item-"]')
    expect(Number(doorAfterMove.attributes('x'))).toBeGreaterThanOrEqual(leftBoundaryX - 0.5)

    const closetRect = wrapper.find('[data-testid^="elevation-closet-"]')
    expect(closetRect.exists()).toBe(true)
    const closetStartY = Number(closetRect.attributes('y'))

    dispatchPointerDown(
      closetRect.element,
      Number(closetRect.attributes('x')) + 4,
      closetStartY + 4,
      22,
    )
    await nextTick()

    dispatchPointerLikeEvent('pointermove', leftBoundaryX - 240, closetStartY + 4)
    dispatchPointerLikeEvent('pointerup', leftBoundaryX - 240, closetStartY + 4)
    await nextTick()

    const closetAfterMove = wrapper.find('[data-testid^="elevation-closet-"]')
    expect(Number(closetAfterMove.attributes('x'))).toBeGreaterThanOrEqual(leftBoundaryX - 0.5)

    wrapper.unmount()
  })

  it('allows closet drag and resize when target area does not overlap openings', async () => {
    installSvgPointerPolyfill()
    setActivePinia(createPinia())
    const roomStore = useRoomStore()
    const closetStore = useClosetStore()

    closetStore.setCabinetDimensions({ width: 12 * CM_PER_INCH, height: 80 * CM_PER_INCH })

    const wrapper = mount(FloorPlan, {
      attachTo: document.body,
      global: {
        stubs: {
          TopToolbar: true,
          FooterBar: true,
        },
      },
    })

    const wallSegments = wrapper.findAll('polygon.wall-segment')
    expect(wallSegments.length).toBeGreaterThan(0)
    await wallSegments[0]!.trigger('click')
    await nextTick()

    const selectedWall = roomStore.walls[0]!
    roomStore.addItem({
      type: 'wall_opening',
      category: 'door',
      wallId: selectedWall.id,
      positionAlongWall: 0.5,
      width: 14 * CM_PER_INCH,
      height: 80 * CM_PER_INCH,
      leftPosition: 0,
      rightPosition: 0,
      elevation: 0,
    })
    await nextTick()

    const addClosetButton = wrapper.find('[data-testid="add-elevation-closet-btn"]')
    expect(addClosetButton.exists()).toBe(true)
    await addClosetButton.trigger('click')
    await nextTick()

    const elevationButton = wrapper.find('[data-testid="open-elevation-btn"]')
    await elevationButton.trigger('click')
    await nextTick()

    const closetRect = wrapper.find('[data-testid^="elevation-closet-"]')
    expect(closetRect.exists()).toBe(true)

    const startX = Number(closetRect.attributes('x'))
    const startY = Number(closetRect.attributes('y'))
    const startWidth = Number(closetRect.attributes('width'))

    dispatchPointerDown(closetRect.element, startX + 2, startY + 2, 11)
    await nextTick()

    // Move slightly right but still outside the central opening area.
    dispatchPointerLikeEvent('pointermove', startX + 18, startY + 2)
    dispatchPointerLikeEvent('pointerup', startX + 18, startY + 2)
    await nextTick()

    const afterMove = wrapper.find('[data-testid^="elevation-closet-"]')
    const movedX = Number(afterMove.attributes('x'))
    expect(movedX).toBeGreaterThan(startX)

    await afterMove.trigger('click')
    await nextTick()

    const widthHandle = wrapper.find('.elevation-closet-handle-width')
    expect(widthHandle.exists()).toBe(true)
    const handleX = Number(widthHandle.attributes('cx'))
    const handleY = Number(widthHandle.attributes('cy'))

    dispatchPointerDown(widthHandle.element, handleX, handleY, 12)
    await nextTick()

    // Small width increase in a valid area should be accepted.
    dispatchPointerLikeEvent('pointermove', handleX + 10, handleY)
    dispatchPointerLikeEvent('pointerup', handleX + 10, handleY)
    await nextTick()

    const afterResize = wrapper.find('[data-testid^="elevation-closet-"]')
    const resizedWidth = Number(afterResize.attributes('width'))
    expect(resizedWidth).toBeGreaterThan(startWidth)

    wrapper.unmount()
  })
})
