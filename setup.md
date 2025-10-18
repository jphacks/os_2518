# Lingua Bridge

留学生と日本の学生を結ぶ言語交換マッチングアプリです。Next.js (App Router)・Prisma・PostgreSQL を採用し、SSE を用いたリアルタイム通知を実装しています。

## セットアップ

```bash
npm install --prefix web
```

環境変数は `web/.env.example` を参考に `web/.env` を作成してください。

## コマンド

```bash
# 開発サーバー
npm run dev --prefix web

# Lint チェック
npm run lint --prefix web

# Prisma マイグレーション
npm run prisma:migrate --prefix web

# シードデータ投入
npm run db:seed --prefix web
```

## Docker での起動

```bash
docker compose up --build
```

`http://localhost:3000` でアプリにアクセスできます。PostgreSQL は `localhost:5432` で起動します。

## 主なディレクトリ

- `docs/` : 仕様書や開発ルール
- `web/` : Next.js + Prisma プロジェクト本体
  - `src/app/api/` : サーバー API ルート
  - `src/app/home` : メイン画面
  - `src/lib/` : 認証/サービスロジック
  - `src/components/home/` : ホーム画面用 React コンポーネント

## 開発メモ

- 認証は JWT(アクセストークン/リフレッシュトークン) で実装し、DB にリフレッシュトークンを保存しています。
- 通知は Server-Sent Events (`/api/v1/events/stream`) でブラウザへ push します。
- Prisma のマイグレーションとシードは `npm run prisma:migrate` / `npm run db:seed` で実行できます。
