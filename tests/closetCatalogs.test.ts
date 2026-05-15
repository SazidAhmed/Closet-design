import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import {
  createTowerFromCategory,
  getCategoryLimits,
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
