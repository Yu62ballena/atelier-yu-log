"use client";

import { useMemo, useState } from "react";
import type { Event } from "../lib/db";

export function Timeline({ events, projectColors }: { events: Event[], projectColors: Record<string, string> }) {
  const [tooltip, setTooltip] = useState<{ x: number, y: number, text: string } | null>(null);

  // Parse start and map events to fractions of the day
  const blocks = useMemo(() => {
    return events.map(ev => {
      const startDt = new Date(ev.started_at);
      // Minutes since 0:00 local time
      const startMins = startDt.getHours() * 60 + startDt.getMinutes();
      const durationMins = ev.duration_sec / 60;
      const startPercent = (startMins / (24 * 60)) * 100;
      const widthPercent = (durationMins / (24 * 60)) * 100;

      // Simplistic mapping: if title/app contains project name, use project color, else unclassified
      // A more robust implementation would use daily_reports evidence. For now, simple matching.
      let color = "var(--proj-other)";
      if (ev.is_afk) {
        color = "var(--afk)";
      } else {
        const textToMatch = `${ev.app} ${ev.title} ${ev.url}`.toLowerCase();
        for (const [pName, pColor] of Object.entries(projectColors)) {
          // If project name exists in text, assign color
          // Note: Issue mentioned "evidence突合", since we don't have full evidence struct, we do substring check.
          if (textToMatch.includes(pName.toLowerCase())) {
            color = pColor;
            break;
          }
        }
      }

      const timeFmt = `${startDt.getHours().toString().padStart(2, '0')}:${startDt.getMinutes().toString().padStart(2, '0')}`;

      return {
        id: ev.id,
        startPercent,
        widthPercent,
        color,
        tooltip: `[${timeFmt}] ${ev.app} - ${ev.title || ''}`,
      };
    });
  }, [events, projectColors]);

  return (
    <div className="relative w-full pt-6 pb-2">
      {/* 0 to 24 markers */}
      <div className="absolute top-0 w-full flex justify-between text-xs text-[#78716C]">
        <span>0:00</span>
        <span>6:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>

      <div className="h-6 w-full bg-gray-100 relative rounded overflow-hidden">
        {blocks.map(b => (
          <div
            key={b.id}
            className="absolute top-0 h-full hover:opacity-80 transition-opacity"
            style={{ left: `${b.startPercent}%`, width: `${b.widthPercent}%`, backgroundColor: b.color }}
            onMouseEnter={(e) => {
              setTooltip({ x: e.clientX, y: e.clientY, text: b.tooltip });
            }}
            onMouseLeave={() => setTooltip(null)}
            onMouseMove={(e) => {
              if (tooltip) {
                setTooltip({ ...tooltip, x: e.clientX, y: e.clientY });
              }
            }}
          />
        ))}
      </div>

      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none"
          style={{ top: tooltip.y + 10, left: tooltip.x + 10 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
