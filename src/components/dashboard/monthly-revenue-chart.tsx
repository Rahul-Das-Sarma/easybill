"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

type Point = {
  month: string;
  revenue: number;
};

export function MonthlyRevenueChart({ data }: { data: Point[] }) {
  return (
    <div className="mt-4 h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => inr.format(v)}
            width={80}
          />
          <Tooltip
            formatter={(value) => {
              const amount = typeof value === "number" ? value : 0;
              return [inr.format(amount), "Revenue"];
            }}
            cursor={{ fill: "rgba(148, 163, 184, 0.15)" }}
          />
          <Bar dataKey="revenue" radius={[8, 8, 0, 0]} fill="currentColor" className="text-primary" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
