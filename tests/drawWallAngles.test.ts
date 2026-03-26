import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { useRoomStore } from '../src/stores/useRoomStore'

const EPS = 1e-6

function wallEndPoint(wall: { position: [number, number]; angle: number; length: number }): [number, number] {
  return [
    wall.position[0] + Math.cos(wall.angle) * wall.length,
    wall.position[1] + Math.sin(wall.angle) * wall.length,
  ]
}

function expectOn45Lattice(angle: number): void {
  const step = Math.PI / 4
  const k = Math.round(angle / step)
  expect(Math.abs(angle - k * step)).toBeLessThanOrEqual(EPS)
}

describe('draw wall snapping', () => {
  it('allows 45-degree wall segments', () => {
    setActivePinia(createPinia())
    const store = useRoomStore()
    store.startDrawWalls()

    store.addWallVertex(40, 32, 6, [0, 0])
    expect(store.walls.length).toBe(1)
    expectOn45Lattice(store.walls[0]!.angle)
    expect(Math.abs(store.walls[0]!.angle - Math.PI / 4)).toBeLessThanOrEqual(0.2)
  })

  it('keeps chain connectivity across snapped segments', () => {
    setActivePinia(createPinia())
    const store = useRoomStore()
    store.startDrawWalls()

    store.addWallVertex(60, 0, 6, [0, 0])
    store.addWallVertex(90, 40, 6)
    expect(store.walls.length).toBe(2)

    const firstEnd = wallEndPoint(store.walls[0]!)
    const secondStart = store.walls[1]!.position
    expect(Math.hypot(firstEnd[0] - secondStart[0], firstEnd[1] - secondStart[1])).toBeLessThanOrEqual(EPS)
    expectOn45Lattice(store.walls[1]!.angle)
  })

  it('closes a rhombus-like path with a single final wall', () => {
    setActivePinia(createPinia())
    const store = useRoomStore()
    store.startDrawWalls()

    store.addWallVertex(60, 0, 6, [0, 0])
    store.addWallVertex(100, 40, 6)
    store.addWallVertex(40, 40, 6)
    expect(store.walls.length).toBe(3)

    store.closeRoom(6)
    expect(store.walls.length).toBe(4)

    const firstStart = store.walls[0]!.position
    const lastEnd = wallEndPoint(store.walls[store.walls.length - 1]!)
    expect(Math.hypot(lastEnd[0] - firstStart[0], lastEnd[1] - firstStart[1])).toBeLessThanOrEqual(EPS)
    for (const wall of store.walls) {
      expectOn45Lattice(wall.angle)
    }
  })
})
