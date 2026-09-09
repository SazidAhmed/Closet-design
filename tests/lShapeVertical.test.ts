import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useClosetStore } from '../src/stores/useClosetStore'

describe('L Shape Vertical custom part', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('creates L Shape Vertical with user specified defaults (unattached)', () => {
    const closet = useClosetStore()
    const part = closet.addCustomPart('l shape vertical')

    expect(part.partType).toBe('l shape vertical')
    expect(part.width).toBe(3)
    expect(part.depth).toBe(24)
    expect(part.height).toBe(84)
    expect(part.outset).toBeUndefined() // outset 0 or undefined
    expect(part.elevation).toBe(0)
    expect(part.orientation).toBe('left')
  })

  it('places L Shape Vertical on attached cabinet with doors from door to wall', () => {
    const closet = useClosetStore()
    closet.towers.push({
      id: 'tower-1',
      label: 'Cabinet 1',
      width: 30,
      depth: 23.875,
      height: 84,
      elevation: 0,
      outset: 0,
      doorMode: 'with_doors',
      doorGap: 0.125,
      doorThickness: 0.75,
      positionAlongWall: 0.5,
      accessories: [],
      wallId: 'wall-1',
    })

    const part = closet.addCustomPart('l shape vertical', 'tower-1', 100, 'right', 'right')

    expect(part.partType).toBe('l shape vertical')
    expect(part.width).toBe(3)
    expect(part.height).toBe(84)
    // 23.875 + 0.125 + 0.75 = 24.75
    expect(part.depth).toBe(24.75)
    expect(part.outset).toBeUndefined() // 0 stored as undefined or 0
    expect(part.orientation).toBe('right')
    expect(part.attachedToTowerId).toBe('tower-1')
  })

  it('places L Shape Vertical on attached cabinet without doors from front to wall', () => {
    const closet = useClosetStore()
    closet.towers.push({
      id: 'tower-2',
      label: 'Cabinet 2',
      width: 30,
      depth: 16,
      height: 90,
      elevation: 0,
      outset: 0,
      doorMode: 'without_doors',
      positionAlongWall: 0.5,
      accessories: [],
      wallId: 'wall-1',
    })

    const part = closet.addCustomPart('l shape vertical', 'tower-2', 100, 'left', 'left')

    expect(part.partType).toBe('l shape vertical')
    expect(part.width).toBe(3)
    expect(part.height).toBe(90)
    expect(part.depth).toBe(16)
    expect(part.outset).toBeUndefined()
    expect(part.orientation).toBe('left')
    expect(part.attachedToTowerId).toBe('tower-2')
  })

  it('tracks cabinet depth change by updating L Shape Vertical depth', () => {
    const closet = useClosetStore()
    closet.towers.push({
      id: 'tower-1',
      label: 'Cabinet 1',
      width: 30,
      depth: 23.875,
      height: 84,
      doorMode: 'with_doors',
      doorGap: 0.125,
      doorThickness: 0.75,
      positionAlongWall: 0.5,
      accessories: [],
      wallId: 'wall-1',
    })

    const part = closet.addCustomPart('l shape vertical', 'tower-1', 100, 'right', 'right')
    expect(part.depth).toBe(24.75)

    // Cabinet depth changes to 20
    closet.setTowerDepth('tower-1', 20)

    const updatedPart = closet.towers.find((t) => t.id === part.id)!
    // 20 + 0.125 + 0.75 = 20.875
    expect(updatedPart.depth).toBe(20.875)
  })

  it('tracks cabinet outset change by updating L Shape Vertical outset', () => {
    const closet = useClosetStore()
    closet.towers.push({
      id: 'tower-1',
      label: 'Cabinet 1',
      width: 30,
      depth: 23.875,
      height: 84,
      outset: 0,
      positionAlongWall: 0.5,
      accessories: [],
      wallId: 'wall-1',
    })

    const part = closet.addCustomPart('l shape vertical', 'tower-1', 100, 'right', 'right')

    closet.setTowerOutset('tower-1', 5)

    const updatedPart = closet.towers.find((t) => t.id === part.id)!
    expect(updatedPart.outset).toBe(5)
  })
})
