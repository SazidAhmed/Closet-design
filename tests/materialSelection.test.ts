import { describe, it, expect } from 'vitest'
import { useGrainSelector } from '../src/composables/useGrainSelector'
import { useGlassMirrorSelector } from '../src/composables/useGlassMirrorSelector'
import {
  isGlassDoorType,
  allowsBothGlassAndMirror,
  hasBoxMaterialColors,
  getFilteredBoxMaterialColors,
  getFilteredDrawerTypes,
  areDrawerPrerequisitesMet,
  getDrawerValidationMessage,
  validateFormCompleteness,
} from '../src/composables/useMaterialHelpers'
import { MATERIAL_IDS, GRAIN_IDS, GRAIN_FLAGS } from '../src/features/closet/domain/materials/materialConstants'

describe('Material Selection Logic', () => {
  describe('useGrainSelector', () => {
    const allGrains = [
      { id: GRAIN_IDS.N_A, name: 'N/A' },
      { id: GRAIN_IDS.VERTICAL, name: 'Vertical' },
      { id: GRAIN_IDS.HORIZONTAL_UPCHARGE, name: 'Horizontal' },
    ]

    it('returns only N/A when color does not have grain', () => {
      const { getFilteredGrains, isGrainSelectionDisabled } = useGrainSelector()
      const color = { id: 1, name: 'Solid White', has_grain: GRAIN_FLAGS.NO_GRAIN }
      const filtered = getFilteredGrains(color, allGrains)
      expect(filtered).toHaveLength(1)
      expect(filtered[0]?.id).toBe(GRAIN_IDS.N_A)
      expect(isGrainSelectionDisabled(color)).toBe(true)
    })

    it('returns both vertical and horizontal when color has grain and allows both', () => {
      const { getFilteredGrains, getGrainSelectionMessage, isGrainSelectionDisabled } = useGrainSelector()
      const color = {
        id: 2,
        name: 'Woodline 3',
        has_grain: GRAIN_FLAGS.HAS_GRAIN,
        only_vertical_grain: GRAIN_FLAGS.ALLOWS_BOTH,
      }
      const filtered = getFilteredGrains(color, allGrains)
      expect(filtered).toHaveLength(2)
      expect(filtered.map((g: any) => g.id)).toContain(GRAIN_IDS.VERTICAL)
      expect(filtered.map((g: any) => g.id)).toContain(GRAIN_IDS.HORIZONTAL_UPCHARGE)
      expect(getGrainSelectionMessage(color)).toBe('Vertical and horizontal grain options available')
      expect(isGrainSelectionDisabled(color)).toBe(false)
    })

    it('returns only vertical when color has only_vertical_grain', () => {
      const { getFilteredGrains, getGrainSelectionMessage } = useGrainSelector()
      const color = {
        id: 3,
        name: 'Oak',
        has_grain: GRAIN_FLAGS.HAS_GRAIN,
        only_vertical_grain: GRAIN_FLAGS.ONLY_VERTICAL,
      }
      const filtered = getFilteredGrains(color, allGrains)
      expect(filtered).toHaveLength(1)
      expect(filtered[0]?.id).toBe(GRAIN_IDS.VERTICAL)
      expect(getGrainSelectionMessage(color)).toBe('Only vertical grain available for this color')
    })
  })

  describe('useGlassMirrorSelector', () => {
    it('returns parent options including mirror only when allowBoth is true', () => {
      const { getParentOptions } = useGlassMirrorSelector(null)

      const onlyGlass = getParentOptions(false)
      expect(onlyGlass).toHaveLength(1)
      expect(onlyGlass[0]?.key).toBe('glass')

      const both = getParentOptions(true)
      expect(both).toHaveLength(2)
      expect(both.map((p: any) => p.key)).toEqual(['glass', 'mirror'])
    })

    it('returns child options matching parentKey', () => {
      const { getChildOptions } = useGlassMirrorSelector(null)
      const glassChildren = getChildOptions('glass')
      expect(glassChildren.length).toBeGreaterThan(0)
      const mirrorChildren = getChildOptions('mirror')
      expect(mirrorChildren.length).toBeGreaterThan(0)
    })
  })

  describe('useMaterialHelpers', () => {
    it('detects glass door type correctly', () => {
      expect(isGlassDoorType({ id: 1, name: 'Standard' })).toBe(false)
      expect(isGlassDoorType({ id: MATERIAL_IDS.GLASS_DOOR_TYPE_ID, name: 'Glass Door' })).toBe(true)
    })

    it('detects mirror support only on Aluminum Glass Door (ID 57)', () => {
      expect(allowsBothGlassAndMirror({ id: 10, name: 'Wood Shaker' })).toBe(false)
      expect(allowsBothGlassAndMirror({ id: MATERIAL_IDS.ALUMINUM_GLASS_DOOR_ID, name: 'Aluminum Frame' })).toBe(true)
    })

    it('detects box material color requirements', () => {
      expect(hasBoxMaterialColors({ id: 1 })).toBe(false)
      expect(hasBoxMaterialColors({ id: 5 })).toBe(true)
      expect(hasBoxMaterialColors({ id: 8 })).toBe(true)
    })

    it('filters box material colors for selected box material', () => {
      const colors = [
        { id: 101, color: 'White', box_material_id: 5 },
        { id: 102, color: 'Black', box_material_id: 5 },
        { id: 103, color: 'Grey', box_material_id: 8 },
      ]
      const filtered = getFilteredBoxMaterialColors({ id: 5 }, colors)
      expect(filtered).toHaveLength(2)
      expect(filtered.map((c: any) => c.id)).toEqual([101, 102])
    })

    it('filters drawer types when box material is NOT finished interior', () => {
      const drawerTypes = [
        { id: 1, name: 'Standard Drawer' },
        { id: MATERIAL_IDS.FINISHED_INTERIOR_SPECIAL_DRAWER_ID, name: 'Matches Selected Box Material Color' },
      ]
      // Normal box material (ID 1)
      const filteredNormal = getFilteredDrawerTypes({ id: 1 }, null, drawerTypes)
      expect(filteredNormal.map((d: any) => d.id)).not.toContain(MATERIAL_IDS.FINISHED_INTERIOR_SPECIAL_DRAWER_ID)

      // Finished Interior box material (ID 8)
      const filteredFinished = getFilteredDrawerTypes({ id: 8 }, null, drawerTypes)
      expect(filteredFinished.map((d: any) => d.id)).toContain(MATERIAL_IDS.FINISHED_INTERIOR_SPECIAL_DRAWER_ID)
    })

    it('drawer prerequisites requirement and messages', () => {
      expect(areDrawerPrerequisitesMet(null, null)).toBe(false)
      expect(areDrawerPrerequisitesMet({ id: 1 }, null)).toBe(false)
      expect(areDrawerPrerequisitesMet(null, { id: 10 })).toBe(false)
      expect(areDrawerPrerequisitesMet({ id: 1 }, { id: 10 })).toBe(true)

      expect(getDrawerValidationMessage(null, null)).toContain('Box Material and Door Material')
      expect(getDrawerValidationMessage(null, { id: 10 })).toContain('Box Material')
      expect(getDrawerValidationMessage({ id: 1 }, null)).toContain('Door Material')
      expect(getDrawerValidationMessage({ id: 1 }, { id: 10 })).toBe('')
    })

    it('validates form completeness', () => {
      expect(validateFormCompleteness(null)).toBe(false)

      const incomplete = {
        box_materials: { id: 1 },
        door_types: { id: 1 },
        door_finish_materials: null,
      }
      expect(validateFormCompleteness(incomplete)).toBe(false)

      const validComplete = {
        box_materials: { id: 1 },
        box_material_colors: null, // Not required for ID 1
        door_types: { id: 1 },
        door_finish_materials: { id: 10 },
        door_finish_material_colors: { id: 100 },
        grains: { id: 1 },
        drawer_types: { id: 2 },
        drawer_materials: { id: 1 },
      }
      expect(validateFormCompleteness(validComplete)).toBe(true)
    })
  })
})
