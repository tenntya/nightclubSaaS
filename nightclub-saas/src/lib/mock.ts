/**
 * モックデータ
 * 開発・デモ用のサンプルデータ
 */

import type { Receipt, Attendance, Settings, KPIData } from "./types";
import { generateReceiptId, generateAttendanceId } from "./calc";

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