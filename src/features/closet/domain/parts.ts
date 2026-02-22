// ---------------------------------------------------------------------------
// Part types — v2 (extended for towers, dividers, accessories)
// ---------------------------------------------------------------------------

export type Vec3 = [number, number, number]

export type PartTransform = Readonly<{
  pos: Vec3
  rot: Vec3
}>

export type PartDims = Readonly<{
  x: number
  y: number
  z: number
}>

export type ClosetPartType =
  | 'panel_left'
  | 'panel_right'
  | 'panel_top'
  | 'panel_bottom'
  | 'panel_back'
  | 'shelf'
  | 'divider'
  | 'rod'
  | 'drawer_box'
  | 'shoe_shelf'

export type ClosetPart = Readonly<{
  id: string
  type: ClosetPartType
  dims: PartDims
  transform: PartTransform
  materialId: string
  /** Which tower this part belongs to (null for carcass panels). */
  towerId?: string
  meta?: Record<string, unknown>
}>
