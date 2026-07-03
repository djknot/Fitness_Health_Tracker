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
import { formatMedium, weekdayShort } from '../lib/dates';
import { useChartTheme } from '../theme/chart';
import { ChartTooltipBox, TooltipLabel, TooltipValue } from './ChartTooltip';

interface CaloriesChartProps {
  data: { date: string; calories: number }[];
  target?: number;
  className?: string;
}

export function CaloriesChart({ data, target, className = 'h-56' }: CaloriesChartProps) {
  const theme = useChartTheme();

  const renderTooltip = (props: {
    active?: boolean;
    payload?: ReadonlyArray<{ value?: number | string | ReadonlyArray<number | string>; payload?: { date?: string } }>;
  }) => {
    const point = props.payload?.[0];
    if (!props.active || !point?.payload?.date) return null;
    return (
      <ChartTooltipBox theme={theme}>
        <TooltipValue theme={theme}>{Number(point.value).toLocaleString('en-US')} kcal</TooltipValue>
        <TooltipLabel theme={theme}>{formatMedium(point.payload.date)}</TooltipLabel>
      </ChartTooltipBox>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={theme.grid} strokeWidth={1} />
          <XAxis
            dataKey="date"
            tickFormatter={weekdayShort}
            tick={{ fill: theme.tick, fontSize: 11 }}
            axisLine={{ stroke: theme.axis }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: theme.tick, fontSize: 11 }}
            tickFormatter={(v: number) => v.toLocaleString('en-US')}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={renderTooltip} cursor={{ fill: theme.cursorFill }} />
          {target != null && target > 0 && (
            <ReferenceLine y={target} stroke={theme.refLine} strokeDasharray="4 4" strokeWidth={1} />
          )}
          <Bar
            dataKey="calories"
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
