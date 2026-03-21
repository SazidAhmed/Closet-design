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

    /** Rotate a wall to the provided angle in radians. */
    setWallAngle(wallId: string, angleRad: number, anchor: 'start' | 'end' = 'start') {
      const wall = this.walls.find((w) => w.id === wallId)
      if (!wall || !Number.isFinite(angleRad)) return

      const nextAngle = Math.atan2(Math.sin(angleRad), Math.cos(angleRad))
      if (anchor === 'end') {
        const endX = wall.position[0] + Math.cos(wall.angle) * wall.length
        const endY = wall.position[1] + Math.sin(wall.angle) * wall.length
        wall.position = [
          endX - Math.cos(nextAngle) * wall.length,
          endY - Math.sin(nextAngle) * wall.length,
        ]
      }

      wall.angle = nextAngle
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
      const dx = x - startPos[0]
      const dy = y - startPos[1]
      const length = Math.sqrt(dx * dx + dy * dy)
      if (length < 1) return
      const angle = Math.atan2(dy, dx)
      const wallThickness = Math.max(1, Math.min(30, Math.round(thickness)))

      walls.push({
        id: createWallId(),
        length: Math.round(length),
        position: [startPos[0], startPos[1]],
        angle,
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
      const angle = Math.atan2(dy, dx)
      const wallThickness = Math.max(1, Math.min(30, Math.round(thickness)))
      walls.push({
        id: createWallId(),
        length: Math.round(dist),
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
