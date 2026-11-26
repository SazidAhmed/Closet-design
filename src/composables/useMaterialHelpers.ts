import {
  BOX_MATERIALS_WITH_COLORS,
  EXCLUDED_DRAWER_TYPE_IDS,
  FINISHED_INTERIOR_IDS,
  MATERIAL_IDS,
  RESTRICTIVE_STYLE_IDS,
  VALIDATION_MESSAGES,
} from '../features/closet/domain/materials/materialConstants'
import { getImageUrl } from '../lib/utils'
import { useGrainSelector } from './useGrainSelector'

const { getFilteredGrains, isGrainSelectionValid, getGrainSelectionMessage } = useGrainSelector()

export function isGlassDoorType(doorType: any): boolean {
  return Boolean(doorType && doorType.id === MATERIAL_IDS.GLASS_DOOR_TYPE_ID)
}

export function allowsBothGlassAndMirror(doorFinishMaterial: any): boolean {
  return Boolean(doorFinishMaterial && doorFinishMaterial.id === MATERIAL_IDS.ALUMINUM_GLASS_DOOR_ID)
}

export function hasBoxMaterialColors(boxMaterial: any): boolean {
  return Boolean(boxMaterial && BOX_MATERIALS_WITH_COLORS.includes(boxMaterial.id))
}

export function getFilteredBoxMaterialColors(boxMaterial: any, boxMaterialColors: any[]) {
  if (!boxMaterial || !boxMaterialColors) return []
  return boxMaterialColors
    .filter((color: any) => color.box_material_id === boxMaterial.id)
    .map((color: any) => ({
      id: color.id,
      title: color.color,
      image: getImageUrl(color.image),
      box_material_id: color.box_material_id,
      category_id: color.category_id,
    }))
}

export function getFilteredDrawerTypes(boxMaterial: any, doorFinishMaterial: any, allDrawerTypes: any[]) {
  if (!allDrawerTypes) return []

  const isFinishedInterior = boxMaterial && FINISHED_INTERIOR_IDS.includes(boxMaterial.id)
  let filteredDrawerTypes = allDrawerTypes

  // Filter out special drawer type if not finished interior
  if (!isFinishedInterior) {
    filteredDrawerTypes = filteredDrawerTypes.filter(
      (drawerType: any) => drawerType.id !== MATERIAL_IDS.FINISHED_INTERIOR_SPECIAL_DRAWER_ID,
    )
  }

  // Filter out restricted drawer types if door finish material has restrictive style_id
  if (doorFinishMaterial && RESTRICTIVE_STYLE_IDS.includes(doorFinishMaterial.style_id)) {
    filteredDrawerTypes = filteredDrawerTypes.filter(
      (drawerType: any) => !EXCLUDED_DRAWER_TYPE_IDS.includes(drawerType.id),
    )
  }

  return filteredDrawerTypes
}

export function areDrawerPrerequisitesMet(boxMaterial: any, doorFinishMaterial: any): boolean {
  return Boolean(boxMaterial && doorFinishMaterial)
}

export function getDrawerValidationMessage(boxMaterial: any, doorFinishMaterial: any): string {
  const messages = VALIDATION_MESSAGES.DRAWER_PREREQUISITES

  if (!boxMaterial && !doorFinishMaterial) {
    return messages.BOTH_MISSING
  } else if (!boxMaterial) {
    return messages.BOX_MISSING
  } else if (!doorFinishMaterial) {
    return messages.DOOR_MISSING
  }
  return ''
}

export function isDrawerTypeValid(
  drawerType: any,
  boxMaterial: any,
  doorFinishMaterial: any,
  allDrawerTypes: any[],
): boolean {
  if (!drawerType) return true
  const validDrawerTypes = getFilteredDrawerTypes(boxMaterial, doorFinishMaterial, allDrawerTypes)
  return validDrawerTypes.some((validType: any) => validType.id === drawerType.id)
}

export function getFilteredGrainOptions(doorFinishMaterialColor: any, allGrains: any[]) {
  return getFilteredGrains(doorFinishMaterialColor, allGrains)
}

export function isValidGrainSelection(selectedGrain: any, doorFinishMaterialColor: any, allGrains: any[]) {
  return isGrainSelectionValid(selectedGrain, doorFinishMaterialColor, allGrains)
}

export function getGrainValidationMessage(doorFinishMaterialColor: any): string {
  return getGrainSelectionMessage(doorFinishMaterialColor)
}

export function createDefaultMaterialStructure() {
  return {
    box_materials: null,
    box_material_colors: null,
    door_types: null,
    door_finish_materials: null,
    glass_or_mirror: null,
    glass_mirror_type: null,
    door_finish_material_colors: null,
    grains: null,
    drawer_types: null,
    drawer_materials: null,
  }
}

export function validateFormCompleteness(materials: any): boolean {
  if (!materials) return false

  const doorType = materials.door_types
  const boxMaterial = materials.box_materials
  const doorFinishMaterial = materials.door_finish_materials
  const doorFinishMaterialColor = materials.door_finish_material_colors

  // Required base materials
  if (!boxMaterial || !doorType || !doorFinishMaterial) {
    return false
  }

  // Door finish material color is required when door finish material is selected
  if (!doorFinishMaterialColor) {
    return false
  }

  const requireGlassFields = isGlassDoorType(doorType)
  const requireBoxColor = hasBoxMaterialColors(boxMaterial)

  // Validate box material color if required
  if (requireBoxColor && !materials.box_material_colors) {
    return false
  }

  // Validate glass/mirror fields if required
  if (requireGlassFields) {
    if (!materials.glass_or_mirror || !materials.glass_mirror_type) {
      return false
    }
  }

  // Drawer validation: only validate if prerequisites are met
  const drawerType = materials.drawer_types
  const drawerMaterial = materials.drawer_materials
  const hasDrawerType = drawerType !== null && drawerType !== undefined
  const hasDrawerMaterial = drawerMaterial !== null && drawerMaterial !== undefined
  const drawerPrerequisitesMet = areDrawerPrerequisitesMet(boxMaterial, doorFinishMaterial)

  // If prerequisites are met, both drawer type and material must be selected together
  const drawerSelectionValid =
    !drawerPrerequisitesMet || (!hasDrawerType && !hasDrawerMaterial) || (hasDrawerType && hasDrawerMaterial)

  return drawerSelectionValid
}
