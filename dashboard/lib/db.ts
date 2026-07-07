import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), '../data/atelier.db');
const COLLECTOR_CONFIG_PATH = path.join(process.cwd(), '../collector/config.json');
const COLLECTOR_CONFIG_EXAMPLE = path.join(process.cwd(), '../collector/config.example.json');
const PIPELINE_CONFIG_PATH = path.join(process.cwd(), '../pipeline/config.json');
const PIPELINE_CONFIG_EXAMPLE = path.join(process.cwd(), '../pipeline/config.example.json');

let db: Database.Database | null = null;

export function getDb() {
  if (db) return db;
  if (!fs.existsSync(DB_PATH)) {
    return null;
  }
  db = new Database(DB_PATH, { readonly: true });
  return db;
}

export type Event = {
  id: number;
  started_at: string;
  duration_sec: number;
  app: string;
  title: string | null;
  url: string | null;
  is_afk: number;
};

export type DailyReport = {
  date: string;
  result_json: string;
  notion_page_id: string | null;
  created_at: string;
};

export type ProjectCache = {
  notion_id: string;
  name: string;
  keywords: string | null;
  status: string | null;
  synced_at: string | null;
};

export function getTodayEvents(dateStr: string): Event[] {
  const db = getDb();
  if (!db) return [];
  // Match prefix
  return db.prepare(`SELECT * FROM events WHERE substr(started_at, 1, 10) = ? ORDER BY started_at ASC`).all(dateStr) as Event[];
}

export function getDailyReport(dateStr: string): DailyReport | null {
  const db = getDb();
  if (!db) return null;
  const row = db.prepare(`SELECT * FROM daily_reports WHERE date = ?`).get(dateStr);
  return (row as DailyReport) || null;
}

export function getPeriodEvents(startDateStr: string, endDateStr: string): Event[] {
  const db = getDb();
  if (!db) return [];
  return db.prepare(`
    SELECT * FROM events
    WHERE substr(started_at, 1, 10) >= ? AND substr(started_at, 1, 10) <= ?
    ORDER BY started_at ASC
  `).all(startDateStr, endDateStr) as Event[];
}

export function getAllDailyReports(): DailyReport[] {
  const db = getDb();
  if (!db) return [];
  return db.prepare(`SELECT * FROM daily_reports ORDER BY date DESC`).all() as DailyReport[];
}

export function getProjectsCache(): ProjectCache[] {
  const db = getDb();
  if (!db) return [];
  return db.prepare(`SELECT * FROM projects_cache`).all() as ProjectCache[];
}

export function getSettings() {
  const readJson = (filePath: string, fallbackPath: string) => {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    if (fs.existsSync(fallbackPath)) {
      return JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
    }
    return {};
  };

  const collectorConfig = readJson(COLLECTOR_CONFIG_PATH, COLLECTOR_CONFIG_EXAMPLE);
  const pipelineConfig = readJson(PIPELINE_CONFIG_PATH, PIPELINE_CONFIG_EXAMPLE);

  return {
    collector: collectorConfig,
    pipeline: pipelineConfig
  };
}
