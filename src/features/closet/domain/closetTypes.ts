// ---------------------------------------------------------------------------
// Closet type definitions & presets
// ---------------------------------------------------------------------------

import type { Room } from './types/room'
import type { Tower } from './types/tower'
import type { CabinetDimensions } from './schema'
import { createDefaultRoom } from './types/room'
import { createDefaultTower } from './types/tower'

export type ClosetTypeName = 'reach_in' | 'walk_in' | 'custom'

export type ClosetTypeOption = {
  name: ClosetTypeName
  label: string
  description: string
  /** Default room dimensions for this type (cm). */
  roomWidth: number
  roomDepth: number
  roomHeight: number
  /** Factory that produces the default room for this type. */
  createRoom: () => Room
  /** Factory that produces the default cabinet dimensions. */
  createCabinet: () => CabinetDimensions
  /** Factory that produces the default tower configuration. */
  createTowers: () => Tower[]
}

export const CLOSET_TYPES: ClosetTypeOption[] = [
  {
    name: 'reach_in',
    label: 'Reach-In Closet',
    description: 'A standard closet accessed from the front, typically 2-8 feet wide. Great for bedrooms, hallways, and entryways.',
    roomWidth: 183,    // ~6 ft
    roomDepth: 61,     // ~2 ft
    roomHeight: 244,   // ~8 ft
    createRoom: () => createDefaultRoom(183, 61, 244),
    createCabinet: () => ({ width: 183, height: 213, depth: 61, thickness: 2 }),
    createTowers: () => [
      createDefaultTower(91.5, 61, 213, 1),
      createDefaultTower(91.5, 61, 213, 2),
    ],
  },
  {
    name: 'walk_in',
    label: 'Walk-In Closet',
    description: 'A spacious room-sized closet you can walk into. Configure towers on multiple walls with full customization.',
    roomWidth: 244,    // ~8 ft
    roomDepth: 244,    // ~8 ft
    roomHeight: 244,   // ~8 ft
    createRoom: () => createDefaultRoom(244, 244, 244),
    createCabinet: () => ({ width: 244, height: 213, depth: 61, thickness: 2 }),
    createTowers: () => [
      createDefaultTower(61, 61, 213, 1),
      createDefaultTower(61, 61, 213, 2),
      createDefaultTower(61, 61, 213, 3),
      createDefaultTower(61, 61, 213, 4),
    ],
  },
  {
    name: 'custom',
    label: 'Custom Layout',
    description: 'Start with a blank room and design everything from scratch. Full control over room shape, walls, and closet placement.',
    roomWidth: 244,
    roomDepth: 244,
    roomHeight: 244,
    createRoom: () => createDefaultRoom(244, 244, 244),
    createCabinet: () => ({ width: 120, height: 213, depth: 61, thickness: 2 }),
    createTowers: () => [
      createDefaultTower(120, 61, 213, 1),
    ],
  },
]

export function getClosetType(name: ClosetTypeName): ClosetTypeOption {
  return CLOSET_TYPES.find((t) => t.name === name) ?? CLOSET_TYPES[0]!
}

// ---- Auto-create presets (used in Design Closet → Auto Create tab) --------

export type AutoCreatePreset = {
  id: string
  label: string
  description: string
  createTowers: (cabinetWidth: number, depth: number, height: number) => Tower[]
}

export const AUTO_CREATE_PRESETS: AutoCreatePreset[] = [
  {
    id: 'basic-shelves',
    label: 'Basic Shelves',
    description: 'Simple shelving towers across the full width.',
    createTowers: (w, d, h) => {
      const towerCount = Math.max(1, Math.round(w / 60))
      const tw = w / towerCount
      return Array.from({ length: towerCount }, (_, i) =>
        createDefaultTower(tw, d, h, i + 1),
      )
    },
  },
  {
    id: 'hanging-and-shelves',
    label: 'Hanging + Shelves',
    description: 'Equal mix of hanging rods and shelf towers.',
    createTowers: (w, d, h) => {
      const towerCount = Math.max(2, Math.round(w / 60))
      const tw = w / towerCount
      return Array.from({ length: towerCount }, (_, i) => {
        const tower = createDefaultTower(tw, d, h, i + 1)
        if (i % 2 === 0) {
          tower.accessories = [
            { type: 'rod', position: 'high', count: 1 },
            { type: 'rod', position: 'low', count: 1 },
          ]
        } else {
          tower.accessories = [
            { type: 'shelf_set', count: 5 },
          ]
        }
        return tower
      })
    },
  },
  {
    id: 'double-hang',
    label: 'Double Hang',
    description: 'Two rods stacked vertically in each tower — maximizes hanging space.',
    createTowers: (w, d, h) => {
      const towerCount = Math.max(1, Math.round(w / 60))
      const tw = w / towerCount
      return Array.from({ length: towerCount }, (_, i) => {
        const tower = createDefaultTower(tw, d, h, i + 1)
        tower.accessories = [
          { type: 'rod', position: 'high', count: 1 },
          { type: 'rod', position: 'low', count: 1 },
        ]
        return tower
      })
    },
  },
  {
    id: 'drawers-and-shelves',
    label: 'Drawers + Shelves',
    description: 'Alternating drawer and shelf towers for maximum organization.',
    createTowers: (w, d, h) => {
      const towerCount = Math.max(2, Math.round(w / 60))
      const tw = w / towerCount
      return Array.from({ length: towerCount }, (_, i) => {
        const tower = createDefaultTower(tw, d, h, i + 1)
        if (i % 2 === 0) {
          tower.accessories = [
            { type: 'drawer', count: 3, drawerHeight: 15 },
            { type: 'shelf_set', count: 2 },
          ]
        } else {
          tower.accessories = [
            { type: 'shelf_set', count: 5 },
          ]
        }
        return tower
      })
    },
  },
  {
    id: 'shoe-closet',
    label: 'Shoe Closet',
    description: 'Dedicated shoe shelves with hanging rods above.',
    createTowers: (w, d, h) => {
      const towerCount = Math.max(2, Math.round(w / 60))
      const tw = w / towerCount
      return Array.from({ length: towerCount }, (_, i) => {
        const tower = createDefaultTower(tw, d, h, i + 1)
        tower.accessories = [
          { type: 'rod', position: 'high', count: 1 },
          { type: 'shoe_shelf', count: 4 },
        ]
        return tower
      })
    },
  },
]
