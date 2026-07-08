import { getTodayEvents, getDailyReport } from "../lib/db";
import { Timeline } from "./Timeline";
import { ProjectBarChart } from "./ProjectBarChart";

export default async function TodayPage() {
  const today = new Date().toISOString().split("T")[0];
  const events = getTodayEvents(today);
  const report = getDailyReport(today);

  if (events.length === 0 && !report) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <p className="text-[#78716C] mb-4">まだデータがありません。collectorを起動してください。</p>
      </div>
    );
  }

  // Calculate Focus Metrics
  let contextSwitches = 0;
  let maxContinuousWork = 0;
  let currentContinuousWork = 0;

  let lastApp = "";
  for (const event of events) {
    if (event.is_afk) {
      if (currentContinuousWork > maxContinuousWork) {
        maxContinuousWork = currentContinuousWork;
      }
      currentContinuousWork = 0;
      lastApp = "";
      continue;
    }

    if (lastApp && lastApp !== event.app) {
      contextSwitches++;
    }
    lastApp = event.app;
    currentContinuousWork += event.duration_sec;
  }
  if (currentContinuousWork > maxContinuousWork) {
    maxContinuousWork = currentContinuousWork;
  }

  const maxWorkMins = Math.floor(maxContinuousWork / 60);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let resultJson: any = { projects: [], unclassified_minutes: 0 };
  if (report?.result_json) {
    try {
      resultJson = JSON.parse(report.result_json);
    } catch {
      // ignore
    }
  }

  if (!resultJson.projects || !Array.isArray(resultJson.projects)) {
    resultJson.projects = [];
  }
  if (typeof resultJson.unclassified_minutes !== 'number') {
    resultJson.unclassified_minutes = 0;
  }

  // Assign color indices to projects for Timeline & BarChart
  const projectColors: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resultJson.projects.forEach((p: any, i: number) => {
    projectColors[p.name] = i < 6 ? `var(--proj-${i + 1})` : 'var(--proj-other)';
  });

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">Today</h2>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#FFFFFF] border border-[#E7E5E4] rounded-lg p-5">
          <div className="text-[14px] font-semibold text-[#78716C] mb-1">Context Switches</div>
          <div className="text-[28px] font-bold">{contextSwitches}</div>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E7E5E4] rounded-lg p-5">
          <div className="text-[14px] font-semibold text-[#78716C] mb-1">Max Continuous Work (min)</div>
          <div className="text-[28px] font-bold">{maxWorkMins}</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-[#FFFFFF] border border-[#E7E5E4] rounded-lg p-5">
        <h3 className="text-[14px] font-semibold text-[#78716C] mb-4">Timeline</h3>
        <Timeline events={events} projectColors={projectColors} />
      </div>

      {/* Bar Chart */}
      <div className="bg-[#FFFFFF] border border-[#E7E5E4] rounded-lg p-5 relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[14px] font-semibold text-[#78716C]">Total Time per Project (min)</h3>

          {report && (
            // A simple heuristic for events vs daily_reports mismatch:
            // Since events covers whole day and AI report covers the day, we expect total events duration
            // (minus AFK roughly) to be somewhat close to total minutes in report.
            // If they are wildly different, it implies logs deleted or mismatch.
            (() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const totalReportMins = resultJson.projects.reduce((acc: number, p: any) => acc + p.minutes, 0) + resultJson.unclassified_minutes;
              const totalEventsMins = Math.floor(events.filter((e) => !e.is_afk).reduce((acc, e) => acc + e.duration_sec, 0) / 60);

              if (Math.abs(totalReportMins - totalEventsMins) > 10) {
                return (
                  <div className="text-amber-500 flex items-center gap-1 text-sm font-semibold" title="イベントと日報の時間が一致しません（ログが削除された可能性があります）">
                    ⚠️ データの不整合
                  </div>
                );
              }
              return null;
            })()
          )}
        </div>

        {(!report || (resultJson.projects.length === 0 && resultJson.unclassified_minutes === 0)) ? (
          <div className="text-[#78716C] text-sm py-4">
            AI仕分けがまだ実行されていません。（daily_reportsがありません）
          </div>
        ) : (
          <div className="h-[300px]">
             <ProjectBarChart data={resultJson} projectColors={projectColors} />
          </div>
        )}
      </div>
    </div>
  );
}
