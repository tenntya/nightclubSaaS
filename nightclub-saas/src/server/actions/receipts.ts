"use server";

import { z } from "zod";
import type { 
  Receipt, 
  BatchReceiptOp, 
  BatchReceiptResult,
  CreateReceiptInput,
  UpdateReceiptInput,
  PaymentMethod,
  ItemCategory
} from "@/lib/types";
import { mockReceiptStore } from "@/lib/mock";

// ========================
// バリデーションスキーマ
// ========================

const paymentMethodSchema = z.enum(["Cash", "Card", "QR", "Other"]);
const itemCategorySchema = z.enum(["item", "set", "nomination", "bottle", "other"]);

const receiptItemSchema = z.object({
  name: z.string().min(1, "アイテム名は必須です"),
  category: itemCategorySchema,
  unitPriceTaxInJPY: z.number().min(0, "単価は0以上である必要があります"),
  qty: z.number().min(1, "数量は1以上である必要があります"),
});

const createReceiptSchema = z.object({
  items: z.array(receiptItemSchema).min(1, "アイテムは最低1つ必要です"),
  paymentMethod: paymentMethodSchema,
  discountJPY: z.number().min(0).optional(),
  serviceChargeRatePercent: z.number().min(0).max(100).optional(),
  chargeEnabled: z.boolean().optional(),
  chargeFixedJPY: z.number().min(0).optional(),
  note: z.string().optional(),
});

const updateReceiptSchema = z.object({
  items: z.array(receiptItemSchema).min(1).optional(),
  paymentMethod: paymentMethodSchema.optional(),
  discountJPY: z.number().min(0).optional(),
  serviceChargeRatePercent: z.number().min(0).max(100).optional(),
  chargeEnabled: z.boolean().optional(),
  chargeFixedJPY: z.number().min(0).optional(),
  note: z.string().optional(),
});

const batchReceiptOpSchema = z.object({
  op: z.enum(["create", "update", "cancel"]),
  id: z.string().optional(),
  payload: z.union([createReceiptSchema, updateReceiptSchema]).optional(),
});

// ========================
// サーバーアクション
// ========================

/**
 * 伝票一覧を取得
 */
export async function listReceipts(): Promise<Receipt[]> {
  try {
    const receipts = await mockReceiptStore.list();
    return receipts;
  } catch (error) {
    console.error("Failed to list receipts:", error);
    throw new Error("伝票一覧の取得に失敗しました");
  }
}

/**
 * 伝票を取得
 */
export async function getReceipt(id: string): Promise<Receipt | undefined> {
  try {
    const receipt = await mockReceiptStore.get(id);
    return receipt;
  } catch (error) {
    console.error("Failed to get receipt:", error);
    throw new Error("伝票の取得に失敗しました");
  }
}

/**
 * 伝票を作成
 */
export async function createReceipt(input: CreateReceiptInput): Promise<Receipt> {
  try {
    // バリデーション
    const validated = createReceiptSchema.parse(input);
    
    // 伝票を作成
    const newReceipt = await mockReceiptStore.create(validated);
    
    return newReceipt;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => e.message).join(", ");
      throw new Error(`入力エラー: ${message}`);
    }
    console.error("Failed to create receipt:", error);
    throw new Error("伝票の作成に失敗しました");
  }
}

/**
 * 伝票を更新
 */
export async function updateReceipt(
  id: string,
  input: UpdateReceiptInput
): Promise<Receipt> {
  try {
    // バリデーション
    const validated = updateReceiptSchema.parse(input);
    
    // 伝票を更新
    const updatedReceipt = await mockReceiptStore.update(id, validated);
    
    return updatedReceipt;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => e.message).join(", ");
      throw new Error(`入力エラー: ${message}`);
    }
    console.error("Failed to update receipt:", error);
    throw new Error("伝票の更新に失敗しました");
  }
}

/**
 * 伝票をキャンセル
 */
export async function cancelReceipt(id: string): Promise<Receipt> {
  try {
    const cancelledReceipt = await mockReceiptStore.cancel(id);
    return cancelledReceipt;
  } catch (error) {
    console.error("Failed to cancel receipt:", error);
    throw new Error("伝票のキャンセルに失敗しました");
  }
}

/**
 * 複数の伝票を一括作成
 */
export async function createMultipleReceipts(
  inputs: CreateReceiptInput[]
): Promise<{ receipts: Receipt[], errors: string[] }> {
  const receipts: Receipt[] = [];
  const errors: string[] = [];
  
  for (const input of inputs) {
    try {
      const receipt = await createReceipt(input);
      receipts.push(receipt);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "伝票作成エラー");
    }
  }
  
  return { receipts, errors };
}

/**
 * 伝票のバッチ操作
 */
export async function batchReceipts(
  ops: BatchReceiptOp[]
): Promise<BatchReceiptResult[]> {
  try {
    // 各操作をバリデーション
    const validatedOps = ops.map(op => {
      try {
        return batchReceiptOpSchema.parse(op);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            ...op,
            error: error.errors.map(e => e.message).join(", ")
          };
        }
        throw error;
      }
    });

    // バリデーションエラーがある場合は、エラー結果を返す
    const errorOps = validatedOps.filter(op => 'error' in op);
    if (errorOps.length > 0) {
      return errorOps.map((op: any) => ({
        id: op.id ?? "unknown",
        status: "error" as const,
        message: op.error,
      }));
    }

    // バッチ操作を実行
    const results = await mockReceiptStore.batch(validatedOps as BatchReceiptOp[]);
    
    return results;
  } catch (error) {
    console.error("Failed to batch process receipts:", error);
    throw new Error("伝票のバッチ操作に失敗しました");
  }
}