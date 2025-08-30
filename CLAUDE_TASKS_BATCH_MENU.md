# 実装タスク: 伝票一括操作とメニュー管理（追加拡張）

目的: 既存仕様を維持したまま、以下を追加実装する。
- 伝票の一括操作（バッチ）
- メニュー登録/編集/有効化の管理と、伝票作成でのメニュー選択

必須方針
- 破壊的変更は行わない（既存の型/計算/画面は維持）。
- 追加は `nightclub-saas/src/**` に限定。命名/スタイルは AGENTS.md/REQUIREMENTS.md 準拠。

## 1) 型/スキーマの追加（src/lib/types.ts）
- 追記型:
  - `export type MenuCategory = 'set'|'bottle'|'nomination'|'item'|'other'`
  - `export interface MenuItem { id: string; name: string; category: MenuCategory; priceTaxInJPY: number; active: boolean }`
  - `export type BatchReceiptOp = { op: 'create'|'update'|'cancel'; id?: string; payload?: CreateReceiptInput|UpdateReceiptInput }`
  - `export interface BatchReceiptResult { id: string; status: 'ok'|'error'; message?: string }`

## 2) モック保存層（DB未導入のため）
- 新規: `src/lib/mock.ts`
  - `inMemory` の簡易ストアを提供（Menu/Receipt）。
  - 必要関数: `mockMenuStore`（list/create/update/toggle）、`mockReceiptStore`（list/get/create/update/cancel/batch）。
  - NOTE: 将来 Prisma 置換前提。型は types.ts を使用。

## 3) サーバーアクション（新規）
- `src/server/actions/menu.ts`
  - `listMenu(): Promise<MenuItem[]>`
  - `createMenuItem(input: Omit<MenuItem,'id'|'active'> & {active?: boolean}): Promise<MenuItem>`
  - `updateMenuItem(id: string, patch: Partial<Omit<MenuItem,'id'>>): Promise<MenuItem>`
  - `toggleMenuActive(id: string, active: boolean): Promise<MenuItem>`
  - Zod で name/category/price バリデーション。
- `src/server/actions/receipts.ts`
  - `batchReceipts(ops: BatchReceiptOp[]): Promise<BatchReceiptResult[]>`
  - `listReceipts(): Promise<Receipt[]>`（UI 一覧用の最小限）
  - 仕様: `op` ごとに分岐。create/update は totals を `calcReceiptTotals` で再計算。cancel は `status: 'cancelled'`。

## 4) 画面追加/改修
- `/settings/menu`（新規ルート）
  - 追加ファイル: `src/app/settings/menu/page.tsx`
  - 機能: メニュー一覧（名称/カテゴリ/税込価格/Active/操作）。新規追加モーダル、編集、Active トグル。
  - バリデーション: zod。価格>=0、名称必須。
- `/receipts`（既存改修）
  - タブ化: 「新規作成」「一覧」。shadcn Tabs を使用。
  - 新規作成タブ: 既存フォームに「メニューから追加」コンボボックス（`listMenu()` 取得、選択で `name/category/price` を行に反映）。
  - 一覧タブ: 伝票テーブル + 行チェックボックス + ツールバー（「一括キャンセル」「一括割引（固定額）」「一括決済変更」「選択CSV」）。実行時に `BatchReceiptOp[]` を構築し `batchReceipts()` 呼び出し。結果はトースト表示。

## 5) テスト（Vitest）
- 追加ファイル例:
  - `src/server/menu.actions.test.ts`: create/update/toggle/list の正常/異常。
  - `src/server/receipts.actions.test.ts`: batch の成功/部分失敗/無効op/バリデーション。
- 既存 `src/lib/calc.test.ts` は維持。小数価格（メニュー経由）の境界ケースを追加しても良い。

## 6) 受入れ基準（Acceptance Criteria）
- メニュー: 追加/編集/有効切替ができ、`/receipts` 新規作成で選択可能（非Active は非表示）。
- バッチ: `/receipts` 一覧で複数選択→1回の実行で反映。成功/失敗件数とメッセージを通知。部分成功を許容。
- 計算: 価格は税込として行に反映。`calcReceiptTotals` により最終合計のみ切り上げ。UI と CSV の total が一致。
- 後方互換: 既存の単票作成フローは影響なしに動作。

## 7) 実装手順（順序）
1. types 追記 + zod スキーマ作成
2. `src/lib/mock.ts` 実装（メニュー/伝票の in-memory）
3. サーバーアクション `menu.ts` → `receipts.ts(batch/list)`
4. `/settings/menu` 画面実装（一覧/追加/編集/トグル）
5. `/receipts` タブ化 + 一覧タブ + バッチツールバー + メニューから追加
6. 単体テスト追加 → `npm run test:run`
7. UI 動作確認 → `npm run dev`

## 8) 実装メモ
- UI は shadcn/ui（Table/Badge/Dialog/Select/Tabs/Switch）を使用。
- ID 発番は既存の `generateReceiptId()` を流用。Menu は `MENU-yyyymmdd-xxx` 等の簡易IDで可。
- CSV 出力は既存仕様に準拠（列順・日付形式）。一覧の選択行に対してフィルタ可能にする。

---
実装後、PR には: 目的、変更点、スクリーンショット、確認手順、関連 Issue（あれば）を記載。小さく分割すること。
