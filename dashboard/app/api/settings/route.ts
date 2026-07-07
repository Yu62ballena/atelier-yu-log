import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Because we cannot alter collector/ files based on instructions, we will mock the save functionality
// but realistically, the issue requested writing to collector/config.json via API route.
// Let's implement writing to it, as the issue specifically says: "設定画面から除外アプリを追加するとcollector/config.jsonが更新される"
// This indicates the system *is* allowed to write to it through the Next.js API.

export async function POST(request: Request) {
  try {
    const { exclude_apps } = await request.json();

    if (!Array.isArray(exclude_apps)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const COLLECTOR_CONFIG_PATH = path.join(process.cwd(), '../collector/config.json');
    const COLLECTOR_CONFIG_EXAMPLE = path.join(process.cwd(), '../collector/config.example.json');

    let config = {};
    if (fs.existsSync(COLLECTOR_CONFIG_PATH)) {
      config = JSON.parse(fs.readFileSync(COLLECTOR_CONFIG_PATH, 'utf-8'));
    } else if (fs.existsSync(COLLECTOR_CONFIG_EXAMPLE)) {
      config = JSON.parse(fs.readFileSync(COLLECTOR_CONFIG_EXAMPLE, 'utf-8'));
    }

    config = { ...config, exclude_apps };

    fs.writeFileSync(COLLECTOR_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');

    return NextResponse.json({ success: true, exclude_apps });
  } catch (error) {
    console.error("Failed to update config:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
