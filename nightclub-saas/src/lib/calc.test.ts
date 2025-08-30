/**
 * 計算ユーティリティのテスト
 * REQUIREMENTS.md の計算仕様に基づくテストケース
 */

import { describe, it, expect } from "vitest";
import {
  ceilToYen,
  roundToYen,
  calcReceiptTotals,
  formatJPY,
  formatJPYWithDecimals,
  formatPercent,
  generateReceiptId,
  generateAttendanceId,
} from "./calc";
import type { ReceiptItem } from "./types";

describe("ceilToYen", () => {
  it("整数はそのまま返す", () => {
    expect(ceilToYen(100)).toBe(100);
    expect(ceilToYen(0)).toBe(0);
    expect(ceilToYen(999)).toBe(999);
  });

  it("小数点以下を切り上げる", () => {
    expect(ceilToYen(100.01)).toBe(101);
    expect(ceilToYen(100.5)).toBe(101);
    expect(ceilToYen(100.99)).toBe(101);
  });

  it("負の数も切り上げる", () => {
    expect(ceilToYen(-100.5)).toBe(-100);
    expect(ceilToYen(-100.01)).toBe(-100);
  });
});

describe("roundToYen", () => {
  it("整数はそのまま返す", () => {
    expect(roundToYen(100)).toBe(100);
    expect(roundToYen(0)).toBe(0);
    expect(roundToYen(999)).toBe(999);
  });

  it("小数点以下を四捨五入する", () => {
    expect(roundToYen(100.4)).toBe(100);
    expect(roundToYen(100.5)).toBe(101);
    expect(roundToYen(100.6)).toBe(101);
  });

  it("負の数も四捨五入する", () => {
    expect(roundToYen(-100.4)).toBe(-100);
    expect(roundToYen(-100.5)).toBe(-100);
    expect(roundToYen(-100.6)).toBe(-101);
  });
});

describe("calcReceiptTotals", () => {
  const createItem = (name: string, price: number, qty: number): ReceiptItem => ({
    id: `item-${name}`,
    name,
    category: "item",
    unitPriceTaxInJPY: price,
    qty,
  });

  describe("基本的な計算", () => {
    it("例1: 小計3000, 割引0, SC10%, チャージ1000", () => {
      const items = [createItem("item1", 3000, 1)];
      const result = calcReceiptTotals({
        items,
        discountJPY: 0,
        serviceChargeRatePercent: 10,
        chargeEnabled: true,
        chargeFixedJPY: 1000,
        taxRatePercent: 10,
      });

      expect(result.subtotal).toBe(3000);
      expect(result.serviceCharge).toBe(300); // 3000 * 0.1
      expect(result.chargeFixed).toBe(1000);
      expect(result.totalRaw).toBe(4300); // 3000 + 300 + 1000
      expect(result.total).toBe(4300); // ceil(4300)
      expect(result.taxIncluded).toBe(391); // round(4300 * 0.1 / 1.1)
    });

    it("例2: 小計2500.5, 割引600, SC5%, チャージ0", () => {
      const items = [
        createItem("item1", 1500.5, 1),
        createItem("item2", 1000, 1),
      ];
      const result = calcReceiptTotals({
        items,
        discountJPY: 600,
        serviceChargeRatePercent: 5,
        chargeEnabled: false,
        chargeFixedJPY: 0,
        taxRatePercent: 10,
      });

      expect(result.subtotal).toBe(2500.5);
      expect(result.serviceCharge).toBeCloseTo(95.025, 3); // (2500.5 - 600) * 0.05
      expect(result.chargeFixed).toBe(0);
      expect(result.totalRaw).toBeCloseTo(1995.525, 3); // 1900.5 + 95.025
      expect(result.total).toBe(1996); // ceil(1995.525)
      expect(result.taxIncluded).toBe(181); // round(1995.525 * 0.1 / 1.1)
    });
  });

  describe("境界値テスト", () => {
    it("空の商品リスト", () => {
      const result = calcReceiptTotals({
        items: [],
        discountJPY: 0,
        serviceChargeRatePercent: 10,
        chargeEnabled: false,
        chargeFixedJPY: 0,
        taxRatePercent: 10,
      });

      expect(result.subtotal).toBe(0);
      expect(result.serviceCharge).toBe(0);
      expect(result.chargeFixed).toBe(0);
      expect(result.total).toBe(0);
      expect(result.taxIncluded).toBe(0);
    });

    it("割引が小計を超える場合は小計まで制限", () => {
      const items = [createItem("item1", 1000, 1)];
      const result = calcReceiptTotals({
        items,
        discountJPY: 2000, // 小計1000円を超える割引
        serviceChargeRatePercent: 10,
        chargeEnabled: false,
        chargeFixedJPY: 0,
        taxRatePercent: 10,
      });

      expect(result.subtotal).toBe(1000);
      expect(result.serviceCharge).toBe(0); // (1000 - 1000) * 0.1 = 0
      expect(result.total).toBe(0);
    });

    it("負の割引は0として扱う", () => {
      const items = [createItem("item1", 1000, 1)];
      const result = calcReceiptTotals({
        items,
        discountJPY: -500, // 負の割引
        serviceChargeRatePercent: 10,
        chargeEnabled: false,
        chargeFixedJPY: 0,
        taxRatePercent: 10,
      });

      expect(result.subtotal).toBe(1000);
      expect(result.serviceCharge).toBe(100); // 1000 * 0.1
      expect(result.total).toBe(1100);
    });

    it("端数のある金額の切り上げ", () => {
      const items = [createItem("item1", 999.01, 1)];
      const result = calcReceiptTotals({
        items,
        discountJPY: 0,
        serviceChargeRatePercent: 10,
        chargeEnabled: false,
        chargeFixedJPY: 0,
        taxRatePercent: 10,
      });

      expect(result.subtotal).toBe(999.01);
      expect(result.serviceCharge).toBeCloseTo(99.901, 3);
      expect(result.totalRaw).toBeCloseTo(1098.911, 3);
      expect(result.total).toBe(1099); // ceil(1098.911)
    });
  });

  describe("複数商品の計算", () => {
    it("複数商品の合計を正しく計算", () => {
      const items = [
        createItem("ボトル", 12000, 1),
        createItem("チャージ", 3000, 2),
        createItem("おつまみ", 500, 3),
      ];
      const result = calcReceiptTotals({
        items,
        discountJPY: 500,
        serviceChargeRatePercent: 20,
        chargeEnabled: true,
        chargeFixedJPY: 2000,
        taxRatePercent: 10,
      });

      expect(result.subtotal).toBe(19500); // 12000 + 6000 + 1500
      expect(result.serviceCharge).toBe(3800); // (19500 - 500) * 0.2
      expect(result.chargeFixed).toBe(2000);
      expect(result.total).toBe(24800); // ceil(19000 + 3800 + 2000)
    });
  });

  describe("税計算の検証", () => {
    it("内税を正しく計算（10%）", () => {
      const items = [createItem("item1", 11000, 1)]; // 税込11000円
      const result = calcReceiptTotals({
        items,
        discountJPY: 0,
        serviceChargeRatePercent: 0,
        chargeEnabled: false,
        chargeFixedJPY: 0,
        taxRatePercent: 10,
      });

      expect(result.total).toBe(11000);
      expect(result.taxIncluded).toBe(1000); // round(11000 * 0.1 / 1.1)
    });

    it("内税を正しく計算（8%）", () => {
      const items = [createItem("item1", 10800, 1)]; // 税込10800円
      const result = calcReceiptTotals({
        items,
        discountJPY: 0,
        serviceChargeRatePercent: 0,
        chargeEnabled: false,
        chargeFixedJPY: 0,
        taxRatePercent: 8,
      });

      expect(result.total).toBe(10800);
      expect(result.taxIncluded).toBe(800); // round(10800 * 0.08 / 1.08)
    });
  });
});

describe("formatJPY", () => {
  it("日本円フォーマットで表示", () => {
    expect(formatJPY(1234)).toMatch(/1,234/);
    expect(formatJPY(0)).toMatch(/0/);
    expect(formatJPY(1000000)).toMatch(/1,000,000/);
  });

  it("小数点は表示しない", () => {
    expect(formatJPY(1234.56)).toMatch(/1,235/);
  });
});

describe("formatJPYWithDecimals", () => {
  it("小数点ありで表示", () => {
    const result = formatJPYWithDecimals(1234.56, 2);
    expect(result).toMatch(/1,234\.56/);
  });

  it("指定した桁数で表示", () => {
    const result = formatJPYWithDecimals(1234.5, 1);
    expect(result).toMatch(/1,234\.5/);
  });
});

describe("formatPercent", () => {
  it("パーセント表示", () => {
    expect(formatPercent(10)).toBe("10%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(100)).toBe("100%");
    expect(formatPercent(12.5)).toBe("12.5%");
  });
});

describe("generateReceiptId", () => {
  it("正しい形式のIDを生成", () => {
    const id = generateReceiptId();
    expect(id).toMatch(/^RCPT-\d{8}-\d{3}$/);
  });

  it("毎回異なるIDを生成", () => {
    const id1 = generateReceiptId();
    const id2 = generateReceiptId();
    // 同じ日時でもランダム部分が異なる可能性が高い
    expect(id1).not.toBe(id2);
  });
});

describe("generateAttendanceId", () => {
  it("正しい形式のIDを生成", () => {
    const id = generateAttendanceId();
    expect(id).toMatch(/^ATD-\d{8}-\d{3}$/);
  });

  it("毎回異なるIDを生成", () => {
    const id1 = generateAttendanceId();
    const id2 = generateAttendanceId();
    // 同じ日時でもランダム部分が異なる可能性が高い
    expect(id1).not.toBe(id2);
  });
});