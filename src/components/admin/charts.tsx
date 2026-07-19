"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Recharts wrappers (§2 stack) — data arrives serialized from the server. */

export function RevenueAreaChart({ data, currency }: { data: { label: string; value: number }[]; currency: string }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1B2A4A" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#1B2A4A" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E7E9EE" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8A8F98" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={{ fontSize: 11, fill: "#8A8F98" }} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))} />
        <Tooltip
          formatter={(value) => [`${Number(value).toLocaleString("en-US")} ${currency}`, ""]}
          separator=""
          contentStyle={{ borderRadius: 12, border: "1px solid #E7E9EE", fontSize: 13 }}
        />
        <Area type="monotone" dataKey="value" stroke="#1B2A4A" strokeWidth={2} fill="url(#revFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StatusDonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-col items-center gap-4 lg:flex-row">
      <div className="relative h-[220px] w-[220px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius={68} outerRadius={100} paddingAngle={2} strokeWidth={0}>
              {data.map((d) => (
                <Cell key={d.label} fill={d.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E7E9EE", fontSize: 13 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="font-heading text-2xl font-bold text-ink">{total}</p>
          </div>
        </div>
      </div>
      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2 lg:grid-cols-1">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="truncate text-gray-6">{d.label}</span>
            <span className="ms-auto font-bold text-ink">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
