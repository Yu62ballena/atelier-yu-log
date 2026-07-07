"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ReportRow({ report }: { report: any }) {
  const [expanded, setExpanded] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let resultJson: any = { projects: [], unclassified_minutes: 0 };
  try {
    resultJson = JSON.parse(report.result_json);
  } catch {
    // ignore
  }

  if (!resultJson.projects || !Array.isArray(resultJson.projects)) {
    resultJson.projects = [];
  }
  if (typeof resultJson.unclassified_minutes !== 'number') {
    resultJson.unclassified_minutes = 0;
  }

  const notionUrl = report.notion_page_id
    ? `https://notion.so/${report.notion_page_id.replace(/-/g, "")}`
    : null;

  return (
    <div className="bg-[#FFFFFF] border border-[#E7E5E4] rounded-lg overflow-hidden">
      <div
        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-[#FAFAF9] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-[#78716C]">
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
          <span className="font-bold text-lg">{report.date}</span>
        </div>
        {notionUrl && (
          <a
            href={notionUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[#2563EB] hover:underline text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={14} /> Notion Page
          </a>
        )}
      </div>

      {expanded && (
        <div className="px-11 py-4 border-t border-[#E7E5E4] bg-[#FAFAF9]">
          <h4 className="font-semibold text-[14px] text-[#78716C] mb-3">Project Summary</h4>
          <div className="flex flex-col gap-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {resultJson.projects.map((p: any, idx: number) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-[#1C1917]">{p.name}</span>
                  <span className="text-[#78716C] font-mono">{p.minutes} min</span>
                </div>
                {p.summary && (
                  <p className="text-sm text-[#78716C] bg-[#FFFFFF] p-3 rounded border border-[#E7E5E4]">
                    {p.summary}
                  </p>
                )}
              </div>
            ))}
            {resultJson.unclassified_minutes > 0 && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E7E5E4]">
                <span className="font-medium text-[#78716C]">未分類</span>
                <span className="text-[#78716C] font-mono">{resultJson.unclassified_minutes} min</span>
              </div>
            )}
            {resultJson.projects.length === 0 && resultJson.unclassified_minutes === 0 && (
              <div className="text-sm text-[#78716C]">No summary data available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
