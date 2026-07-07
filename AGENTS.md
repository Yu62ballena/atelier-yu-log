# AGENTS.md — Atelier Yu Log

## 1. 役割とペルソナ

これは**個人用（シングルユーザー・完全ローカル）**のタイムトラッキングアプリです。
Macの操作ログを自動収集し、AIがNotionのプロジェクト情報と照合して日報を自動生成、ローカルダッシュボードで可視化します。

- 利用者は開発者本人のみ。認証・マルチユーザー対応は不要。
- 公開・デプロイは行わない。すべてローカルで完結する。
- 品質方針：無料公開プロダクトではないため、雑に動けばOKではなく、放置運用に耐える安定性を優先する（クラッシュしない・エラーでログが失われない）。

## 2. 技術スタック

| 領域 | 技術 | バージョン指定 |
|---|---|---|
| ログ収集（collector） | Python | 3.11以上 |
| macOS API連携 | PyObjC（`pyobjc-framework-Cocoa`, `pyobjc-framework-Quartz`） | 最新安定版 |
| データストア | SQLite3（Python標準ライブラリ） | - |
| 常駐管理 | launchd（plistファイル） | - |
| 仕分けパイプライン（pipeline） | Python | 3.11以上 |
| Notion連携 | `notion-client`（公式SDK） または `requests`で直接REST呼び出し | 最新安定版 |
| ダッシュボード（dashboard） | Next.js（App Router） | 14以上 |
| 言語 | TypeScript | - |
| チャート | Recharts | 最新安定版 |
| スタイリング | Tailwind CSS | 最新安定版 |
| パッケージマネージャー | npm | - |

**Node.jsは18以上を前提とする。**

## 3. ファイル構成

```
atelier-yu-log/
├── AGENTS.md
├── references/
│   └── skills/
│       └── design.md
├── collector/                    ← Issue 1
│   ├── main.py                   （常駐エントリポイント）
│   ├── config.example.json       （設定サンプル。実ファイルconfig.jsonはgit管理外）
│   ├── com.yu.atelierlog.plist.template
│   └── requirements.txt
├── pipeline/                     ← Issue 2
│   ├── daily_report.py           （日次集計の実行エントリ）
│   ├── notion_client.py
│   ├── classifier_client.py      （Antigravity呼び出し。差し替え可能な設計にする）
│   ├── config.example.json
│   └── requirements.txt
├── dashboard/                    ← Issue 3
│   ├── app/
│   │   ├── page.tsx              （①今日ビュー）
│   │   ├── period/page.tsx       （②期間集計）
│   │   ├── hierarchy/page.tsx    （③階層ビュー）
│   │   ├── reports/page.tsx      （④日報一覧）
│   │   └── settings/page.tsx     （⑤設定）
│   ├── lib/
│   │   └── db.ts                 （SQLite読み込み共通処理）
│   ├── components/
│   ├── package.json
│   └── tsconfig.json
└── data/
    └── .gitkeep                  （atelier.dbはここに生成される。git管理外）
```

## 4. 厳格なルール

- **`data/*.db` を直接編集・削除しない。** スキーマ変更が必要な場合はマイグレーションスクリプトを別途用意する。
- **クラウドホスティング・認証機能・マルチユーザー対応を勝手に追加しない。** このアプリは完全ローカル・シングルユーザー前提。
- **Gemini APIを直接呼び出さない。** AI仕分けは必ず `pipeline/classifier_client.py` を経由する（Antigravityローカル呼び出しに一本化するため）。
- **SQLiteスキーマは仕様書（本Issue群）記載のものを厳守する。** カラム名・型を勝手に変更しない。
- **collector（ログ収集）はダッシュボードのビルド・実行に依存させない。** collectorはPythonのみで完結し、Next.jsのインストールなしで単独動作できること。
- **`config.json` や `.env` など秘匿情報を含むファイルは `.gitignore` に必ず含める。**
- **`npm run dev` のような終了しないコマンドをJulesのConfiguration欄に書かない。**

## 5. referencesの読み込み

- **作業開始前に、リポジトリ内の `.agents` フォルダに含まれるスキルファイルを必ずすべて読み込み、その内容に従うこと。** これらはAntigravityのskill-selectorによって本プロジェクト用に選定されたベストプラクティス集であり、実装方針より優先度が高い。
- `.agents` フォルダ内のスキルファイル自体は変更・削除しないこと（読み取り専用の参照資料として扱う）。
- **`references/skills/design.md`** は、ダッシュボードのUI実装（Issue 3）に反映すること。collector・pipelineの実装（Issue 1・2）にはUI要素がないため design.md は不要。

## 6. Critic Agent向け品質チェックリスト（PR提出前に自己チェック）

- [ ] `.agents` フォルダ内のスキルをすべて読み込み、その方針に沿って実装したか
- [ ] `data/*.db` を誤って書き換え・コミットしていないか
- [ ] SQLiteスキーマ（テーブル名・カラム名・型）が仕様書と完全一致しているか
- [ ] 例外処理：ネットワーク障害・API障害時にプロセス全体がクラッシュせず、ログを残して継続または安全に終了するか
- [ ] 秘匿情報（Notionトークン等）がコード中にハードコードされていないか
- [ ] collectorがNext.js等の他ディレクトリに依存していないか（単独で動くか）
- [ ] ダッシュボードのUIが design.md のカラーパレット・数値と一致しているか
