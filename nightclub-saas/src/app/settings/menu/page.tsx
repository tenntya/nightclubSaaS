"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { MenuItem, MenuCategory } from "@/lib/types";
import { 
  listMenu, 
  createMenuItem, 
  updateMenuItem, 
  toggleMenuActive 
} from "@/server/actions/menu";

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // フォーム状態
  const [formData, setFormData] = useState({
    name: "",
    category: "item" as MenuCategory,
    priceTaxInJPY: 0,
    active: true,
  });

  // メニュー一覧を取得
  const fetchMenuItems = async () => {
    try {
      const items = await listMenu();
      setMenuItems(items);
    } catch (error) {
      toast.error("メニュー一覧の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  // フォームリセット
  const resetForm = () => {
    setFormData({
      name: "",
      category: "item",
      priceTaxInJPY: 0,
      active: true,
    });
    setEditingItem(null);
  };

  // ダイアログを開く（新規/編集）
  const openDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        priceTaxInJPY: item.priceTaxInJPY,
        active: item.active,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  // ダイアログを閉じる
  const closeDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  // メニュー保存（新規/更新）
  const handleSave = async () => {
    try {
      if (!formData.name) {
        toast.error("メニュー名を入力してください");
        return;
      }
      if (formData.priceTaxInJPY < 0) {
        toast.error("価格は0以上で入力してください");
        return;
      }

      if (editingItem) {
        // 更新
        await updateMenuItem(editingItem.id, formData);
        toast.success("メニューを更新しました");
      } else {
        // 新規作成
        await createMenuItem(formData);
        toast.success("メニューを追加しました");
      }

      await fetchMenuItems();
      closeDialog();
    } catch (error) {
      toast.error(editingItem ? "メニューの更新に失敗しました" : "メニューの追加に失敗しました");
    }
  };

  // 有効/無効の切り替え
  const handleToggleActive = async (item: MenuItem) => {
    try {
      await toggleMenuActive(item.id, !item.active);
      await fetchMenuItems();
      toast.success(
        !item.active ? "メニューを有効にしました" : "メニューを無効にしました"
      );
    } catch (error) {
      toast.error("メニューの状態変更に失敗しました");
    }
  };

  // カテゴリーの表示名
  const getCategoryLabel = (category: MenuCategory): string => {
    const labels: Record<MenuCategory, string> = {
      set: "セット",
      bottle: "ボトル",
      nomination: "指名",
      item: "アイテム",
      other: "その他",
    };
    return labels[category] || category;
  };

  // カテゴリーのバッジカラー
  const getCategoryColor = (category: MenuCategory): string => {
    const colors: Record<MenuCategory, string> = {
      set: "bg-blue-500",
      bottle: "bg-purple-500",
      nomination: "bg-pink-500",
      item: "bg-green-500",
      other: "bg-gray-500",
    };
    return colors[category] || "bg-gray-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">メニュー管理</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => openDialog()}
              className="bg-brand-accent text-brand-accentFg hover:bg-brand-accent/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              メニュー追加
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "メニュー編集" : "新規メニュー追加"}
              </DialogTitle>
              <DialogDescription>
                メニュー情報を入力してください
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">メニュー名</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: シャンパン（モエ）"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">カテゴリー</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => 
                    setFormData({ ...formData, category: value as MenuCategory })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set">セット</SelectItem>
                    <SelectItem value="bottle">ボトル</SelectItem>
                    <SelectItem value="nomination">指名</SelectItem>
                    <SelectItem value="item">アイテム</SelectItem>
                    <SelectItem value="other">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">税込価格（円）</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.priceTaxInJPY}
                  onChange={(e) => 
                    setFormData({ ...formData, priceTaxInJPY: Number(e.target.value) })
                  }
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, active: checked })
                  }
                />
                <Label htmlFor="active">有効にする</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                キャンセル
              </Button>
              <Button 
                type="button" 
                onClick={handleSave}
                className="bg-brand-accent text-brand-accentFg hover:bg-brand-accent/90"
              >
                {editingItem ? "更新" : "追加"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>メニュー一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>カテゴリー</TableHead>
                <TableHead className="text-right">税込価格</TableHead>
                <TableHead className="text-center">状態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menuItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(item.category)}>
                      {getCategoryLabel(item.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    ¥{item.priceTaxInJPY.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={item.active}
                      onCheckedChange={() => handleToggleActive(item)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDialog(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {menuItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    メニューが登録されていません
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}