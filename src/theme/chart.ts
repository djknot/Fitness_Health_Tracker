import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * Chart colors resolved in JS: SVG presentation attributes can't reliably
 * read CSS custom properties, so Recharts gets concrete hex per scheme.
 * Values come from the validated reference palette (see memory-bank).
 */
export interface ChartTheme {
  series1: string;
  series2: string;
  series3: string;
  grid: string;
  axis: string;
  tick: string;
  surface: string;
  border: string;
  ink: string;
  ink2: string;
  refLine: string;
  cursorFill: string;
}

export const LIGHT_CHART: ChartTheme = {
  series1: '#2a78d6',
  series2: '#1baf7a',
  series3: '#eda100',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  tick: '#898781',
  surface: '#fcfcfb',
  border: 'rgba(11,11,11,0.10)',
  ink: '#0b0b0b',
  ink2: '#52514e',
  refLine: '#898781',
  cursorFill: 'rgba(11,11,11,0.05)',
};

export const DARK_CHART: ChartTheme = {
  series1: '#3987e5',
  series2: '#199e70',
  series3: '#c98500',
  grid: '#2c2c2a',
  axis: '#383835',
  tick: '#898781',
  surface: '#1a1a19',
  border: 'rgba(255,255,255,0.10)',
  ink: '#ffffff',
  ink2: '#c3c2b7',
  refLine: '#898781',
  cursorFill: 'rgba(255,255,255,0.06)',
};

export function usePrefersDark(): boolean {
  const [dark, setDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return dark;
}

/** Effective dark-mode flag: manual preference wins, 'system' follows the OS. */
export function useIsDark(): boolean {
  const pref = useAppStore((s) => s.prefs.theme);
  const systemDark = usePrefersDark();
  return pref === 'dark' || (pref === 'system' && systemDark);
}

export function useChartTheme(): ChartTheme {
  return useIsDark() ? DARK_CHART : LIGHT_CHART;
}
