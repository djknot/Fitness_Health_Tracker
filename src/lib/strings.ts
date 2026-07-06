/** Capitalize the first character (e.g. meal-type labels: "breakfast" → "Breakfast"). */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
