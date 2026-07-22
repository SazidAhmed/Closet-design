/**
 * Standard increment for inch dimensions (1/16th of an inch = 0.0625).
 */
export const INCH_STEP = 0.0625;

/**
 * Snap a dimension value to the nearest 1/16th of an inch (0.0625).
 * Uses standard half-up rounding and cleans floating-point noise up to 4 decimal places.
 *
 * @param val Number to snap
 * @returns Number snapped to nearest multiple of 0.0625
 */
export function snapTo16th(val: number): number {
  if (!Number.isFinite(val)) return 0;
  const snapped = Math.round(val / INCH_STEP) * INCH_STEP;
  return Number(snapped.toFixed(4));
}
