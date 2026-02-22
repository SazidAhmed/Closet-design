// ---------------------------------------------------------------------------
// Domain constraints — v2 (extended for towers + accessories)
// ---------------------------------------------------------------------------

export const CABINET_CONSTRAINTS = {
  width: { min: 30, max: 600 },
  height: { min: 100, max: 300 },
  depth: { min: 30, max: 100 },
  thickness: { min: 1, max: 6 },
} as const

export const TOWER_CONSTRAINTS = {
  width: { min: 20, max: 200 },
  depth: { min: 20, max: 100 },
  height: { min: 50, max: 300 },
  maxPerCloset: 12,
} as const

export const ACCESSORY_CONSTRAINTS = {
  shelves: { min: 0, max: 10 },
  rods: { min: 0, max: 2 },
  drawers: { min: 0, max: 6 },
  drawerHeight: { min: 8, max: 30 },
  shoeShelf: { min: 0, max: 8 },
} as const

export const ROOM_CONSTRAINTS = {
  wallLength: { min: 30, max: 1200 },
  height: { min: 200, max: 400 },
} as const
