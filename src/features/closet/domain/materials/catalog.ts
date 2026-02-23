// ---------------------------------------------------------------------------
// Seeded material & handle catalogs
// ---------------------------------------------------------------------------

import type { Material, HandleStyle } from '../types/material'

// ---- Finish materials (carcass / panel surfaces) --------------------------

export const FINISH_MATERIALS: Material[] = [
  {
    id: 'miami-linen',
    label: 'Miami Linen',
    category: 'finish',
    colorHex: '#d7d1c7',
    textureUrl: 'proc:linen',
    roughness: 0.9,
    metalness: 0,
    pricePerSqFt: 4.5,
  },
  {
    id: 'classic-white',
    label: 'Classic White',
    category: 'finish',
    colorHex: '#f0ece6',
    roughness: 0.85,
    metalness: 0,
    pricePerSqFt: 4.0,
  },
  {
    id: 'driftwood',
    label: 'Driftwood',
    category: 'finish',
    colorHex: '#a89985',
    textureUrl: 'proc:driftwood',
    roughness: 0.92,
    metalness: 0,
    pricePerSqFt: 5.0,
  },
  {
    id: 'espresso',
    label: 'Espresso',
    category: 'finish',
    colorHex: '#3e2c23',
    textureUrl: 'proc:espresso',
    roughness: 0.88,
    metalness: 0,
    pricePerSqFt: 5.0,
  },
  {
    id: 'walnut',
    label: 'Walnut',
    category: 'finish',
    colorHex: '#6b4c3b',
    textureUrl: 'proc:walnut',
    roughness: 0.9,
    metalness: 0,
    pricePerSqFt: 6.0,
  },
  {
    id: 'storm-grey',
    label: 'Storm Grey',
    category: 'finish',
    colorHex: '#6b717d',
    roughness: 0.87,
    metalness: 0,
    pricePerSqFt: 5.0,
  },
  {
    id: 'midnight-blue',
    label: 'Midnight Blue',
    category: 'finish',
    colorHex: '#2c3e5a',
    roughness: 0.88,
    metalness: 0,
    pricePerSqFt: 5.5,
  },
  {
    id: 'chocolate',
    label: 'Chocolate',
    category: 'finish',
    colorHex: '#4a3728',
    textureUrl: 'proc:chocolate',
    roughness: 0.9,
    metalness: 0,
    pricePerSqFt: 5.0,
  },
  {
    id: 'ivory',
    label: 'Ivory',
    category: 'finish',
    colorHex: '#ece5d5',
    roughness: 0.85,
    metalness: 0,
    pricePerSqFt: 4.5,
  },
  {
    id: 'charcoal',
    label: 'Charcoal',
    category: 'finish',
    colorHex: '#36373a',
    roughness: 0.88,
    metalness: 0,
    pricePerSqFt: 5.0,
  },
]

// ---- Backing materials ----------------------------------------------------

export const BACKING_MATERIALS: Material[] = [
  {
    id: 'backing-white',
    label: 'White',
    category: 'backing',
    colorHex: '#f0ece6',
    roughness: 0.95,
    metalness: 0,
    pricePerSqFt: 2.0,
  },
  {
    id: 'backing-match',
    label: 'Match Finish',
    category: 'backing',
    colorHex: '#d7d1c7',
    roughness: 0.95,
    metalness: 0,
    pricePerSqFt: 3.0,
  },
  {
    id: 'backing-none',
    label: 'No Backing',
    category: 'backing',
    colorHex: '#888888',
    roughness: 1,
    metalness: 0,
    pricePerSqFt: 0,
  },
]

// ---- Floor materials (cosmetic) -------------------------------------------

export const FLOOR_MATERIALS: Material[] = [
  {
    id: 'floor-hardwood',
    label: 'Hardwood',
    category: 'floor',
    colorHex: '#b5906b',
    textureUrl: 'proc:hardwood-floor',
    roughness: 0.8,
    metalness: 0,
    pricePerSqFt: 0,
  },
  {
    id: 'floor-tile',
    label: 'Tile',
    category: 'floor',
    colorHex: '#c9c3b9',
    roughness: 0.6,
    metalness: 0,
    pricePerSqFt: 0,
  },
  {
    id: 'floor-carpet',
    label: 'Carpet',
    category: 'floor',
    colorHex: '#d4c9b8',
    textureUrl: 'proc:carpet',
    roughness: 1.0,
    metalness: 0,
    pricePerSqFt: 0,
  },
  {
    id: 'floor-default',
    label: 'Default',
    category: 'floor',
    colorHex: '#d4c9b8',
    roughness: 0.9,
    metalness: 0,
    pricePerSqFt: 0,
  },
]

// ---- Door finish materials ------------------------------------------------

export const DOOR_MATERIALS: Material[] = [
  {
    id: 'door-bronze',
    label: 'Bronze',
    category: 'door',
    colorHex: '#8b7355',
    roughness: 0.7,
    metalness: 0.3,
    pricePerSqFt: 0,
  },
  {
    id: 'door-walnut',
    label: 'Walnut',
    category: 'door',
    colorHex: '#6b4c3b',
    roughness: 0.85,
    metalness: 0,
    pricePerSqFt: 0,
  },
  {
    id: 'door-white',
    label: 'White',
    category: 'door',
    colorHex: '#f0ece6',
    roughness: 0.85,
    metalness: 0,
    pricePerSqFt: 0,
  },
]

// ---- Handle styles --------------------------------------------------------

export const HANDLE_STYLES: HandleStyle[] = [
  { id: 'handle-none', label: 'None', colorHex: 'transparent', price: 0 },
  { id: 'polished-chrome', label: 'Polished Chrome', colorHex: '#c0c0c0', price: 8.0 },
  { id: 'brushed-chrome', label: 'Brushed Chrome', colorHex: '#a8a8a8', price: 8.0 },
  { id: 'brass', label: 'Brass', colorHex: '#d4a843', price: 10.0 },
  { id: 'nickel', label: 'Nickel', colorHex: '#b0b0b0', price: 9.0 },
  { id: 'bronze-handle', label: 'Bronze', colorHex: '#8b6914', price: 10.0 },
  { id: 'black-metal', label: 'Black Metal', colorHex: '#1a1a1a', price: 9.0 },
]

// ---- Wall color palette ---------------------------------------------------

export type ColorSwatch = { id: string; label: string; colorHex: string }

export const WALL_COLORS: ColorSwatch[] = [
  { id: 'wall-linen',     label: 'Linen',       colorHex: '#e8e4de' },
  { id: 'wall-sand',      label: 'Sand',        colorHex: '#d4c9b8' },
  { id: 'wall-cream',     label: 'Cream',       colorHex: '#f5f0e8' },
  { id: 'wall-stone',     label: 'Stone',       colorHex: '#c5bfb3' },
  { id: 'wall-white',     label: 'White',       colorHex: '#f8f6f2' },
  { id: 'wall-sage',      label: 'Sage',        colorHex: '#c6ccbe' },
  { id: 'wall-pearl',     label: 'Pearl',       colorHex: '#e6ddd0' },
  { id: 'wall-dove',      label: 'Dove Grey',   colorHex: '#c2bdb6' },
]

// ---- Trim color palette ---------------------------------------------------

export const TRIM_COLORS: ColorSwatch[] = [
  { id: 'trim-white',      label: 'White',        colorHex: '#ffffff' },
  { id: 'trim-ivory',      label: 'Ivory',        colorHex: '#f0ece6' },
  { id: 'trim-sand',       label: 'Sand',         colorHex: '#d4c9b8' },
  { id: 'trim-taupe',      label: 'Taupe',        colorHex: '#8b7e6e' },
  { id: 'trim-charcoal',   label: 'Charcoal',     colorHex: '#4a4a4a' },
]

// ---- Lookup helpers -------------------------------------------------------

const _allMaterials = [
  ...FINISH_MATERIALS,
  ...BACKING_MATERIALS,
  ...FLOOR_MATERIALS,
  ...DOOR_MATERIALS,
]

const _materialsById = new Map(_allMaterials.map((m) => [m.id, m]))
const _handlesById = new Map(HANDLE_STYLES.map((h) => [h.id, h]))

export function getMaterial(id: string): Material | undefined {
  return _materialsById.get(id)
}

export function getHandle(id: string): HandleStyle | undefined {
  return _handlesById.get(id)
}
