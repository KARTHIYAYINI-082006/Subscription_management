import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { revenueByMonth, subscriptionStats } from "@/lib/mock-data";

const tip = { contentStyle: { borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 } };

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={revenueByMonth} margin={{ left: -10, right: 8 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
        <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" tickFormatter={(v) => `$${v / 1000}k`} />
        <Tooltip {...tip} formatter={(v: number) => `$${v.toLocaleString()}`} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#rev)" />
        <Area type="monotone" dataKey="mrr" name="MRR" stroke="var(--chart-2)" strokeWidth={2} fill="transparent" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SubscriptionPie() {
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-4)", "var(--chart-5)"];
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={subscriptionStats} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95} paddingAngle={3}>
          {subscriptionStats.map((_, i) => <Cell key={i} fill={colors[i]} />)}
        </Pie>
        <Tooltip {...tip} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MonthlyBars() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={revenueByMonth} margin={{ left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
        <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" tickFormatter={(v) => `$${v / 1000}k`} />
        <Tooltip {...tip} formatter={(v: number) => `$${v.toLocaleString()}`} />
        <Bar dataKey="revenue" name="Revenue" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
