// ---------------------------------------------------------------------------
// useTextureCache — loads, caches, and generates textures for materials
// ---------------------------------------------------------------------------

import { shallowRef } from 'vue'
import * as THREE from 'three'

// ── Global texture cache (shared across components) ──────────────────────

const textureCache = new Map<string, THREE.Texture>()
const pendingLoads = new Set<string>()

// Reactive version counter — bumped when a new texture finishes loading
const version = shallowRef(0)

// ── Procedural texture generators ────────────────────────────────────────

const TEXTURE_SIZE = 256

/** Generate wood grain texture data */
function generateWoodGrain(
  baseR: number, baseG: number, baseB: number,
  grainIntensity = 30,
  ringScale = 0.02,
): Uint8Array {
  const data = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4)

  // Simple pseudo-random noise
  function noise(x: number, y: number): number {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
    return n - Math.floor(n)
  }

  // Fractal noise
  function fbm(x: number, y: number): number {
    let val = 0
    let amp = 0.5
    for (let i = 0; i < 4; i++) {
      val += amp * noise(x, y)
      x *= 2.0
      y *= 2.0
      amp *= 0.5
    }
    return val
  }

  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const idx = (y * TEXTURE_SIZE + x) * 4

      // Wood rings pattern
      const nx = x * ringScale
      const ny = y * ringScale
      const distortion = fbm(nx * 4, ny * 4) * 2
      const ring = Math.sin((nx + distortion) * 20) * 0.5 + 0.5

      // Fine grain lines
      const grain = fbm(x * 0.1, y * 0.02) * grainIntensity

      // Combine
      const variation = ring * grainIntensity * 0.7 + grain * 0.3
      data[idx] = Math.max(0, Math.min(255, baseR + variation - grainIntensity / 2))
      data[idx + 1] = Math.max(0, Math.min(255, baseG + variation - grainIntensity / 2))
      data[idx + 2] = Math.max(0, Math.min(255, baseB + variation - grainIntensity / 2))
      data[idx + 3] = 255
    }
  }
  return data
}

/** Generate fabric/linen texture data */
function generateFabric(baseR: number, baseG: number, baseB: number): Uint8Array {
  const data = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4)

  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const idx = (y * TEXTURE_SIZE + x) * 4

      // Weave pattern
      const warpVisible = ((x % 4) < 2) !== ((y % 4) < 2)
      const weaveOffset = warpVisible ? 5 : -5

      // Subtle noise
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
      const noiseVal = (n - Math.floor(n)) * 8 - 4

      data[idx] = Math.max(0, Math.min(255, baseR + weaveOffset + noiseVal))
      data[idx + 1] = Math.max(0, Math.min(255, baseG + weaveOffset + noiseVal))
      data[idx + 2] = Math.max(0, Math.min(255, baseB + weaveOffset + noiseVal))
      data[idx + 3] = 255
    }
  }
  return data
}

/** Generate floor plank texture data */
function generateFloorPlanks(baseR: number, baseG: number, baseB: number): Uint8Array {
  const data = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4)
  const plankWidth = 64 // pixels

  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const idx = (y * TEXTURE_SIZE + x) * 4

      // Plank seams (dark lines)
      const plankX = x % plankWidth
      const isSeam = plankX === 0 || plankX === 1

      // Wood grain along planks
      const grainNoise = Math.sin(x * 0.05 + y * 0.5) * 10
      const fineGrain = Math.sin(y * 0.8 + Math.sin(x * 0.1) * 3) * 5
      const variation = grainNoise + fineGrain

      // Per-plank color variation
      const plankIdx = Math.floor(x / plankWidth)
      const plankTint = ((plankIdx * 37) % 20) - 10

      if (isSeam) {
        data[idx] = Math.max(0, baseR - 40)
        data[idx + 1] = Math.max(0, baseG - 40)
        data[idx + 2] = Math.max(0, baseB - 40)
      } else {
        data[idx] = Math.max(0, Math.min(255, baseR + variation + plankTint))
        data[idx + 1] = Math.max(0, Math.min(255, baseG + variation + plankTint))
        data[idx + 2] = Math.max(0, Math.min(255, baseB + variation + plankTint))
      }
      data[idx + 3] = 255
    }
  }
  return data
}

/** Generate carpet texture data */
function generateCarpet(baseR: number, baseG: number, baseB: number): Uint8Array {
  const data = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4)

  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const idx = (y * TEXTURE_SIZE + x) * 4

      // Dense noise for carpet fibers
      const n1 = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
      const n2 = Math.sin(x * 269.5 + y * 183.3) * 28001.8384
      const noise = ((n1 - Math.floor(n1)) + (n2 - Math.floor(n2))) * 6 - 6

      data[idx] = Math.max(0, Math.min(255, baseR + noise))
      data[idx + 1] = Math.max(0, Math.min(255, baseG + noise))
      data[idx + 2] = Math.max(0, Math.min(255, baseB + noise))
      data[idx + 3] = 255
    }
  }
  return data
}

// ── Procedural texture registry ──────────────────────────────────────────


function createProceduralTexture(id: string): THREE.DataTexture | null {
  let texData: Uint8Array | null = null

  switch (id) {
    case 'proc:walnut':
      texData = generateWoodGrain(107, 76, 59, 35, 0.025)
      break
    case 'proc:espresso':
      texData = generateWoodGrain(62, 44, 35, 25, 0.02)
      break
    case 'proc:driftwood':
      texData = generateWoodGrain(168, 153, 133, 20, 0.015)
      break
    case 'proc:chocolate':
      texData = generateWoodGrain(74, 55, 40, 30, 0.02)
      break
    case 'proc:linen':
      texData = generateFabric(215, 209, 199)
      break
    case 'proc:hardwood-floor':
      texData = generateFloorPlanks(181, 144, 107)
      break
    case 'proc:carpet':
      texData = generateCarpet(212, 201, 184)
      break
    default:
      return null
  }

  const texture = new THREE.DataTexture(texData, TEXTURE_SIZE, TEXTURE_SIZE)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.needsUpdate = true
  return texture
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Get a texture by URL or procedural ID.
 * - Procedural IDs start with `proc:` and are generated in-memory
 * - URL-based textures are loaded via TextureLoader
 * Returns null if not yet loaded; re-renders happen when loading completes.
 */
export function getTexture(urlOrId: string | undefined): THREE.Texture | null {
  if (!urlOrId) return null

  // Check cache first
  if (textureCache.has(urlOrId)) {
    return textureCache.get(urlOrId)!
  }

  // Procedural textures — generate immediately
  if (urlOrId.startsWith('proc:')) {
    const tex = createProceduralTexture(urlOrId)
    if (tex) {
      textureCache.set(urlOrId, tex)
      return tex
    }
    return null
  }

  // URL-based texture — load asynchronously
  if (!pendingLoads.has(urlOrId)) {
    pendingLoads.add(urlOrId)
    const loader = new THREE.TextureLoader()
    loader.load(
      urlOrId,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        textureCache.set(urlOrId, texture)
        pendingLoads.delete(urlOrId)
        // Bump version to trigger Vue reactivity
        version.value++
      },
      undefined,
      () => {
        // Load error — remove from pending
        pendingLoads.delete(urlOrId)
      },
    )
  }

  return null
}

/**
 * Set texture repeat based on object dimensions (in cm).
 * Call this after getting a texture to scale it appropriately.
 */
export function scaleTexture(
  texture: THREE.Texture | null,
  widthCm: number,
  heightCm: number,
  tileSizeCm = 50,
): void {
  if (!texture) return
  texture.repeat.set(widthCm / tileSizeCm, heightCm / tileSizeCm)
}

/**
 * Get a CSS background string for a texture (handles procedural data-uris).
 */
export function getTextureSwatch(urlOrId: string | undefined): string | undefined {
  if (!urlOrId) return undefined

  if (urlOrId.startsWith('proc:')) {
    const tex = getTexture(urlOrId) as THREE.DataTexture
    if (!tex) return undefined

    // Draw DataTexture to a small canvas to get a data URL
    const canvas = document.createElement('canvas')
    canvas.width = TEXTURE_SIZE
    canvas.height = TEXTURE_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    const imgData = ctx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE)
    const data = tex.image.data
    if (!data) return undefined
    
    imgData.data.set(data as Uint8ClampedArray)
    ctx.putImageData(imgData, 0, 0)

    return `url(${canvas.toDataURL()})`
  }

  return `url(${urlOrId})`
}

/** Reactive version ref — read in templates to trigger updates when textures load */
export { version as textureVersion }
