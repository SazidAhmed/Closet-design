// ---------------------------------------------------------------------------
// Tower & Accessory domain types
// ---------------------------------------------------------------------------

/** An accessory placed inside a tower. */
export type RodAccessory = {
  type: 'rod'
  /** Vertical position of the rod within the tower. */
  position: 'high' | 'medium' | 'low'
  /** Number of rods (1 = single, 2 = double). */
  count: 1 | 2
}

export type ShelfSetAccessory = {
  type: 'shelf_set'
  /** Number of shelves in this set. */
  count: number
}

export type ShoeShelfAccessory = {
  type: 'shoe_shelf'
  /** Number of angled shoe shelf slots. */
  count: number
}

export type DrawerAccessory = {
  type: 'drawer'
  /** Number of drawers stacked vertically. */
  count: number
  /** Height of each drawer in current units. */
  drawerHeight: number
}

export type PropAccessory = {
  type: 'prop'
  /** ID referencing a decorative prop (clothes, shoes, etc.). */
  propId: string
}

export type Accessory =
  | RodAccessory
  | ShelfSetAccessory
  | ShoeShelfAccessory
  | DrawerAccessory
  | PropAccessory

/** Accessory level used by the slider UI (None / Low / Medium / High). */
export type AccessoryLevel = 'none' | 'low' | 'medium' | 'high'

/** A single vertical section (tower) inside the closet. */
export type Tower = {
  id: string
  /** Display label (e.g. "Tower 1"). */
  label: string
  /** Width of the tower in current units. */
  width: number
  /** Depth override (if different from the overall cabinet depth). */
  depth: number
  /** Height override (if different from the overall cabinet height). */
  height: number
  /** Accessories placed inside this tower. */
  accessories: Accessory[]
}

// ---- Factory helpers ------------------------------------------------------

let _towerIdCounter = 0
export function createTowerId(): string {
  return `tower_${++_towerIdCounter}_${Date.now().toString(36)}`
}

/** Standard tower depth options (in cm — roughly matching 14", 16", 20", 24"). */
export const TOWER_DEPTH_OPTIONS = [
  { label: '14"', valueCm: 35.5 },
  { label: '16"', valueCm: 40.6 },
  { label: '20"', valueCm: 50.8 },
  { label: '24"', valueCm: 61.0 },
] as const

/** Standard tower height options (in cm — roughly matching 84", 96"). */
export const TOWER_HEIGHT_OPTIONS = [
  { label: '84"', valueCm: 213.4 },
  { label: '96"', valueCm: 243.8 },
] as const

/**
 * Map a slider level to a concrete accessory count/config.
 */
export function accessoryLevelToCount(level: AccessoryLevel): number {
  switch (level) {
    case 'none': return 0
    case 'low': return 1
    case 'medium': return 3
    case 'high': return 5
  }
}

/**
 * Create a default tower with basic shelves.
 */
export function createDefaultTower(
  width = 60,
  depth = 61,
  height = 213.4,
  index = 1,
): Tower {
  return {
    id: createTowerId(),
    label: `Tower ${index}`,
    width,
    depth,
    height,
    accessories: [
      { type: 'rod', position: 'high', count: 1 },
      { type: 'shelf_set', count: 3 },
    ],
  }
}
