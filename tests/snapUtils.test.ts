import { describe, expect, it } from 'vitest';
import { INCH_STEP, snapTo16th } from '../src/features/closet/domain/snapUtils';

describe('snapTo16th utility', () => {
  it('preserves exact 1/16th multiples', () => {
    expect(snapTo16th(0.0625)).toBe(0.0625);
    expect(snapTo16th(0.125)).toBe(0.125);
    expect(snapTo16th(0.1875)).toBe(0.1875);
    expect(snapTo16th(0.25)).toBe(0.25);
    expect(snapTo16th(0.3125)).toBe(0.3125);
    expect(snapTo16th(0.375)).toBe(0.375);
    expect(snapTo16th(0.4375)).toBe(0.4375);
    expect(snapTo16th(0.5)).toBe(0.5);
    expect(snapTo16th(0.5625)).toBe(0.5625);
    expect(snapTo16th(0.625)).toBe(0.625);
    expect(snapTo16th(0.6875)).toBe(0.6875);
    expect(snapTo16th(0.75)).toBe(0.75);
    expect(snapTo16th(0.8125)).toBe(0.8125);
    expect(snapTo16th(0.875)).toBe(0.875);
    expect(snapTo16th(0.9375)).toBe(0.9375);
    expect(snapTo16th(1.0)).toBe(1.0);
  });

  it('rounds non-multiples to nearest 1/16th', () => {
    // Small value < 0.03125 -> rounds down to 0
    expect(snapTo16th(0.0011)).toBe(0);
    expect(snapTo16th(0.03)).toBe(0);

    // Value >= 0.03125 -> rounds up to 0.0625
    expect(snapTo16th(0.03125)).toBe(0.0625);
    expect(snapTo16th(0.04)).toBe(0.0625);

    // 14.503 -> 14.5
    expect(snapTo16th(14.503)).toBe(14.5);

    // 14.54 -> 14.5625 (14 9/16)
    expect(snapTo16th(14.54)).toBe(14.5625);
  });

  it('handles invalid or non-finite inputs gracefully', () => {
    expect(snapTo16th(NaN)).toBe(0);
    expect(snapTo16th(Infinity)).toBe(0);
  });
});
