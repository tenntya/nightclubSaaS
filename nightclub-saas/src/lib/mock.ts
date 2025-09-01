/**
 * モックデータ
 * 開発・デモ用のサンプルデータ
 */

import type { 
  Receipt, 
  Attendance, 
  Settings, 
  KPIData, 
  MenuItem, 
  BatchReceiptOp, 
  BatchReceiptResult,
  CreateReceiptInput,
  UpdateReceiptInput,
  Staff,
  StaffAttendanceRecord,
  AttendanceRequest,
  StaffShiftWish,
  StaffShiftPlan
} from "./types";
import { generateReceiptId, generateAttendanceId, calcReceiptTotals } from "./calc";

// 現在時刻からの相対時間を生成
const getRelativeTime = (hoursAgo: number): string => {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
};

// 今日の日付を取得（JST 20:00開始として）
const getTodayBusinessDate = (): string => {
  const now = new Date();
  const jstHour = now.getHours() + 9; // JST変換（簡易版）
  if (jstHour < 20) {
    // 20時前なら前日扱い
    now.setDate(now.getDate() - 1);
  }
  now.setHours(20, 0, 0, 0);
  return now.toISOString();
};

// モック伝票データ
export const mockReceipts: Receipt[] = [
  {
    id: generateReceiptId(),
    issuedAt: getRelativeTime(1),
    items: [
      {
        id: "item-1",
        name: "シャンパン（ドンペリ）",
        category: "bottle",
        unitPriceTaxInJPY: 88000,
        qty: 1,
      },
      {
        id: "item-2",
        name: "チャージ",
        category: "other",
        unitPriceTaxInJPY: 5000,
        qty: 2,
      },
      {
        id: "item-3",
        name: "フルーツ盛り合わせ",
        category: "item",
        unitPriceTaxInJPY: 3000,
        qty: 1,
      },
    ],
    paymentMethod: "Card",
    discountJPY: 0,
    serviceChargeRatePercent: 20,
    chargeEnabled: true,
    chargeFixedJPY: 3000,
    totals: {
      subtotal: 101000,
      serviceCharge: 20200,
      chargeFixed: 3000,
      totalRaw: 124200,
      total: 124200,
      taxIncluded: 11291,
    },
    status: "active",
  },
  {
    id: generateReceiptId(),
    issuedAt: getRelativeTime(2),
    items: [
      {
        id: "item-4",
        name: "60分セット",
        category: "set",
        unitPriceTaxInJPY: 8000,
        qty: 3,
      },
      {
        id: "item-5",
        name: "指名料（あやか）",
        category: "nomination",
        unitPriceTaxInJPY: 3000,
        qty: 1,
      },
    ],
    paymentMethod: "Cash",
    discountJPY: 1000,
    serviceChargeRatePercent: 10,
    chargeEnabled: true,
    chargeFixedJPY: 2000,
    totals: {
      subtotal: 27000,
      serviceCharge: 2600,
      chargeFixed: 2000,
      totalRaw: 30600,
      total: 30600,
      taxIncluded: 2782,
    },
    status: "active",
  },
  {
    id: generateReceiptId(),
    issuedAt: getRelativeTime(3),
    items: [
      {
        id: "item-6",
        name: "ウイスキー（山崎12年）",
        category: "bottle",
        unitPriceTaxInJPY: 25000,
        qty: 1,
      },
      {
        id: "item-7",
        name: "チャージ",
        category: "other",
        unitPriceTaxInJPY: 5000,
        qty: 4,
      },
    ],
    paymentMethod: "QR",
    discountJPY: 0,
    serviceChargeRatePercent: 15,
    chargeEnabled: false,
    chargeFixedJPY: 0,
    totals: {
      subtotal: 45000,
      serviceCharge: 6750,
      chargeFixed: 0,
      totalRaw: 51750,
      total: 51750,
      taxIncluded: 4705,
    },
    status: "active",
  },
];

// モック来店データ
export const mockAttendances: Attendance[] = [
  {
    id: generateAttendanceId(),
    checkedInAt: getRelativeTime(0.5),
    checkedOutAt: undefined, // 現在在店中
    guestCount: 3,
    note: "VIP対応",
  },
  {
    id: generateAttendanceId(),
    checkedInAt: getRelativeTime(1),
    checkedOutAt: undefined, // 現在在店中
    guestCount: 2,
  },
  {
    id: generateAttendanceId(),
    checkedInAt: getRelativeTime(2),
    checkedOutAt: getRelativeTime(0.5),
    guestCount: 4,
    note: "誕生日パーティー",
  },
  {
    id: generateAttendanceId(),
    checkedInAt: getRelativeTime(3),
    checkedOutAt: getRelativeTime(1),
    guestCount: 1,
  },
  {
    id: generateAttendanceId(),
    checkedInAt: getRelativeTime(4),
    checkedOutAt: getRelativeTime(2),
    guestCount: 5,
    note: "団体予約",
  },
];

// 現在在店数を計算
export const getCurrentGuestCount = (): number => {
  return mockAttendances
    .filter((a) => !a.checkedOutAt)
    .reduce((sum, a) => sum + a.guestCount, 0);
};

// モック設定データ
export const mockSettings: Settings = {
  organizationName: "Club Elegance",
  taxRatePercent: 10,
  serviceChargeRatePercent: 10,
  chargeEnabled: true,
  chargeFixedJPY: 2000,
  currency: "JPY",
  timezone: "Asia/Tokyo",
  businessHours: {
    openTime: "20:00",
    closeTime: "03:00",
  },
  theme: "dark",
  rbac: {
    roles: ["Admin", "Owner", "Staff"],
    assignments: [
      {
        userId: "user-1",
        userEmail: "admin@nightclub.com",
        role: "Admin",
      },
      {
        userId: "user-2",
        userEmail: "owner@nightclub.com",
        role: "Owner",
      },
      {
        userId: "user-3",
        userEmail: "staff1@nightclub.com",
        role: "Staff",
      },
    ],
  },
};

// KPIデータ生成（過去30日分）
export const generateKPIData = (days: number = 30): KPIData[] => {
  const data: KPIData[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // ランダムな売上データを生成（週末は高め）
    const isWeekend = date.getDay() === 5 || date.getDay() === 6;
    const baseSales = isWeekend ? 500000 : 300000;
    const variance = Math.random() * 200000 - 100000;
    const sales = Math.round(baseSales + variance);
    
    const customerCount = Math.round(sales / (15000 + Math.random() * 10000));
    const avgSpend = Math.round(sales / customerCount);

    data.push({
      date: date.toISOString(),
      sales,
      customerCount,
      avgSpend,
    });
  }

  return data;
};

// 今日のKPIサマリー
export const getTodayKPI = (): KPIData => {
  const todayReceipts = mockReceipts.filter((r) => {
    const receiptDate = new Date(r.issuedAt).toDateString();
    const today = new Date().toDateString();
    return receiptDate === today;
  });

  const sales = todayReceipts.reduce((sum, r) => sum + r.totals.total, 0);
  const customerCount = mockAttendances.filter((a) => {
    const attendanceDate = new Date(a.checkedInAt).toDateString();
    const today = new Date().toDateString();
    return attendanceDate === today;
  }).length;

  return {
    date: new Date().toISOString(),
    sales,
    customerCount,
    avgSpend: customerCount > 0 ? Math.round(sales / customerCount) : 0,
  };
};

// 月間KPIサマリー
export const getMonthlyKPI = (): KPIData => {
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  
  const monthlyData = generateKPIData(30).filter((d) => {
    const date = new Date(d.date);
    return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
  });

  const totalSales = monthlyData.reduce((sum, d) => sum + d.sales, 0);
  const totalCustomers = monthlyData.reduce((sum, d) => sum + d.customerCount, 0);

  return {
    date: new Date().toISOString(),
    sales: totalSales,
    customerCount: totalCustomers,
    avgSpend: totalCustomers > 0 ? Math.round(totalSales / totalCustomers) : 0,
  };
};

// スタッフリスト（勤怠用）
export const mockStaff = [
  { id: "staff-1", name: "佐藤 あやか", role: "キャスト" },
  { id: "staff-2", name: "鈴木 まりあ", role: "キャスト" },
  { id: "staff-3", name: "田中 ゆい", role: "キャスト" },
  { id: "staff-4", name: "山田 太郎", role: "マネージャー" },
  { id: "staff-5", name: "高橋 次郎", role: "バーテンダー" },
];

// 商品マスタ（簡易版）
export const mockProducts = [
  { id: "prod-1", name: "シャンパン（モエ）", category: "bottle", price: 35000 },
  { id: "prod-2", name: "シャンパン（ドンペリ）", category: "bottle", price: 88000 },
  { id: "prod-3", name: "ウイスキー（山崎12年）", category: "bottle", price: 25000 },
  { id: "prod-4", name: "ウイスキー（響17年）", category: "bottle", price: 45000 },
  { id: "prod-5", name: "60分セット", category: "set", price: 8000 },
  { id: "prod-6", name: "90分セット", category: "set", price: 12000 },
  { id: "prod-7", name: "指名料", category: "nomination", price: 3000 },
  { id: "prod-8", name: "同伴料", category: "nomination", price: 5000 },
  { id: "prod-9", name: "チャージ", category: "other", price: 5000 },
  { id: "prod-10", name: "フルーツ盛り合わせ", category: "item", price: 3000 },
  { id: "prod-11", name: "チーズ盛り合わせ", category: "item", price: 2500 },
  { id: "prod-12", name: "ミックスナッツ", category: "item", price: 1500 },
];

// ========================
// メニューストア（インメモリ）
// ========================

// メニューアイテムの初期データ
const initialMenuItems: MenuItem[] = [
  { id: "MENU-20250830-001", name: "シャンパン（モエ）", category: "bottle", priceTaxInJPY: 35000, active: true },
  { id: "MENU-20250830-002", name: "シャンパン（ドンペリ）", category: "bottle", priceTaxInJPY: 88000, active: true },
  { id: "MENU-20250830-003", name: "ウイスキー（山崎12年）", category: "bottle", priceTaxInJPY: 25000, active: true },
  { id: "MENU-20250830-004", name: "ウイスキー（響17年）", category: "bottle", priceTaxInJPY: 45000, active: true },
  { id: "MENU-20250830-005", name: "60分セット", category: "set", priceTaxInJPY: 8000, active: true },
  { id: "MENU-20250830-006", name: "90分セット", category: "set", priceTaxInJPY: 12000, active: true },
  { id: "MENU-20250830-007", name: "指名料", category: "nomination", priceTaxInJPY: 3000, active: true },
  { id: "MENU-20250830-008", name: "同伴料", category: "nomination", priceTaxInJPY: 5000, active: true },
  { id: "MENU-20250830-009", name: "チャージ", category: "other", priceTaxInJPY: 5000, active: true },
  { id: "MENU-20250830-010", name: "フルーツ盛り合わせ", category: "item", priceTaxInJPY: 3000, active: true },
  { id: "MENU-20250830-011", name: "チーズ盛り合わせ", category: "item", priceTaxInJPY: 2500, active: true },
  { id: "MENU-20250830-012", name: "ミックスナッツ", category: "item", priceTaxInJPY: 1500, active: false },
];

// メニューストア
let menuItemsStore: MenuItem[] = [...initialMenuItems];

// メニューID生成
const generateMenuId = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const counter = String(menuItemsStore.length + 1).padStart(3, '0');
  return `MENU-${dateStr}-${counter}`;
};

// メニューストア関数
export const mockMenuStore = {
  // メニュー一覧取得
  list: async (): Promise<MenuItem[]> => {
    return [...menuItemsStore];
  },

  // メニュー作成
  create: async (input: Omit<MenuItem, 'id' | 'active'> & { active?: boolean }): Promise<MenuItem> => {
    const newItem: MenuItem = {
      id: generateMenuId(),
      name: input.name,
      category: input.category,
      priceTaxInJPY: input.priceTaxInJPY,
      active: input.active ?? true,
    };
    menuItemsStore.push(newItem);
    return newItem;
  },

  // メニュー更新
  update: async (id: string, patch: Partial<Omit<MenuItem, 'id'>>): Promise<MenuItem> => {
    const index = menuItemsStore.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error(`MenuItem not found: ${id}`);
    }
    menuItemsStore[index] = { ...menuItemsStore[index], ...patch };
    return menuItemsStore[index];
  },

  // メニュー有効/無効切替
  toggle: async (id: string, active: boolean): Promise<MenuItem> => {
    const index = menuItemsStore.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error(`MenuItem not found: ${id}`);
    }
    menuItemsStore[index].active = active;
    return menuItemsStore[index];
  },

  // メニュー削除
  delete: async (id: string): Promise<{ id: string }> => {
    const index = menuItemsStore.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error(`MenuItem not found: ${id}`);
    }
    menuItemsStore.splice(index, 1);
    return { id };
  },
};

// ========================
// 伝票ストア（拡張版）
// ========================

// 伝票ストア（既存のmockReceiptsを使用）
let receiptsStore: Receipt[] = [...mockReceipts];

export const mockReceiptStore = {
  // 伝票一覧取得
  list: async (): Promise<Receipt[]> => {
    return [...receiptsStore];
  },

  // 伝票取得
  get: async (id: string): Promise<Receipt | undefined> => {
    return receiptsStore.find(r => r.id === id);
  },

  // 伝票作成
  create: async (input: CreateReceiptInput): Promise<Receipt> => {
    const totals = calcReceiptTotals({
      items: input.items.map((item, index) => ({
        ...item,
        id: `item-${Date.now()}-${index}`,
      })),
      discountJPY: input.discountJPY ?? 0,
      serviceChargeRatePercent: input.serviceChargeRatePercent ?? mockSettings.serviceChargeRatePercent,
      chargeEnabled: input.chargeEnabled ?? mockSettings.chargeEnabled,
      chargeFixedJPY: input.chargeFixedJPY ?? mockSettings.chargeFixedJPY,
      taxRatePercent: mockSettings.taxRatePercent,
    });

    const newReceipt: Receipt = {
      id: generateReceiptId(),
      issuedAt: new Date().toISOString(),
      items: input.items.map((item, index) => ({
        ...item,
        id: `item-${Date.now()}-${index}`,
      })),
      paymentMethod: input.paymentMethod,
      discountJPY: input.discountJPY ?? 0,
      serviceChargeRatePercent: input.serviceChargeRatePercent ?? mockSettings.serviceChargeRatePercent,
      chargeEnabled: input.chargeEnabled ?? mockSettings.chargeEnabled,
      chargeFixedJPY: input.chargeFixedJPY ?? mockSettings.chargeFixedJPY,
      totals,
      status: "active",
      note: input.note,
    };

    receiptsStore.push(newReceipt);
    return newReceipt;
  },

  // 伝票更新
  update: async (id: string, input: UpdateReceiptInput): Promise<Receipt> => {
    const index = receiptsStore.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error(`Receipt not found: ${id}`);
    }

    const current = receiptsStore[index];
    const updated = {
      ...current,
      items: input.items ? input.items.map((item, i) => ({
        ...item,
        id: `item-${Date.now()}-${i}`,
      })) : current.items,
      paymentMethod: input.paymentMethod ?? current.paymentMethod,
      discountJPY: input.discountJPY ?? current.discountJPY,
      serviceChargeRatePercent: input.serviceChargeRatePercent ?? current.serviceChargeRatePercent,
      chargeEnabled: input.chargeEnabled ?? current.chargeEnabled,
      chargeFixedJPY: input.chargeFixedJPY ?? current.chargeFixedJPY,
      note: input.note ?? current.note,
    };

    // 合計を再計算
    updated.totals = calcReceiptTotals({
      items: updated.items,
      discountJPY: updated.discountJPY,
      serviceChargeRatePercent: updated.serviceChargeRatePercent,
      chargeEnabled: updated.chargeEnabled,
      chargeFixedJPY: updated.chargeFixedJPY,
      taxRatePercent: mockSettings.taxRatePercent,
    });

    receiptsStore[index] = updated;
    return updated;
  },

  // 伝票キャンセル
  cancel: async (id: string): Promise<Receipt> => {
    const index = receiptsStore.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error(`Receipt not found: ${id}`);
    }
    receiptsStore[index].status = "cancelled";
    return receiptsStore[index];
  },

  // バッチ操作
  batch: async (ops: BatchReceiptOp[]): Promise<BatchReceiptResult[]> => {
    const results: BatchReceiptResult[] = [];

    for (const op of ops) {
      try {
        switch (op.op) {
          case "create":
            if (!op.payload || !('items' in op.payload)) {
              throw new Error("Create operation requires payload with items");
            }
            const created = await mockReceiptStore.create(op.payload as CreateReceiptInput);
            results.push({ id: created.id, status: "ok" });
            break;

          case "update":
            if (!op.id) {
              throw new Error("Update operation requires id");
            }
            if (!op.payload) {
              throw new Error("Update operation requires payload");
            }
            const updated = await mockReceiptStore.update(op.id, op.payload as UpdateReceiptInput);
            results.push({ id: updated.id, status: "ok" });
            break;

          case "cancel":
            if (!op.id) {
              throw new Error("Cancel operation requires id");
            }
            const cancelled = await mockReceiptStore.cancel(op.id);
            results.push({ id: cancelled.id, status: "ok" });
            break;

          default:
            results.push({ 
              id: op.id ?? "unknown", 
              status: "error", 
              message: `Unknown operation: ${op.op}` 
            });
        }
      } catch (error) {
        results.push({
          id: op.id ?? "unknown",
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  },
};

// ========================
// スタッフ勤怠管理モックデータ
// ========================

// スタッフデータ
export const mockStaff: Staff[] = [
  {
    id: "staff-001",
    name: "田中 花子",
    role: "Staff",
    punchToken: "TK001",
    active: true,
    email: "tanaka@example.com",
  },
  {
    id: "staff-002",
    name: "佐藤 美咲",
    role: "Staff",
    punchToken: "ST002",
    active: true,
    email: "sato@example.com",
  },
  {
    id: "staff-003",
    name: "鈴木 あゆみ",
    role: "Staff",
    punchToken: "SZ003",
    active: true,
    email: "suzuki@example.com",
  },
  {
    id: "staff-004",
    name: "高橋 恵子",
    role: "Admin",
    punchToken: "TH004",
    active: true,
    email: "takahashi@example.com",
  },
  {
    id: "staff-005",
    name: "山田 太郎",
    role: "Owner",
    punchToken: "YM005",
    active: true,
    email: "yamada@example.com",
  },
];

// スタッフ勤怠レコード
let staffAttendanceStore: StaffAttendanceRecord[] = [];

// 申請レコード
let attendanceRequestsStore: AttendanceRequest[] = [];

// シフト希望
let staffShiftWishStore: StaffShiftWish[] = [];

// シフト計画
let staffShiftPlanStore: StaffShiftPlan[] = [];

// 最後の打刻時刻を記録（二重打刻防止用）
const lastPunchTimes: Record<string, { checkIn?: Date; checkOut?: Date }> = {};

// スタッフストア関数
export const mockStaffStore = {
  // スタッフ一覧取得
  list: async (): Promise<Staff[]> => {
    return [...mockStaff];
  },

  // スタッフ取得（トークンまたはIDで）
  getByToken: async (token: string): Promise<Staff | undefined> => {
    return mockStaff.find(s => s.punchToken === token);
  },

  getById: async (id: string): Promise<Staff | undefined> => {
    return mockStaff.find(s => s.id === id);
  },
};

// 勤怠レコードID生成
const generateAttendanceRecordId = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const counter = String(staffAttendanceStore.length + 1).padStart(3, '0');
  return `ATT-${dateStr}-${counter}`;
};

// 申請ID生成
const generateRequestId = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const counter = String(attendanceRequestsStore.length + 1).padStart(3, '0');
  return `REQ-${dateStr}-${counter}`;
};

// 営業日を取得（20:00開始）
const getBusinessDate = (date: Date = new Date()): string => {
  const d = new Date(date);
  const hours = d.getHours();
  if (hours < 20) {
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().split('T')[0];
};

// スタッフ勤怠ストア関数
export const mockStaffAttendanceStore = {
  // 出勤打刻
  checkIn: async (params: { 
    token: string; 
    reason?: "normal" | "early" | "late" | "dohan";
    note?: string;
  }): Promise<StaffAttendanceRecord> => {
    const staff = await mockStaffStore.getByToken(params.token);
    if (!staff) {
      throw new Error("無効なトークンです");
    }

    // 二重打刻防止（5秒以内）
    const lastPunch = lastPunchTimes[staff.id];
    if (lastPunch?.checkIn) {
      const timeDiff = Date.now() - lastPunch.checkIn.getTime();
      if (timeDiff < 5000) {
        throw new Error("連続打刻はできません。しばらくお待ちください。");
      }
    }

    const businessDate = getBusinessDate();
    const now = new Date().toISOString();

    // 既存レコードをチェック
    let record = staffAttendanceStore.find(
      r => r.staffId === staff.id && r.businessDate === businessDate
    );

    if (record && record.checkInAt) {
      throw new Error("既に出勤打刻済みです");
    }

    if (!record) {
      // 新規レコード作成
      record = {
        id: generateAttendanceRecordId(),
        staffId: staff.id,
        businessDate,
        checkInAt: now,
        status: "open",
        reason: params.reason ?? "normal",
        note: params.note,
        audit: [
          {
            at: now,
            userId: staff.id,
            action: "checked_in",
            diff: { checkInAt: now, reason: params.reason },
          },
        ],
      };
      staffAttendanceStore.push(record);
    } else {
      // 既存レコードを更新
      record.checkInAt = now;
      record.reason = params.reason ?? "normal";
      record.note = params.note;
      record.audit = record.audit ?? [];
      record.audit.push({
        at: now,
        userId: staff.id,
        action: "checked_in",
        diff: { checkInAt: now, reason: params.reason },
      });
    }

    // 最後の打刻時刻を記録
    if (!lastPunchTimes[staff.id]) {
      lastPunchTimes[staff.id] = {};
    }
    lastPunchTimes[staff.id].checkIn = new Date();

    return record;
  },

  // 退勤打刻
  checkOut: async (params: { token: string; note?: string }): Promise<StaffAttendanceRecord> => {
    const staff = await mockStaffStore.getByToken(params.token);
    if (!staff) {
      throw new Error("無効なトークンです");
    }

    // 二重打刻防止（5秒以内）
    const lastPunch = lastPunchTimes[staff.id];
    if (lastPunch?.checkOut) {
      const timeDiff = Date.now() - lastPunch.checkOut.getTime();
      if (timeDiff < 5000) {
        throw new Error("連続打刻はできません。しばらくお待ちください。");
      }
    }

    const businessDate = getBusinessDate();
    const now = new Date().toISOString();

    const record = staffAttendanceStore.find(
      r => r.staffId === staff.id && r.businessDate === businessDate && r.status === "open"
    );

    if (!record) {
      throw new Error("出勤打刻がありません");
    }

    if (record.checkOutAt) {
      throw new Error("既に退勤打刻済みです");
    }

    record.checkOutAt = now;
    record.status = "closed";
    if (params.note) {
      record.note = params.note;
    }
    record.audit = record.audit ?? [];
    record.audit.push({
      at: now,
      userId: staff.id,
      action: "checked_out",
      diff: { checkOutAt: now },
    });

    // 最後の打刻時刻を記録
    if (!lastPunchTimes[staff.id]) {
      lastPunchTimes[staff.id] = {};
    }
    lastPunchTimes[staff.id].checkOut = new Date();

    return record;
  },

  // 本日の勤怠一覧取得
  listToday: async (): Promise<StaffAttendanceRecord[]> => {
    const businessDate = getBusinessDate();
    return staffAttendanceStore.filter(r => r.businessDate === businessDate);
  },

  // 月次勤怠一覧取得
  listByMonth: async (month: string): Promise<StaffAttendanceRecord[]> => {
    // month format: "2025-09"
    return staffAttendanceStore.filter(r => r.businessDate.startsWith(month));
  },

  // 特定スタッフの勤怠取得
  getByStaffId: async (staffId: string, month?: string): Promise<StaffAttendanceRecord[]> => {
    let records = staffAttendanceStore.filter(r => r.staffId === staffId);
    if (month) {
      records = records.filter(r => r.businessDate.startsWith(month));
    }
    return records;
  },

  // 修正申請作成
  requestEdit: async (params: {
    recordId: string;
    staffId: string;
    payload: Partial<Pick<StaffAttendanceRecord, "checkInAt" | "checkOutAt" | "reason" | "note">>;
  }): Promise<AttendanceRequest> => {
    const record = staffAttendanceStore.find(r => r.id === params.recordId);
    if (!record) {
      throw new Error("勤怠レコードが見つかりません");
    }

    if (record.staffId !== params.staffId) {
      throw new Error("他のスタッフの勤怠は編集できません");
    }

    const request: AttendanceRequest = {
      id: generateRequestId(),
      recordId: params.recordId,
      staffId: params.staffId,
      type: "edit",
      payload: params.payload,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    attendanceRequestsStore.push(request);
    return request;
  },

  // 申請承認
  approveRequest: async (params: {
    requestId: string;
    approverUserId: string;
    comment?: string;
  }): Promise<AttendanceRequest> => {
    const request = attendanceRequestsStore.find(r => r.id === params.requestId);
    if (!request) {
      throw new Error("申請が見つかりません");
    }

    if (request.status !== "pending") {
      throw new Error("既に処理済みの申請です");
    }

    const record = staffAttendanceStore.find(r => r.id === request.recordId);
    if (!record) {
      throw new Error("勤怠レコードが見つかりません");
    }

    // レコードを更新
    const now = new Date().toISOString();
    const diff: Record<string, any> = {};
    
    if (request.payload.checkInAt !== undefined) {
      diff.checkInAt = { from: record.checkInAt, to: request.payload.checkInAt };
      record.checkInAt = request.payload.checkInAt;
    }
    if (request.payload.checkOutAt !== undefined) {
      diff.checkOutAt = { from: record.checkOutAt, to: request.payload.checkOutAt };
      record.checkOutAt = request.payload.checkOutAt;
    }
    if (request.payload.reason !== undefined) {
      diff.reason = { from: record.reason, to: request.payload.reason };
      record.reason = request.payload.reason;
    }
    if (request.payload.note !== undefined) {
      diff.note = { from: record.note, to: request.payload.note };
      record.note = request.payload.note;
    }

    record.status = "approved";
    record.audit = record.audit ?? [];
    record.audit.push({
      at: now,
      userId: params.approverUserId,
      action: "approved",
      diff,
    });

    // 申請を更新
    request.status = "approved";
    request.decidedAt = now;
    request.decidedBy = params.approverUserId;
    request.comment = params.comment;

    return request;
  },

  // 申請却下
  rejectRequest: async (params: {
    requestId: string;
    approverUserId: string;
    comment?: string;
  }): Promise<AttendanceRequest> => {
    const request = attendanceRequestsStore.find(r => r.id === params.requestId);
    if (!request) {
      throw new Error("申請が見つかりません");
    }

    if (request.status !== "pending") {
      throw new Error("既に処理済みの申請です");
    }

    const now = new Date().toISOString();
    request.status = "rejected";
    request.decidedAt = now;
    request.decidedBy = params.approverUserId;
    request.comment = params.comment;

    // レコードの監査ログに却下を記録
    const record = staffAttendanceStore.find(r => r.id === request.recordId);
    if (record) {
      record.audit = record.audit ?? [];
      record.audit.push({
        at: now,
        userId: params.approverUserId,
        action: "rejected",
        diff: { requestId: request.id },
      });
    }

    return request;
  },

  // 申請一覧取得
  listRequests: async (status?: "pending" | "approved" | "rejected"): Promise<AttendanceRequest[]> => {
    if (status) {
      return attendanceRequestsStore.filter(r => r.status === status);
    }
    return [...attendanceRequestsStore];
  },
};

// シフトストア関数
export const mockShiftStore = {
  // シフト希望提出
  submitWish: async (params: {
    staffId: string;
    month: string;
    wishes: Array<{ date: string; available: boolean; memo?: string }>;
  }): Promise<StaffShiftWish> => {
    const existing = staffShiftWishStore.find(
      w => w.staffId === params.staffId && w.month === params.month
    );

    if (existing) {
      existing.wishes = params.wishes;
      return existing;
    }

    const wish: StaffShiftWish = {
      id: `WISH-${Date.now()}`,
      staffId: params.staffId,
      month: params.month,
      wishes: params.wishes,
    };

    staffShiftWishStore.push(wish);
    return wish;
  },

  // シフト希望取得
  getWishes: async (month: string): Promise<StaffShiftWish[]> => {
    return staffShiftWishStore.filter(w => w.month === month);
  },

  // シフト計画作成・更新
  updatePlan: async (params: {
    month: string;
    assignments: Array<{ date: string; staffId: string; start?: string; end?: string; memo?: string }>;
    published?: boolean;
  }): Promise<StaffShiftPlan> => {
    let plan = staffShiftPlanStore.find(p => p.month === params.month);

    if (!plan) {
      plan = {
        id: `PLAN-${Date.now()}`,
        month: params.month,
        assignments: params.assignments,
        published: params.published ?? false,
      };
      staffShiftPlanStore.push(plan);
    } else {
      plan.assignments = params.assignments;
      if (params.published !== undefined) {
        plan.published = params.published;
      }
    }

    return plan;
  },

  // シフト計画取得
  getPlan: async (month: string): Promise<StaffShiftPlan | undefined> => {
    return staffShiftPlanStore.find(p => p.month === month);
  },
};