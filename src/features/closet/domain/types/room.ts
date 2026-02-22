// ---------------------------------------------------------------------------
// Room / Floor-plan domain types
// ---------------------------------------------------------------------------

export type Vec2 = [number, number]

/** A single wall segment in the room. */
export type Wall = {
  id: string
  /** Wall length in current units (cm or inches). */
  length: number
  /** Start position of the wall (x, y) in floor-plan coordinates. */
  position: Vec2
  /** Angle of the wall in radians (0 = along +X axis). */
  angle: number
  /** Whether a closet section is placed against this wall. */
  hasCloset: boolean
}

// ---- Placed architectural items -------------------------------------------

export type DoorSubtype =
  | 'wall_opening'
  | 'double_door'
  | 'single_door'
  | 'sliding_door'
  | 'bifold_door'

export type ArchitectureSubtype =
  | 'rect_column'
  | 'round_column'
  | 'interior_wall'

export type WallDecoratorSubtype =
  | 'window'
  | 'vent'
  | 'outlet'
  | 'light_switch'
  | 'wall_photo'
  | 'floor_photo'

export type PlacedItemType = DoorSubtype | ArchitectureSubtype | WallDecoratorSubtype

export type PlacedItemCategory = 'door' | 'architecture' | 'wall_decorator'

/** An item placed on a wall or on the floor of the room. */
export type PlacedItem = {
  id: string
  type: PlacedItemType
  category: PlacedItemCategory
  /** Which wall the item is attached to (null for freestanding floor items like columns). */
  wallId: string | null
  /** Position along the wall (0..1 normalised, or absolute offset in units). */
  positionAlongWall: number
  /** Width of the item in current units. */
  width: number
  /** Height of the item in current units. */
  height: number
}

// ---- Room cosmetic options ------------------------------------------------

export type RoomColors = {
  floorFinishId: string
  floorColor: string
  wallColor: string
  trimColor: string
}

// ---- Room aggregate -------------------------------------------------------

export type RoomShape = 'rectangular' | 'l_shape' | 'custom'

export type Room = {
  shape: RoomShape
  walls: Wall[]
  /** Ceiling height in current units. */
  height: number
  /** Placed architectural items (doors, windows, columns, etc.). */
  items: PlacedItem[]
  colors: RoomColors
}

// ---- Factory helpers ------------------------------------------------------

let _wallIdCounter = 0
export function createWallId(): string {
  return `wall_${++_wallIdCounter}_${Date.now().toString(36)}`
}

let _itemIdCounter = 0
export function createItemId(): string {
  return `item_${++_itemIdCounter}_${Date.now().toString(36)}`
}

export function createDefaultRoomColors(): RoomColors {
  return {
    floorFinishId: 'floor-default',
    floorColor: '#d4c9b8',
    wallColor: '#e8e4de',
    trimColor: '#ffffff',
  }
}

/**
 * Create a default rectangular room (4 walls).
 * Default is 8ft × 8ft = 243.84cm × 243.84cm (≈244cm).
 */
export function createDefaultRoom(widthCm = 244, depthCm = 244, heightCm = 244): Room {
  const hw = widthCm / 2
  const hd = depthCm / 2

  return {
    shape: 'rectangular',
    walls: [
      { id: createWallId(), length: widthCm, position: [-hw, -hd], angle: 0, hasCloset: false },            // bottom
      { id: createWallId(), length: depthCm, position: [hw, -hd], angle: Math.PI / 2, hasCloset: false },   // right
      { id: createWallId(), length: widthCm, position: [hw, hd], angle: Math.PI, hasCloset: true },         // top (closet wall)
      { id: createWallId(), length: depthCm, position: [-hw, hd], angle: (3 * Math.PI) / 2, hasCloset: false }, // left
    ],
    height: heightCm,
    items: [],
    colors: createDefaultRoomColors(),
  }
}
