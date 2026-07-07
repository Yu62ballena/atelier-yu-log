"use client";

import { useState } from "react";

export function SettingsClient({ initialExcludeApps }: { initialExcludeApps: string[] }) {
  const [excludeApps, setExcludeApps] = useState<string[]>(initialExcludeApps);
  const [newApp, setNewApp] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    if (newApp.trim() && !excludeApps.includes(newApp.trim())) {
      setExcludeApps([...excludeApps, newApp.trim()]);
      setNewApp("");
    }
  };

  const handleRemove = (app: string) => {
    setExcludeApps(excludeApps.filter(a => a !== app));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exclude_apps: excludeApps })
      });
      alert('保存しました');
    } catch {
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold text-[14px] text-[#78716C] mb-2">Exclude Apps</h3>

      <div className="flex gap-2">
        <input
          type="text"
          value={newApp}
          onChange={(e) => setNewApp(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="App Name (e.g. Activity Monitor)"
          className="flex-1 px-3 py-2 border border-[#E7E5E4] rounded-md text-[13px] outline-none focus:border-[#2563EB]"
        />
        <button
          onClick={handleAdd}
          className="bg-[#FAFAF9] border border-[#E7E5E4] px-4 py-2 rounded-md hover:bg-[#E7E5E4] transition-colors"
        >
          Add
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-2">
        {excludeApps.map(app => (
          <div key={app} className="bg-[#E7E5E4] px-3 py-1 rounded-full flex items-center gap-2">
            <span>{app}</span>
            <button
              onClick={() => handleRemove(app)}
              className="text-[#78716C] hover:text-[#1C1917] font-bold"
            >
              &times;
            </button>
          </div>
        ))}
        {excludeApps.length === 0 && (
          <div className="text-[#78716C] text-sm">No apps excluded.</div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#2563EB] text-white px-4 py-2 rounded-[6px] hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
