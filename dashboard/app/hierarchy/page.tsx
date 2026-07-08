import { getPeriodEvents, getAllDailyReports } from "../../lib/db";
import { SunburstChart } from "./SunburstChart";

export default async function HierarchyPage() {
  const d = new Date();
  d.setDate(d.getDate() - 30); // Last 30 days
  const events = getPeriodEvents(d.toISOString().split("T")[0], "2099-12-31");
  const reports = getAllDailyReports();

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <p className="text-[#78716C] mb-4">まだデータがありません。collectorを起動してください。</p>
      </div>
    );
  }

  // Build hierarchy: Project -> App -> Title
  // Using simple heuristic to assign event to project based on text matching.
  const projectsSet = new Set<string>();
  reports.forEach(r => {
    try {
      const parsed = JSON.parse(r.result_json);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parsed.projects.forEach((p: any) => projectsSet.add(p.name));
    } catch {
      // ignore JSON parse error
    }
  });

  const projectsArray = Array.from(projectsSet);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hierarchyMap: any = {};

  events.forEach(ev => {
    if (ev.is_afk) return;

    let assignedProject = "未分類";
    const textToMatch = `${ev.app} ${ev.title} ${ev.url}`.toLowerCase();
    for (const pName of projectsArray) {
      if (textToMatch.includes(pName.toLowerCase())) {
        assignedProject = pName;
        break;
      }
    }

    if (!hierarchyMap[assignedProject]) hierarchyMap[assignedProject] = {};
    if (!hierarchyMap[assignedProject][ev.app]) hierarchyMap[assignedProject][ev.app] = {};

    const titleKey = ev.title || "No Title";
    if (!hierarchyMap[assignedProject][ev.app][titleKey]) {
      hierarchyMap[assignedProject][ev.app][titleKey] = 0;
    }

    hierarchyMap[assignedProject][ev.app][titleKey] += ev.duration_sec / 60;
  });

  const hierarchyData = {
    name: "root",
    children: Object.keys(hierarchyMap).map(proj => ({
      name: proj,
      children: Object.keys(hierarchyMap[proj]).map(app => ({
        name: app,
        children: Object.keys(hierarchyMap[proj][app]).map(title => ({
          name: title,
          value: Math.round(hierarchyMap[proj][app][title])
        }))
      }))
    }))
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">Hierarchy View</h2>
      <div className="bg-[#FFFFFF] border border-[#E7E5E4] rounded-lg p-5">
         <SunburstChart data={hierarchyData} />
      </div>
    </div>
  );
}
