// ---------------------------------------------------------------------------
// Closet Schema v2 — with Room, Towers, Accessories, Materials
// ---------------------------------------------------------------------------

import type { Room } from './types/room'
import type { Tower } from './types/tower'
import type { ClosetMaterials, ArchitecturalDoorOptions } from './types/material'
import type { ClosetTypeName } from './closetTypes'
import { createDefaultRoom } from './types/room'
import { createDefaultTower } from './types/tower'
import { createDefaultClosetMaterials, createDefaultDoorOptions } from './types/material'

// ---- Keep v1 backward compat types exported for migration -----------------

export const CLOSET_SCHEMA_VERSION = 2 as const

export type Units = 'cm' | 'in'

export type ClosetSchemaVersion = typeof CLOSET_SCHEMA_VERSION

export type CabinetDimensions = {
  width: number
  height: number
  depth: number
  thickness: number
}

// ---- v2 state -------------------------------------------------------------

export type ClosetStateV2 = {
  schemaVersion: 2
  units: Units
  closetType: ClosetTypeName
  room: Room
  cabinet: CabinetDimensions
  towers: Tower[]
  materials: ClosetMaterials
  doorOptions: ArchitecturalDoorOptions
}

export function createDefaultClosetState(): ClosetStateV2 {
  return {
    schemaVersion: 2,
    units: 'cm',
    closetType: 'walk_in',
    room: createDefaultRoom(),
    cabinet: {
      width: 244,
      height: 213,
      depth: 61,
      thickness: 2,
    },
    towers: [
      createDefaultTower(61, 61, 213, 1),
      createDefaultTower(61, 61, 213, 2),
      createDefaultTower(61, 61, 213, 3),
      createDefaultTower(61, 61, 213, 4),
    ],
    materials: createDefaultClosetMaterials(),
    doorOptions: createDefaultDoorOptions(),
  }
}

// ---- Clamp helper ---------------------------------------------------------

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

/**
 * Returns a JSON-safe payload that is stable for backend pricing/BOM.
 */
export function exportForBackend(state: ClosetStateV2) {
  return {
    schemaVersion: CLOSET_SCHEMA_VERSION,
    units: state.units,
    closetType: state.closetType,
    cabinet: {
      width: clamp(Number(state.cabinet.width) || 0, 30, 600),
      height: clamp(Number(state.cabinet.height) || 0, 100, 300),
      depth: clamp(Number(state.cabinet.depth) || 0, 30, 100),
      thickness: clamp(Number(state.cabinet.thickness) || 0, 1, 6),
    },
    towers: state.towers.map((t) => ({
      id: t.id,
      label: t.label,
      width: clamp(Number(t.width) || 0, 20, 200),
      depth: clamp(Number(t.depth) || 0, 20, 100),
      height: clamp(Number(t.height) || 0, 50, 300),
      accessories: t.accessories,
    })),
    materials: { ...state.materials },
    doorOptions: { ...state.doorOptions },
    room: {
      shape: state.room.shape,
      height: state.room.height,
      wallCount: state.room.walls.length,
      colors: { ...state.room.colors },
    },
  }
}

// ---- v1 backward compatibility (migration) --------------------------------

export type ClosetMaterialsV1 = {
  carcassMaterialId: string
  backMaterialId: string
  edgeBandingId: string
}

export type ClosetStateV1 = {
  schemaVersion: 1
  units: 'cm'
  cabinet: CabinetDimensions
  shelves: number
  materials: ClosetMaterialsV1
}

export function migrateV1toV2(v1: ClosetStateV1): ClosetStateV2 {
  const state = createDefaultClosetState()

  // Preserve cabinet dimensions
  state.cabinet = { ...v1.cabinet }

  // Convert single-shelf config into a single tower with shelf_set
  state.towers = [
    {
      id: 'tower_migrated_1',
      label: 'Tower 1',
      width: v1.cabinet.width,
      depth: v1.cabinet.depth,
      height: v1.cabinet.height,
      accessories: [
        { type: 'shelf_set', count: v1.shelves },
      ],
    },
  ]

  // Map old material IDs
  state.materials = {
    finishId: v1.materials.carcassMaterialId === 'carcass-default' ? 'miami-linen' : v1.materials.carcassMaterialId,
    backingId: v1.materials.backMaterialId === 'back-default' ? 'backing-white' : v1.materials.backMaterialId,
    handleStyleId: 'handle-none',
  }

  return state
}
