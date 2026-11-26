import { GRAIN_FLAGS, GRAIN_IDS } from '../features/closet/domain/materials/materialConstants'

export function useGrainSelector() {
  // Filter available grains based on door finish material color properties
  const getFilteredGrains = (doorFinishMaterialColor: any, allGrains: any[]) => {
    if (!allGrains || !Array.isArray(allGrains)) return []

    // If no door finish material color selected, return all grains
    if (!doorFinishMaterialColor) return allGrains

    const { has_grain, only_vertical_grain } = doorFinishMaterialColor

    // Case 1: has_grain = 0 -> Only show N/A
    if (has_grain === GRAIN_FLAGS.NO_GRAIN) {
      return allGrains.filter((grain) => grain.id === GRAIN_IDS.N_A)
    }

    // Case 2: has_grain = 1
    if (has_grain === GRAIN_FLAGS.HAS_GRAIN) {
      // Case 2a: only_vertical_grain = 1 -> Only show Vertical
      if (only_vertical_grain === GRAIN_FLAGS.ONLY_VERTICAL) {
        return allGrains.filter((grain) => grain.id === GRAIN_IDS.VERTICAL)
      }

      // Case 2b: only_vertical_grain = 0 -> Show Vertical and Horizontal (Upcharge)
      if (only_vertical_grain === GRAIN_FLAGS.ALLOWS_BOTH) {
        return allGrains.filter(
          (grain) => grain.id === GRAIN_IDS.VERTICAL || grain.id === GRAIN_IDS.HORIZONTAL_UPCHARGE,
        )
      }
    }

    // Fallback: return all grains if conditions don't match
    return allGrains
  }

  // Check if grain selection should be disabled
  const isGrainSelectionDisabled = (doorFinishMaterialColor: any) => {
    if (!doorFinishMaterialColor) return true
    return doorFinishMaterialColor.has_grain === GRAIN_FLAGS.NO_GRAIN
  }

  // Get grain selection message for UI
  const getGrainSelectionMessage = (doorFinishMaterialColor: any) => {
    if (!doorFinishMaterialColor) {
      return 'Please select Door Color first'
    }

    const { has_grain, only_vertical_grain } = doorFinishMaterialColor

    if (has_grain === GRAIN_FLAGS.NO_GRAIN) {
      return 'No grain options available for this color'
    }

    if (has_grain === GRAIN_FLAGS.HAS_GRAIN && only_vertical_grain === GRAIN_FLAGS.ONLY_VERTICAL) {
      return 'Only vertical grain available for this color'
    }

    if (has_grain === GRAIN_FLAGS.HAS_GRAIN && only_vertical_grain === GRAIN_FLAGS.ALLOWS_BOTH) {
      return 'Vertical and horizontal grain options available'
    }

    return 'Select grain option'
  }

  // Check if current grain selection is valid for the door finish material color
  const isGrainSelectionValid = (selectedGrain: any, doorFinishMaterialColor: any, allGrains: any[]) => {
    if (!selectedGrain || !doorFinishMaterialColor) return true

    const filteredGrains = getFilteredGrains(doorFinishMaterialColor, allGrains)
    return filteredGrains.some((grain) => grain.id === selectedGrain.id)
  }

  // Get the default grain selection for a door finish material color
  const getDefaultGrainSelection = (doorFinishMaterialColor: any, allGrains: any[]) => {
    const filteredGrains = getFilteredGrains(doorFinishMaterialColor, allGrains)

    // If only N/A is available, auto-select it
    if (filteredGrains.length === 1 && filteredGrains[0].id === GRAIN_IDS.N_A) {
      return filteredGrains[0]
    }

    return null
  }

  return {
    getFilteredGrains,
    isGrainSelectionDisabled,
    getGrainSelectionMessage,
    isGrainSelectionValid,
    getDefaultGrainSelection,
  }
}
