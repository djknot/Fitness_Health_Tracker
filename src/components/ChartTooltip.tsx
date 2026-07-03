import type { ReactNode } from 'react';
import type { ChartTheme } from '../theme/chart';

/** Shared tooltip chrome: surface box, hairline border, value-first typography. */
export function ChartTooltipBox({ theme, children }: { theme: ChartTheme; children: ReactNode }) {
  return (
    <div
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
        padding: '8px 10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
      }}
    >
      {children}
    </div>
  );
}

export function TooltipValue({ theme, children }: { theme: ChartTheme; children: ReactNode }) {
  return <div style={{ color: theme.ink, fontSize: 14, fontWeight: 600 }}>{children}</div>;
}

export function TooltipLabel({ theme, children }: { theme: ChartTheme; children: ReactNode }) {
  return <div style={{ color: theme.ink2, fontSize: 11, marginTop: 2 }}>{children}</div>;
}
