"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Edit, 
  Trash2, 
  FileEdit, 
  Trash,
  AlertTriangle 
} from "lucide-react";
import { toast } from "sonner";
import type { MenuItem, MenuCategory } from "@/lib/types";
import { 
  listMenu, 
  createMenuItem, 
  updateMenuItem, 
  toggleMenuActive,
  deleteMenuItem 
} from "@/server/actions/menu";

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("create");
  
  // 登録タブの状態
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // 削除タブの状態
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
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

  // 選択状態の切り替え
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  // 全選択/全解除
  const toggleAllSelection = () => {
    if (selectedItems.size === menuItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(menuItems.map(item => item.id)));
    }
  };

  // 削除確認ダイアログを開く
  const openDeleteDialog = (id?: string) => {
    if (id) {
      // 個別削除
      setDeleteTarget(id);
    } else {
      // 一括削除
      if (selectedItems.size === 0) {
        toast.error("削除するアイテムを選択してください");
        return;
      }
      setDeleteTarget(null);
    }
    setDeleteDialogOpen(true);
  };

  // 削除実行
  const executeDelete = async () => {
    setDeleting(true);
    
    try {
      let targetIds: string[] = [];
      
      if (deleteTarget) {
        // 個別削除
        targetIds = [deleteTarget];
      } else {
        // 一括削除
        targetIds = Array.from(selectedItems);
      }

      let successCount = 0;
      let errorCount = 0;

      for (const id of targetIds) {
        try {
          await deleteMenuItem(id);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Failed to delete item ${id}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount}件のメニューを削除しました`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount}件の削除に失敗しました`);
      }

      await fetchMenuItems();
      setSelectedItems(new Set());
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      toast.error("削除処理中にエラーが発生しました");
    } finally {
      setDeleting(false);
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">
            <FileEdit className="mr-2 h-4 w-4" />
            登録
          </TabsTrigger>
          <TabsTrigger value="delete">
            <Trash className="mr-2 h-4 w-4" />
            削除
          </TabsTrigger>
        </TabsList>

        {/* 登録タブ */}
        <TabsContent value="create" className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>メニュー一覧</CardTitle>
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
        </TabsContent>

        {/* 削除タブ */}
        <TabsContent value="delete" className="space-y-4">
          {/* ツールバー */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedItems.size === menuItems.length && menuItems.length > 0}
                  onCheckedChange={toggleAllSelection}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedItems.size}件選択中
                </span>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => openDeleteDialog()}
                disabled={selectedItems.size === 0 || deleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                選択削除
              </Button>
            </CardContent>
          </Card>

          {/* 削除用テーブル */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>メニュー一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
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
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleSelection(item.id)}
                        />
                      </TableCell>
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
                        <Badge variant={item.active ? "default" : "secondary"}>
                          {item.active ? "有効" : "無効"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(item.id)}
                          disabled={deleting}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {menuItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        メニューが登録されていません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              削除の確認
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? (
                "選択したメニューを削除しますか？"
              ) : (
                `${selectedItems.size}件のメニューを削除しますか？`
              )}
              <br />
              <span className="font-semibold text-red-500">
                この操作は取り消せません。
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "削除中..." : "削除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}