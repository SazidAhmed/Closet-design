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

function parseOperand(str: string): number | null {
  const s = str.trim();
  if (!s) return null;
  const num = Number(s);
  if (Number.isFinite(num)) {
    return num;
  }
  const fracMatch = s.match(/^(?:(\d+(?:\.\d+)?)(?:\s+|-(?!\s)))?(\d+)\/(\d+)$/);
  if (fracMatch) {
    const whole = fracMatch[1] ? parseFloat(fracMatch[1]) : 0;
    const n = parseFloat(fracMatch[2]!);
    const d = parseFloat(fracMatch[3]!);
    if (d !== 0) {
      return whole + n / d;
    }
  }
  return null;
}

/**
 * Parse a raw user input string (decimal, fraction, or 2-number addition/subtraction,
 * e.g. "96.5", "96 1/2", "96-1/2", "3/16", "4+4", "10-2", "12.5 + 3.25")
 * into a numeric value snapped to the nearest 1/16th of an inch (0.0625).
 */
export function parseFractionInput(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  if (typeof input === 'number') {
    return snapTo16th(input);
  }
  if (typeof input !== 'string') return 0;

  const trimmed = input.trim();
  if (!trimmed) return 0;

  // Try direct decimal number parse first
  const directNum = Number(trimmed);
  if (Number.isFinite(directNum)) {
    return snapTo16th(directNum);
  }

  // Check fraction patterns: "96 1/2", "96-1/2", "1/2", "3/16"
  const match = trimmed.match(/^(?:(\d+(?:\.\d+)?)(?:\s+|-(?!\s)))?(\d+)\/(\d+)$/);
  if (match) {
    const whole = match[1] ? parseFloat(match[1]) : 0;
    const num = parseFloat(match[2]!);
    const den = parseFloat(match[3]!);
    if (den !== 0) {
      return snapTo16th(whole + num / den);
    }
  }

  // Check binary calculation between 2 numbers based on "+" and "-"
  for (let i = 1; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (char === '+' || char === '-') {
      const leftPart = trimmed.slice(0, i).trim();
      const rightPart = trimmed.slice(i + 1).trim();
      if (leftPart && rightPart) {
        const leftVal = parseOperand(leftPart);
        const rightVal = parseOperand(rightPart);
        if (leftVal !== null && rightVal !== null) {
          const result = char === '+' ? leftVal + rightVal : leftVal - rightVal;
          return snapTo16th(result);
        }
      }
    }
  }

  return 0;
}
