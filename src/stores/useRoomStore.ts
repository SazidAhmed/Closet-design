// ---------------------------------------------------------------------------
// Room store — floor plan state
// ---------------------------------------------------------------------------

import { defineStore } from 'pinia'
import type { Room, PlacedItem, RoomColors } from '../features/closet/domain/types/room'
import { createDefaultRoom, createItemId } from '../features/closet/domain/types/room'
import { ROOM_CONSTRAINTS } from '../features/closet/domain/constraints'

function clampWall(v: number): number {
  return Math.max(ROOM_CONSTRAINTS.wallLength.min, Math.min(ROOM_CONSTRAINTS.wallLength.max, Math.round(v)))
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
      const roomW = this.walls[0]?.length ?? 244
      const maxOffset = Math.max(0, (roomW - cabinetW) / 2)
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
      const roomD = this.walls[1]?.length ?? 244
      const maxOffset = Math.max(0, roomD - cabinetD)
      this.closetOffsetZ = Math.max(0, Math.min(maxOffset, z))
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
  },
})
