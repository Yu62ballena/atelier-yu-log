"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import clsx from "clsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PeriodClient({ events, dailyReports }: { events: any[], dailyReports: any[] }) {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [axis, setAxis] = useState<"project" | "app" | "domain">("project");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chartData: any[] = [];
  const dataKeys: Set<string> = new Set();

  if (events.length === 0 && dailyReports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <p className="text-[#78716C] mb-4">まだデータがありません。collectorを起動してください。</p>
      </div>
    );
  }

  // Very simplified grouping for demonstration of the axis logic.
  // We group by day (since our mock data is just today, this will have 1 bar for 'day')
  const groupKeyFn = (dateStr: string) => {
    const d = new Date(dateStr);
    if (period === "day") return d.toISOString().split("T")[0];
    if (period === "week") {
      const first = d.getDate() - d.getDay();
      const firstDay = new Date(d.setDate(first));
      return firstDay.toISOString().split("T")[0]; // week start date
    }
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`; // month
  };

  const grouped: Record<string, Record<string, number>> = {};

  if (axis === "project") {
    // Group by daily_reports result_json
    dailyReports.forEach(r => {
      const gKey = groupKeyFn(r.date);
      if (!grouped[gKey]) grouped[gKey] = {};

      try {
        const parsed = JSON.parse(r.result_json);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parsed.projects.forEach((p: any) => {
          grouped[gKey][p.name] = (grouped[gKey][p.name] || 0) + p.minutes;
          dataKeys.add(p.name);
        });
        if (parsed.unclassified_minutes) {
          grouped[gKey]["未分類"] = (grouped[gKey]["未分類"] || 0) + parsed.unclassified_minutes;
          dataKeys.add("未分類");
        }
      } catch {
        // ignore
      }
    });
  } else {
    // Group by events app/domain
    events.forEach(ev => {
      if (ev.is_afk) return;
      const gKey = groupKeyFn(ev.started_at);
      if (!grouped[gKey]) grouped[gKey] = {};

      let itemKey = ev.app;
      if (axis === "domain") {
        if (ev.url && ev.url.trim().length > 0) {
          try {
            // simple domain extraction if it includes http, otherwise just use it
            const url = ev.url.startsWith("http") ? new URL(ev.url).hostname : ev.url;
            itemKey = url;
          } catch {
            itemKey = "その他（URLなし）";
          }
        } else {
          itemKey = "その他（URLなし）";
        }
      }

      const mins = ev.duration_sec / 60;
      grouped[gKey][itemKey] = (grouped[gKey][itemKey] || 0) + mins;
      dataKeys.add(itemKey);
    });
  }

  chartData = Object.keys(grouped).sort().map(k => {
    return { date: k, ...grouped[k] };
  });

  const colors = ["#2563EB", "#059669", "#D97706", "#DB2777", "#7C3AED", "#0891B2"];
  const keysArray = Array.from(dataKeys);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">Period Summary</h2>

      <div className="flex flex-col gap-4">
        {/* Tabs 1 */}
        <div className="flex border-b border-[#E7E5E4] gap-6">
          {(["day", "week", "month"] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={clsx("pb-2 px-1 border-b-2 font-medium capitalize text-sm transition-colors",
                period === p ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#78716C] hover:text-[#1C1917]"
              )}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Tabs 2 */}
        <div className="flex border-b border-[#E7E5E4] gap-6">
          {(["project", "app", "domain"] as const).map(a => (
            <button
              key={a}
              onClick={() => setAxis(a)}
              className={clsx("pb-2 px-1 border-b-2 font-medium capitalize text-sm transition-colors",
                axis === a ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#78716C] hover:text-[#1C1917]"
              )}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#FFFFFF] border border-[#E7E5E4] rounded-lg p-5 h-[500px]">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#78716C]">
            データがありません
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              {keysArray.map((key, i) => (
                <Bar key={key} dataKey={key} stackId="a" fill={key === "未分類" || key === "その他（URLなし）" ? "#78716C" : colors[i % colors.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
