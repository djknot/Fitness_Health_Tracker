import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Units } from '../types';
import { formatMedium } from '../lib/dates';
import { kgToDisplay, weightUnit } from '../lib/units';
import { useChartTheme } from '../theme/chart';
import { ChartTooltipBox, TooltipLabel, TooltipValue } from './ChartTooltip';
import { ChartEmpty } from './ui';

interface WeightChartProps {
  series: { date: string; weightKg: number }[];
  targetWeightKg?: number;
  units: Units;
  className?: string;
}

export function WeightChart({ series, targetWeightKg, units, className = 'h-56' }: WeightChartProps) {
  const theme = useChartTheme();
  const unit = weightUnit(units);
  const data = series.map((p) => ({ date: p.date, weight: kgToDisplay(p.weightKg, units) }));

  if (data.length < 2) {
    return <ChartEmpty className={className} message="Log at least two weigh-ins to see your trend." />;
  }

  const target = targetWeightKg != null ? kgToDisplay(targetWeightKg, units) : undefined;
  const values = data.map((d) => d.weight).concat(target != null ? [target] : []);
  const domain: [number, number] = [
    Math.floor(Math.min(...values) - 1),
    Math.ceil(Math.max(...values) + 1),
  ];

  const renderTooltip = (props: {
    active?: boolean;
    payload?: ReadonlyArray<{ value?: number | string | ReadonlyArray<number | string>; payload?: { date?: string } }>;
  }) => {
    const point = props.payload?.[0];
    if (!props.active || !point?.payload?.date) return null;
    return (
      <ChartTooltipBox theme={theme}>
        <TooltipValue theme={theme}>
          {String(point.value)} {unit}
        </TooltipValue>
        <TooltipLabel theme={theme}>{formatMedium(point.payload.date)}</TooltipLabel>
      </ChartTooltipBox>
    );
  };

  const showDots = data.length <= 31;

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
          <XAxis
            dataKey="date"
            tickFormatter={formatMedium}
            tick={{ fill: theme.tick, fontSize: 11 }}
            axisLine={{ stroke: theme.axis }}
            tickLine={false}
            minTickGap={32}
          />
          <YAxis
            domain={domain}
            tick={{ fill: theme.tick, fontSize: 11 }}
            tickFormatter={(v: number) => String(Math.round(v))}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={renderTooltip} cursor={{ stroke: theme.axis, strokeWidth: 1 }} />
          {target != null && (
            <ReferenceLine y={target} stroke={theme.refLine} strokeDasharray="4 4" strokeWidth={1} />
          )}
          <Area
            type="monotone"
            dataKey="weight"
            stroke="none"
            fill={theme.series1}
            fillOpacity={0.1}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke={theme.series1}
            strokeWidth={2}
            strokeLinecap="round"
            dot={
              showDots
                ? { r: 4, fill: theme.series1, stroke: theme.surface, strokeWidth: 2 }
                : false
            }
            activeDot={{ r: 5, fill: theme.series1, stroke: theme.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
