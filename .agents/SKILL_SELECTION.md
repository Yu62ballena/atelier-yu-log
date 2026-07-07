# スキル選定ログ (SKILL_SELECTION.md)

## 選定プラン詳細

### 対象タスク
Atelier Yu Log (Mac操作ログ収集 + AI仕分け + Notion連携 + Next.jsダッシュボード)

### 選定カテゴリ
- `frontend`
- `design`
- `backend`
- `essentials`

### 配置スキル
1. **`async-python-patterns`** (source: aas)
   - 理由: ログ収集プロセスの非同期(asyncio)常駐実行やハートビートマージの実装をカバーするため。
2. **`claude-d3js-skill`** (source: aas)
   - 理由: 階層的なログ可視化（サンバースト図や積み上げグラフなど）のd3.js/Rechartsによる実装をカバーするため。
3. **`frontend-ui-dark-ts`** (source: aas)
   - 理由: ガラスモフィズムやダークテーマを基調としたプレミアムなダッシュボードデザインをカバーするため。
4. **`react-nextjs-development`** (source: aas)
   - 理由: Next.js 14+ (App Router) + TypeScript + Tailwind CSS によるフロントエンド開発ワークフローをカバーするため。
5. **`python-pro`** (source: aas)
   - 理由: Python 3.12+ 開発における基本パターン、uvやruffなどの最新ツールをカバーするため。
6. **`prisma-expert`** (source: aas)
   - 理由: SQLite3を用いたログ/ダッシュボードデータストアに対する Prisma ORM スキーマ定義やマイグレーションをカバーするため。
7. **`notion-automation`** (source: aas)
   - 理由: Notion APIを用いたプロジェクト一覧の取得や日報DB自動書き込み処理をカバーするため。

### 併用・重複判定
- `source: user` スキルに今回の要件と重複・関係するものが存在しなかったため、すべて `source: aas` のスキルを選択して役割別に補完し合うように配置しました。

### 除外したスキルとその理由
- `nextjs-app-router-patterns` / `senior-frontend` / `tailwind-patterns`
  - 理由: `react-nextjs-development` および `frontend-ui-dark-ts` がフロントエンド要件（Next.js App Router, Tailwind v4など）を包括的にカバーしているため、重複を避けるべく除外。
- `python-patterns` / `python-development`
  - 理由: `python-pro` と `async-python-patterns` でPython実装に必要な知識が十分にカバーされるため除外。
