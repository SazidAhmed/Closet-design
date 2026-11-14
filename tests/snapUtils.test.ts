import { describe, expect, it } from 'vitest';
import { INCH_STEP, snapTo16th, parseFractionInput } from '../src/features/closet/domain/snapUtils';

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

describe('parseFractionInput utility', () => {
  it('parses numbers and decimal strings', () => {
    expect(parseFractionInput(8)).toBe(8);
    expect(parseFractionInput('8')).toBe(8);
    expect(parseFractionInput('6.0000')).toBe(6);
    expect(parseFractionInput('12.5')).toBe(12.5);
  });

  it('parses fractional representations', () => {
    expect(parseFractionInput('1/2')).toBe(0.5);
    expect(parseFractionInput('96 1/2')).toBe(96.5);
    expect(parseFractionInput('96-1/2')).toBe(96.5);
    expect(parseFractionInput('3/16')).toBe(0.1875);
  });

  it('calculates addition between 2 numbers with "+"', () => {
    expect(parseFractionInput('4+4')).toBe(8);
    expect(parseFractionInput('4 + 4')).toBe(8);
    expect(parseFractionInput('12.5 + 3.5')).toBe(16);
    expect(parseFractionInput('0.25 + 0.75')).toBe(1);
    expect(parseFractionInput('4 + 1/2')).toBe(4.5);
  });

  it('calculates subtraction between 2 numbers with "-"', () => {
    expect(parseFractionInput('10-2')).toBe(8);
    expect(parseFractionInput('10 - 2')).toBe(8);
    expect(parseFractionInput('22.3125 - 12.3125')).toBe(10);
    expect(parseFractionInput('12 - 4')).toBe(8);
    expect(parseFractionInput('10 - 1/2')).toBe(9.5);
  });
});
