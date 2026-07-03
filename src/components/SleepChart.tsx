import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMedium, weekdayShort } from '../lib/dates';
import { useChartTheme } from '../theme/chart';
import { ChartTooltipBox, TooltipLabel, TooltipValue } from './ChartTooltip';

interface SleepChartProps {
  data: { date: string; hours: number }[];
  className?: string;
}

export function SleepChart({ data, className = 'h-56' }: SleepChartProps) {
  const theme = useChartTheme();

  const renderTooltip = (props: {
    active?: boolean;
    payload?: ReadonlyArray<{ value?: number | string | ReadonlyArray<number | string>; payload?: { date?: string } }>;
  }) => {
    const point = props.payload?.[0];
    if (!props.active || !point?.payload?.date) return null;
    return (
      <ChartTooltipBox theme={theme}>
        <TooltipValue theme={theme}>{String(point.value)} h</TooltipValue>
        <TooltipLabel theme={theme}>{formatMedium(point.payload.date)}</TooltipLabel>
      </ChartTooltipBox>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
          <XAxis
            dataKey="date"
            tickFormatter={weekdayShort}
            tick={{ fill: theme.tick, fontSize: 11 }}
            axisLine={{ stroke: theme.axis }}
            tickLine={false}
            minTickGap={16}
          />
          <YAxis
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            tick={{ fill: theme.tick, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={renderTooltip} cursor={{ fill: theme.cursorFill }} />
          <Bar
            dataKey="hours"
            fill={theme.series1}
            radius={[4, 4, 0, 0]}
            maxBarSize={20}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
