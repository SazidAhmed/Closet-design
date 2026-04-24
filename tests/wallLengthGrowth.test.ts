import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import type { Vec2, Wall } from '../src/features/closet/domain/types/room'
import { useRoomStore } from '../src/stores/useRoomStore'

const EPS = 1e-6

type WallSnapshot = Pick<Wall, 'id' | 'length' | 'position' | 'angle'>

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

function expectVecClose(a: Vec2, b: Vec2, epsilon = EPS): void {
  expect(Math.abs(a[0] - b[0])).toBeLessThanOrEqual(epsilon)
  expect(Math.abs(a[1] - b[1])).toBeLessThanOrEqual(epsilon)
}

function expectSequentialConnectivity(walls: WallSnapshot[]): void {
  for (let i = 0; i < walls.length - 1; i += 1) {
    const end = wallEndPoint(walls[i]!)
    const nextStart = walls[i + 1]!.position
    expectVecClose(end, nextStart)
  }
}

function expectClosedConnectivity(walls: WallSnapshot[]): void {
  expectSequentialConnectivity(walls)
  expectVecClose(wallEndPoint(walls[walls.length - 1]!), walls[0]!.position)
}

function createStore() {
  setActivePinia(createPinia())
  return useRoomStore()
}

function setOpenThreeWallChain(store: ReturnType<typeof useRoomStore>) {
  const walls: Wall[] = [
    {
      id: 'open_1',
      position: [0, 0],
      length: 120,
      angle: 0,
      hasCloset: true,
      thickness: 6,
      label: '1',
      visible: true,
    },
    {
      id: 'open_2',
      position: [120, 0],
      length: 100,
      angle: Math.PI / 2,
      hasCloset: false,
      thickness: 6,
      label: '2',
      visible: true,
    },
    {
      id: 'open_3',
      position: [120, 100],
      length: 80,
      angle: Math.PI,
      hasCloset: false,
      thickness: 6,
      label: '3',
      visible: true,
    },
  ]

  store.setRoomFromWalls(walls)
}

function setStandaloneWall(store: ReturnType<typeof useRoomStore>) {
  const walls: Wall[] = [
    {
      id: 'solo_1',
      position: [0, 0],
      length: 120,
      angle: 0,
      hasCloset: true,
      thickness: 6,
      label: '1',
      visible: true,
    },
  ]

  store.setRoomFromWalls(walls)
}

describe('wall length growth-side behavior', () => {
  it('one-connected wall grows from end and translates connected chain', () => {
    const store = createStore()
    setOpenThreeWallChain(store)

    const before = snapshotWalls(store.walls)
    const selected = before[0]!
    const wall2BeforeStart = before[1]!.position

    store.resizeWallLength(selected.id, selected.length + 40, 'end')

    const after = snapshotWalls(store.walls)
    const selectedAfter = after[0]!
    const expectedShift: Vec2 = [40, 0]

    expect(selectedAfter.length).toBeCloseTo(selected.length + 40, 6)
    expectVecClose(selectedAfter.position, selected.position)
    expectVecClose(after[1]!.position, [wall2BeforeStart[0] + expectedShift[0], wall2BeforeStart[1] + expectedShift[1]])
    expectSequentialConnectivity(after)
  })

  it('both-connected internal wall grows from end and keeps topology connected', () => {
    const store = createStore()
    setOpenThreeWallChain(store)

    const before = snapshotWalls(store.walls)
    const selected = before[1]!
    const wall3BeforeStart = before[2]!.position

    store.resizeWallLength(selected.id, selected.length + 30, 'end')

    const after = snapshotWalls(store.walls)

    expect(after[1]!.length).toBeCloseTo(selected.length + 30, 6)
    expectVecClose(after[0]!.position, before[0]!.position)
    expectVecClose(after[2]!.position, [wall3BeforeStart[0], wall3BeforeStart[1] + 30])
    expectSequentialConnectivity(after)
  })

  it('standalone wall grows locally with no neighbor compensation', () => {
    const store = createStore()
    setStandaloneWall(store)

    const before = snapshotWalls(store.walls)
    const selected = before[0]!

    store.resizeWallLength(selected.id, selected.length + 55, 'end')

    const after = snapshotWalls(store.walls)

    expect(after).toHaveLength(1)
    expect(after[0]!.length).toBeCloseTo(selected.length + 55, 6)
    expectVecClose(after[0]!.position, selected.position)
  })

  it('closed room length growth preserves closed connectivity', () => {
    const store = createStore()

    const before = snapshotWalls(store.walls)
    expect(before.length).toBeGreaterThanOrEqual(4)

    store.resizeWallLength(before[0]!.id, before[0]!.length + 35, 'end')

    const after = snapshotWalls(store.walls)
    expectClosedConnectivity(after)
  })
})
