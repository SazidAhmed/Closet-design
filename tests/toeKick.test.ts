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

  it('places Toe Kick at bottom of attached cabinet and inherits width & position', () => {
    const closet = useClosetStore()
    closet.towers.push({
      id: 'tower-1',
      label: 'Cabinet 1',
      width: 36,
      depth: 24,
      height: 84,
      elevation: 6,
      outset: 2,
      positionAlongWall: 0.4,
      accessories: [],
      wallId: 'wall-1',
    })

    const part = closet.addCustomPart('toe kick', 'tower-1', 100)

    expect(part.partType).toBe('toe kick')
    expect(part.width).toBe(36)
    expect(part.depth).toBe(0.75)
    expect(part.height).toBe(4.5)
    expect(part.outset).toBe(23) // 2 + 21
    expect(part.elevation).toBe(6) // bottom of cabinet
    expect(part.positionAlongWall).toBe(0.4)
    expect(part.attachedToTowerId).toBe('tower-1')
  })

  it('tracks cabinet width change by updating Toe Kick width', () => {
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
    expect(part.width).toBe(36)

    // Cabinet width changes to 40
    closet.setTowerWidth('tower-1', 40)

    const updatedPart = closet.towers.find((t) => t.id === part.id)!
    expect(updatedPart.width).toBe(40)
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

  it('tracks cabinet elevation change by updating Toe Kick elevation', () => {
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

    // Cabinet elevated to 10
    closet.setTowerElevation('tower-1', 10)

    const updatedPart = closet.towers.find((t) => t.id === part.id)!
    expect(updatedPart.elevation).toBe(10)
  })

  it('tracks cabinet outset change by updating Toe Kick outset', () => {
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

    // Cabinet outset set to 3
    closet.setTowerOutset('tower-1', 3)

    const updatedPart = closet.towers.find((t) => t.id === part.id)!
    expect(updatedPart.outset).toBe(24) // 3 + 21
  })
})
