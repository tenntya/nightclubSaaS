# スタッフ勤怠タブ 要件定義（MVP）

本ドキュメントは、現行実装（来店管理=顧客の入退店 `/attendance`）を維持しつつ、新たに「スタッフ勤怠管理」を実装するためのMVP要件をまとめたものです。既存のコーディング規約（Next.js App Router, TypeScript, Tailwind, shadcn/ui, `@/*` alias）に準拠します。

## スコープと前提
- 対象従業員: 正社員・アルバイト（業務委託は対象外）
- 拠点: 単一店舗前提（店舗間兼務なし）
- 稼働時間帯: 深夜中心（翌日跨ぎの特別区分は行わない）
- タイムゾーン/言語/通貨: 日本国内・日本語・JPYのみ
- 既存ロール: `Admin`/`Owner`/`Staff(=Cast)` を使用
- 既存の「来店管理（顧客）」画面はそのまま。スタッフ勤怠は別ルートで実装

## ルートと画面構成（骨子）
- ルート: `/staff-attendance`
  - タブ1: 「打刻」… QRで出退勤、状態表示
  - タブ2: 「日次承認」… 当日の勤怠一覧、承認/差戻し
  - タブ3: 「月次一覧」… 月次集計（個人別、CSVは未定項目のためMVPでは見送り）
  - タブ4: 「シフト」… 月次シフト（希望シフトの入力と公開）

ナビゲーション: サイドバーに「勤怠管理（スタッフ）」を新規追加（`/attendance` の「来店管理（顧客）」と区別）。

## RBAC/権限
- `Staff`（キャスト）: 自分の打刻/申請、自己の勤怠閲覧
- `Admin`/`Owner`: 全員の勤怠閲覧・編集、承認権限、監査ログ閲覧
- 個人情報（時給など）は `Admin`/`Owner` のみ表示（MVPでは時給の保有はしないが非表示制御は土台対応）

## 打刻（QR）
- 手段: スマホによるQRスキャンを前提（MVP: 問題切分けのため「カメラで読み取り」または「コード手入力」を併用）
- 方式（MVP案）:
  - スタッフごとに固定の`punchToken`を発行（モック/ローカルストア）
  - `/staff-attendance`の「打刻」画面で、QR読み取り or トークン入力 → サーバーアクションにPOST
  - 連続打刻の二重登録防止（同種打刻の最短5秒ガード）
  - 不正防止（位置/IP/ローテーション）は未定のためMVPでは未搭載。将来は時限トークン/ジオフェンスに拡張

- 区分: 打刻時に`reason`選択（`normal`/`early`/`late`/`dohan`）
  - 「早出」「遅刻」「同伴」を区分保存（グレースの数値設定は未定のため、まずは手動区分で記録）

- 打刻漏れ検知: 当日「出勤のみ」「退勤なし」を一覧で強調表示（自動通知は未定のため非対応）。

- 自動休憩: なし（MVPでは休憩打刻/控除を持たない）

## 申請/承認フロー
- 対象: 打刻修正/遅刻・早退・同伴の申告（MVP: 打刻修正申請を中心に対応）
- フロー: `Staff` → `Owner/Admin`が1段階承認
- 申請項目（例）: 対象日・修正内容（時刻/区分/メモ）
- 承認UI: 「日次承認」タブで申請一覧 → 承認/差戻し、コメント（テキスト）
- ステータス: `pending`/`approved`/`rejected`

## シフト
- 目的: 月次シフトを「希望シフト」に沿って当てはめる
- MVP: 以下の操作に限定
  - `Staff`が希望シフト（勤務可能日/時間帯の意向）を提出
  - `Owner/Admin`が月次シフトを作成・公開（公開状態フラグ）
  - ドラッグ&ドロップは未定のため非対応。モーダル/インラインの簡易編集

## 勤怠ルール/計算（MVP）
- 丸め: 未定 → MVPでは「丸めなし（分単位）」で保存・集計
- 残業/休憩/休暇/休日判定: なし（MVP対象外）
- 深夜/日付跨ぎ: 区別しない（滞在時間は単純差分）
- 端数処理: CSV/画面とも整数分で表示（未定項目が固まるまで統一）

## ドリンクバック/伝票バック（下拵え）
- 必要性: 勤怠連動の手当として将来算出
- MVPでは「スタッフ×伝票の紐付け」を行えるタグを先行実装（`receipt_id`/`staff_id`の関連）
  - まずは勤怠と切り離し、伝票管理画面で対応予定（別PR）。
  - 本ドキュメントではデータモデルとストア拡張の鉤（hook）まで定義。

## データモデル（叩き台）
```ts
// スタッフ
export interface Staff {
  id: string;
  name: string;
  role: "Staff" | "Admin" | "Owner";
  punchToken?: string; // QR用（MVP固定トークン）
  active: boolean;
}

// 打刻レコード（1回の入退店をまとめる日単位の実績）
export interface StaffAttendanceRecord {
  id: string;
  staffId: string;
  businessDate: string; // 例: 2025-09-01（営業日基準）
  checkInAt?: string;   // ISO8601
  checkOutAt?: string;  // ISO8601
  status: "open" | "closed" | "approved" | "rejected";
  reason?: "normal" | "early" | "late" | "dohan";
  note?: string;
  audit?: AuditTrail[];
}

export interface AuditTrail {
  at: string; // ISO8601
  userId: string;
  action: string; // created/checked_in/checked_out/edited/approved/rejected
  diff?: Record<string, any>;
}

// 申請（打刻修正）
export interface AttendanceRequest {
  id: string;
  recordId: string; // StaffAttendanceRecord.id
  staffId: string;
  type: "edit";
  payload: Partial<Pick<StaffAttendanceRecord, "checkInAt"|"checkOutAt"|"reason"|"note">>;
  status: "pending" | "approved" | "rejected";
  comment?: string; // 承認者コメント
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string; // Admin/Owner
}

// シフト
export interface StaffShiftWish {
  id: string;
  staffId: string;
  month: string; // 2025-09
  wishes: Array<{ date: string; available: boolean; memo?: string }>;
}

export interface StaffShiftPlan {
  id: string;
  month: string; // 2025-09
  assignments: Array<{ date: string; staffId: string; start?: string; end?: string; memo?: string }>;
  published: boolean;
}

// 伝票バック（将来）
export interface ReceiptAssignment {
  id: string;
  receiptId: string;
  staffId: string;
  type: "drink_back" | "receipt_back";
  amountJPY?: number; // 算出は将来の計算規則に従う
}
```

## サーバーアクション/ストア（MVP）
- `src/server/actions/staff-attendance.ts`（新規）想定の関数
  - `checkIn({ token, reason })` → `StaffAttendanceRecord` を作成/更新
  - `checkOut({ token })` → `StaffAttendanceRecord` を更新
  - `listToday()`/`listByMonth(month)` → 一覧取得
  - `requestEdit({ recordId, payload })` → `AttendanceRequest` 起票（Staff）
  - `approveRequest({ requestId, comment })`（Admin/Owner）
  - すべて監査ログ（`audit`）に追記

- ストア: `src/lib/mock.ts` にモック配列を追加（本番はDB前提）
  - `mockStaff` は既存を再利用
  - `staffAttendanceStore: StaffAttendanceRecord[]`
  - `attendanceRequestsStore: AttendanceRequest[]`
  - `staffShiftWishStore: StaffShiftWish[]`, `staffShiftPlanStore: StaffShiftPlan[]`

## 画面UI（MVP詳細）
- 打刻（`/staff-attendance?tab=punch`）
  - `Input` にトークン入力 + `Scan` ボタン（将来: カメラQR読み取り）
  - 現在の自分の本日状態（未出勤/出勤中/退勤済）表示、`reason` セレクト
- 日次承認（`?tab=daily`）
  - テーブル: スタッフ名/出勤/退勤/区分/メモ/状態/操作（承認/差戻し）
  - 「退勤なし」ハイライト
- 月次一覧（`?tab=monthly`）
  - 月切替、個人別合計（総勤務分）表示
- シフト（`?tab=shift`）
  - 希望入力（スタッフ）、プラン編集/公開（管理者）

## 受け入れ基準（テスト観点）
- 打刻
  - トークンが有効なら`checkIn`/`checkOut`が記録される
  - 連続二重打刻は抑止される（5秒以内）
  - `reason` が保存され、日次・月次に反映される
- 申請/承認
  - `Staff`が修正申請を起票でき、`Admin/Owner`が承認/差戻しできる
  - 承認で対象レコードが更新され、`audit`に履歴が残る
- 一覧
  - 日次で「退勤なし」が検出される
  - 月次でスタッフ別の合計勤務分が正しく算出される（丸めなし）
- 権限
  - `Staff`は自身のデータのみ閲覧/申請可、`Admin/Owner`は全件

Vitestの対象（例）:
- `lib/attendance.test.ts`: 集計（分換算）・二重打刻抑止・理由区分の保存
- `server/staff-attendance.actions.test.ts`: checkIn/Out/承認フロー・監査ログ

## 非機能/運用（MVP）
- データ保持・SLA・通知・外部連携は未定 → 実装フックと拡張ポイントのみ用意
- スマホ打刻必須: まずはトークン入力で代替、後続でQRスキャンUI（メディアAPI）

## 未決事項（要確認）
- 丸めルールの確定（出退勤/合計、単位と方向）
- 位置情報/IP制限の要否（QRの不正抑止）
- CSV仕様（給与/監査）と文字コード、列定義
- 通知（承認/打刻漏れ）とチャネル（アプリ/メール/LINE/Slack）
- ドリンクバック/伝票バックの算出ロジックとレポート要件
- 監査要件の粒度（保持期間、改ざん対策）

## 実装タスク（提案）
1) ルート追加 `/staff-attendance` + タブUI（shadcn Tabs）
2) モックストア/型の追加（`types.ts`/`mock.ts`）
3) サーバーアクション雛形（checkIn/Out, list, request/approve）
4) 打刻UI（トークン入力 + 状態表示 + 理由選択）
5) 日次承認UI（テーブル + 承認/差戻し + ハイライト）
6) 月次集計（分単位、丸めなし）
7) 簡易シフト（希望入力/公開フラグ）
8) テスト（単体/サーバーアクション）

---
本MVPは「最小で運用可能」なラインに絞り、未定事項は将来の変更に耐えるデータ構造で下拵えしています。決まり次第、丸め・CSV・通知・連携・バック計算を拡張します。
