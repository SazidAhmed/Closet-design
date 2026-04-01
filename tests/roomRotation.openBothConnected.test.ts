import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { useRoomStore } from '../src/stores/useRoomStore'
import type { Vec2, Wall } from '../src/features/closet/domain/types/room'

type WallSnapshot = Pick<Wall, 'id' | 'length' | 'position' | 'angle'>

const EPS = 1e-6

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

function normalizeAngle(angleRad: number): number {
  return Math.atan2(Math.sin(angleRad), Math.cos(angleRad))
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

function expectVecClose(a: Vec2, b: Vec2, epsilon = EPS): void {
  expect(Math.abs(a[0] - b[0])).toBeLessThanOrEqual(epsilon)
  expect(Math.abs(a[1] - b[1])).toBeLessThanOrEqual(epsilon)
}

function expectOpenConnectivity(walls: WallSnapshot[]): void {
  for (let i = 0; i < walls.length - 1; i += 1) {
    const end = wallEndPoint(walls[i]!)
    const nextStart = walls[i + 1]!.position
    expect(Math.hypot(end[0] - nextStart[0], end[1] - nextStart[1])).toBeLessThanOrEqual(EPS)
  }
}

function openChainTurns(walls: WallSnapshot[]): number[] {
  const turns: number[] = []
  for (let i = 0; i < walls.length - 1; i += 1) {
    turns.push(normalizeAngle(walls[i + 1]!.angle - walls[i]!.angle))
  }
  return turns
}

function createStore() {
  setActivePinia(createPinia())
  return useRoomStore()
}

function setOpenRepresentativeChain(store: ReturnType<typeof useRoomStore>) {
  const points: Vec2[] = [
    [0, 0],
    [120, 0],
    [120, 90],
    [220, 90],
    [220, 170],
  ]

  const walls: Wall[] = points.slice(0, -1).map((start, i) => {
    const end = points[i + 1]!
    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    return {
      id: `open_${i + 1}`,
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

describe('open both-connected one-side rotation', () => {
  it('anchor start rotates selected wall and end-side chain while keeping pivot fixed', () => {
    const store = createStore()
    setOpenRepresentativeChain(store)

    const before = snapshotWalls(store.walls)
    const selected = before[1]!
    const pivotBefore = selected.position
    const beforeTurns = openChainTurns(before)

    store.setWallAngle(selected.id, selected.angle + degToRad(28), 'start')

    const after = snapshotWalls(store.walls)
    const pivotAfter = after[1]!.position
    const afterTurns = openChainTurns(after)

    expectVecClose(pivotAfter, pivotBefore)
    expectOpenConnectivity(after)

    // Non-rotated side (wall 1) stays untouched when rotating away from start pivot.
    expectVecClose(after[0]!.position, before[0]!.position)
    expect(Math.abs(normalizeAngle(after[0]!.angle - before[0]!.angle))).toBeLessThanOrEqual(EPS)

    // Pivot-side joint changes, downstream joints on rotated side remain invariant.
    expect(Math.abs(normalizeAngle(afterTurns[0]! - beforeTurns[0]!))).toBeGreaterThan(1e-3)
    expect(Math.abs(normalizeAngle(afterTurns[1]! - beforeTurns[1]!))).toBeLessThanOrEqual(EPS)
    expect(Math.abs(normalizeAngle(afterTurns[2]! - beforeTurns[2]!))).toBeLessThanOrEqual(EPS)
  })

  it('anchor end rotates selected wall and start-side chain while keeping pivot fixed', () => {
    const store = createStore()
    setOpenRepresentativeChain(store)

    const before = snapshotWalls(store.walls)
    const selected = before[1]!
    const pivotBefore = wallEndPoint(selected)
    const beforeTurns = openChainTurns(before)

    store.setWallAngle(selected.id, selected.angle - degToRad(24), 'end')

    const after = snapshotWalls(store.walls)
    const pivotAfter = wallEndPoint(after[1]!)
    const afterTurns = openChainTurns(after)

    expectVecClose(pivotAfter, pivotBefore)
    expectOpenConnectivity(after)

    // Non-rotated side (walls 3,4) stays untouched when rotating away from end pivot.
    expectVecClose(after[2]!.position, before[2]!.position)
    expectVecClose(after[3]!.position, before[3]!.position)
    expect(Math.abs(normalizeAngle(after[2]!.angle - before[2]!.angle))).toBeLessThanOrEqual(EPS)
    expect(Math.abs(normalizeAngle(after[3]!.angle - before[3]!.angle))).toBeLessThanOrEqual(EPS)

    // Start-side downstream joint remains invariant; pivot-side joint changes.
    expect(Math.abs(normalizeAngle(afterTurns[0]! - beforeTurns[0]!))).toBeLessThanOrEqual(EPS)
    expect(Math.abs(normalizeAngle(afterTurns[1]! - beforeTurns[1]!))).toBeGreaterThan(1e-3)
  })

  it('wall 2 representative topology keeps wall2-wall3 and wall3-wall4 right angles', () => {
    const store = createStore()
    setOpenRepresentativeChain(store)

    const before = snapshotWalls(store.walls)
    const selected = before[1]!
    const beforeTurns = openChainTurns(before)

    expect(Math.abs(Math.abs(beforeTurns[1]!) - Math.PI / 2)).toBeLessThanOrEqual(EPS)
    expect(Math.abs(Math.abs(beforeTurns[2]!) - Math.PI / 2)).toBeLessThanOrEqual(EPS)

    store.setWallAngle(selected.id, selected.angle + degToRad(35), 'start')

    const after = snapshotWalls(store.walls)
    const afterTurns = openChainTurns(after)

    expect(Math.abs(Math.abs(afterTurns[1]!) - Math.PI / 2)).toBeLessThanOrEqual(EPS)
    expect(Math.abs(Math.abs(afterTurns[2]!) - Math.PI / 2)).toBeLessThanOrEqual(EPS)
  })
})

describe('boundary rotation regression', () => {
  it('boundary selected wall keeps rigid chain invariants', () => {
    const store = createStore()
    setOpenRepresentativeChain(store)

    const before = snapshotWalls(store.walls)
    const selected = before[0]!
    const pivotBefore = wallEndPoint(selected)
    const beforeTurns = openChainTurns(before)

    store.setWallAngle(selected.id, selected.angle + degToRad(18), 'end')

    const after = snapshotWalls(store.walls)
    const pivotAfter = wallEndPoint(after[0]!)
    const afterTurns = openChainTurns(after)

    expectVecClose(pivotAfter, pivotBefore)
    expectOpenConnectivity(after)

    after.forEach((wall, i) => {
      expect(Math.abs(wall.length - before[i]!.length)).toBeLessThanOrEqual(EPS)
    })
    afterTurns.forEach((turn, i) => {
      expect(Math.abs(normalizeAngle(turn - beforeTurns[i]!))).toBeLessThanOrEqual(EPS)
    })
  })
})
