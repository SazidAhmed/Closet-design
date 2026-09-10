import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useClosetStore } from '../src/stores/useClosetStore'

describe('Toe Kick custom part', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('creates Toe Kick with user specified defaults (unattached)', () => {
    const closet = useClosetStore()
    const part = closet.addCustomPart('toe kick')

    expect(part.partType).toBe('toe kick')
    expect(part.width).toBe(30)
    expect(part.depth).toBe(0.75)
    expect(part.height).toBe(4.5)
    expect(part.outset).toBe(21)
    expect(part.elevation).toBe(0)
    expect(part.attachedToTowerId).toBeUndefined()
  })

  it('places Toe Kick at bottom of cabinet but remains independent in width & position', () => {
    const closet = useClosetStore()
    closet.towers.push({
      id: 'tower-1',
      label: 'Cabinet 1',
      width: 36,
      depth: 24,
      height: 84,
      elevation: 0,
      outset: 3,
      positionAlongWall: 0.5,
      accessories: [],
      wallId: 'wall-1',
    })

    const part = closet.addCustomPart('toe kick', 'tower-1', 100)

    expect(part.partType).toBe('toe kick')
    expect(part.width).toBe(30) // Independent default
    expect(part.depth).toBe(0.75)
    expect(part.height).toBe(4.5)
    expect(part.outset).toBe(21) // Independent default
    expect(part.elevation).toBe(0)
    expect(part.positionAlongWall).toBe(0.5)
    expect(part.attachedToTowerId).toBeUndefined() // Completely independent
  })

  it('ignores cabinet width change', () => {
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

    const part = closet.addCustomPart('toe kick', 'tower-1', 100)
    expect(part.width).toBe(30)

    // Cabinet width changes to 40
    closet.setTowerWidth('tower-1', 40, 100)

    const updatedPart = closet.towers.find((t) => t.id === part.id)!
    expect(updatedPart.width).toBe(30) // Remains unchanged
  })

  it('preserves Toe Kick height at 4.5 and elevation at bottom on cabinet height change', () => {
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

    const part = closet.addCustomPart('toe kick', 'tower-1', 100)
    expect(part.height).toBe(4.5)

    closet.setTowerHeight('tower-1', 90)

    const updatedPart = closet.towers.find((t) => t.id === part.id)!
    expect(updatedPart.height).toBe(4.5)
    expect(updatedPart.elevation).toBe(0)
  })

  it('ignores cabinet elevation change', () => {
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

    const part = closet.addCustomPart('toe kick', 'tower-1', 100)
    expect(part.elevation).toBe(0)

    // Cabinet elevation changes by +10
    closet.setTowerElevation('tower-1', 10)

    const updatedPart = closet.towers.find((t) => t.id === part.id)!
    expect(updatedPart.elevation).toBe(0) // Remains unchanged
  })

  it('ignores cabinet outset change', () => {
    const closet = useClosetStore()
    closet.towers.push({
      id: 'tower-1',
      label: 'Cabinet 1',
      width: 36,
      depth: 24,
      height: 84,
      elevation: 0,
      outset: 0,
      positionAlongWall: 0.5,
      accessories: [],
      wallId: 'wall-1',
    })

    const part = closet.addCustomPart('toe kick', 'tower-1', 100)
    expect(part.outset).toBe(21)

    // Cabinet outset changes to 3
    closet.setTowerOutset('tower-1', 3)

    const updatedPart = closet.towers.find((t) => t.id === part.id)!
    expect(updatedPart.outset).toBe(21) // Remains unchanged
  })
})
