import { getAllDailyReports } from "../../lib/db";
import { ReportRow } from "./ReportRow";

export default async function ReportsPage() {
  const reports = getAllDailyReports();

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <p className="text-[#78716C] mb-4">まだデータがありません。collectorを起動してください。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">Daily Reports</h2>
      <div className="flex flex-col gap-3">
        {reports.map(r => (
          <ReportRow key={r.date} report={r} />
        ))}
      </div>
    </div>
  );
}
