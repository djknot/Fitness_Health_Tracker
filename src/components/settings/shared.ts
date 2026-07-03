import { useEffect, useRef, useState } from 'react';

/** Show a transient "Saved ✓" flag for 2 s; the timer is cleared on unmount. */
export function useSavedFlash(): [boolean, () => void] {
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  const flash = () => {
    setSaved(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaved(false), 2000);
  };
  return [saved, flash];
}

/** '' or non-numeric → undefined, else the parsed number. */
export function numOrUndefined(s: string): number | undefined {
  const t = s.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** Parse a positive number, falling back when blank/invalid/non-positive. */
export function positiveOr(s: string, fallback: number): number {
  const n = numOrUndefined(s);
  return n != null && n > 0 ? n : fallback;
}
