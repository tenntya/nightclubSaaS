# 要件定義（確定版 v1）

本ドキュメントは「単店舗スナック向け Nightclub SaaS」の実装指針です。Claude 等の自走実装ができるよう、機能・計算仕様・型・API・テスト・運用を詳細化しています。実装は `nightclub-saas/`（Next.js + TypeScript + Tailwind + shadcn/ui）配下で行います。

## 1. 目的と対象
- 目的: 来店管理・会計・KPI 可視化を単店舗運用で成立させ、将来の多店舗化に拡張可能な基盤を作る。
- 対象ユーザー: 顧客来店管理、会計担当、店長、オーナー。
- デバイス: 店舗=iPad（Safari/Chrome）、オーナー=PC（Chrome/Edge）。
- KPI（ダッシュボード）: 売上・客数・客単価（日/週/月）。

## 2. 画面/ルートと機能
- `/dashboard`
  - KPI カード（売上/客数/客単価）と期間切替（日/週/月）。
  - 簡易推移グラフ（売上）。
- `/attendance`（来店客が対象）
  - チェックイン/アウト、現在在店数の表示。
  - 再入場・定員は後続対応（v1 は無し）。
- `/receipts`
  - 伝票の作成/更新/取消、項目追加（商品/セット/指名/ボトル/その他）。
  - 割引（固定額）、サービス料%（課税対象）、固定チャージ（課税対象）の設定。
  - 合計は「合計で切り上げ」。CSV 出力。
- `/settings`
  - 組織情報、税率（既定10%）、サービス料%、固定チャージ（有効/金額）、通貨（JPY）、タイムゾーン、営業時間、テーマ。
  - RBAC 設定（Admin/Owner/Staff）。

## 3. ドメイン/計算仕様
- 通貨/税: JPY、消費税10%、税込み基準。
- サービス料: 課税対象（％）。
- 固定チャージ: 課税対象（JPY）。
- 丸め: 「最終合計のみ」円単位で切り上げ（CEIL）。中間値は小数保持。
- 計算順序（v1）:
  1) 小計 = Σ(item.unitPriceTaxInJPY × qty)
  2) 割引 = fixedDiscountJPY（小計を下回らない範囲に制限）
  3) サービス料 = (小計 − 割引) × serviceChargeRatePercent/100
  4) 固定チャージ = settings.chargeEnabled ? settings.chargeFixedJPY : 0
  5) 合計（生）= 小計 − 割引 + サービス料 + 固定チャージ
  6) 合計 = ceilToYen(合計（生）)
- 税内訳（報告/CSV 用の参考値）:
  - 課税対象額（生）= 小計 − 割引 + サービス料 + 固定チャージ
  - 内税推定 = roundToYen(課税対象額（生） × 税率 / (1 + 税率))
  - 備考: 内税は報告用で、最終合計（切り上げ）と整合するよう整数円に四捨五入。

## 4. CSV 仕様
- 文字コード: UTF-8、区切り: `,`、改行: LF。
- 日付: 伝票日時=`YYYY-MM-DDTHH:mm:ss`、集計日=`YYYY-MM-DD`。
- カラム順（v1）:
  - `date, receipt_id, item, qty, unit_price_jpy_tax_in, subtotal_jpy, discount_jpy, service_charge_jpy, charge_fixed_jpy, tax_included_jpy, total_jpy, payment_method`
- 決済種別: `Cash | Card | QR | Other`。
- 例（1行）:
  - `2025-01-01T21:30:00,RCPT-001,Set 60min,1,3000,3000,0,300,1000,299,4599,Cash`

## 5. 認証/権限（RBAC）
- 認証: NextAuth（Email + Google）。
- ロール: `Admin / Owner / Staff`。
- アクセス権（v1）:
  - Admin: 全ページと設定変更（RBAC含む）。
  - Owner: Dashboard/Receipts/Attendance すべて、Settings は一部（RBAC除く）。
  - Staff: Receipts/Attendance のみ。Dashboard は参照可、Settings は不可。
- 画面制御: ルートガードと UI 制御の双方で適用。

## 6. データモデル（提案/Prisma 想定）
- 共通: 今は単店舗だが将来拡張のため `tenantId` を任意で保持。
- Receipt
  - id, tenantId?, issuedAt, items: ReceiptItem[]
  - paymentMethod: enum(`Cash | Card | QR | Other`)
  - discountJPY: number
  - serviceChargeRatePercent: number
  - chargeEnabled: boolean
  - chargeFixedJPY: number
  - totals: { subtotal, serviceCharge, chargeFixed, total, taxIncluded }
- ReceiptItem
  - id, name, category: enum(`item | set | nomination | bottle | other`)
  - unitPriceTaxInJPY: number, qty: number
- Attendance
  - id, tenantId?, checkedInAt, checkedOutAt?, guestCount: number, note?
- Settings（単一テナント分）
  - taxRatePercent=10, serviceChargeRatePercent, chargeEnabled, chargeFixedJPY
  - currency=JPY, timezone='Asia/Tokyo', businessHours, theme
  - rbac: roles/assignments

TypeScript 型は `src/lib/types.ts` に配置し、上記と整合させる。

## 7. API/サーバーアクション設計（Next.js RSC）
- 置き場所: `src/app/(routes)/actions/*.ts` または `src/server/actions/*.ts`。
- 署名（例）:
  - `createReceipt(input: CreateReceiptInput): Promise<Receipt>`
  - `updateReceipt(id: string, patch: Partial<Receipt>): Promise<Receipt>`
  - `cancelReceipt(id: string): Promise<void>`
  - `exportReceiptsCSV(range: {from: Date; to: Date}): Promise<string>`
  - `checkIn(input: { guestCount: number }): Promise<Attendance>`
  - `checkOut(id: string): Promise<Attendance>`
  - `getDashboardKPI(granularity: 'day'|'week'|'month', range): Promise<KPI[]>`
  - `getSettings(): Promise<Settings>` / `updateSettings(patch: Partial<Settings>): Promise<Settings>`
- バリデーション: `zod` を推奨（型と同居）。

## 8. 計算ユーティリティ（必須）
- 置き場所: `src/lib/format.ts`（既存と統合）または `src/lib/calc.ts` 新設。
- 必須関数:
  - `ceilToYen(n: number): number`
  - `roundToYen(n: number): number`
  - `calcReceiptTotals(input: { items: ReceiptItem[]; discountJPY: number; serviceChargeRatePercent: number; chargeEnabled: boolean; chargeFixedJPY: number; taxRatePercent: number; }): { subtotal: number; serviceCharge: number; chargeFixed: number; totalRaw: number; total: number; taxIncluded: number; }`
- 単体テストで境界（0円、割引過多、端数 0.01〜0.99）を網羅。

## 9. UI/UX 仕様（要点）
- 一貫性: Tailwind + shadcn/ui、テーマはワインレッド×ゴールド（`tailwind.config.ts` のトークン使用）。
- フォーム: 入力は基本「税込み金額（円）」、小数は許可するが内部で保持、表示は円整数に丸め（合計は切り上げ）。
- `/receipts`: アイテム行の追加/削除、合計プレビュー、決済方法選択。
- `/attendance`: 現在在店数を即時反映（RSC/サーバーアクション）。
- `/dashboard`: 期間プリセット（本日/今週/今月）、KPI と簡易チャート。
- 空状態/エラー: 明確な文言と再試行ボタン。

## 10. テスト/品質
- 単体: Vitest + Testing Library（`src/**/*.test.ts(x)`）。
  - `calcReceiptTotals` の仕様例（期待値は整数円）:
    - 例1: 小計3000, 割引0, SC10%, チャージ1000 → 合計=ceil(3000+300+1000)=4300, 税内訳=round((3000+300+1000)×0.1/1.1)=299
    - 例2: 小計2500.5, 割引600, SC5%, チャージ0 → 合計=ceil(1900.5+(1900.5×0.05))=ceil(1995.525)=1996
  - 割引が小計超過の場合は0円にクランプ。
- E2E: Playwright（来店→会計→CSV、設定変更→計算反映、RBAC によるアクセス制御）。
- カバレッジ: 70% 以上。

## 11. 受入れ基準（抜粋）
- 合計は常に円単位で切り上げ、CSV の total_jpy と UI 表示が一致。
- サービス料（％）と固定チャージは課税対象として計算される。
- CSV の日付形式・カラム順・決済種別が仕様通り。
- RBAC により Admin/Owner/Staff のアクセス/操作権が正しく制御。
- 設定変更が新規伝票の計算に反映、既存伝票はその時点の値で計算保持（履歴整合）。

## 12. 環境変数/運用
- `.env.local`（コミットしない）:
  - `DATABASE_URL`（PostgreSQL／開発は SQLite も可）
  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`（任意）
  - `NEXT_PUBLIC_SITE_URL`
  - `NEXT_TELEMETRY_DISABLED=1`（任意）
- デプロイ: Vercel。ビルドは `npm run build`、環境変数はダッシュボード管理。

## 13. 実装順序（推奨）
1) 型/計算ユーティリティ/テスト（`calcReceiptTotals`）
2) `/receipts` 基本UIと作成フロー、CSV エクスポート
3) `/attendance` 最小フロー
4) `/dashboard` KPI 集計
5) `/settings` と RBAC
6) 認証（NextAuth）と保護ルート

---
補足: 本ドキュメントは AGENTS.md の開発ガイドに準拠します。疑問点はリポジトリに Issue 化し、未決項目は上記デフォルトで進めてください。
