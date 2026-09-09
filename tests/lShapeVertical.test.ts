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
    expect(part.depth).toBe(3)
    expect(part.height).toBe(84)
    expect(part.outset).toBe(20.875)
    expect(part.elevation).toBe(0)
    expect(part.orientation).toBe('left')
  })

  it('places L Shape Vertical on attached cabinet with independent properties', () => {
    const closet = useClosetStore()
    closet.towers.push({
      id: 'tower-1',
      label: 'Cabinet 1',
      width: 30,
      depth: 23.875,
      height: 90,
      elevation: 5,
      outset: 2,
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
    expect(part.depth).toBe(3)
    expect(part.outset).toBe(20.875)
    expect(part.elevation).toBe(0)
    expect(part.orientation).toBe('right')
    expect(part.attachedToTowerId).toBe('tower-1')
  })

  it('does not inherit cabinet depth, height, or outset changes', () => {
    const closet = useClosetStore()
    closet.towers.push({
      id: 'tower-1',
      label: 'Cabinet 1',
      width: 30,
      depth: 23.875,
      height: 84,
      outset: 0,
      doorMode: 'with_doors',
      doorGap: 0.125,
      doorThickness: 0.75,
      positionAlongWall: 0.5,
      accessories: [],
      wallId: 'wall-1',
    })

    const part = closet.addCustomPart('l shape vertical', 'tower-1', 100, 'right', 'right')
    expect(part.depth).toBe(3)
    expect(part.height).toBe(84)
    expect(part.outset).toBe(20.875)

    // Cabinet depth changes to 20
    closet.setTowerDepth('tower-1', 20)
    const afterDepth = closet.towers.find((t) => t.id === part.id)!
    expect(afterDepth.depth).toBe(3)

    // Cabinet height changes to 96
    closet.setTowerHeight('tower-1', 96)
    const afterHeight = closet.towers.find((t) => t.id === part.id)!
    expect(afterHeight.height).toBe(84)

    // Cabinet outset changes to 5
    closet.setTowerOutset('tower-1', 5)
    const afterOutset = closet.towers.find((t) => t.id === part.id)!
    expect(afterOutset.outset).toBe(20.875)
  })
})
