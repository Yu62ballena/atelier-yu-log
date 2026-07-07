"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ProjectBarChart({ data, projectColors }: { data: any, projectColors: Record<string, string> }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartData = [...(data.projects || [])].map((p: any) => ({
    name: p.name,
    minutes: p.minutes,
  }));

  if (data.unclassified_minutes > 0) {
    chartData.push({
      name: "未分類",
      minutes: data.unclassified_minutes
    });
  }

  const safeProjectColors: Record<string, string> = { ...projectColors, "未分類": "var(--proj-other)" };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
        <XAxis type="number" />
        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
        <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
        <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={safeProjectColors[entry.name as string] || 'var(--proj-other)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
