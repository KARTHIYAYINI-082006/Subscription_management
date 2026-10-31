import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART } from '@/lib/constants';
import { formatMonth, inr, inrShort } from '@/lib/utils';
import type { TrendPoint } from '@/types';

const axis = { stroke: CHART.axis, fontSize: 11, tickLine: false, axisLine: false } as const;
const tooltipStyle = {
  contentStyle: { borderRadius: 10, border: '1px solid #EBE5EF', boxShadow: '0 8px 24px -8px rgba(40,29,53,.2)', fontSize: 12 },
  labelStyle: { color: '#30283A', fontWeight: 600, marginBottom: 4 },
};

/** Invoiced vs collected revenue per month (two series, shared axis). */
export function RevenueTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {[CHART.primary, CHART.secondary].map((c) => (
            <linearGradient key={c} id={`fill-${c.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={c} stopOpacity={0.18} />
              <stop offset="100%" stopColor={c} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="month" tickFormatter={formatMonth} {...axis} />
        <YAxis tickFormatter={inrShort} width={64} {...axis} />
        <Tooltip {...tooltipStyle} labelFormatter={(l) => formatMonth(String(l))} formatter={(v) => inr(Number(v))} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Area type="monotone" dataKey="invoiced" name="Invoiced" stroke={CHART.primary} strokeWidth={2} fill={`url(#fill-${CHART.primary.slice(1)})`} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
        <Area type="monotone" dataKey="collected" name="Collected" stroke={CHART.secondary} strokeWidth={2} fill={`url(#fill-${CHART.secondary.slice(1)})`} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** New subscriptions started per month (single series). */
export function GrowthChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="month" tickFormatter={formatMonth} {...axis} />
        <YAxis allowDecimals={false} {...axis} />
        <Tooltip {...tooltipStyle} cursor={{ fill: '#F5F0F9' }} labelFormatter={(l) => formatMonth(String(l))} />
        <Bar dataKey="newSubscriptions" name="New subscriptions" fill={CHART.primary} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal labelled bars for ranked breakdowns (values printed, so no colour legend needed). */
export function BarList({ items, format = inr }: { items: { name: string; value: number }[]; format?: (v: number) => string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.name} title={`${item.name}: ${format(item.value)}`}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-ink">{item.name}</span>
            <span className="shrink-0 font-medium tabular-nums text-ink">{format(item.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-brand-50/70">
            <div className="h-2 rounded-full transition-all" style={{ width: `${(item.value / max) * 100}%`, background: CHART.primary }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
