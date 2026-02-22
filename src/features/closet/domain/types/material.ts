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
