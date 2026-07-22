import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import {
  CLOSET_CATALOG_CATEGORIES,
  createTowerFromCategory,
  getCategoryLimits,
  isOneBoxAvailable,
  resolveCabinetForTower,
  resolveCatalogForTower,
} from '../src/features/closet/domain/closetCatalogs'
import { exportForBackend } from '../src/features/closet/domain/schema'
import { useClosetStore } from '../src/stores/useClosetStore'

const CM_PER_INCH = 2.54

function inch(value: number): number {
  return value * CM_PER_INCH
}

describe('closet catalog selection', () => {
  it('resolves doorless CAS catalogs by depth', () => {
    expect(resolveCatalogForTower('without_doors', 'CAS', inch(15)).catalogId).toBe(205)
    expect(resolveCatalogForTower('without_doors', 'CAS', inch(17)).catalogId).toBe(204)
    expect(resolveCatalogForTower('without_doors', 'CAS', inch(21)).catalogId).toBe(199)
  })

  it('keeps with-doors CAS on its single catalog', () => {
    expect(resolveCatalogForTower('with_doors', 'CAS', inch(23)).catalogId).toBe(190)
    expect(resolveCatalogForTower('with_doors', 'CAS', inch(30)).catalogId).toBe(190)
  })

  it('creates towers with catalog metadata and category minimums', () => {
    const tower = createTowerFromCategory('without_doors', 'CDH', 1)
    const limits = getCategoryLimits('without_doors', 'CDH')

    expect(tower.doorMode).toBe('without_doors')
    expect(tower.categoryCode).toBe('CDH')
    expect(tower.catalogId).toBe(207)
    expect(tower.boxCount).toBe(2)
    expect(tower.width).toBeCloseTo(limits.minW, 1)
    expect(tower.depth).toBeCloseTo(limits.minD, 1)
    expect(tower.height).toBeCloseTo(limits.minH, 1)
  })

  it('store depth edits refresh active catalog and export catalog ID', () => {
    setActivePinia(createPinia())
    const closet = useClosetStore()

    closet.setTowers([])
    closet.addTowerFromCatalog('without_doors', 'CAS')
    const tower = closet.towers[0]!

    expect(tower.catalogId).toBe(205)

    closet.setTowerDepth(tower.id, inch(21))
    expect(tower.catalogId).toBe(199)

    const payload = exportForBackend(closet.$state)
    expect(payload.towers[0]?.catalogId).toBe(199)
  })
})

describe('box configuration & cabinet resolution', () => {
  it('isOneBoxAvailable enforces width thresholds by depth', () => {
    // 15D -> max 40"
    expect(isOneBoxAvailable('without_doors', 'CAS', 30, 15)).toBe(true)
    expect(isOneBoxAvailable('without_doors', 'CAS', 40, 15)).toBe(true)
    expect(isOneBoxAvailable('without_doors', 'CAS', 41, 15)).toBe(false)
    
    // 21D -> max 37"
    expect(isOneBoxAvailable('without_doors', 'CAS', 37, 21)).toBe(true)
    expect(isOneBoxAvailable('without_doors', 'CAS', 38, 21)).toBe(false)

    // with_doors -> never available
    expect(isOneBoxAvailable('with_doors', 'CAS', 30, 23)).toBe(false)
  })

  it('store width edits force 2-box when exceeding threshold', () => {
    setActivePinia(createPinia())
    const closet = useClosetStore()

    closet.setTowers([])
    closet.addTowerFromCatalog('without_doors', 'CAS')
    const tower = closet.towers[0]!
    
    // Set to 30W, 15D, 1-box
    closet.setTowerWidth(tower.id, 30)
    closet.setTowerBoxCount(tower.id, 1)
    expect(tower.boxCount).toBe(1)

    // Exceed threshold (40" for 15D)
    closet.setTowerWidth(tower.id, 41)
    
    // Should auto-force back to 2-box
    expect(tower.boxCount).toBe(2)
  })

  it('resolves cabinet based on box count and dimensions', () => {
    // Inject mock cabinets into the first CAS catalog for testing
    const cas15 = CLOSET_CATALOG_CATEGORIES
      .find(c => c.doorMode === 'without_doors' && c.categoryCode === 'CAS')!
      .catalogs.find(c => c.catalogId === 205)!
    
    cas15.cabinets = [
      { id: 10, code: 'CAB-2B-30', width: 30, height: 84, depth: 15, minW: 25, maxW: 35, minH: 80, maxH: 85, minD: 6, maxD: 16, boxOptions: [2], numberOfShelves: 0, numOfDrawers: 0, numOfRollouts: 0, basePrice: '0' },
      { id: 11, code: 'CAB-1B-30', width: 30, height: 84, depth: 15, minW: 25, maxW: 35, minH: 80, maxH: 85, minD: 6, maxD: 16, boxOptions: [1, 2], numberOfShelves: 0, numOfDrawers: 0, numOfRollouts: 0, basePrice: '0' },
      { id: 12, code: 'CAB-2B-45', width: 45, height: 84, depth: 15, minW: 35.1, maxW: 45, minH: 80, maxH: 85, minD: 6, maxD: 16, boxOptions: [2], numberOfShelves: 0, numOfDrawers: 0, numOfRollouts: 0, basePrice: '0' }
    ]

    // Width 32, ask for 1-box -> within [25, 35] range, should pick 1B-30 (supports boxOption 1)
    let cab = resolveCabinetForTower('without_doors', 'CAS', 32, 84, 15, 1)
    expect(cab?.id).toBe(11)

    // Width 45, ask for 2-box -> within [35.1, 45] range, should pick 2B-45
    cab = resolveCabinetForTower('without_doors', 'CAS', 45, 84, 15, 2)
    expect(cab?.id).toBe(12)

    // Cleanup
    cas15.cabinets = []
  })

  it('preserves user entered width, height, and depth when matching cabinet is resolved', () => {
    setActivePinia(createPinia())
    const closet = useClosetStore()

    const cas15 = CLOSET_CATALOG_CATEGORIES
      .find(c => c.doorMode === 'without_doors' && c.categoryCode === 'CAS')!
      .catalogs.find(c => c.catalogId === 205)!

    cas15.cabinets = [
      { id: 10, code: 'CAS158415', width: 15, height: 84, depth: 15, minW: 13.0625, maxW: 16, minH: 80, maxH: 85, minD: 13, maxD: 16, boxOptions: [1, 2], numberOfShelves: 0, numOfDrawers: 0, numOfRollouts: 0, basePrice: '0' }
    ]

    closet.setTowers([])
    closet.addTowerFromCatalog('without_doors', 'CAS')
    const tower = closet.towers[0]!

    // Set custom width (e.g. 14.5) within cabinet range (13.0625..16)
    closet.setTowerWidth(tower.id, 14.5)

    // Cabinet should resolve to CAS158415 (#10)
    expect(tower.cabinetId).toBe(10)
    expect(tower.cabinetCode).toBe('CAS158415')

    // Tower width should remain 14.5 rather than being snapped to cabinet.width (15)
    expect(tower.width).toBe(14.5)

    cas15.cabinets = []
  })
})

