import type { Units } from '../types';

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function weightUnit(units: Units): 'kg' | 'lb' {
  return units === 'metric' ? 'kg' : 'lb';
}

export function lengthUnit(units: Units): 'cm' | 'in' {
  return units === 'metric' ? 'cm' : 'in';
}

/** Canonical kg → display number in the user's unit, rounded to 1 decimal. */
export function kgToDisplay(kg: number, units: Units): number {
  return round1(units === 'metric' ? kg : kg / KG_PER_LB);
}

/** Number typed by the user in their unit → canonical kg. */
export function displayToKg(value: number, units: Units): number {
  return units === 'metric' ? value : value * KG_PER_LB;
}

export function cmToDisplay(cm: number, units: Units): number {
  return round1(units === 'metric' ? cm : cm / CM_PER_IN);
}

export function displayToCm(value: number, units: Units): number {
  return units === 'metric' ? value : value * CM_PER_IN;
}

/** "72.5 kg" / "159.8 lb" */
export function formatWeight(kg: number, units: Units): string {
  return `${kgToDisplay(kg, units)} ${weightUnit(units)}`;
}
