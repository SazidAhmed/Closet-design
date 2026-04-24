// @vitest-environment jsdom

import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import FloorPlan from '../src/features/closet/views/FloorPlan.vue'
import { useRoomStore } from '../src/stores/useRoomStore'
import type { Vec2, Wall } from '../src/features/closet/domain/types/room'

type WallSnapshot = Pick<Wall, 'id' | 'length' | 'position' | 'angle'>

const EPS = 1e-6

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function wallEndPoint(wall: WallSnapshot): Vec2 {
  return [
    wall.position[0] + Math.cos(wall.angle) * wall.length,
    wall.position[1] + Math.sin(wall.angle) * wall.length,
  ]
}

function snapshotWalls(walls: Wall[]): WallSnapshot[] {
  return walls.map((wall) => ({
    id: wall.id,
    length: wall.length,
    position: [wall.position[0], wall.position[1]],
    angle: wall.angle,
  }))
}

function polygonSignedArea(vertices: Vec2[]): number {
  let sum = 0
  for (let i = 0; i < vertices.length; i += 1) {
    const [x1, y1] = vertices[i]!
    const [x2, y2] = vertices[(i + 1) % vertices.length]!
    sum += x1 * y2 - x2 * y1
  }
  return sum / 2
}

function insideLeftPivot(walls: WallSnapshot[], selectedIndex: number): Vec2 {
  const vertices = walls.map((wall) => [wall.position[0], wall.position[1]] as Vec2)
  const signedArea = polygonSignedArea(vertices)
  const start = vertices[selectedIndex]!
  const end = vertices[(selectedIndex + 1) % vertices.length]!
  return signedArea >= 0 ? start : end
}

function expectVecClose(a: Vec2, b: Vec2, epsilon = EPS): void {
  expect(Math.abs(a[0] - b[0])).toBeLessThanOrEqual(epsilon)
  expect(Math.abs(a[1] - b[1])).toBeLessThanOrEqual(epsilon)
}

function setConcaveWall2Representative(store: ReturnType<typeof useRoomStore>) {
  const vertices: Vec2[] = [
    [0, -60],
    [140, -80],
    [120, -200],
    [320, -200],
    [320, -360],
    [0, -360],
  ]

  const walls: Wall[] = vertices.map((start, i) => {
    const end = vertices[(i + 1) % vertices.length]!
    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    return {
      id: `ui_concave_${i + 1}`,
      position: [start[0], start[1]],
      length: Math.hypot(dx, dy),
      angle: Math.atan2(dy, dx),
      hasCloset: i === 0,
      thickness: 6,
      label: String(i + 1),
      visible: true,
    }
  })

  store.setRoomFromWalls(walls)
}

function setOpenWall4BoundaryRepresentative(store: ReturnType<typeof useRoomStore>) {
  const vertices: Vec2[] = [
    [0, 0],
    [140, 0],
    [140, 100],
    [0, 100],
    [0, 40],
  ]

  const walls: Wall[] = vertices.slice(0, -1).map((start, i) => {
    const end = vertices[i + 1]!
    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    return {
      id: `ui_open_${i + 1}`,
      position: [start[0], start[1]],
      length: Math.hypot(dx, dy),
      angle: Math.atan2(dy, dx),
      hasCloset: i === 0,
      thickness: 6,
      label: String(i + 1),
      visible: true,
    }
  })

  store.setRoomFromWalls(walls)
}

function setTwoWallRightEndpointScenario(store: ReturnType<typeof useRoomStore>) {
  const walls: Wall[] = [
    {
      id: 'ui_right_endpoint_1',
      position: [0, 0],
      length: 140,
      angle: 0,
      hasCloset: true,
      thickness: 6,
      label: '1',
      visible: true,
    },
    {
      id: 'ui_right_endpoint_2',
      position: [140, 0],
      length: 100,
      angle: Math.PI / 2,
      hasCloset: false,
      thickness: 6,
      label: '2',
      visible: true,
    },
  ]

  store.setRoomFromWalls(walls)
}

function findButtonByText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper
    .findAll('button')
    .find((button) => button.text().includes(text))
}

function findLengthInput(wrapper: ReturnType<typeof mount>) {
  const rows = wrapper.findAll('.wall-props .prop-row')
  for (const row of rows) {
    const label = row.find('label')
    if (!label.exists()) continue
    if (label.text().trim() !== 'Length') continue
    const input = row.find('input')
    if (input.exists()) return input
  }
  return null
}

function findVertexDotByPosition(
  wrapper: ReturnType<typeof mount>,
  target: Vec2,
  tolerance = 1,
) {
  const dots = wrapper.findAll('circle.vertex-dot')
  return dots.find((dot) => {
    const cx = Number(dot.attributes('cx'))
    const cy = Number(dot.attributes('cy'))
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return false
    return Math.hypot(cx - target[0], cy - target[1]) <= tolerance
  })
}

async function beginDrawingSession(wrapper: ReturnType<typeof mount>) {
  const startDrawingButton =
    findButtonByText(wrapper, 'Custom Room') ??
    findButtonByText(wrapper, 'Clear Drawing') ??
    findButtonByText(wrapper, 'Start Drawing') ??
    findButtonByText(wrapper, 'Clear and Redraw')

  expect(startDrawingButton).toBeTruthy()
  await startDrawingButton!.trigger('click')
}

describe('FloorPlan wall selection + angle UI integration', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('locks draw viewBox on initial closed room so first rotation does not recenter', async () => {
    setActivePinia(createPinia())

    const wrapper = mount(FloorPlan, {
      attachTo: document.body,
      global: {
        stubs: {
          TopToolbar: true,
          FooterBar: true,
        },
      },
    })

    await nextTick()

    const wallPolygons = wrapper.findAll('polygon.wall-segment')
    expect(wallPolygons.length).toBeGreaterThanOrEqual(4)
    await wallPolygons[3]!.trigger('click')

    const svg = wrapper.find('svg.draw-canvas')
    expect(svg.exists()).toBe(true)
    const viewBoxBefore = svg.attributes('viewBox')
    expect(viewBoxBefore).toBeTruthy()

    const plusOneButton = wrapper.find('button[title="Rotate +1°"]')
    expect(plusOneButton.exists()).toBe(true)

    for (let i = 0; i < 8; i += 1) {
      await plusOneButton.trigger('click')
    }

    await nextTick()

    const viewBoxAfter = svg.attributes('viewBox')
    expect(viewBoxAfter).toBe(viewBoxBefore)

    wrapper.unmount()
  })

  it('keeps draw viewBox locked during repeated wall length updates in open topology', async () => {
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

    await beginDrawingSession(wrapper)
    setTwoWallRightEndpointScenario(roomStore)
    await nextTick()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    const wallPolygons = wrapper.findAll('polygon.wall-segment')
    expect(wallPolygons.length).toBe(2)
    await wallPolygons[0]!.trigger('click')

    const svg = wrapper.find('svg.draw-canvas')
    expect(svg.exists()).toBe(true)
    const viewBoxBefore = svg.attributes('viewBox')
    expect(viewBoxBefore).toBeTruthy()

    const lengthInput = findLengthInput(wrapper)
    expect(lengthInput).toBeTruthy()

    await lengthInput!.setValue('70')
    await nextTick()
    const viewBoxAfterFirst = svg.attributes('viewBox')
    expect(viewBoxAfterFirst).toBe(viewBoxBefore)

    await lengthInput!.setValue('85')
    await nextTick()
    const viewBoxAfterSecond = svg.attributes('viewBox')
    expect(viewBoxAfterSecond).toBe(viewBoxBefore)

    wrapper.unmount()
  })

  it('keeps wall-2 inner-notch pivot fixed across repeated angle button updates', async () => {
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

    await beginDrawingSession(wrapper)

    // Inject representative closed concave topology after draw session is active.
    setConcaveWall2Representative(roomStore)
    await nextTick()

    const before = snapshotWalls(roomStore.walls)
    expect(polygonSignedArea(before.map((w) => [w.position[0], w.position[1]]))).toBeLessThan(0)

    const selectedIdx = 1
    const pivotBefore = insideLeftPivot(before, selectedIdx)
    const notchBefore = wallEndPoint(before[selectedIdx]!)
    expectVecClose(pivotBefore, notchBefore)

    const wallPolygons = wrapper.findAll('polygon.wall-segment')
    expect(wallPolygons.length).toBe(before.length)
    await wallPolygons[selectedIdx]!.trigger('click')

    const plusOneButton = wrapper.find('button[title="Rotate +1°"]')
    expect(plusOneButton.exists()).toBe(true)

    for (let i = 0; i < 16; i += 1) {
      await plusOneButton.trigger('click')
    }

    const after = snapshotWalls(roomStore.walls)
    const pivotAfter = insideLeftPivot(after, selectedIdx)
    const notchAfter = wallEndPoint(after[selectedIdx]!)

    expectVecClose(pivotAfter, pivotBefore)
    expectVecClose(notchAfter, pivotAfter)

    wrapper.unmount()
  })

  it('inside-side area click selects wall-2 and keeps inner-notch pivot fixed', async () => {
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

    await beginDrawingSession(wrapper)

    setConcaveWall2Representative(roomStore)
    await nextTick()

    const before = snapshotWalls(roomStore.walls)
    const selectedIdx = 1
    const pivotBefore = insideLeftPivot(before, selectedIdx)
    const notchBefore = wallEndPoint(before[selectedIdx]!)
    expectVecClose(pivotBefore, notchBefore)

    const insideAreas = wrapper.findAll('polygon.inside-side-area:not(.preview)')
    expect(insideAreas.length).toBe(before.length)
    await insideAreas[selectedIdx]!.trigger('click')

    expect(wrapper.text()).toContain('Wall 2')

    const plusOneButton = wrapper.find('button[title="Rotate +1°"]')
    expect(plusOneButton.exists()).toBe(true)

    for (let i = 0; i < 16; i += 1) {
      await plusOneButton.trigger('click')
    }

    const after = snapshotWalls(roomStore.walls)
    const pivotAfter = insideLeftPivot(after, selectedIdx)
    const notchAfter = wallEndPoint(after[selectedIdx]!)

    expectVecClose(pivotAfter, pivotBefore)
    expectVecClose(notchAfter, pivotAfter)

    wrapper.unmount()
  })

  it('Add Wall is hidden when selected wall right endpoint is connected and continues from wall-2 right endpoint when free', async () => {
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

    await beginDrawingSession(wrapper)

    setTwoWallRightEndpointScenario(roomStore)
    await nextTick()

    const before = snapshotWalls(roomStore.walls)
    expect(before.length).toBe(2)

    // Stop active drawing so Add Wall action is available.
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    const wallPolygons = wrapper.findAll('polygon.wall-segment')
    expect(wallPolygons.length).toBe(2)

    // Wall 1 right endpoint is already connected to wall 2, so Add Wall stays hidden.
    await wallPolygons[0]!.trigger('click')

    const hiddenForWall1 = findButtonByText(wrapper, 'Add Wall')
    expect(hiddenForWall1).toBeUndefined()

    // Wall 2 right endpoint (opposite inside-left) is free, so Add Wall is available.
    await wallPolygons[1]!.trigger('click')

    const wall2Before = before[1]!
    const expectedStart = wallEndPoint(wall2Before)
    const freeBefore = findVertexDotByPosition(wrapper, expectedStart)
    expect(freeBefore).toBeTruthy()
    expect(freeBefore!.attributes('fill')).toBe('#22c55e')

    const addWallButton = findButtonByText(wrapper, 'Add Wall')
    expect(addWallButton).toBeTruthy()
    await addWallButton!.trigger('click')

    const svg = wrapper.find('svg.draw-canvas')
    expect(svg.exists()).toBe(true)
    const svgElement = svg.element as unknown as {
      createSVGPoint?: () => { x: number; y: number; matrixTransform: (m: unknown) => { x: number; y: number } }
      getScreenCTM?: () => unknown
    }
    svgElement.createSVGPoint = () => ({
      x: 0,
      y: 0,
      matrixTransform: () => ({ x: 0, y: 0 }),
    })
    svgElement.getScreenCTM = () => null

    await svg.trigger('click', { clientX: 0, clientY: 0 })
    await nextTick()

    const after = snapshotWalls(roomStore.walls)
    expect(after.length).toBe(3)

    const newWall = after[2]!

    expectVecClose(newWall.position, expectedStart)

    const connectedAfter = findVertexDotByPosition(wrapper, expectedStart)
    expect(connectedAfter).toBeTruthy()
    expect(connectedAfter!.attributes('fill')).toBe('#fbbf24')

    const firstWallAfter = wrapper.find('polygon.wall-segment')
    expect(firstWallAfter.exists()).toBe(true)
    expect(firstWallAfter.attributes('stroke-linejoin')).toBe('round')
    expect(firstWallAfter.attributes('stroke-linecap')).toBe('round')

    wrapper.unmount()
  })
})
