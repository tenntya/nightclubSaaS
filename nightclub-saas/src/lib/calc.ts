/**
 * 計算ユーティリティ
 * REQUIREMENTS.md に基づいた伝票計算ロジック
 */

import type { ReceiptItem, ReceiptTotals } from "./types";

/**
 * 円単位で切り上げる
 * @param n 数値
 * @returns 切り上げ後の整数円
 */
export function ceilToYen(n: number): number {
  return Math.ceil(n);
}

/**
 * 円単位で四捨五入する
 * @param n 数値
 * @returns 四捨五入後の整数円
 */
export function roundToYen(n: number): number {
  return Math.round(n);
}

/**
 * 伝票の合計を計算する
 * 計算順序（REQUIREMENTS.md v1）:
 * 1) 小計 = Σ(item.unitPriceTaxInJPY × qty)
 * 2) 割引 = fixedDiscountJPY（小計を下回らない範囲に制限）
 * 3) サービス料 = (小計 − 割引) × serviceChargeRatePercent/100
 * 4) 固定チャージ = settings.chargeEnabled ? settings.chargeFixedJPY : 0
 * 5) 合計（生）= 小計 − 割引 + サービス料 + 固定チャージ
 * 6) 合計 = ceilToYen(合計（生）)
 * 
 * 税内訳（報告/CSV用の参考値）:
 * - 課税対象額（生）= 小計 − 割引 + サービス料 + 固定チャージ
 * - 内税推定 = roundToYen(課税対象額（生） × 税率 / (1 + 税率))
 */
export function calcReceiptTotals(input: {
  items: ReceiptItem[];
  discountJPY: number;
  serviceChargeRatePercent: number;
  chargeEnabled: boolean;
  chargeFixedJPY: number;
  taxRatePercent: number;
}): ReceiptTotals {
  const {
    items,
    discountJPY,
    serviceChargeRatePercent,
    chargeEnabled,
    chargeFixedJPY,
    taxRatePercent,
  } = input;

  // 1) 小計 = Σ(item.unitPriceTaxInJPY × qty)
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.unitPriceTaxInJPY * item.qty);
  }, 0);

  // 2) 割引 = fixedDiscountJPY（小計を下回らない範囲に制限）
  // 割引が小計を超える場合は小計までに制限（合計が負にならないように）
  const effectiveDiscount = Math.min(Math.max(0, discountJPY), subtotal);

  // 3) サービス料 = (小計 − 割引) × serviceChargeRatePercent/100
  const afterDiscount = subtotal - effectiveDiscount;
  const serviceCharge = afterDiscount * (serviceChargeRatePercent / 100);

  // 4) 固定チャージ = settings.chargeEnabled ? settings.chargeFixedJPY : 0
  const chargeFixed = chargeEnabled ? chargeFixedJPY : 0;

  // 5) 合計（生）= 小計 − 割引 + サービス料 + 固定チャージ
  const totalRaw = afterDiscount + serviceCharge + chargeFixed;

  // 6) 合計 = ceilToYen(合計（生）)
  const total = ceilToYen(totalRaw);

  // 税内訳（報告/CSV用の参考値）
  // 課税対象額（生）= 小計 − 割引 + サービス料 + 固定チャージ
  const taxableAmount = afterDiscount + serviceCharge + chargeFixed;
  
  // 内税推定 = roundToYen(課税対象額（生） × 税率 / (1 + 税率))
  const taxRate = taxRatePercent / 100;
  const taxIncluded = roundToYen(taxableAmount * taxRate / (1 + taxRate));

  return {
    subtotal,
    serviceCharge,
    chargeFixed,
    totalRaw,
    total,
    taxIncluded,
  };
}

/**
 * 数値を日本円フォーマットで表示する
 * @param n 数値
 * @returns フォーマット済み文字列（例: "¥1,234"）
 */
export function formatJPY(n: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * 数値を日本円フォーマットで表示する（小数点あり）
 * @param n 数値
 * @param decimals 小数点以下の桁数
 * @returns フォーマット済み文字列（例: "¥1,234.56"）
 */
export function formatJPYWithDecimals(n: number, decimals: number = 2): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

/**
 * パーセント表示用のフォーマット
 * @param n 数値（パーセント）
 * @returns フォーマット済み文字列（例: "10%"）
 */
export function formatPercent(n: number): string {
  return `${n}%`;
}

/**
 * 伝票ID生成（仮実装）
 * @returns 伝票ID（例: "RCPT-20250101-001"）
 */
export function generateReceiptId(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `RCPT-${year}${month}${day}-${random}`;
}

/**
 * 来店管理ID生成（仮実装）
 * @returns 来店ID（例: "ATD-20250101-001"）
 */
export function generateAttendanceId(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `ATD-${year}${month}${day}-${random}`;
}