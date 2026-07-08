import { getSettings, getProjectsCache } from "../../lib/db";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const settings = getSettings();
  const projectsCache = getProjectsCache();

  const collectorConfig = settings.collector;
  const pipelineConfig = settings.pipeline;

  // Check Notion connection status
  let notionStatus = "同期が古い";
  if (projectsCache.length > 0) {
    const latestSync = projectsCache.reduce((latest, p) => {
      if (!p.synced_at) return latest;
      const d = new Date(p.synced_at);
      return d > latest ? d : latest;
    }, new Date(0));

    const now = new Date();
    const hoursSinceSync = (now.getTime() - latestSync.getTime()) / (1000 * 60 * 60);
    if (hoursSinceSync <= 24) {
      notionStatus = "正常";
    }
  }

  const hasToken = !!(pipelineConfig.notion_token && pipelineConfig.notion_token !== "PLACEHOLDER");

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      <div className="bg-[#FFFFFF] border border-[#E7E5E4] rounded-lg p-5 flex flex-col gap-6">

        {/* Collector Config */}
        <div>
          <h3 className="font-semibold text-[14px] text-[#78716C] mb-3">Collector Configuration</h3>
          <div className="grid grid-cols-2 gap-y-3 text-[13px]">
            <div className="text-[#78716C]">Polling Interval (sec)</div>
            <div className="font-medium">{collectorConfig.poll_interval_sec || 60}</div>

            <div className="text-[#78716C]">AFK Threshold (sec)</div>
            <div className="font-medium">{collectorConfig.afk_threshold_sec || 300}</div>
          </div>
        </div>

        <div className="h-px bg-[#E7E5E4] w-full" />

        {/* Pipeline / Notion Config */}
        <div>
          <h3 className="font-semibold text-[14px] text-[#78716C] mb-3">Notion Integration</h3>
          <div className="grid grid-cols-2 gap-y-3 text-[13px]">
            <div className="text-[#78716C]">Token Set</div>
            <div className="font-medium">
              {hasToken ? "True" : "False"}
            </div>

            <div className="text-[#78716C]">Connection Status</div>
            <div className="font-medium">
              <span className={notionStatus === "正常" ? "text-green-600" : "text-amber-600"}>
                {notionStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="h-px bg-[#E7E5E4] w-full" />

        {/* Editable Exclude Apps */}
        <SettingsClient initialExcludeApps={collectorConfig.exclude_apps || []} />

      </div>
    </div>
  );
}
