import type { Room, RoomShape, Vec2, Wall } from './types/room'
import {
  DEFAULT_WALL_HEIGHT_IN,
  createDefaultRoomColors,
  createWallId,
} from './types/room'

type QuickPresetDef = {
  id: string
  label: string
  description: string
  shape: RoomShape
  points: Vec2[]
  closetWallIndex: number
}

export type QuickRoomPreset = {
  id: string
  label: string
  description: string
  shape: RoomShape
  createRoom: (heightIn?: number) => Room
}

// Internal units are now inches, so we just use the raw values
const IN = 1

const QUICK_PRESET_DEFS: QuickPresetDef[] = [
  {
    id: 'square-100',
    label: 'Square 100 x 100',
    description: 'Closed room, 100in by 100in.',
    shape: 'rectangular',
    points: [
      [-50 * IN, -50 * IN],
      [50 * IN, -50 * IN],
      [50 * IN, 50 * IN],
      [-50 * IN, 50 * IN],
      [-50 * IN, -50 * IN],
    ],
    closetWallIndex: 0,
  },
  {
    id: 'u-open',
    label: 'Open U 100 x 100',
    description: 'Open U profile with 24in return walls.',
    shape: 'custom',
    points: [
      [-26 * IN, 50 * IN],
      [-50 * IN, 50 * IN],
      [-50 * IN, -50 * IN],
      [50 * IN, -50 * IN],
      [50 * IN, 50 * IN],
      [26 * IN, 50 * IN],
    ],
    closetWallIndex: 2,
  },
  {
    id: 'l-open',
    label: 'Open L 100 x 100',
    description: 'Open L profile with 24in returns on opposite ends.',
    shape: 'custom',
    points: [
      [-50 * IN, -26 * IN],
      [-50 * IN, -50 * IN],
      [50 * IN, -50 * IN],
      [50 * IN, 50 * IN],
      [26 * IN, 50 * IN],
    ],
    closetWallIndex: 2,
  },
  {
    id: 'top-bridge-open',
    label: 'Top Bridge 100',
    description: 'Top wall with two 24in side returns.',
    shape: 'custom',
    points: [
      [-50 * IN, -26 * IN],
      [-50 * IN, -50 * IN],
      [50 * IN, -50 * IN],
      [50 * IN, -26 * IN],
    ],
    closetWallIndex: 1,
  },
]

function wallsFromPoints(points: Vec2[], closetWallIndex: number): Wall[] {
  const walls: Wall[] = []

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i]!
    const end = points[i + 1]!
    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    const length = Math.hypot(dx, dy)
    if (length < 1) continue

    walls.push({
      id: createWallId(),
      length,
      position: [start[0], start[1]],
      angle: Math.atan2(dy, dx),
      hasCloset: i === closetWallIndex,
      thickness: 5.0,
      label: String(walls.length + 1),
      visible: true,
    })
  }

  if (!walls.some((wall) => wall.hasCloset) && walls[0]) {
    walls[0].hasCloset = true
  }

  return walls
}

function roomFromDef(def: QuickPresetDef, heightIn = DEFAULT_WALL_HEIGHT_IN): Room {
  return {
    shape: def.shape,
    walls: wallsFromPoints(def.points, def.closetWallIndex),
    height: heightIn,
    items: [],
    colors: createDefaultRoomColors(),
  }
}

export const DEFAULT_QUICK_ROOM_PRESET_ID = QUICK_PRESET_DEFS[0]!.id

export const QUICK_ROOM_PRESETS: QuickRoomPreset[] = QUICK_PRESET_DEFS.map((def) => ({
  id: def.id,
  label: def.label,
  description: def.description,
  shape: def.shape,
  createRoom: (heightIn = DEFAULT_WALL_HEIGHT_IN) => roomFromDef(def, heightIn),
}))

export function createQuickRoomFromPreset(
  presetId: string,
  heightIn = DEFAULT_WALL_HEIGHT_IN,
): Room {
  const preset = QUICK_ROOM_PRESETS.find((entry) => entry.id === presetId) ?? QUICK_ROOM_PRESETS[0]!
  return preset.createRoom(heightIn)
}
