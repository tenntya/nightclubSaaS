import { describe, it, expect, beforeEach, vi } from "vitest";
import { 
  listMenu, 
  createMenuItem, 
  updateMenuItem, 
  toggleMenuActive,
  deleteMenuItem 
} from "./actions/menu";
import type { MenuItem } from "@/lib/types";

// モックストアをリセットする関数
const resetMockStore = () => {
  vi.resetModules();
};

describe("Menu Server Actions", () => {
  beforeEach(() => {
    resetMockStore();
  });

  describe("listMenu", () => {
    it("メニュー一覧を取得できる", async () => {
      const items = await listMenu();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      
      // 初期データの検証
      const firstItem = items[0];
      expect(firstItem).toHaveProperty("id");
      expect(firstItem).toHaveProperty("name");
      expect(firstItem).toHaveProperty("category");
      expect(firstItem).toHaveProperty("priceTaxInJPY");
      expect(firstItem).toHaveProperty("active");
    });
  });

  describe("createMenuItem", () => {
    it("正常にメニューアイテムを作成できる", async () => {
      const input = {
        name: "テストアイテム",
        category: "item" as const,
        priceTaxInJPY: 5000,
        active: true,
      };

      const result = await createMenuItem(input);
      
      expect(result.id).toBeDefined();
      expect(result.name).toBe(input.name);
      expect(result.category).toBe(input.category);
      expect(result.priceTaxInJPY).toBe(input.priceTaxInJPY);
      expect(result.active).toBe(true);
    });

    it("activeを指定しない場合はデフォルトでtrueになる", async () => {
      const input = {
        name: "デフォルトアクティブ",
        category: "bottle" as const,
        priceTaxInJPY: 10000,
      };

      const result = await createMenuItem(input);
      expect(result.active).toBe(true);
    });

    it("名前が空の場合エラーになる", async () => {
      const input = {
        name: "",
        category: "item" as const,
        priceTaxInJPY: 5000,
      };

      await expect(createMenuItem(input)).rejects.toThrow("入力エラー");
    });

    it("価格が負の値の場合エラーになる", async () => {
      const input = {
        name: "負の価格",
        category: "item" as const,
        priceTaxInJPY: -1000,
      };

      await expect(createMenuItem(input)).rejects.toThrow("入力エラー");
    });

    it("不正なカテゴリーの場合エラーになる", async () => {
      const input = {
        name: "不正カテゴリー",
        category: "invalid" as any,
        priceTaxInJPY: 5000,
      };

      await expect(createMenuItem(input)).rejects.toThrow("入力エラー");
    });
  });

  describe("updateMenuItem", () => {
    it("正常にメニューアイテムを更新できる", async () => {
      // まず作成
      const created = await createMenuItem({
        name: "更新テスト",
        category: "set" as const,
        priceTaxInJPY: 8000,
      });

      // 更新
      const updated = await updateMenuItem(created.id, {
        name: "更新済み",
        priceTaxInJPY: 9000,
      });

      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe("更新済み");
      expect(updated.priceTaxInJPY).toBe(9000);
      expect(updated.category).toBe("set"); // カテゴリーは変更していない
    });

    it("部分更新ができる", async () => {
      const created = await createMenuItem({
        name: "部分更新テスト",
        category: "nomination" as const,
        priceTaxInJPY: 3000,
      });

      // 名前だけ更新
      const updated = await updateMenuItem(created.id, {
        name: "名前だけ更新",
      });

      expect(updated.name).toBe("名前だけ更新");
      expect(updated.category).toBe("nomination");
      expect(updated.priceTaxInJPY).toBe(3000);
    });

    it("存在しないIDの場合エラーになる", async () => {
      await expect(
        updateMenuItem("INVALID-ID", { name: "更新" })
      ).rejects.toThrow("MenuItem not found");
    });

    it("価格を0に更新できる", async () => {
      const created = await createMenuItem({
        name: "価格ゼロテスト",
        category: "other" as const,
        priceTaxInJPY: 1000,
      });

      const updated = await updateMenuItem(created.id, {
        priceTaxInJPY: 0,
      });

      expect(updated.priceTaxInJPY).toBe(0);
    });
  });

  describe("toggleMenuActive", () => {
    it("アクティブ状態を切り替えできる", async () => {
      const created = await createMenuItem({
        name: "トグルテスト",
        category: "bottle" as const,
        priceTaxInJPY: 15000,
        active: true,
      });

      // 無効化
      const disabled = await toggleMenuActive(created.id, false);
      expect(disabled.active).toBe(false);

      // 有効化
      const enabled = await toggleMenuActive(created.id, true);
      expect(enabled.active).toBe(true);
    });

    it("存在しないIDの場合エラーになる", async () => {
      await expect(
        toggleMenuActive("INVALID-ID", false)
      ).rejects.toThrow("MenuItem not found");
    });
  });

  describe("deleteMenuItem", () => {
    it("正常にメニューアイテムを削除できる", async () => {
      // まず作成
      const created = await createMenuItem({
        name: "削除テスト",
        category: "other" as const,
        priceTaxInJPY: 5000,
      });

      // 削除
      const result = await deleteMenuItem(created.id);
      expect(result.id).toBe(created.id);

      // リストから削除されたことを確認
      const items = await listMenu();
      const deleted = items.find(item => item.id === created.id);
      expect(deleted).toBeUndefined();
    });

    it("存在しないIDの場合エラーになる", async () => {
      await expect(
        deleteMenuItem("INVALID-DELETE-ID")
      ).rejects.toThrow("メニューが見つかりません");
    });

    it("複数のアイテムを個別に削除できる", async () => {
      // 複数作成
      const item1 = await createMenuItem({
        name: "削除アイテム1",
        category: "item" as const,
        priceTaxInJPY: 1000,
      });
      const item2 = await createMenuItem({
        name: "削除アイテム2",
        category: "item" as const,
        priceTaxInJPY: 2000,
      });
      const item3 = await createMenuItem({
        name: "削除アイテム3",
        category: "item" as const,
        priceTaxInJPY: 3000,
      });

      // 2つ削除
      await deleteMenuItem(item1.id);
      await deleteMenuItem(item2.id);

      // item3は残っていることを確認
      const items = await listMenu();
      const remaining = items.find(item => item.id === item3.id);
      expect(remaining).toBeDefined();
      expect(remaining?.name).toBe("削除アイテム3");

      // item1, item2は削除されていることを確認
      expect(items.find(item => item.id === item1.id)).toBeUndefined();
      expect(items.find(item => item.id === item2.id)).toBeUndefined();
    });
  });

  describe("統合テスト", () => {
    it("作成→更新→トグル→リストの一連の操作ができる", async () => {
      // 作成
      const created = await createMenuItem({
        name: "統合テスト",
        category: "set" as const,
        priceTaxInJPY: 12000,
      });

      // 更新
      await updateMenuItem(created.id, {
        name: "統合テスト更新済み",
        priceTaxInJPY: 13000,
      });

      // 無効化
      await toggleMenuActive(created.id, false);

      // リスト取得して確認
      const items = await listMenu();
      const target = items.find(item => item.id === created.id);

      expect(target).toBeDefined();
      expect(target?.name).toBe("統合テスト更新済み");
      expect(target?.priceTaxInJPY).toBe(13000);
      expect(target?.active).toBe(false);
    });

    it("作成→削除→リストの一連の操作ができる", async () => {
      // 初期の件数を記録
      const initialItems = await listMenu();
      const initialCount = initialItems.length;

      // 作成
      const created = await createMenuItem({
        name: "削除統合テスト",
        category: "bottle" as const,
        priceTaxInJPY: 20000,
      });

      // 作成後の件数確認
      const afterCreate = await listMenu();
      expect(afterCreate.length).toBe(initialCount + 1);

      // 削除
      await deleteMenuItem(created.id);

      // 削除後の件数確認
      const afterDelete = await listMenu();
      expect(afterDelete.length).toBe(initialCount);
      expect(afterDelete.find(item => item.id === created.id)).toBeUndefined();
    });
  });
});