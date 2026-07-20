// ---------------------------------------------------------------------------
// useUnit — composable for formatting dimensions in inches
// ---------------------------------------------------------------------------

import { computed } from 'vue'

export function useUnit() {
  const unitLabel = computed(() => 'in')
  
  // Hardcoded to false since we no longer support cm
  const isCm = computed(() => false)

  function truncateToDecimals(value: number, d: number): string {
    const factor = Math.pow(10, d)
    const truncated = Math.round(value * factor) / factor
    return String(truncated)
  }

  /**
   * Format a value (stored internally in inches) for display.
   * Rounds to the requested decimal places (default 2).
   * @param value — the value in inches
   * @param decimals — decimal places (default 2)
   */
  function fmt(value: number, decimals?: number): string {
    const d = decimals ?? 2
    return `${truncateToDecimals(value, d)}″`
  }

  // Pass-through functions to replace old cm conversions
  function toCm(displayValue: number): number {
    return displayValue;
  }

  function fromCm(val: number): number {
    return val;
  }

  // Dummy toggle since units are fixed
  function toggleUnits() {}

  return { unitLabel, isCm, fmt, toCm, fromCm, toggleUnits }
}
