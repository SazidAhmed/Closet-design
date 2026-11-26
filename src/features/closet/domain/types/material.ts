// ---------------------------------------------------------------------------
// Material & Handle catalog types
// ---------------------------------------------------------------------------

export type MaterialCategory = 'finish' | 'backing' | 'floor' | 'door'

/** A single material entry in the catalog. */
export type Material = {
  id: string
  label: string
  category: MaterialCategory
  colorHex: string
  /** Optional texture image URL (for 3D rendering and swatch thumbnails). */
  textureUrl?: string
  roughness: number
  metalness: number
  /** Price per square foot (for quote calculation). */
  pricePerSqFt: number
}

/** Handle finish options. */
export type HandleStyle = {
  id: string
  label: string
  colorHex: string
  textureUrl?: string
  /** Flat price per handle. */
  price: number
}

/** Closet material selections (what the user has picked). */
export type ClosetMaterials = {
  finishId: string
  backingId: string
  handleStyleId: string
  [key: string]: any
}

/** Full Room / Closet materials structure matching Dia-Website */
export type RoomMaterials = {
  box_materials: any | null
  box_material_colors: any | null
  door_types: any | null
  door_finish_materials: any | null
  glass_or_mirror: any | null
  glass_mirror_type: any | null
  door_finish_material_colors: any | null
  grains: any | null
  drawer_types: any | null
  drawer_materials: any | null
  // Backward compatibility keys
  finishId?: string
  backingId?: string
  handleStyleId?: string
  [key: string]: any
}

/** Architectural door option selections. */
export type ArchitecturalDoorOptions = {
  handleFinish: string
  doorFinishId: string
  doorColor: string
  plainPanels: boolean
}

// ---- Defaults -------------------------------------------------------------

export function createDefaultClosetMaterials(): ClosetMaterials {
  return {
    finishId: 'miami-linen',
    backingId: 'backing-white',
    handleStyleId: 'handle-none',
    box_materials: null,
    box_material_colors: null,
    door_types: null,
    door_finish_materials: null,
    glass_or_mirror: null,
    glass_mirror_type: null,
    door_finish_material_colors: null,
    grains: null,
    drawer_types: null,
    drawer_materials: null,
  }
}

export function createDefaultRoomMaterials(): RoomMaterials {
  return {
    box_materials: null,
    box_material_colors: null,
    door_types: null,
    door_finish_materials: null,
    glass_or_mirror: null,
    glass_mirror_type: null,
    door_finish_material_colors: null,
    grains: null,
    drawer_types: null,
    drawer_materials: null,
  }
}

export function createDefaultDoorOptions(): ArchitecturalDoorOptions {
  return {
    handleFinish: 'polished-chrome',
    doorFinishId: 'door-bronze',
    doorColor: '#8b7355',
    plainPanels: false,
  }
}
