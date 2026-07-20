// ---------------------------------------------------------------------------
// Room store — floor plan state
// ---------------------------------------------------------------------------

import { defineStore } from 'pinia'
import type { Room, PlacedItem, RoomColors, Vec2 } from '../features/closet/domain/types/room'
import { createDefaultRoom, createItemId, createWallId } from '../features/closet/domain/types/room'
import { ROOM_CONSTRAINTS } from '../features/closet/domain/constraints'

function clampWall(v: number): number {
  return Math.max(ROOM_CONSTRAINTS.wallLength.min, Math.min(ROOM_CONSTRAINTS.wallLength.max, v))
}

function clampItemSize(v: number): number {
  if (!Number.isFinite(v)) return 1
  return Math.max(1, v)
}

function roundToTenth(v: number): number {
  return Math.round(v * 10) / 10
}

function isDoorOrWindowItem(item: Pick<PlacedItem, 'category' | 'type'>): boolean {
  return item.category === 'door' || item.type === 'window'
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

function clampItemPositionAlongWall(
  item: Pick<PlacedItem, 'wallId' | 'width'>,
  walls: Room['walls'],
  requestedPositionAlongWall: number,
): number {
  const clamped = clamp01(requestedPositionAlongWall)
  if (!item.wallId) return clamped

  const wall = walls.find((entry) => entry.id === item.wallId)
  if (!wall || wall.length <= 0) return clamped

  const halfItemWidthRatio = Math.max(0, item.width) / (2 * wall.length)
  if (!Number.isFinite(halfItemWidthRatio)) return clamped

  if (halfItemWidthRatio >= 0.5) {
    // If item width is larger than wall length, keep centered on the wall.
    return 0.5
  }

  return Math.max(halfItemWidthRatio, Math.min(1 - halfItemWidthRatio, clamped))
}

function recalculateDoorWindowSidePositions(item: PlacedItem, walls: Room['walls']): void {
  if (!isDoorOrWindowItem(item) || !item.wallId) return

  const wall = walls.find((entry) => entry.id === item.wallId)
  if (!wall) return

  item.positionAlongWall = clampItemPositionAlongWall(item, walls, item.positionAlongWall)

  const wallLengthIn = wall.length
  const itemWidthIn = item.width
  const centerOffsetIn = Math.max(0, Math.min(1, item.positionAlongWall)) * wallLengthIn

  const leftPosition = Math.max(0, centerOffsetIn - itemWidthIn / 2)
  const rightPosition = Math.max(0, wallLengthIn - (centerOffsetIn + itemWidthIn / 2))

  item.leftPosition = leftPosition
  item.rightPosition = rightPosition
}

function snapped45Segment(start: Vec2, target: Vec2): { angle: number; length: number; end: Vec2 } | null {
  const dx = target[0] - start[0]
  const dy = target[1] - start[1]
  const rawLength = Math.hypot(dx, dy)

  if (rawLength < 1) return null

  const step = Math.PI / 4
  const snappedAngle = Math.atan2(
    Math.sin(Math.round(Math.atan2(dy, dx) / step) * step),
    Math.cos(Math.round(Math.atan2(dy, dx) / step) * step),
  )
  const ux = Math.cos(snappedAngle)
  const uy = Math.sin(snappedAngle)

  // Project onto the snapped direction so the resulting endpoint lies exactly
  // on the 45° lattice (0, 45, 90, ..., 315 degrees).
  const length = dx * ux + dy * uy
  if (Math.abs(length) < 1) return null

  const dir = length >= 0 ? 1 : -1
  const sx = ux * dir
  const sy = uy * dir
  const segLength = Math.abs(length)
  return {
    angle: Math.atan2(sy, sx),
    length: segLength,
    end: [start[0] + sx * segLength, start[1] + sy * segLength],
  }
}

function roomPlanBounds(walls: Room['walls']): {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  depth: number
  centerX: number
  centerY: number
} {
  if (walls.length === 0) {
    const half = 96 / 2
    return {
      minX: -half,
      maxX: half,
      minY: -half,
      maxY: half,
      width: 96,
      depth: 96,
      centerX: 0,
      centerY: 0,
    }
  }

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const wall of walls) {
    const sx = wall.position[0]
    const sy = wall.position[1]
    const ex = sx + Math.cos(wall.angle) * wall.length
    const ey = sy + Math.sin(wall.angle) * wall.length
    minX = Math.min(minX, sx, ex)
    maxX = Math.max(maxX, sx, ex)
    minY = Math.min(minY, sy, ey)
    maxY = Math.max(maxY, sy, ey)
  }

  const width = Math.max(1, maxX - minX)
  const depth = Math.max(1, maxY - minY)
  return {
    minX,
    maxX,
    minY,
    maxY,
    width,
    depth,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  }
}

function closetWallOrFallback(walls: Room['walls']) {
  const tagged = walls.find((w) => w.hasCloset)
  if (tagged) return tagged
  if (walls.length === 0) return null

  // Fallback to the back-most wall in plan space (smallest mid-Y)
  return walls.reduce((best, wall) => {
    const wallMidY = wall.position[1] + Math.sin(wall.angle) * wall.length / 2
    const bestMidY = best.position[1] + Math.sin(best.angle) * best.length / 2
    return wallMidY < bestMidY ? wall : best
  })
}

function wallEndPoint(wall: Room['walls'][number]): Vec2 {
  return [
    wall.position[0] + Math.cos(wall.angle) * wall.length,
    wall.position[1] + Math.sin(wall.angle) * wall.length,
  ]
}

function normalizeAngle(angleRad: number): number {
  return Math.atan2(Math.sin(angleRad), Math.cos(angleRad))
}

function polygonSignedArea(vertices: Vec2[]): number {
  if (vertices.length < 3) return 0
  let sum = 0
  for (let i = 0; i < vertices.length; i += 1) {
    const [x1, y1] = vertices[i]!
    const [x2, y2] = vertices[(i + 1) % vertices.length]!
    sum += x1 * y2 - x2 * y1
  }
  return sum / 2
}

function rotatePointAroundPivot(point: Vec2, pivot: Vec2, cosD: number, sinD: number): Vec2 {
  const dx = point[0] - pivot[0]
  const dy = point[1] - pivot[1]
  return [
    pivot[0] + dx * cosD - dy * sinD,
    pivot[1] + dx * sinD + dy * cosD,
  ]
}

function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  if (polygon.length < 3) return false
  const [px, py] = point
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i]!
    const [xj, yj] = polygon[j]!
    const intersects =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / ((yj - yi) || Number.EPSILON) + xi
    if (intersects) inside = !inside
  }

  return inside
}

function closedWallInteriorSide(vertices: Vec2[], wallIndex: number): 'right' | 'left' {
  const n = vertices.length
  const start = vertices[wallIndex]!
  const end = vertices[(wallIndex + 1) % n]!
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const angle = Math.atan2(dy, dx)
  const midX = (start[0] + end[0]) / 2
  const midY = (start[1] + end[1]) / 2

  const sampleOffset = 8
  const sideX = Math.cos(angle + Math.PI / 2) * sampleOffset
  const sideY = Math.sin(angle + Math.PI / 2) * sampleOffset

  const rightInside = pointInPolygon([midX + sideX, midY + sideY], vertices)
  const leftInside = pointInPolygon([midX - sideX, midY - sideY], vertices)

  if (rightInside !== leftInside) {
    return rightInside ? 'right' : 'left'
  }

  const signedArea = polygonSignedArea(vertices)
  return signedArea >= 0 ? 'right' : 'left'
}

function insideLeftPivot(vertices: Vec2[], wallIndex: number): Vec2 {
  const n = vertices.length
  const wallStart = vertices[wallIndex]!
  const wallEnd = vertices[(wallIndex + 1) % n]!

  const side = closedWallInteriorSide(vertices, wallIndex)
  return side === 'right'
    ? [wallStart[0], wallStart[1]]
    : [wallEnd[0], wallEnd[1]]
}

/** Check if a point is approximately equal to another (within 1 unit tolerance) */
function pointsApproximatelyEqual(p1: Vec2, p2: Vec2, tolerance = 1): boolean {
  return Math.hypot(p1[0] - p2[0], p1[1] - p2[1]) <= tolerance
}

/** Find which wall's end/start connects to this wall's start point, if any */
function findWallConnectedToStart(walls: Room['walls'], wallIdx: number): { idx: number; endpoint: 'end' } | null {
  const wall = walls[wallIdx]!
  const start: Vec2 = [wall.position[0], wall.position[1]]

  for (let i = 0; i < walls.length; i += 1) {
    if (i === wallIdx) continue
    const other = walls[i]!
    const otherEnd: Vec2 = [
      other.position[0] + Math.cos(other.angle) * other.length,
      other.position[1] + Math.sin(other.angle) * other.length,
    ]
    if (pointsApproximatelyEqual(start, otherEnd)) {
      return { idx: i, endpoint: 'end' }
    }
  }
  return null
}

/** Find which wall's start/end connects to this wall's end point, if any */
function findWallConnectedToEnd(walls: Room['walls'], wallIdx: number): { idx: number; endpoint: 'start' } | null {
  const wall = walls[wallIdx]!
  const end: Vec2 = [
    wall.position[0] + Math.cos(wall.angle) * wall.length,
    wall.position[1] + Math.sin(wall.angle) * wall.length,
  ]

  for (let i = 0; i < walls.length; i += 1) {
    if (i === wallIdx) continue
    const other = walls[i]!
    const otherStart: Vec2 = [other.position[0], other.position[1]]
    if (pointsApproximatelyEqual(end, otherStart)) {
      return { idx: i, endpoint: 'start' }
    }
  }
  return null
}

/** True when a selected wall has exactly one connected endpoint. */
function isBoundaryWall(walls: Room['walls'], wallIdx: number): boolean {
  const startConnected = findWallConnectedToStart(walls, wallIdx) !== null
  const endConnected = findWallConnectedToEnd(walls, wallIdx) !== null
  return startConnected !== endConnected
}

/** True when a selected wall has both endpoints connected. */
function isBothConnectedWall(walls: Room['walls'], wallIdx: number): boolean {
  const startConnected = findWallConnectedToStart(walls, wallIdx) !== null
  const endConnected = findWallConnectedToEnd(walls, wallIdx) !== null
  return startConnected && endConnected
}

function wallEndpointConnectivity(walls: Room['walls'], wallIdx: number): {
  startConnected: boolean
  endConnected: boolean
} {
  const wall = walls[wallIdx]!
  const start: Vec2 = [wall.position[0], wall.position[1]]
  const end = wallEndPoint(wall)
  let startConnected = false
  let endConnected = false

  for (let i = 0; i < walls.length; i += 1) {
    if (i === wallIdx) continue
    const other = walls[i]!
    const otherStart: Vec2 = [other.position[0], other.position[1]]
    const otherEnd = wallEndPoint(other)

    if (
      !startConnected &&
      (pointsApproximatelyEqual(start, otherStart) || pointsApproximatelyEqual(start, otherEnd))
    ) {
      startConnected = true
    }
    if (
      !endConnected &&
      (pointsApproximatelyEqual(end, otherStart) || pointsApproximatelyEqual(end, otherEnd))
    ) {
      endConnected = true
    }

    if (startConnected && endConnected) break
  }

  return { startConnected, endConnected }
}

function setWallFromPoints(wall: Room['walls'][number], start: Vec2, end: Vec2): void {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const dist = Math.hypot(dx, dy)
  wall.position = [start[0], start[1]]
  if (dist < 1e-9) {
    wall.length = 1
    return
  }
  wall.length = dist
  wall.angle = Math.atan2(dy, dx)
}

function translateWall(wall: Room['walls'][number], dx: number, dy: number): void {
  wall.position = [wall.position[0] + dx, wall.position[1] + dy]
}

function chainReachRange(lengths: number[]): { minReach: number; maxReach: number } {
  if (lengths.length === 0) return { minReach: 0, maxReach: 0 }
  const maxReach = lengths.reduce((sum, value) => sum + value, 0)
  const longest = Math.max(...lengths)
  const minReach = Math.max(0, longest - (maxReach - longest))
  return { minReach, maxReach }
}

function directionOrFallback(from: Vec2, to: Vec2, fallback: Vec2): Vec2 {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const len = Math.hypot(dx, dy)
  if (len < 1e-9) return [fallback[0], fallback[1]]
  return [dx / len, dy / len]
}

function solveOpenChainFabrik(root: Vec2, target: Vec2, lengths: number[], seedPoints: Vec2[]): Vec2[] {
  const segmentCount = lengths.length
  if (segmentCount === 0) return [root, target]

  const points: Vec2[] = seedPoints.map((point) => [point[0], point[1]])
  if (points.length !== segmentCount + 1) {
    return [root, ...Array.from({ length: segmentCount - 1 }, () => [root[0], root[1]] as Vec2), target]
  }

  const baseDir = directionOrFallback(root, target, [1, 0])
  const rootTargetDist = Math.hypot(target[0] - root[0], target[1] - root[1])
  const totalLength = lengths.reduce((sum, value) => sum + value, 0)

  // Unreachable chain: lay segments straight from root toward target.
  if (rootTargetDist >= totalLength - 1e-6) {
    points[0] = [root[0], root[1]]
    for (let i = 0; i < segmentCount; i += 1) {
      const prev = points[i]!
      points[i + 1] = [
        prev[0] + baseDir[0] * lengths[i]!,
        prev[1] + baseDir[1] * lengths[i]!,
      ]
    }
    return points
  }

  const maxIterations = 72
  const tolerance = 1e-7

  points[0] = [root[0], root[1]]
  points[segmentCount] = [target[0], target[1]]

  for (let iter = 0; iter < maxIterations; iter += 1) {
    // Backward pass: enforce target and backward lengths.
    points[segmentCount] = [target[0], target[1]]
    for (let i = segmentCount - 1; i >= 0; i -= 1) {
      const next = points[i + 1]!
      const current = points[i]!
      const dir = directionOrFallback(next, current, [-baseDir[0], -baseDir[1]])
      points[i] = [
        next[0] + dir[0] * lengths[i]!,
        next[1] + dir[1] * lengths[i]!,
      ]
    }

    // Forward pass: enforce root and forward lengths.
    points[0] = [root[0], root[1]]
    for (let i = 0; i < segmentCount; i += 1) {
      const current = points[i]!
      const next = points[i + 1]!
      const dir = directionOrFallback(current, next, baseDir)
      points[i + 1] = [
        current[0] + dir[0] * lengths[i]!,
        current[1] + dir[1] * lengths[i]!,
      ]
    }

    const end = points[segmentCount]!
    if (Math.hypot(end[0] - target[0], end[1] - target[1]) <= tolerance) {
      break
    }
  }

  points[segmentCount] = [target[0], target[1]]
  return points
}

export const useRoomStore = defineStore('room', {
  state: (): Room & { closetOffsetX: number; closetOffsetY: number; closetOffsetZ: number } => ({
    ...createDefaultRoom(),
    closetOffsetX: 0,
    closetOffsetY: 0,
    closetOffsetZ: 0,
  }),

  getters: {
    wallById: (state) => (id: string) => state.walls.find((w) => w.id === id),
    itemsOnWall: (state) => (wallId: string) =>
      state.items.filter((item) => item.wallId === wallId),
    floorItems: (state) =>
      state.items.filter((item) => item.wallId === null),
    planBounds: (state) => roomPlanBounds(state.walls),
    closetWall: (state) => closetWallOrFallback(state.walls),
    /** True when every wall is connected end-to-end forming a closed polygon. */
    roomIsClosed: (state): boolean => {
      const n = state.walls.length
      if (n < 3) return false
      const first = state.walls[0]!
      const last = state.walls[n - 1]!
      const lastEndX = last.position[0] + Math.cos(last.angle) * last.length
      const lastEndY = last.position[1] + Math.sin(last.angle) * last.length
      return Math.hypot(first.position[0] - lastEndX, first.position[1] - lastEndY) < 1
    },
  },

  actions: {
    /** Replace the entire room (e.g. when switching closet type). */
    setRoom(room: Room) {
      this.$patch(room)
    },

    /** Set room ceiling height. */
    setHeight(h: number) {
      this.height = h
    },

    /** Resize a wall by its ID. */
    setWallLength(wallId: string, length: number) {
      this.resizeWallLength(wallId, length, 'end')
    },

    /** Resize a wall while preserving connectivity through topology-aware propagation. */
    resizeWallLength(wallId: string, length: number, growthSide: 'start' | 'end' = 'end') {
      const walls = this.walls
      const selectedIdx = walls.findIndex((w) => w.id === wallId)
      if (selectedIdx < 0 || !Number.isFinite(length)) return

      const wall = walls[selectedIdx]!
      const nextLength = clampWall(length)
      const delta = nextLength - wall.length
      if (Math.abs(delta) < 1e-9) return

      const ux = Math.cos(wall.angle)
      const uy = Math.sin(wall.angle)

      const translateConnectedFromEnd = (dx: number, dy: number) => {
        const chain: number[] = []
        const visited = new Set<number>([selectedIdx])
        let current = selectedIdx
        let loopsToSelected = false

        while (true) {
          const next = findWallConnectedToEnd(walls, current)
          if (!next) break
          if (next.idx === selectedIdx) {
            loopsToSelected = true
            break
          }
          if (visited.has(next.idx)) break
          visited.add(next.idx)
          chain.push(next.idx)
          current = next.idx
        }

        if (chain.length === 0) return

        if (loopsToSelected) {
          const bridgeIdx = chain[chain.length - 1]!
          for (let i = 0; i < chain.length - 1; i += 1) {
            translateWall(walls[chain[i]!]!, dx, dy)
          }

          const bridgeStart =
            chain.length > 1
              ? wallEndPoint(walls[chain[chain.length - 2]!]!)
              : wallEndPoint(wall)
          const fixedEnd: Vec2 = [wall.position[0], wall.position[1]]
          setWallFromPoints(walls[bridgeIdx]!, bridgeStart, fixedEnd)
          return
        }

        for (const idx of chain) {
          translateWall(walls[idx]!, dx, dy)
        }
      }

      const translateConnectedFromStart = (dx: number, dy: number) => {
        const chain: number[] = []
        const visited = new Set<number>([selectedIdx])
        let current = selectedIdx
        let loopsToSelected = false

        while (true) {
          const prev = findWallConnectedToStart(walls, current)
          if (!prev) break
          if (prev.idx === selectedIdx) {
            loopsToSelected = true
            break
          }
          if (visited.has(prev.idx)) break
          visited.add(prev.idx)
          chain.push(prev.idx)
          current = prev.idx
        }

        if (chain.length === 0) return

        if (loopsToSelected) {
          const bridgeIdx = chain[chain.length - 1]!
          for (let i = 0; i < chain.length - 1; i += 1) {
            translateWall(walls[chain[i]!]!, dx, dy)
          }

          const fixedStart = wallEndPoint(wall)
          const bridgeEnd: Vec2 =
            chain.length > 1
              ? [
                walls[chain[chain.length - 2]!]!.position[0],
                walls[chain[chain.length - 2]!]!.position[1],
              ]
              : [wall.position[0], wall.position[1]]
          setWallFromPoints(walls[bridgeIdx]!, fixedStart, bridgeEnd)
          return
        }

        for (const idx of chain) {
          translateWall(walls[idx]!, dx, dy)
        }
      }

      const { startConnected, endConnected } = wallEndpointConnectivity(walls, selectedIdx)

      const isClosedLoop = this.roomIsClosed && startConnected && endConnected && walls.length >= 3
      if (isClosedLoop) {
        const chainIndices: number[] = []
        for (let step = 1; step < walls.length; step += 1) {
          chainIndices.push((selectedIdx + step) % walls.length)
        }

        const chainLengths = chainIndices.map((idx) => walls[idx]!.length)
        const { minReach, maxReach } = chainReachRange(chainLengths)
        const resolvedLength = Math.max(minReach, Math.min(maxReach, nextLength))

        // For closed loops, preserve non-selected wall lengths and solve only
        // joint positions/angles to reconnect from selected end to start.
        if (growthSide === 'end') {
          wall.length = resolvedLength
          const root = wallEndPoint(wall)
          const target: Vec2 = [wall.position[0], wall.position[1]]
          const seedPoints: Vec2[] = [root]
          for (let i = 1; i < chainIndices.length; i += 1) {
            const chainWall = walls[chainIndices[i]!]!
            seedPoints.push([chainWall.position[0], chainWall.position[1]])
          }
          seedPoints.push(target)

          const solvedPoints = solveOpenChainFabrik(root, target, chainLengths, seedPoints)
          for (let i = 0; i < chainIndices.length; i += 1) {
            const wallIdx = chainIndices[i]!
            const chainWall = walls[wallIdx]!
            const start = solvedPoints[i]!
            const end = solvedPoints[i + 1]!
            chainWall.position = [start[0], start[1]]
            chainWall.length = chainLengths[i]!
            chainWall.angle = normalizeAngle(Math.atan2(end[1] - start[1], end[0] - start[0]))
          }
        } else {
          const fixedEnd = wallEndPoint(wall)
          wall.length = resolvedLength
          wall.position = [
            fixedEnd[0] - ux * resolvedLength,
            fixedEnd[1] - uy * resolvedLength,
          ]

          const root: Vec2 = [fixedEnd[0], fixedEnd[1]]
          const target: Vec2 = [wall.position[0], wall.position[1]]
          const seedPoints: Vec2[] = [root]
          for (let i = 1; i < chainIndices.length; i += 1) {
            const chainWall = walls[chainIndices[i]!]!
            seedPoints.push([chainWall.position[0], chainWall.position[1]])
          }
          seedPoints.push(target)

          const solvedPoints = solveOpenChainFabrik(root, target, chainLengths, seedPoints)
          for (let i = 0; i < chainIndices.length; i += 1) {
            const wallIdx = chainIndices[i]!
            const chainWall = walls[wallIdx]!
            const start = solvedPoints[i]!
            const end = solvedPoints[i + 1]!
            chainWall.position = [start[0], start[1]]
            chainWall.length = chainLengths[i]!
            chainWall.angle = normalizeAngle(Math.atan2(end[1] - start[1], end[0] - start[0]))
          }
        }

        for (const item of this.items) {
          recalculateDoorWindowSidePositions(item, this.walls)
        }
        return
      }

      if (growthSide === 'end') {
        if (endConnected) {
          translateConnectedFromEnd(ux * delta, uy * delta)
        }
        wall.length = nextLength
      } else {
        if (startConnected) {
          translateConnectedFromStart(-ux * delta, -uy * delta)
        }
        wall.position = [
          wall.position[0] - ux * delta,
          wall.position[1] - uy * delta,
        ]
        wall.length = nextLength
      }

      for (const item of this.items) {
        recalculateDoorWindowSidePositions(item, this.walls)
      }
    },

    /**
     * Rotate the entire connected chain rigidly around one endpoint of the selected wall.
     * Used when a boundary wall (one end free) is rotated.
     */
    rotateBoundaryChain(deltaRad: number, wallId: string, anchor: 'start' | 'end' = 'start') {
      if (!Number.isFinite(deltaRad) || deltaRad === 0) return
      const walls = this.walls
      const selectedIdx = walls.findIndex((w) => w.id === wallId)
      if (selectedIdx < 0) return

      const selectedWall = walls[selectedIdx]!
      const pivot: Vec2 = anchor === 'start'
        ? [selectedWall.position[0], selectedWall.position[1]]
        : wallEndPoint(selectedWall)

      // Collect all walls in the connected chain
      const chain: number[] = [selectedIdx]
      let current = selectedIdx

      // Traverse forward to collect connected walls ahead
      while (true) {
        const next = findWallConnectedToEnd(walls, current)
        if (!next || chain.includes(next.idx)) break
        chain.push(next.idx)
        current = next.idx
      }

      // Traverse backward to collect connected walls behind
      current = selectedIdx
      while (true) {
        const prev = findWallConnectedToStart(walls, current)
        if (!prev || chain.includes(prev.idx)) break
        chain.unshift(prev.idx)
        current = prev.idx
      }

      // Build all vertices from the chain in sequence
      const chainVertices: Vec2[] = []
      for (const idx of chain) {
        const wall = walls[idx]!
        chainVertices.push([wall.position[0], wall.position[1]])
      }
      // Add the end of the last wall to complete the chain
      if (chain.length > 0) {
        const lastIdx = chain[chain.length - 1]!
        const lastWall = walls[lastIdx]!
        chainVertices.push([
          lastWall.position[0] + Math.cos(lastWall.angle) * lastWall.length,
          lastWall.position[1] + Math.sin(lastWall.angle) * lastWall.length,
        ])
      }

      const cosD = Math.cos(deltaRad)
      const sinD = Math.sin(deltaRad)

      // Rigid rotation: rotate every vertex around the pivot,
      // then rebuild each wall from consecutive rotated vertices.
      const rotatedVertices = chainVertices.map((v) => rotatePointAroundPivot(v, pivot, cosD, sinD))

      for (let i = 0; i < chain.length; i += 1) {
        const wallIdx = chain[i]!
        const wall = walls[wallIdx]!
        const start = rotatedVertices[i]!
        const end = rotatedVertices[i + 1]!
        const dx = end[0] - start[0]
        const dy = end[1] - start[1]
        wall.position = [start[0], start[1]]
        wall.length = Math.hypot(dx, dy)
        wall.angle = normalizeAngle(Math.atan2(dy, dx))
      }
    },

    /**
     * Rotate only one side of an open topology where the selected wall is connected at both ends.
     * Anchor `start` rotates through end connectivity, anchor `end` rotates through start connectivity.
     */
    rotateOpenBothConnectedOneSide(deltaRad: number, wallId: string, anchor: 'start' | 'end' = 'start') {
      if (!Number.isFinite(deltaRad) || deltaRad === 0) return
      const walls = this.walls
      const selectedIdx = walls.findIndex((w) => w.id === wallId)
      if (selectedIdx < 0) return

      const selectedWall = walls[selectedIdx]!
      const pivot: Vec2 = anchor === 'start'
        ? [selectedWall.position[0], selectedWall.position[1]]
        : wallEndPoint(selectedWall)

      const chain: number[] = [selectedIdx]
      const visited = new Set<number>([selectedIdx])
      let current = selectedIdx

      while (true) {
        const next = anchor === 'start'
          ? findWallConnectedToEnd(walls, current)
          : findWallConnectedToStart(walls, current)
        if (!next || visited.has(next.idx)) break

        if (anchor === 'start') {
          chain.push(next.idx)
        } else {
          chain.unshift(next.idx)
        }
        visited.add(next.idx)
        current = next.idx
      }

      const chainVertices: Vec2[] = []
      for (const chainIdx of chain) {
        const wall = walls[chainIdx]!
        chainVertices.push([wall.position[0], wall.position[1]])
      }
      if (chain.length > 0) {
        const lastIdx = chain[chain.length - 1]!
        chainVertices.push(wallEndPoint(walls[lastIdx]!))
      }

      const cosD = Math.cos(deltaRad)
      const sinD = Math.sin(deltaRad)
      const rotatedVertices = chainVertices.map((v) => rotatePointAroundPivot(v, pivot, cosD, sinD))

      for (let i = 0; i < chain.length; i += 1) {
        const wallIdx = chain[i]!
        const wall = walls[wallIdx]!
        const start = rotatedVertices[i]!
        const end = rotatedVertices[i + 1]!
        const dx = end[0] - start[0]
        const dy = end[1] - start[1]
        wall.position = [start[0], start[1]]
        wall.length = Math.hypot(dx, dy)
        wall.angle = normalizeAngle(Math.atan2(dy, dx))
      }
    },

    /**
     * Rotate the entire closed room rigidly around the selected wall's inside-left corner.
     */
    rotateClosedRoom(deltaRad: number, wallId: string) {
      if (!Number.isFinite(deltaRad) || deltaRad === 0) return
      const walls = this.walls
      if (!this.roomIsClosed || walls.length < 3) return

      const selectedIdx = walls.findIndex((w) => w.id === wallId)
      if (selectedIdx < 0) return

      const n = walls.length
      const vertices = walls.map((w) => [w.position[0], w.position[1]] as Vec2)
      const pivot = insideLeftPivot(vertices, selectedIdx)

      const cosD = Math.cos(deltaRad)
      const sinD = Math.sin(deltaRad)
      // Rigid rotation: rotate every room vertex around one fixed pivot,
      // then rebuild each wall from consecutive rotated vertices.
      const rotatedVertices = vertices.map((v) => rotatePointAroundPivot(v, pivot, cosD, sinD))

      for (let i = 0; i < n; i += 1) {
        const wall = walls[i]!
        const start = rotatedVertices[i]!
        const end = rotatedVertices[(i + 1) % n]!
        const dx = end[0] - start[0]
        const dy = end[1] - start[1]
        wall.position = [start[0], start[1]]
        wall.length = Math.hypot(dx, dy)
        wall.angle = normalizeAngle(Math.atan2(dy, dx))
      }
    },

    /** Rotate a wall to the provided angle in radians.
     *  For a closed polygon, rotates the ENTIRE room rigidly.
     *  For boundary walls where pivot endpoint is connected and opposite end is free,
     *  rotates only the selected wall around the pivot endpoint.
     *  For other boundary walls, rotates the connected chain rigidly.
     *  For an open both-connected wall, rotates one side as a rigid chain.
     *  For all other open cases, rotates locally and translates adjacent walls. */
    setWallAngle(wallId: string, angleRad: number, anchor: 'start' | 'end' = 'start') {
      const idx = this.walls.findIndex((w) => w.id === wallId)
      if (idx < 0 || !Number.isFinite(angleRad)) return
      const wall = this.walls[idx]!
      const nextAngle = normalizeAngle(angleRad)
      const deltaRad = nextAngle - wall.angle

      // ── Closed-room branch: rigid rotation of the whole polygon ────────────
      if (this.roomIsClosed) {
        this.rotateClosedRoom(deltaRad, wallId)
        return
      }

      const { startConnected, endConnected } = wallEndpointConnectivity(this.walls, idx)
      const pivotConnected = anchor === 'start' ? startConnected : endConnected
      const oppositeConnected = anchor === 'start' ? endConnected : startConnected

      // If the selected pivot endpoint is connected but the opposite end is free,
      // hinge only the selected wall around that pivot (do not rotate the structure).
      if (pivotConnected && !oppositeConnected) {
        if (anchor === 'start') {
          wall.angle = nextAngle
        } else {
          const pivot = wallEndPoint(wall)
          wall.position = [
            pivot[0] - Math.cos(nextAngle) * wall.length,
            pivot[1] - Math.sin(nextAngle) * wall.length,
          ]
          wall.angle = nextAngle
        }
        return
      }

      // ── Boundary-wall branch: rigid rotation of connected chain ──────────────
      if (isBoundaryWall(this.walls, idx)) {
        this.rotateBoundaryChain(deltaRad, wallId, anchor)
        return
      }

      if (isBothConnectedWall(this.walls, idx)) {
        this.rotateOpenBothConnectedOneSide(deltaRad, wallId, anchor)
        return
      }

      // ── Open-chain fallback branch: original per-wall rotate logic ─────────
      const setWallFromPoints = (w: Room['walls'][number], start: Vec2, end: Vec2) => {
        const dx = end[0] - start[0]
        const dy = end[1] - start[1]
        const dist = Math.hypot(dx, dy)
        if (dist < 1) return
        w.position = [start[0], start[1]]
        w.length = dist
        w.angle = Math.atan2(dy, dx)
      }
      const translateWall = (i: number, dx: number, dy: number) => {
        const w = this.walls[i]!
        w.position = [w.position[0] + dx, w.position[1] + dy]
      }

      const oldStart: Vec2 = [wall.position[0], wall.position[1]]
      const oldEnd: Vec2 = [
        oldStart[0] + Math.cos(wall.angle) * wall.length,
        oldStart[1] + Math.sin(wall.angle) * wall.length,
      ]

      let newStart: Vec2 = [oldStart[0], oldStart[1]]
      let newEnd: Vec2 = [oldEnd[0], oldEnd[1]]

      if (anchor === 'start') {
        newEnd = [
          oldStart[0] + Math.cos(nextAngle) * wall.length,
          oldStart[1] + Math.sin(nextAngle) * wall.length,
        ]
      } else {
        newStart = [
          oldEnd[0] - Math.cos(nextAngle) * wall.length,
          oldEnd[1] - Math.sin(nextAngle) * wall.length,
        ]
      }

      wall.position = [newStart[0], newStart[1]]
      wall.angle = nextAngle

      const n = this.walls.length
      const nextIdx = (idx + 1) % n
      const epsilon = 1e-9

      if (anchor === 'start') {
        const dx = newEnd[0] - oldEnd[0]
        const dy = newEnd[1] - oldEnd[1]
        if (Math.abs(dx) >= epsilon || Math.abs(dy) >= epsilon) {
          for (let i = idx + 1; i < n; i += 1) {
            translateWall(i, dx, dy)
          }
        }
        return
      }

      const dx = newStart[0] - oldStart[0]
      const dy = newStart[1] - oldStart[1]
      if (Math.abs(dx) >= epsilon || Math.abs(dy) >= epsilon) {
        for (let i = 0; i < idx; i += 1) {
          translateWall(i, dx, dy)
        }
      }

      const nextNextIdx = (nextIdx + 1) % n
      const bridgeStart = wallEndPoint(wall)
      const bridgeEnd: Vec2 = [
        this.walls[nextNextIdx]!.position[0],
        this.walls[nextNextIdx]!.position[1],
      ]
      setWallFromPoints(this.walls[nextIdx]!, bridgeStart, bridgeEnd)
    },

    /** Place a new architectural item and return its ID. */
    addItem(item: Omit<PlacedItem, 'id'>): string {
      const nextItem = { ...item, id: createItemId() }
      nextItem.positionAlongWall = clampItemPositionAlongWall(nextItem, this.walls, nextItem.positionAlongWall)
      recalculateDoorWindowSidePositions(nextItem, this.walls)
      this.items.push(nextItem)
      return nextItem.id
    },

    /** Remove a placed item by ID. */
    removeItem(itemId: string) {
      const idx = this.items.findIndex((i) => i.id === itemId)
      if (idx !== -1) this.items.splice(idx, 1)
    },

    /** Move a placed item along its wall. */
    moveItem(itemId: string, positionAlongWall: number) {
      const item = this.items.find((i) => i.id === itemId)
      if (!item) return
      item.positionAlongWall = clampItemPositionAlongWall(item, this.walls, positionAlongWall)
      recalculateDoorWindowSidePositions(item, this.walls)
    },

    /** Update editable properties of a placed item. */
    updateItemProps(itemId: string, props: Partial<Pick<PlacedItem, 'width' | 'height' | 'leftPosition' | 'rightPosition' | 'elevation'>>) {
      const item = this.items.find((i) => i.id === itemId)
      if (!item) return
      if (props.width !== undefined) item.width = clampItemSize(props.width)
      if (props.height !== undefined) item.height = clampItemSize(props.height)
      if (props.elevation !== undefined) item.elevation = Math.max(0, props.elevation)
      item.positionAlongWall = clampItemPositionAlongWall(item, this.walls, item.positionAlongWall)
      recalculateDoorWindowSidePositions(item, this.walls)
    },

    /** Update room colors. */
    setColors(colors: Partial<RoomColors>) {
      Object.assign(this.colors, colors)
    },

    /** Clear all placed items. */
    clearItems() {
      this.items.splice(0, this.items.length)
    },

    /**
     * Set the horizontal offset of the closet inside the room.
     * Clamped so the cabinet stays within the room walls.
     * cabinetW is the total cabinet width in cm.
     */
    setClosetOffsetX(x: number, cabinetW = 0) {
      const wallSpan = closetWallOrFallback(this.walls)?.length
      const roomW = roomPlanBounds(this.walls).width
      const travelSpan = wallSpan ?? roomW
      const maxOffset = Math.max(0, (travelSpan - cabinetW) / 2)
      this.closetOffsetX = Math.max(-maxOffset, Math.min(maxOffset, x))
    },

    /**
     * Set the vertical offset of the closet from the floor.
     * Clamped between 0 (on the floor) and roomH - cabinetH.
     * cabinetH is the total cabinet height in cm.
     */
    setClosetOffsetY(y: number, cabinetH = 0) {
      const roomH = this.height ?? 244
      const maxOffset = Math.max(0, roomH - cabinetH)
      this.closetOffsetY = Math.max(0, Math.min(maxOffset, y))
    },

    /**
     * Set the front-to-back offset of the closet.
     * 0 = flush against the back wall, max = front of room.
     * cabinetD is the cabinet depth in cm.
     */
    setClosetOffsetZ(z: number, cabinetD = 0) {
      const roomD = roomPlanBounds(this.walls).depth
      const maxOffset = Math.max(0, roomD - cabinetD)
      this.closetOffsetZ = Math.max(0, Math.min(maxOffset, z))
    },

    /** Mark exactly one wall as the closet wall anchor. */
    setClosetWall(wallId: string) {
      this.walls.forEach((wall) => {
        wall.hasCloset = wall.id === wallId
      })
    },

    /**
     * Resize the room in plan space by scaling current geometry from center.
     * Width/depth are target bounds of the current wall layout.
     */
    resizeRoom(width: number, depth: number) {
      const w = clampWall(width)
      const d = clampWall(depth)
      if (this.walls.length === 0) return

      const bounds = roomPlanBounds(this.walls)
      const sourceW = Math.max(1, bounds.width)
      const sourceD = Math.max(1, bounds.depth)

      const scaleX = w / sourceW
      const scaleY = d / sourceD
      const cx = bounds.centerX
      const cy = bounds.centerY

      for (const wall of this.walls) {
        const start: Vec2 = [wall.position[0], wall.position[1]]
        const end = wallEndPoint(wall)

        const scaledStart: Vec2 = [
          cx + (start[0] - cx) * scaleX,
          cy + (start[1] - cy) * scaleY,
        ]
        const scaledEnd: Vec2 = [
          cx + (end[0] - cx) * scaleX,
          cy + (end[1] - cy) * scaleY,
        ]

        const dx = scaledEnd[0] - scaledStart[0]
        const dy = scaledEnd[1] - scaledStart[1]
        const nextLength = Math.hypot(dx, dy)
        if (nextLength < 1) continue

        wall.position = [scaledStart[0], scaledStart[1]]
        wall.length = nextLength
        wall.angle = normalizeAngle(Math.atan2(dy, dx))
      }

      if (this.walls.length === 4 && this.shape === 'rectangular') {
        this.shape = 'rectangular'
      }
    },

    // ─── Draw Walls actions ──────────────────────────────────────────

    /** Start a fresh draw-walls session. */
    startDrawWalls() {
      this.shape = 'custom'
      this.walls = []
      this.items = []
    },

    /** Append a new wall segment from the previous endpoint to (x, y). */
    addWallVertex(x: number, y: number, thickness = 6, firstStart?: Vec2) {
      const walls = this.walls
      let startPos: Vec2
      if (firstStart) {
        startPos = [firstStart[0], firstStart[1]]
      } else if (walls.length === 0) {
        // First actual segment must receive an explicit start vertex.
        return
      } else {
        const prev = walls[walls.length - 1]
        if (!prev) return
        // The end-point of the previous wall is its start + rotated length
        startPos = [
          prev.position[0] + Math.cos(prev.angle) * prev.length,
          prev.position[1] + Math.sin(prev.angle) * prev.length,
        ]
      }
      const segment = snapped45Segment(startPos, [x, y])
      if (!segment) return
      const wallThickness = Math.max(1, Math.min(30, thickness))

      walls.push({
        id: createWallId(),
        length: segment.length,
        position: [startPos[0], startPos[1]],
        angle: segment.angle,
        hasCloset: walls.length === 0,
        thickness: wallThickness,
        label: String(walls.length + 1),
        visible: true,
      })
    },

    /** Close the polygon by adding a final segment back to the first vertex. */
    closeRoom(thickness = 6) {
      const walls = this.walls
      if (walls.length < 2) return
      const first = walls[0]
      const last = walls[walls.length - 1]
      if (!first || !last) return
      const endOfLast: Vec2 = [
        last.position[0] + Math.cos(last.angle) * last.length,
        last.position[1] + Math.sin(last.angle) * last.length,
      ]
      const dx = first.position[0] - endOfLast[0]
      const dy = first.position[1] - endOfLast[1]
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1) return // already closed
      const wallThickness = Math.max(1, Math.min(30, thickness))
      const targetFirst: Vec2 = [first.position[0], first.position[1]]
      const snapped = snapped45Segment(endOfLast, targetFirst)

      let length = dist
      let angle = Math.atan2(dy, dx)
      // Prefer 45° closure when it reaches the exact first vertex. Otherwise,
      // close directly to preserve topology and avoid extra bridging walls.
      if (
        snapped &&
        Math.hypot(
          snapped.end[0] - targetFirst[0],
          snapped.end[1] - targetFirst[1],
        ) < 1
      ) {
        length = snapped.length
        angle = snapped.angle
      }

      walls.push({
        id: createWallId(),
        length,
        position: [endOfLast[0], endOfLast[1]],
        angle,
        hasCloset: false,
        thickness: wallThickness,
        label: String(walls.length + 1),
        visible: true,
      })
    },

    /** Remove the last wall segment (undo while drawing). */
    removeLastWall() {
      if (this.walls.length > 0) {
        this.walls.pop()
      }
    },

    /** Remove a wall segment by ID. */
    removeWall(wallId: string) {
      const idx = this.walls.findIndex((w) => w.id === wallId)
      if (idx < 0) return
      this.walls.splice(idx, 1)

      // Keep default wall numbering intuitive after deletion.
      this.walls.forEach((wall, i) => {
        wall.label = String(i + 1)
      })

      if (!this.walls.some((wall) => wall.hasCloset) && this.walls[0]) {
        this.walls[0].hasCloset = true
      }
    },

    /** Update properties of a single wall. */
    updateWallProps(wallId: string, props: Partial<{ length: number; thickness: number; label: string; visible: boolean }>) {
      const wall = this.walls.find((w) => w.id === wallId)
      if (!wall) return
      if (props.length !== undefined) wall.length = clampWall(props.length)
      if (props.thickness !== undefined) wall.thickness = Math.max(1, Math.min(30, props.thickness))
      if (props.label !== undefined) wall.label = props.label
      if (props.visible !== undefined) wall.visible = props.visible
    },

    /** Replace all walls (e.g. from import). */
    setRoomFromWalls(walls: Room['walls']) {
      this.walls = walls
      this.shape = walls.length === 4 ? 'rectangular' : 'custom'
      if (!this.walls.some((wall) => wall.hasCloset) && this.walls[0]) {
        this.walls[0].hasCloset = true
      }
    },
  },
})
