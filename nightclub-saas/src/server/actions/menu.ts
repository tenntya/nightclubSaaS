"use server";

import { z } from "zod";
import type { MenuItem, MenuCategory } from "@/lib/types";
import { mockMenuStore } from "@/lib/mock";

// ========================
// バリデーションスキーマ
// ========================

const menuCategorySchema = z.enum(["set", "bottle", "nomination", "item", "other"]);

const createMenuItemSchema = z.object({
  name: z.string().min(1, "メニュー名は必須です"),
  category: menuCategorySchema,
  priceTaxInJPY: z.number().min(0, "価格は0以上である必要があります"),
  active: z.boolean().optional(),
});

const updateMenuItemSchema = z.object({
  name: z.string().min(1, "メニュー名は必須です").optional(),
  category: menuCategorySchema.optional(),
  priceTaxInJPY: z.number().min(0, "価格は0以上である必要があります").optional(),
  active: z.boolean().optional(),
});

// ========================
// サーバーアクション
// ========================

/**
 * メニュー一覧を取得
 */
export async function listMenu(): Promise<MenuItem[]> {
  try {
    const items = await mockMenuStore.list();
    return items;
  } catch (error) {
    console.error("Failed to list menu items:", error);
    throw new Error("メニュー一覧の取得に失敗しました");
  }
}

/**
 * メニューアイテムを作成
 */
export async function createMenuItem(
  input: Omit<MenuItem, "id" | "active"> & { active?: boolean }
): Promise<MenuItem> {
  try {
    // バリデーション
    const validated = createMenuItemSchema.parse(input);
    
    // メニューアイテムを作成
    const newItem = await mockMenuStore.create(validated);
    
    return newItem;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => e.message).join(", ");
      throw new Error(`入力エラー: ${message}`);
    }
    console.error("Failed to create menu item:", error);
    throw new Error("メニューアイテムの作成に失敗しました");
  }
}

/**
 * メニューアイテムを更新
 */
export async function updateMenuItem(
  id: string,
  patch: Partial<Omit<MenuItem, "id">>
): Promise<MenuItem> {
  try {
    // バリデーション
    const validated = updateMenuItemSchema.parse(patch);
    
    // メニューアイテムを更新
    const updatedItem = await mockMenuStore.update(id, validated);
    
    return updatedItem;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => e.message).join(", ");
      throw new Error(`入力エラー: ${message}`);
    }
    console.error("Failed to update menu item:", error);
    throw new Error("メニューアイテムの更新に失敗しました");
  }
}

/**
 * メニューアイテムの有効/無効を切り替え
 */
export async function toggleMenuActive(
  id: string,
  active: boolean
): Promise<MenuItem> {
  try {
    const updatedItem = await mockMenuStore.toggle(id, active);
    return updatedItem;
  } catch (error) {
    console.error("Failed to toggle menu item active status:", error);
    throw new Error("メニューアイテムの有効/無効切り替えに失敗しました");
  }
}

/**
 * メニューアイテムを削除
 */
export async function deleteMenuItem(
  id: string
): Promise<{ id: string }> {
  try {
    const result = await mockMenuStore.delete(id);
    return result;
  } catch (error) {
    console.error("Failed to delete menu item:", error);
    if (error instanceof Error && error.message.includes("not found")) {
      throw new Error("メニューが見つかりません");
    }
    throw new Error("メニューアイテムの削除に失敗しました");
  }
}
