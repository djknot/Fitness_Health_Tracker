import { describe, expect, it } from 'vitest';
import {
  cmToDisplay,
  displayToCm,
  displayToKg,
  formatWeight,
  kgToDisplay,
  lengthUnit,
  round1,
  weightUnit,
} from './units';

describe('unit labels', () => {
  it('picks the right units per system', () => {
    expect(weightUnit('metric')).toBe('kg');
    expect(weightUnit('imperial')).toBe('lb');
    expect(lengthUnit('metric')).toBe('cm');
    expect(lengthUnit('imperial')).toBe('in');
  });
});

describe('weight conversion', () => {
  it('passes metric values through unchanged', () => {
    expect(kgToDisplay(72.5, 'metric')).toBe(72.5);
    expect(displayToKg(72.5, 'metric')).toBe(72.5);
  });

  it('round-trips kg -> lb -> kg within 0.05', () => {
    const lb = kgToDisplay(72.5, 'imperial');
    expect(lb).toBe(159.8);
    expect(Math.abs(displayToKg(lb, 'imperial') - 72.5)).toBeLessThan(0.05);
  });
});

describe('length conversion', () => {
  it('round-trips cm -> in -> cm within 0.15', () => {
    const inches = cmToDisplay(180, 'imperial');
    expect(inches).toBe(70.9);
    expect(Math.abs(displayToCm(inches, 'imperial') - 180)).toBeLessThan(0.15);
  });

  it('passes metric values through unchanged', () => {
    expect(cmToDisplay(180, 'metric')).toBe(180);
    expect(displayToCm(180, 'metric')).toBe(180);
  });
});

describe('formatWeight', () => {
  it('formats both unit systems', () => {
    expect(formatWeight(72.5, 'metric')).toBe('72.5 kg');
    expect(formatWeight(72.5, 'imperial')).toBe('159.8 lb');
  });
});

describe('round1', () => {
  it('rounds to one decimal', () => {
    expect(round1(3.14159)).toBe(3.1);
    expect(round1(2.678)).toBe(2.7);
    expect(round1(5)).toBe(5);
  });
});
