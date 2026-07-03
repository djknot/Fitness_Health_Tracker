import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMedium } from '../../lib/dates';
import type { WeekValue } from '../../lib/reports';
import { useChartTheme } from '../../theme/chart';
import { ChartTooltipBox, TooltipLabel, TooltipValue } from '../ChartTooltip';

interface WeeklyBarChartProps {
  /** One point per Mon-start week; null values render as gaps. */
  data: WeekValue[];
  /** Tooltip value text, e.g. (v) => `${v} kcal avg`. */
  formatValue: (v: number) => string;
  /** Optional dashed reference line (extends the domain when above the bars). */
  refValue?: number;
  refLabel?: string;
  /** Whole-number y-axis (e.g. workout counts). */
  integerY?: boolean;
  className?: string;
}

/** Single-series weekly bar chart in the app's established Recharts idiom. */
export function WeeklyBarChart({
  data,
  formatValue,
  refValue,
  refLabel,
  integerY = false,
  className = 'h-56',
}: WeeklyBarChartProps) {
  const theme = useChartTheme();

  const renderTooltip = (props: {
    active?: boolean;
    payload?: ReadonlyArray<{
      value?: number | string | ReadonlyArray<number | string>;
      payload?: { weekStart?: string };
    }>;
  }) => {
    const point = props.payload?.[0];
    if (!props.active || point?.value == null || !point.payload?.weekStart) return null;
    return (
      <ChartTooltipBox theme={theme}>
        <TooltipValue theme={theme}>{formatValue(Number(point.value))}</TooltipValue>
        <TooltipLabel theme={theme}>Week of {formatMedium(point.payload.weekStart)}</TooltipLabel>
      </ChartTooltipBox>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
          <XAxis
            dataKey="weekStart"
            tickFormatter={formatMedium}
            tick={{ fill: theme.tick, fontSize: 11 }}
            axisLine={{ stroke: theme.axis }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            allowDecimals={!integerY}
            tick={{ fill: theme.tick, fontSize: 11 }}
            tickFormatter={(v: number) => v.toLocaleString('en-US')}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={renderTooltip} cursor={{ fill: theme.cursorFill }} />
          {refValue != null && refValue > 0 && (
            <ReferenceLine
              y={refValue}
              stroke={theme.refLine}
              strokeDasharray="4 4"
              strokeWidth={1}
              ifOverflow="extendDomain"
              label={
                refLabel
                  ? { value: refLabel, position: 'insideTopRight', fill: theme.tick, fontSize: 10 }
                  : undefined
              }
            />
          )}
          <Bar
            dataKey="value"
            fill={theme.series1}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
