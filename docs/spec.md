# 留学生交流マッチングアプリ 仕様書

## 1. プロジェクト概要
- 対象: 英語を練習したい日本の学生と、交流相手を探している留学生
- 技術スタック: Next.js (TypeScript, App Router), Prisma, PostgreSQL, WebSocket (Next.js Route Handler + `ws`)
- 運用環境: Docker Compose によるローカル開発環境、将来のクラウドデプロイを想定

## 2. 全体アーキテクチャ
- フロントエンドと API を Next.js アプリ内で統合
- Prisma による DB アクセス、`prisma migrate`/`prisma generate` を利用
- JWT によるセッション管理（短期アクセストークン + リフレッシュトークン）
- WebSocket によるメッセージ・マッチング通知
- S3 互換ストレージの導入を見据えつつ、MVP では Next.js Route Handler 経由でローカル保存

## 3. 画面仕様

### 3.1 認証フロー
- **ログイン画面 `/login`**
  - 入力: メールアドレス、パスワード
  - アクション: ログイン (POST `/api/v1/auth/login`)、新規登録ページへ遷移
  - バリデーション: RFC compliant email、パスワード 8 文字以上

- **新規登録画面 `/register`**
  - 必須入力: 表示名、メールアドレス、パスワード、母国語、練習したい言語、レベル(0〜5)
  - 任意入力: 趣味、特技、ひとこと、アイコン画像
  - バリデーション: 各項目の必須チェック・文字数制限
  - 登録完了後: ログイン処理まで自動実行 → ホーム画面へ遷移

### 3.2 ホーム画面 `/home`
ヘッダー: 現在タブ表示、ログアウトボタン

タブ構成:
1. **おすすめ**: Matching 候補 20 件をカード表示
   - レイアウト: アイコン + 基本情報、未設定項目は「未設定」
   - ソート: ユーザーが練習したい言語 = 相手の母国語を優先、ランダム順
   - アクション: プロフィール詳細モーダル、マッチングリクエスト送信

2. **連絡済み**: マッチング済みユーザーの一覧
   - リスト表示 (最新メッセージ順)
   - アクション: チャット画面へ遷移

3. **検索**
   - フィルタ: 表示名、母国語、ターゲット言語、レベル
   - 結果: 無限スクロール可能なカードリスト

4. **プロフィール**
   - 自身のプロフィール表示 & 編集フォーム
   - ターゲット言語を複数管理 (追加/削除)
   - アイコンアップロード（画像プレビュー付き）

5. **通知**
   - マッチング承認・拒否、メッセージ未読などの履歴一覧
   - 未読フラグ付きでソート

### 3.3 チャット画面 `/matches/[id]`
- 表示: 相手情報、メッセージリスト (送信/受信の吹き出し表示)
- 入力: メッセージ送信フォーム (1〜2000文字)
- 機能: WebSocket を介した新着メッセージ受信、既読更新
- 履歴取得: GET `/api/v1/matches/{id}/messages`

## 4. API 仕様

### 4.1 認証
| メソッド | パス | 説明 |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | ユーザー登録、プロフィール・ターゲット言語作成 |
| POST | `/api/v1/auth/login` | 認証、JWT 発行 |
| POST | `/api/v1/auth/refresh` | リフレッシュトークンでアクセストークン再発行 |
| POST | `/api/v1/auth/logout` | リフレッシュトークン無効化 |

### 4.2 プロフィール
| メソッド | パス | 説明 |
| --- | --- | --- |
| GET | `/api/v1/me` | 自身のプロフィール取得 |
| PUT | `/api/v1/me` | プロフィール更新 |
| POST | `/api/v1/me/icon` | アイコン画像アップロード |
| GET | `/api/v1/users` | クエリでユーザー検索（おすすめ/検索で利用） |
| GET | `/api/v1/users/{id}` | 指定ユーザーのプロフィール取得 |

### 4.3 ターゲット言語
| メソッド | パス | 説明 |
| --- | --- | --- |
| POST | `/api/v1/me/targets` | ターゲット言語追加 |
| DELETE | `/api/v1/me/targets/{id}` | ターゲット言語削除 |

### 4.4 マッチング
| メソッド | パス | 説明 |
| --- | --- | --- |
| POST | `/api/v1/matches` | マッチング申請（`requester_id`=自分、`receiver_id`=相手） |
| GET | `/api/v1/matches` | マッチング一覧取得（フィルタ: ステータス） |
| POST | `/api/v1/matches/{id}/accept` | マッチング承認 |
| POST | `/api/v1/matches/{id}/reject` | マッチング拒否 |

### 4.5 メッセージ
| メソッド | パス | 説明 |
| --- | --- | --- |
| GET | `/api/v1/matches/{id}/messages` | 指定マッチのメッセージ一覧取得 |
| POST | `/api/v1/matches/{id}/messages` | メッセージ送信 |
| POST | `/api/v1/messages/{id}/read` | 既読更新 |

### 4.6 通知
| メソッド | パス | 説明 |
| --- | --- | --- |
| GET | `/api/v1/notifications` | 通知履歴をページング取得 |
| POST | `/api/v1/notifications/{id}/read` | 通知を既読化 |
- WebSocket: `/api/v1/ws`  
  - イベント: `match.requested`, `match.responded`, `message.created`, `message.read`

## 5. データモデル

### 5.1 Users
| フィールド | 型 | 備考 |
| --- | --- | --- |
| id | int | PK |
| display_name | string | 1〜50 |
| email | string | Unique |
| password_hash | string | bcrypt |
| native_language_id | int | FK `Language` |
| hobby, skill, comment | string? | null 許容 |
| icon_path | string? | ローカル保存パス |
| created_at / updated_at | datetime | 自動設定 |

### 5.2 TargetLanguage
| フィールド | 型 | 備考 |
| --- | --- | --- |
| id | int | PK |
| user_id | int | FK `Users` |
| language_id | int | FK `Language` |
| level | int | 0〜5 |

### 5.3 Language
- 主要言語を事前投入 (日本語, 英語, 中国語, 韓国語 etc.)

### 5.4 Matches / MatchStatus
- `status_id`: 1=PENDING, 2=ACCEPTED, 3=REJECTED
- `accepted_at`: 受諾日時、`rejected_at`: 拒否日時（任意）

### 5.5 Messages
- `is_read`: 受信者が既読にした場合 true
- 将来的に `attachments` を検討

### 5.6 Notifications
- `type`: `match_request`, `match_accept`, `match_reject`, `message_received`
- `payload`: JSONB 型で関連 ID を保持
- `is_read`: 既読フラグ

## 6. バリデーション
- email: RFC5322、重複禁止
- password: 8〜64 文字、英数字 + 記号混合推奨
- display_name: 1〜50 文字
- message content: 1〜2000 文字
- target language level: 0〜5

## 7. 通知設計
1. メッセージまたはマッチング状態が変化 → DB にイベント保存
2. `/api/v1/events/stream` の Server-Sent Events(SSE) チャネル経由で対象ユーザーへ JSON 通知を push
3. クライアントは受信後に該当 API を再取得し状態を同期
4. メール通知は将来対応。MVP では UI 上の通知のみ

## 8. Docker 構成
- `web`: Next.js アプリ (Node.js)
- `db`: PostgreSQL 15
- `mailhog` (将来検討) はオプション
- ボリューム: PostgreSQL データ、アイコン画像保存ディレクトリ

## 9. テスト計画
- ユニットテスト: Zod スキーマ・サービス層
- E2E: Playwright or Cypress (後続タスク)
- CI: GitHub Actions を想定（ローカルでは `npm run test`/`npm run lint`）

## 10. 今後の拡張
- グループチャット、イベント機能
- モデレーション (不適切表現チェック)
- 外部ストレージ・CDN
- メール通知、プッシュ通知対応
