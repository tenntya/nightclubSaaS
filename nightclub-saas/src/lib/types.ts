/**
 * ナイトクラブSaaS ドメイン型定義
 * REQUIREMENTS.md に基づいた型定義
 */

// ========================
// 決済方法
// ========================
export type PaymentMethod = "Cash" | "Card" | "QR" | "Other";

// ========================
// カテゴリー
// ========================
export type ItemCategory = "item" | "set" | "nomination" | "bottle" | "other";

// メニューカテゴリー（拡張版）
export type MenuCategory = "set" | "bottle" | "nomination" | "item" | "other";

// ========================
// RBAC ロール
// ========================
export type UserRole = "Admin" | "Owner" | "Staff";

// ========================
// 伝票関連
// ========================
export interface ReceiptItem {
  id: string;
  name: string;
  category: ItemCategory;
  unitPriceTaxInJPY: number; // 税込み単価（円）
  qty: number;
}

export interface ReceiptTotals {
  subtotal: number;      // 小計
  serviceCharge: number; // サービス料
  chargeFixed: number;   // 固定チャージ
  totalRaw: number;      // 合計（切り上げ前）
  total: number;         // 合計（切り上げ後）
  taxIncluded: number;   // 内税推定値
}

export interface Receipt {
  id: string;
  tenantId?: string;      // 将来のマルチテナント対応用
  issuedAt: string;       // ISO 8601形式
  items: ReceiptItem[];
  paymentMethod: PaymentMethod;
  discountJPY: number;    // 割引額（固定）
  serviceChargeRatePercent: number; // サービス料率（%）
  chargeEnabled: boolean; // 固定チャージ有効
  chargeFixedJPY: number; // 固定チャージ額
  totals: ReceiptTotals;
  status?: "active" | "cancelled" | "paid"; // 伝票ステータス
  note?: string;          // 備考
}

// ========================
// 来店管理関連
// ========================
export interface Attendance {
  id: string;
  tenantId?: string;      // 将来のマルチテナント対応用
  checkedInAt: string;    // ISO 8601形式
  checkedOutAt?: string;  // ISO 8601形式（未退店の場合null）
  guestCount: number;     // 来店人数
  note?: string;          // 備考
}

// ========================
// 設定関連
// ========================
export interface Settings {
  // 基本設定
  tenantId?: string;
  organizationName: string;
  
  // 税金・料金設定
  taxRatePercent: number;           // 税率（デフォルト10%）
  serviceChargeRatePercent: number; // サービス料率（%）
  chargeEnabled: boolean;           // 固定チャージ有効/無効
  chargeFixedJPY: number;          // 固定チャージ金額
  
  // 通貨・地域設定
  currency: "JPY";                  // 通貨（v1はJPYのみ）
  timezone: string;                 // タイムゾーン（例: "Asia/Tokyo"）
  
  // 営業時間
  businessHours: {
    openTime: string;  // 例: "19:00"
    closeTime: string; // 例: "03:00"
  };
  
  // テーマ設定
  theme: "dark" | "light";
  
  // RBAC設定
  rbac?: {
    roles: UserRole[];
    assignments: RoleAssignment[];
  };
}

export interface RoleAssignment {
  userId: string;
  userEmail: string;
  role: UserRole;
}

// ========================
// ダッシュボード関連
// ========================
export interface KPIData {
  date: string;          // ISO 8601形式
  sales: number;         // 売上
  customerCount: number; // 客数
  avgSpend: number;      // 客単価
}

export type KPIGranularity = "day" | "week" | "month";

export interface DashboardKPI {
  granularity: KPIGranularity;
  fromDate: string;
  toDate: string;
  data: KPIData[];
  totals: {
    totalSales: number;
    totalCustomers: number;
    avgSpendOverall: number;
  };
}

// ========================
// CSV出力関連
// ========================
export interface CSVExportOptions {
  fromDate: string;  // ISO 8601形式
  toDate: string;    // ISO 8601形式
  includeDetails?: boolean;
}

export interface CSVRow {
  date: string;
  receipt_id: string;
  item: string;
  qty: number;
  unit_price_jpy_tax_in: number;
  subtotal_jpy: number;
  discount_jpy: number;
  service_charge_jpy: number;
  charge_fixed_jpy: number;
  tax_included_jpy: number;
  total_jpy: number;
  payment_method: PaymentMethod;
}

// ========================
// フォーム入力用の型
// ========================
export interface CreateReceiptInput {
  items: Omit<ReceiptItem, "id">[];
  paymentMethod: PaymentMethod;
  discountJPY?: number;
  serviceChargeRatePercent?: number;
  chargeEnabled?: boolean;
  chargeFixedJPY?: number;
  note?: string;
}

export interface UpdateReceiptInput {
  items?: Omit<ReceiptItem, "id">[];
  paymentMethod?: PaymentMethod;
  discountJPY?: number;
  serviceChargeRatePercent?: number;
  chargeEnabled?: boolean;
  chargeFixedJPY?: number;
  note?: string;
}

export interface CheckInInput {
  guestCount: number;
  note?: string;
}

export interface UpdateSettingsInput {
  organizationName?: string;
  taxRatePercent?: number;
  serviceChargeRatePercent?: number;
  chargeEnabled?: boolean;
  chargeFixedJPY?: number;
  businessHours?: {
    openTime: string;
    closeTime: string;
  };
  theme?: "dark" | "light";
}

// ========================
// メニュー管理関連
// ========================
export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  priceTaxInJPY: number;  // 税込価格（円）
  active: boolean;        // 有効/無効フラグ
}

// ========================
// バッチ操作関連
// ========================
export type BatchReceiptOp = {
  op: "create" | "update" | "cancel";
  id?: string;  // updateやcancelの場合は必須
  payload?: CreateReceiptInput | UpdateReceiptInput;  // createやupdateの場合に使用
};

export interface BatchReceiptResult {
  id: string;
  status: "ok" | "error";
  message?: string;
}

// ========================
// レスポンス型
// ========================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}