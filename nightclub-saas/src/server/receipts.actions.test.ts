import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  listReceipts,
  getReceipt,
  createReceipt,
  updateReceipt,
  cancelReceipt,
  batchReceipts,
} from "./actions/receipts";
import type { CreateReceiptInput, UpdateReceiptInput, BatchReceiptOp } from "@/lib/types";

// モックストアをリセットする関数
const resetMockStore = () => {
  vi.resetModules();
};

describe("Receipts Server Actions", () => {
  beforeEach(() => {
    resetMockStore();
  });

  describe("listReceipts", () => {
    it("伝票一覧を取得できる", async () => {
      const receipts = await listReceipts();
      expect(Array.isArray(receipts)).toBe(true);
      expect(receipts.length).toBeGreaterThan(0);

      const firstReceipt = receipts[0];
      expect(firstReceipt).toHaveProperty("id");
      expect(firstReceipt).toHaveProperty("issuedAt");
      expect(firstReceipt).toHaveProperty("items");
      expect(firstReceipt).toHaveProperty("totals");
    });
  });

  describe("getReceipt", () => {
    it("IDで伝票を取得できる", async () => {
      const receipts = await listReceipts();
      const targetId = receipts[0].id;

      const receipt = await getReceipt(targetId);
      expect(receipt).toBeDefined();
      expect(receipt?.id).toBe(targetId);
    });

    it("存在しないIDの場合undefinedを返す", async () => {
      const receipt = await getReceipt("INVALID-ID");
      expect(receipt).toBeUndefined();
    });
  });

  describe("createReceipt", () => {
    it("正常に伝票を作成できる", async () => {
      const input: CreateReceiptInput = {
        items: [
          {
            name: "テスト商品",
            category: "item",
            unitPriceTaxInJPY: 3000,
            qty: 2,
          },
        ],
        paymentMethod: "Cash",
        discountJPY: 500,
        serviceChargeRatePercent: 10,
        chargeEnabled: true,
        chargeFixedJPY: 1000,
      };

      const receipt = await createReceipt(input);

      expect(receipt.id).toBeDefined();
      expect(receipt.items).toHaveLength(1);
      expect(receipt.items[0].name).toBe("テスト商品");
      expect(receipt.paymentMethod).toBe("Cash");
      expect(receipt.discountJPY).toBe(500);
      expect(receipt.totals).toBeDefined();
      expect(receipt.totals.total).toBeGreaterThan(0);
    });

    it("複数商品の伝票を作成できる", async () => {
      const input: CreateReceiptInput = {
        items: [
          {
            name: "商品1",
            category: "bottle",
            unitPriceTaxInJPY: 10000,
            qty: 1,
          },
          {
            name: "商品2",
            category: "set",
            unitPriceTaxInJPY: 8000,
            qty: 2,
          },
        ],
        paymentMethod: "Card",
      };

      const receipt = await createReceipt(input);
      expect(receipt.items).toHaveLength(2);
      expect(receipt.totals.subtotal).toBe(26000); // 10000 + 8000*2
    });

    it("アイテムが空の場合エラーになる", async () => {
      const input: CreateReceiptInput = {
        items: [],
        paymentMethod: "Cash",
      };

      await expect(createReceipt(input)).rejects.toThrow("アイテムは最低1つ必要");
    });

    it("不正な決済方法の場合エラーになる", async () => {
      const input: CreateReceiptInput = {
        items: [
          {
            name: "テスト",
            category: "item",
            unitPriceTaxInJPY: 1000,
            qty: 1,
          },
        ],
        paymentMethod: "Invalid" as any,
      };

      await expect(createReceipt(input)).rejects.toThrow("入力エラー");
    });
  });

  describe("updateReceipt", () => {
    it("伝票を更新できる", async () => {
      // まず作成
      const created = await createReceipt({
        items: [
          {
            name: "初期商品",
            category: "item",
            unitPriceTaxInJPY: 5000,
            qty: 1,
          },
        ],
        paymentMethod: "Cash",
        discountJPY: 0,
      });

      // 更新
      const updateInput: UpdateReceiptInput = {
        discountJPY: 1000,
        paymentMethod: "Card",
      };

      const updated = await updateReceipt(created.id, updateInput);

      expect(updated.id).toBe(created.id);
      expect(updated.discountJPY).toBe(1000);
      expect(updated.paymentMethod).toBe("Card");
      // アイテムは変更していない
      expect(updated.items[0].name).toBe("初期商品");
    });

    it("アイテムを更新できる", async () => {
      const created = await createReceipt({
        items: [
          {
            name: "旧商品",
            category: "item",
            unitPriceTaxInJPY: 3000,
            qty: 1,
          },
        ],
        paymentMethod: "Cash",
      });

      const updated = await updateReceipt(created.id, {
        items: [
          {
            name: "新商品",
            category: "bottle",
            unitPriceTaxInJPY: 10000,
            qty: 2,
          },
        ],
      });

      expect(updated.items).toHaveLength(1);
      expect(updated.items[0].name).toBe("新商品");
      expect(updated.totals.subtotal).toBe(20000);
    });

    it("存在しないIDの場合エラーになる", async () => {
      await expect(
        updateReceipt("INVALID-ID", { discountJPY: 1000 })
      ).rejects.toThrow("Receipt not found");
    });
  });

  describe("cancelReceipt", () => {
    it("伝票をキャンセルできる", async () => {
      const created = await createReceipt({
        items: [
          {
            name: "キャンセルテスト",
            category: "item",
            unitPriceTaxInJPY: 5000,
            qty: 1,
          },
        ],
        paymentMethod: "Cash",
      });

      const cancelled = await cancelReceipt(created.id);

      expect(cancelled.id).toBe(created.id);
      expect(cancelled.status).toBe("cancelled");
    });

    it("存在しないIDの場合エラーになる", async () => {
      await expect(cancelReceipt("INVALID-ID")).rejects.toThrow("Receipt not found");
    });
  });

  describe("batchReceipts", () => {
    it("複数の伝票を一括作成できる", async () => {
      const ops: BatchReceiptOp[] = [
        {
          op: "create",
          payload: {
            items: [
              {
                name: "バッチ商品1",
                category: "item",
                unitPriceTaxInJPY: 3000,
                qty: 1,
              },
            ],
            paymentMethod: "Cash",
          },
        },
        {
          op: "create",
          payload: {
            items: [
              {
                name: "バッチ商品2",
                category: "set",
                unitPriceTaxInJPY: 8000,
                qty: 2,
              },
            ],
            paymentMethod: "Card",
          },
        },
      ];

      const results = await batchReceipts(ops);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe("ok");
      expect(results[1].status).toBe("ok");
    });

    it("一括キャンセルができる", async () => {
      // まず伝票を作成
      const receipt1 = await createReceipt({
        items: [{ name: "商品1", category: "item", unitPriceTaxInJPY: 1000, qty: 1 }],
        paymentMethod: "Cash",
      });
      const receipt2 = await createReceipt({
        items: [{ name: "商品2", category: "item", unitPriceTaxInJPY: 2000, qty: 1 }],
        paymentMethod: "Card",
      });

      const ops: BatchReceiptOp[] = [
        { op: "cancel", id: receipt1.id },
        { op: "cancel", id: receipt2.id },
      ];

      const results = await batchReceipts(ops);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe("ok");
      expect(results[1].status).toBe("ok");

      // キャンセルされたか確認
      const cancelled1 = await getReceipt(receipt1.id);
      const cancelled2 = await getReceipt(receipt2.id);
      expect(cancelled1?.status).toBe("cancelled");
      expect(cancelled2?.status).toBe("cancelled");
    });

    it("一括更新ができる", async () => {
      // まず伝票を作成
      const receipt1 = await createReceipt({
        items: [{ name: "商品1", category: "item", unitPriceTaxInJPY: 1000, qty: 1 }],
        paymentMethod: "Cash",
        discountJPY: 0,
      });
      const receipt2 = await createReceipt({
        items: [{ name: "商品2", category: "item", unitPriceTaxInJPY: 2000, qty: 1 }],
        paymentMethod: "Cash",
        discountJPY: 0,
      });

      const ops: BatchReceiptOp[] = [
        {
          op: "update",
          id: receipt1.id,
          payload: { discountJPY: 100 },
        },
        {
          op: "update",
          id: receipt2.id,
          payload: { discountJPY: 200 },
        },
      ];

      const results = await batchReceipts(ops);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe("ok");
      expect(results[1].status).toBe("ok");

      // 更新されたか確認
      const updated1 = await getReceipt(receipt1.id);
      const updated2 = await getReceipt(receipt2.id);
      expect(updated1?.discountJPY).toBe(100);
      expect(updated2?.discountJPY).toBe(200);
    });

    it("部分的な失敗を処理できる", async () => {
      const receipt = await createReceipt({
        items: [{ name: "商品", category: "item", unitPriceTaxInJPY: 1000, qty: 1 }],
        paymentMethod: "Cash",
      });

      const ops: BatchReceiptOp[] = [
        { op: "cancel", id: receipt.id }, // 成功するはず
        { op: "cancel", id: "INVALID-ID" }, // 失敗するはず
        {
          op: "create",
          payload: {
            items: [{ name: "新商品", category: "item", unitPriceTaxInJPY: 3000, qty: 1 }],
            paymentMethod: "Card",
          },
        }, // 成功するはず
      ];

      const results = await batchReceipts(ops);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe("ok");
      expect(results[1].status).toBe("error");
      expect(results[1].message).toContain("Receipt not found");
      expect(results[2].status).toBe("ok");
    });

    it("不正な操作タイプの場合エラーを返す", async () => {
      const ops: BatchReceiptOp[] = [
        {
          op: "invalid" as any,
          id: "test",
        },
      ];

      const results = await batchReceipts(ops);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("error");
      expect(results[0].message).toContain("Unknown operation");
    });

    it("createにpayloadがない場合エラーを返す", async () => {
      const ops: BatchReceiptOp[] = [
        {
          op: "create",
        },
      ];

      const results = await batchReceipts(ops);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("error");
      expect(results[0].message).toContain("requires payload");
    });

    it("updateにIDがない場合エラーを返す", async () => {
      const ops: BatchReceiptOp[] = [
        {
          op: "update",
          payload: { discountJPY: 1000 },
        },
      ];

      const results = await batchReceipts(ops);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("error");
      expect(results[0].message).toContain("requires id");
    });
  });
});