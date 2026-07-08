import { getPeriodEvents, getAllDailyReports } from "../../lib/db";
import { PeriodClient } from "./PeriodClient";

export default async function PeriodPage() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1); // Get last 1 year

  const events = getPeriodEvents(d.toISOString().split("T")[0], "2099-12-31");
  const reports = getAllDailyReports();

  return <PeriodClient events={events} dailyReports={reports} />;
}
