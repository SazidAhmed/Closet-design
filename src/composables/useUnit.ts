// ---------------------------------------------------------------------------
// useUnit — composable for formatting dimensions in cm or inches
// ---------------------------------------------------------------------------

import { computed } from 'vue'
import { useAppStore } from '../stores/useAppStore'

const CM_PER_INCH = 2.54

export function useUnit() {
  const app = useAppStore()

  const unitLabel = computed(() => (app.units === 'cm' ? 'cm' : 'in'))
  const isCm = computed(() => app.units === 'cm')

  /**
   * Format a value (always stored internally in cm) for display.
   * @param cm — the value in centimeters
   * @param decimals — decimal places (default 1 for inches, 0 for cm)
   */
  function fmt(cm: number, decimals?: number): string {
    if (app.units === 'in') {
      const inches = cm / CM_PER_INCH
      const d = decimals ?? 1
      return `${inches.toFixed(d)}″`
    }
    const d = decimals ?? 0
    return `${cm.toFixed(d)} cm`
  }

  /**
   * Convert a display-unit value back to cm for storage.
   * Use when reading user input from a field displaying the current unit.
   */
  function toCm(displayValue: number): number {
    return app.units === 'in' ? displayValue * CM_PER_INCH : displayValue
  }

  /**
   * Convert cm to the current display unit (raw number, no label).
   */
  function fromCm(cm: number): number {
    return app.units === 'in' ? cm / CM_PER_INCH : cm
  }

  return { unitLabel, isCm, fmt, toCm, fromCm, toggleUnits: app.toggleUnits }
}
