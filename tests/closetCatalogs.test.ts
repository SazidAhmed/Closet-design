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

  it('resolves corner cabinet catalog IDs based on orientation and depth', () => {
    // Left Corner: 15" -> ID 217, 18" -> ID 216
    expect(resolveCatalogForTower('without_doors', 'CAS', 15, true, 'left').catalogId).toBe(217)
    expect(resolveCatalogForTower('without_doors', 'CAS', 18, true, 'left').catalogId).toBe(216)

    // Right Corner: 15" -> ID 215, 18" -> ID 214
    expect(resolveCatalogForTower('without_doors', 'CAS', 15, true, 'right').catalogId).toBe(215)
    expect(resolveCatalogForTower('without_doors', 'CAS', 18, true, 'right').catalogId).toBe(214)

    // CDH Category corner catalogs
    expect(resolveCatalogForTower('without_doors', 'CDH', 15, true, 'left').catalogId).toBe(217)
    expect(resolveCatalogForTower('without_doors', 'CDH', 18, true, 'right').catalogId).toBe(214)

    // CLH Category corner catalogs
    expect(resolveCatalogForTower('without_doors', 'CLH', 15, true, 'left').catalogId).toBe(217)
    expect(resolveCatalogForTower('without_doors', 'CLH', 18, true, 'right').catalogId).toBe(214)
  })

  it('store setTowerCornerPosition updates catalog ID, corner flags and backend export payload', () => {
    setActivePinia(createPinia())
    const closet = useClosetStore()

    closet.setTowers([])
    closet.addTowerFromCatalog('without_doors', 'CAS')
    const tower = closet.towers[0]!

    // Default depth is 15
    closet.setTowerCornerPosition(tower.id, 'left')
    expect(tower.isCorner).toBe(true)
    expect(tower.cornerPosition).toBe('left')
    expect(tower.cornerOrientation).toBe('left')
    expect(tower.catalogId).toBe(217)

    // Change orientation to right
    closet.setTowerCornerPosition(tower.id, 'right')
    expect(tower.cornerPosition).toBe('right')
    expect(tower.cornerOrientation).toBe('right')
    expect(tower.catalogId).toBe(215)

    // Change depth to 18
    closet.setTowerDepth(tower.id, 18)
    expect(tower.catalogId).toBe(214)

    const payload = exportForBackend(closet.$state)
    expect(payload.towers[0]?.isCorner).toBe(true)
    expect(payload.towers[0]?.cornerPosition).toBe('right')
    expect(payload.towers[0]?.cornerOrientation).toBe('right')
    expect(payload.towers[0]?.catalogId).toBe(214)
  })

  it('sets width to 30 when toggling corner position if width is less than 30', () => {
    setActivePinia(createPinia())
    const closet = useClosetStore()

    closet.setTowers([])
    closet.addTowerFromCatalog('without_doors', 'CAS')
    const tower = closet.towers[0]!

    // Set width to 12 (< 30)
    closet.setTowerWidth(tower.id, 12)
    expect(tower.width).toBe(12)

    // Toggle to left corner -> width should be set to 30
    closet.setTowerCornerPosition(tower.id, 'left')
    expect(tower.isCorner).toBe(true)
    expect(tower.width).toBe(30)

    // Set width to 36 (>= 30)
    closet.setTowerWidth(tower.id, 36)
    expect(tower.width).toBe(36)

    // Toggle to right corner -> width should remain 36
    closet.setTowerCornerPosition(tower.id, 'right')
    expect(tower.isCorner).toBe(true)
    expect(tower.width).toBe(36)

    // Attempting to set width < 30 on a corner cabinet should clamp to 30
    closet.setTowerWidth(tower.id, 18)
    expect(tower.width).toBe(30)

    // Attempting to set height < 84 on a corner cabinet should clamp to 84 (main cabinet min height)
    closet.setTowerHeight(tower.id, 72)
    expect(tower.height).toBe(84)

    // Default Total Depth (depth + cornerBridgeWidth) should be 23
    expect(tower.depth + (tower.cornerBridgeWidth ?? 0)).toBe(23)

    // Setting bridge width to achieve Total Depth of 23.5
    closet.setTowerBridgeDimensions(tower.id, { bridgeWidth: 23.5 - tower.depth })
    expect(tower.depth + (tower.cornerBridgeWidth ?? 0)).toBe(23.5)

    // Setting bridge depth should clamp to main cabinet depth limits (15 to 23 for CAS)
    closet.setTowerBridgeDimensions(tower.id, { bridgeDepth: 10 })
    expect(tower.cornerBridgeDepth).toBe(15)
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

  it('selects the very first cabinet of the new catalog when depth edit causes a catalog switch', () => {
    setActivePinia(createPinia())
    const closet = useClosetStore()

    const cas15 = CLOSET_CATALOG_CATEGORIES
      .find(c => c.doorMode === 'without_doors' && c.categoryCode === 'CAS')!
      .catalogs.find(c => c.catalogId === 205)!

    const cas18 = CLOSET_CATALOG_CATEGORIES
      .find(c => c.doorMode === 'without_doors' && c.categoryCode === 'CAS')!
      .catalogs.find(c => c.catalogId === 204)!

    cas15.cabinets = [
      { id: 4050, code: 'CAS128415', width: 12, height: 84, depth: 15, minW: 6, maxW: 13, minH: 80, maxH: 85, minD: 6, maxD: 16, boxOptions: [1, 2], numberOfShelves: 7, numOfDrawers: 0, numOfRollouts: 0, basePrice: '350' },
      { id: 4052, code: 'CAS308415', width: 30, height: 84, depth: 15, minW: 25, maxW: 35, minH: 80, maxH: 85, minD: 6, maxD: 16, boxOptions: [1, 2], numberOfShelves: 7, numOfDrawers: 0, numOfRollouts: 0, basePrice: '450' }
    ]

    cas18.cabinets = [
      { id: 4053, code: 'CAS128418', width: 12, height: 84, depth: 18, minW: 6, maxW: 13, minH: 80, maxH: 85, minD: 16.0625, maxD: 19, boxOptions: [1, 2], numberOfShelves: 7, numOfDrawers: 0, numOfRollouts: 0, basePrice: '380' },
      { id: 4055, code: 'CAS308418', width: 30, height: 84, depth: 18, minW: 25, maxW: 35, minH: 80, maxH: 85, minD: 16.0625, maxD: 19, boxOptions: [1, 2], numberOfShelves: 7, numOfDrawers: 0, numOfRollouts: 0, basePrice: '480' }
    ]

    closet.setTowers([])
    closet.addTowerFromCatalog('without_doors', 'CAS')
    const tower = closet.towers[0]!

    // Initially at depth 15, set width to 30 -> resolves to CAS308415 (#4052)
    closet.setTowerDepth(tower.id, 15)
    closet.setTowerWidth(tower.id, 30)
    expect(tower.catalogId).toBe(205)
    expect(tower.cabinetId).toBe(4052)
    expect(tower.cabinetCode).toBe('CAS308415')

    // Change depth to 18 -> switches to catalog 204 -> should select the very first cabinet CAS128418 (#4053)
    closet.setTowerDepth(tower.id, 18)
    expect(tower.catalogId).toBe(204)
    expect(tower.cabinetId).toBe(4053)
    expect(tower.cabinetCode).toBe('CAS128418')

    // Cleanup
    cas15.cabinets = []
    cas18.cabinets = []
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

