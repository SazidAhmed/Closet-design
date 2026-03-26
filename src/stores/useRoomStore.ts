// ---------------------------------------------------------------------------
// Room store — floor plan state
// ---------------------------------------------------------------------------

import { defineStore } from 'pinia'
import type { Room, PlacedItem, RoomColors, Vec2 } from '../features/closet/domain/types/room'
import { createDefaultRoom, createItemId, createWallId } from '../features/closet/domain/types/room'
import { ROOM_CONSTRAINTS } from '../features/closet/domain/constraints'

function clampWall(v: number): number {
  return Math.max(ROOM_CONSTRAINTS.wallLength.min, Math.min(ROOM_CONSTRAINTS.wallLength.max, Math.round(v)))
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
    const half = 244 / 2
    return {
      minX: -half,
      maxX: half,
      minY: -half,
      maxY: half,
      width: 244,
      depth: 244,
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

function insideLeftPivot(vertices: Vec2[], wallIndex: number): Vec2 {
  const n = vertices.length
  const signedArea = polygonSignedArea(vertices)
  const wallStart = vertices[wallIndex]!
  const wallEnd = vertices[(wallIndex + 1) % n]!

  // Inside is derived from winding:
  // - positive signed area => clockwise wall order in this floor-plan space
  // - negative signed area => counterclockwise wall order
  //
  // "Left endpoint from inside" means: stand on the wall and face into the room.
  // Under that viewpoint in this screen-space coordinate system:
  // - clockwise order => left endpoint is wall START
  // - counterclockwise order => left endpoint is wall END
  return signedArea >= 0
    ? [wallStart[0], wallStart[1]]
    : [wallEnd[0], wallEnd[1]]
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
      const wall = this.walls.find((w) => w.id === wallId)
      if (wall) wall.length = length
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
     *  For a closed polygon this rotates the ENTIRE room rigidly.
     *  For an open chain, only the selected wall rotates (adjacent walls translate). */
    setWallAngle(wallId: string, angleRad: number, anchor: 'start' | 'end' = 'start') {
      const idx = this.walls.findIndex((w) => w.id === wallId)
      if (idx < 0 || !Number.isFinite(angleRad)) return

      // ── Closed-room branch: rigid rotation of the whole polygon ────────────
      if (this.roomIsClosed) {
        const wall = this.walls[idx]!
        const nextAngle = normalizeAngle(angleRad)
        const deltaRad = nextAngle - wall.angle
        this.rotateClosedRoom(deltaRad, wallId)
        return
      }

      // ── Open-chain branch: original per-wall rotate logic ──────────────────
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

      const wall = this.walls[idx]!
      const oldStart: Vec2 = [wall.position[0], wall.position[1]]
      const oldEnd: Vec2 = [
        oldStart[0] + Math.cos(wall.angle) * wall.length,
        oldStart[1] + Math.sin(wall.angle) * wall.length,
      ]

      const nextAngle = normalizeAngle(angleRad)
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

    /** Place a new architectural item. */
    addItem(item: Omit<PlacedItem, 'id'>) {
      this.items.push({ ...item, id: createItemId() })
    },

    /** Remove a placed item by ID. */
    removeItem(itemId: string) {
      const idx = this.items.findIndex((i) => i.id === itemId)
      if (idx !== -1) this.items.splice(idx, 1)
    },

    /** Move a placed item along its wall. */
    moveItem(itemId: string, positionAlongWall: number) {
      const item = this.items.find((i) => i.id === itemId)
      if (item) item.positionAlongWall = positionAlongWall
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
     * Resize a rectangular room — keeps opposite walls paired.
     * walls[0] & walls[2] = width, walls[1] & walls[3] = depth.
     */
    resizeRoom(width: number, depth: number) {
      const w = clampWall(width)
      const d = clampWall(depth)
      if (this.walls[0]) this.walls[0].length = w
      if (this.walls[2]) this.walls[2].length = w
      if (this.walls[1]) this.walls[1].length = d
      if (this.walls[3]) this.walls[3].length = d
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
      const wallThickness = Math.max(1, Math.min(30, Math.round(thickness)))

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
      const wallThickness = Math.max(1, Math.min(30, Math.round(thickness)))
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
