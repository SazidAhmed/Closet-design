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

function wallMidY(wall: WallSnapshot): number {
  const end = wallEndPoint(wall)
  return (wall.position[1] + end[1]) / 2
}

function snapshotWalls(walls: Wall[]): WallSnapshot[] {
  return walls.map((wall) => ({
    id: wall.id,
    length: wall.length,
    position: [wall.position[0], wall.position[1]],
    angle: wall.angle,
  }))
}

function verticesFromWalls(walls: WallSnapshot[]): Vec2[] {
  return walls.map((wall) => [wall.position[0], wall.position[1]])
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
  const vertices = verticesFromWalls(walls)
  const signedArea = polygonSignedArea(vertices)
  const start = vertices[selectedIndex]!
  const end = vertices[(selectedIndex + 1) % vertices.length]!
  return signedArea >= 0 ? start : end
}

function turningAngles(walls: WallSnapshot[]): number[] {
  const turns: number[] = []
  for (let i = 0; i < walls.length; i += 1) {
    const current = walls[i]!
    const next = walls[(i + 1) % walls.length]!
    turns.push(normalizeAngle(next.angle - current.angle))
  }
  return turns
}

function expectVecClose(a: Vec2, b: Vec2, epsilon = EPS): void {
  expect(Math.abs(a[0] - b[0])).toBeLessThanOrEqual(epsilon)
  expect(Math.abs(a[1] - b[1])).toBeLessThanOrEqual(epsilon)
}

function expectClosedConnectivity(walls: WallSnapshot[]): void {
  for (let i = 0; i < walls.length; i += 1) {
    const end = wallEndPoint(walls[i]!)
    const nextStart = walls[(i + 1) % walls.length]!.position
    expect(Math.hypot(end[0] - nextStart[0], end[1] - nextStart[1])).toBeLessThanOrEqual(EPS)
  }
}

function expectRigidInvariants(before: WallSnapshot[], after: WallSnapshot[]): void {
  const beforeTurns = turningAngles(before)
  const afterTurns = turningAngles(after)
  after.forEach((wall, i) => {
    expect(Math.abs(wall.length - before[i]!.length)).toBeLessThanOrEqual(EPS)
    expect(Math.abs(normalizeAngle(afterTurns[i]! - beforeTurns[i]!))).toBeLessThanOrEqual(EPS)
  })
  expectClosedConnectivity(after)
}

function findBottomWallIndex(walls: WallSnapshot[]): number {
  let index = 0
  let best = Number.NEGATIVE_INFINITY
  walls.forEach((wall, i) => {
    const midY = wallMidY(wall)
    if (midY > best) {
      best = midY
      index = i
    }
  })
  return index
}

function findTopWallIndex(walls: WallSnapshot[]): number {
  let index = 0
  let best = Number.POSITIVE_INFINITY
  walls.forEach((wall, i) => {
    const midY = wallMidY(wall)
    if (midY < best) {
      best = midY
      index = i
    }
  })
  return index
}

function createStore() {
  setActivePinia(createPinia())
  return useRoomStore()
}

function setCounterClockwiseRectangle(store: ReturnType<typeof useRoomStore>) {
  const hw = 100
  const hh = 80
  const vertices: Vec2[] = [
    [-hw, -hh],
    [-hw, hh],
    [hw, hh],
    [hw, -hh],
  ]
  const walls: Wall[] = vertices.map((start, i) => {
    const end = vertices[(i + 1) % vertices.length]!
    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    return {
      id: `ccw_${i + 1}`,
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

describe('closed room rotation pivot', () => {
  it('clockwise order: selected bottom wall keeps inside-left pivot fixed', () => {
    const store = createStore()
    const before = snapshotWalls(store.walls)
    const idx = findBottomWallIndex(before)
    const pivotBefore = insideLeftPivot(before, idx)
    const wall = before[idx]!
    const expectedBottomRight = wall.position

    expectVecClose(pivotBefore, expectedBottomRight)

    store.setWallAngle(wall.id, wall.angle + degToRad(32), 'start')
    const after = snapshotWalls(store.walls)
    const pivotAfter = insideLeftPivot(after, idx)

    expectVecClose(pivotAfter, pivotBefore)
    expectRigidInvariants(before, after)
  })

  it('clockwise order: selected top wall keeps inside-left pivot fixed', () => {
    const store = createStore()
    const before = snapshotWalls(store.walls)
    const idx = findTopWallIndex(before)
    const pivotBefore = insideLeftPivot(before, idx)

    const wall = before[idx]!
    const expectedTopLeft = wall.position
    expectVecClose(pivotBefore, expectedTopLeft)

    store.setWallAngle(wall.id, wall.angle - degToRad(27), 'start')
    const after = snapshotWalls(store.walls)
    const pivotAfter = insideLeftPivot(after, idx)

    expectVecClose(pivotAfter, pivotBefore)
    expectRigidInvariants(before, after)
  })

  it('counterclockwise order: selected bottom wall keeps inside-left pivot fixed', () => {
    const store = createStore()
    setCounterClockwiseRectangle(store)

    const before = snapshotWalls(store.walls)
    expect(polygonSignedArea(verticesFromWalls(before))).toBeLessThan(0)
    const idx = findBottomWallIndex(before)
    const pivotBefore = insideLeftPivot(before, idx)
    const expectedBottomRight = wallEndPoint(before[idx]!)

    expectVecClose(pivotBefore, expectedBottomRight)

    store.setWallAngle(before[idx]!.id, before[idx]!.angle + degToRad(21), 'start')
    const after = snapshotWalls(store.walls)
    const pivotAfter = insideLeftPivot(after, idx)

    expectVecClose(pivotAfter, pivotBefore)
    expectRigidInvariants(before, after)
  })

  it('repeated rotations preserve closure, pivot, and wall lengths', () => {
    const store = createStore()
    const before = snapshotWalls(store.walls)
    const idx = findBottomWallIndex(before)
    const pivotBefore = insideLeftPivot(before, idx)
    const baselineLengths = before.map((w) => w.length)

    for (let i = 0; i < 24; i += 1) {
      const selected = store.walls[idx]!
      store.setWallAngle(selected.id, selected.angle + degToRad(7.5), 'start')
    }

    const after = snapshotWalls(store.walls)
    const pivotAfter = insideLeftPivot(after, idx)
    expectVecClose(pivotAfter, pivotBefore)
    expectClosedConnectivity(after)
    after.forEach((wall, i) => {
      expect(Math.abs(wall.length - baselineLengths[i]!)).toBeLessThanOrEqual(EPS)
    })
  })
})

