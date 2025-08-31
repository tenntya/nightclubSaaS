"use client";

import { useState, useEffect } from "react";
import { MultiReceiptForm } from "@/components/receipts/multi-receipt-form";
import { toast } from "sonner";
import type { MenuItem } from "@/lib/types";
import { listMenu } from "@/server/actions/menu";

export default function ReceiptsPage() {
  // メニューアイテム
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // 初期データ取得
  useEffect(() => {
    fetchMenuItems();
  }, []);

  // メニューアイテム取得
  const fetchMenuItems = async () => {
    try {
      const items = await listMenu();
      setMenuItems(items.filter(item => item.active));
    } catch (error) {
      console.error("Failed to fetch menu items:", error);
      toast.error("メニューの取得に失敗しました");
    }
  };

  const handleComplete = () => {
    // 完了後の処理（必要に応じて拡張）
    toast.success("処理が完了しました");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-brand-accent">伝票管理</h1>
      </div>

      {/* 複数伝票作成フォーム（タブなし、直接表示） */}
      <MultiReceiptForm 
        menuItems={menuItems} 
        onComplete={handleComplete}
      />
    </div>
  );
}