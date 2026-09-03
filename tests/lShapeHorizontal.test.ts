import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useClosetStore } from '../src/stores/useClosetStore'

describe('L Shape Horizontal custom part', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('creates L Shape Horizontal with user specified defaults (unattached)', () => {
    const closet = useClosetStore()
    const part = closet.addCustomPart('l shape horizontal')

    expect(part.partType).toBe('l shape horizontal')
    expect(part.width).toBe(30)
    expect(part.depth).toBe(3)
    expect(part.height).toBe(3)
    expect(part.outset).toBe(23.875)
    expect(part.elevation).toBe(84)
    expect(part.orientation).toBeUndefined()
  })

  it('places L Shape Horizontal at top of attached cabinet and inherits width', () => {
    const closet = useClosetStore()
    // Create mock tower
    closet.towers.push({
      id: 'tower-1',
      label: 'Cabinet 1',
      width: 36,
      depth: 24,
      height: 84,
      elevation: 0,
      positionAlongWall: 0.5,
      accessories: [],
      wallId: 'wall-1',
    })

    const part = closet.addCustomPart('l shape horizontal', 'tower-1', 100)

    expect(part.partType).toBe('l shape horizontal')
    expect(part.width).toBe(36)
    expect(part.depth).toBe(3)
    expect(part.height).toBe(3)
    expect(part.outset).toBe(23.875)
    expect(part.elevation).toBe(84)
    expect(part.positionAlongWall).toBe(0.5)
  })

  it('tracks cabinet height change by updating L Shape Horizontal elevation', () => {
    const closet = useClosetStore()
    closet.towers.push({
      id: 'tower-1',
      label: 'Cabinet 1',
      width: 36,
      depth: 24,
      height: 84,
      elevation: 0,
      positionAlongWall: 0.5,
      accessories: [],
      wallId: 'wall-1',
    })

    const part = closet.addCustomPart('l shape horizontal', 'tower-1', 100)
    expect(part.elevation).toBe(84)

    // Cabinet height changes to 90
    closet.setTowerHeight('tower-1', 90)

    const updatedPart = closet.towers.find((t) => t.id === part.id)!
    expect(updatedPart.height).toBe(3) // Part height remains 3
    expect(updatedPart.elevation).toBe(90) // Elevation moves up to top of cabinet
  })

  it('tracks cabinet elevation change by updating L Shape Horizontal elevation', () => {
    const closet = useClosetStore()
    closet.towers.push({
      id: 'tower-1',
      label: 'Cabinet 1',
      width: 36,
      depth: 24,
      height: 84,
      elevation: 0,
      positionAlongWall: 0.5,
      accessories: [],
      wallId: 'wall-1',
    })

    const part = closet.addCustomPart('l shape horizontal', 'tower-1', 100)
    expect(part.elevation).toBe(84)

    // Cabinet elevation changes by +5
    closet.setTowerElevation('tower-1', 5)

    const updatedPart = closet.towers.find((t) => t.id === part.id)!
    expect(updatedPart.elevation).toBe(89)
  })
})
