"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Trash2, 
  Download, 
  Calculator, 
  Check, 
  ChevronsUpDown,
  Ban,
  Receipt,
  List,
  DollarSign,
  CreditCard
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { 
  Receipt,
  ReceiptItem, 
  PaymentMethod, 
  ItemCategory,
  MenuItem,
  BatchReceiptOp,
  BatchReceiptResult 
} from "@/lib/types";
import { calcReceiptTotals, generateReceiptId } from "@/lib/calc";
import { fmtJPY, fmtDate, fmtPaymentMethod, fmtItemCategory } from "@/lib/format";
import { listMenu } from "@/server/actions/menu";
import { 
  listReceipts, 
  createReceipt, 
  batchReceipts 
} from "@/server/actions/receipts";

// フォームのスキーマ
const receiptItemSchema = z.object({
  name: z.string().min(1, "商品名は必須です"),
  category: z.enum(["item", "set", "nomination", "bottle", "other"]),
  unitPriceTaxInJPY: z.number().min(0, "金額は0以上である必要があります"),
  qty: z.number().min(1, "数量は1以上である必要があります"),
});

const receiptSchema = z.object({
  paymentMethod: z.enum(["Cash", "Card", "QR", "Other"]),
  discountJPY: z.number().min(0).default(0),
  serviceChargeRatePercent: z.number().min(0).max(100).default(10),
  chargeEnabled: z.boolean().default(true),
  chargeFixedJPY: z.number().min(0).default(1000),
});

export default function ReceiptsPage() {
  // タブの状態
  const [activeTab, setActiveTab] = useState("create");
  
  // メニューアイテム
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState("");
  
  // 伝票一覧
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set());
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchType, setBatchType] = useState<"cancel" | "discount" | "payment" | "csv">("cancel");
  const [batchValue, setBatchValue] = useState<string | number>("");
  
  // 伝票アイテムの状態管理
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [newItem, setNewItem] = useState({
    name: "",
    category: "item" as ItemCategory,
    unitPriceTaxInJPY: 0,
    qty: 1,
  });

  // フォーム管理
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      paymentMethod: "Cash" as PaymentMethod,
      discountJPY: 0,
      serviceChargeRatePercent: 10,
      chargeEnabled: true,
      chargeFixedJPY: 1000,
    },
  });

  // フォームの値を監視
  const formValues = watch();

  // 初期データ取得
  useEffect(() => {
    fetchMenuItems();
    fetchReceipts();
  }, []);

  // メニューアイテム取得
  const fetchMenuItems = async () => {
    try {
      const items = await listMenu();
      setMenuItems(items.filter(item => item.active));
    } catch (error) {
      console.error("Failed to fetch menu items:", error);
    }
  };

  // 伝票一覧取得
  const fetchReceipts = async () => {
    try {
      const receiptList = await listReceipts();
      setReceipts(receiptList);
    } catch (error) {
      toast.error("伝票一覧の取得に失敗しました");
    }
  };

  // 合計計算
  const totals = calcReceiptTotals({
    items,
    discountJPY: formValues.discountJPY || 0,
    serviceChargeRatePercent: formValues.serviceChargeRatePercent || 10,
    chargeEnabled: formValues.chargeEnabled || false,
    chargeFixedJPY: formValues.chargeFixedJPY || 1000,
    taxRatePercent: 10,
  });

  // メニューから追加
  const addFromMenu = (menuItem: MenuItem) => {
    const item: ReceiptItem = {
      id: `item-${Date.now()}`,
      name: menuItem.name,
      category: menuItem.category as ItemCategory,
      unitPriceTaxInJPY: menuItem.priceTaxInJPY,
      qty: 1,
    };
    setItems([...items, item]);
    setSelectedMenu("");
    setMenuOpen(false);
    toast.success(`${menuItem.name}を追加しました`);
  };

  // アイテム追加
  const addItem = () => {
    if (newItem.name && newItem.unitPriceTaxInJPY > 0) {
      const item: ReceiptItem = {
        id: `item-${Date.now()}`,
        ...newItem,
      };
      setItems([...items, item]);
      setNewItem({
        name: "",
        category: "item",
        unitPriceTaxInJPY: 0,
        qty: 1,
      });
    }
  };

  // アイテム削除
  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // 伝票作成
  const onSubmit = async (data: any) => {
    try {
      const receipt = await createReceipt({
        items: items.map(item => ({
          name: item.name,
          category: item.category,
          unitPriceTaxInJPY: item.unitPriceTaxInJPY,
          qty: item.qty,
        })),
        paymentMethod: data.paymentMethod,
        discountJPY: data.discountJPY,
        serviceChargeRatePercent: data.serviceChargeRatePercent,
        chargeEnabled: data.chargeEnabled,
        chargeFixedJPY: data.chargeFixedJPY,
      });
      
      toast.success(`伝票 ${receipt.id} を作成しました`);
      setItems([]);
      await fetchReceipts();
      setActiveTab("list");
    } catch (error) {
      toast.error("伝票の作成に失敗しました");
    }
  };

  // 選択状態の切り替え
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedReceipts);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedReceipts(newSelection);
  };

  // 全選択/全解除
  const toggleAllSelection = () => {
    if (selectedReceipts.size === receipts.filter(r => r.status === "active").length) {
      setSelectedReceipts(new Set());
    } else {
      setSelectedReceipts(new Set(receipts.filter(r => r.status === "active").map(r => r.id)));
    }
  };

  // バッチ操作ダイアログを開く
  const openBatchDialog = (type: typeof batchType) => {
    setBatchType(type);
    setBatchValue("");
    setBatchDialogOpen(true);
  };

  // バッチ操作実行
  const executeBatch = async () => {
    if (selectedReceipts.size === 0) {
      toast.error("伝票を選択してください");
      return;
    }

    const ops: BatchReceiptOp[] = [];

    switch (batchType) {
      case "cancel":
        selectedReceipts.forEach(id => {
          ops.push({ op: "cancel", id });
        });
        break;
      case "discount":
        selectedReceipts.forEach(id => {
          ops.push({
            op: "update",
            id,
            payload: { discountJPY: Number(batchValue) },
          });
        });
        break;
      case "payment":
        selectedReceipts.forEach(id => {
          ops.push({
            op: "update",
            id,
            payload: { paymentMethod: batchValue as PaymentMethod },
          });
        });
        break;
      case "csv":
        // CSV出力処理
        const selectedReceiptData = receipts.filter(r => selectedReceipts.has(r.id));
        downloadCSV(selectedReceiptData);
        setBatchDialogOpen(false);
        return;
    }

    try {
      const results = await batchReceipts(ops);
      const successCount = results.filter(r => r.status === "ok").length;
      const errorCount = results.filter(r => r.status === "error").length;
      
      if (successCount > 0) {
        toast.success(`${successCount}件の伝票を処理しました`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount}件の処理に失敗しました`);
      }
      
      await fetchReceipts();
      setSelectedReceipts(new Set());
      setBatchDialogOpen(false);
    } catch (error) {
      toast.error("バッチ処理に失敗しました");
    }
  };

  // CSV出力
  const downloadCSV = (receiptList: Receipt[]) => {
    const headers = ["日付", "伝票ID", "商品", "数量", "単価", "小計", "割引", "サービス料", "チャージ", "内税", "合計", "決済方法"];
    const rows = receiptList.flatMap(receipt => 
      receipt.items.map(item => [
        fmtDate(receipt.issuedAt),
        receipt.id,
        item.name,
        item.qty,
        item.unitPriceTaxInJPY,
        item.unitPriceTaxInJPY * item.qty,
        receipt.discountJPY,
        receipt.totals.serviceCharge,
        receipt.totals.chargeFixed,
        receipt.totals.taxIncluded,
        receipt.totals.total,
        receipt.paymentMethod,
      ])
    );
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `receipts_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    
    toast.success("CSVファイルをダウンロードしました");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-brand-accent">伝票管理</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">
            <Receipt className="mr-2 h-4 w-4" />
            新規作成
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="mr-2 h-4 w-4" />
            一覧
          </TabsTrigger>
        </TabsList>

        {/* 新規作成タブ */}
        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左側：アイテム入力 */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>商品追加</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* メニューから追加 */}
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <Label>メニューから追加</Label>
                      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={menuOpen}
                            className="w-full justify-between"
                          >
                            {selectedMenu
                              ? menuItems.find((item) => item.id === selectedMenu)?.name
                              : "メニューを選択..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="メニューを検索..." />
                            <CommandEmpty>メニューが見つかりません</CommandEmpty>
                            <CommandGroup>
                              {menuItems.map((item) => (
                                <CommandItem
                                  key={item.id}
                                  value={item.id}
                                  onSelect={(currentValue) => {
                                    setSelectedMenu(currentValue === selectedMenu ? "" : currentValue);
                                    if (currentValue !== selectedMenu) {
                                      addFromMenu(item);
                                    }
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedMenu === item.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="flex-1">{item.name}</span>
                                  <span className="text-muted-foreground">
                                    {fmtJPY(item.priceTaxInJPY)}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <Separator />

                  {/* 手動入力 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="item-name">商品名</Label>
                      <Input
                        id="item-name"
                        value={newItem.name}
                        onChange={(e) =>
                          setNewItem({ ...newItem, name: e.target.value })
                        }
                        placeholder="例: ボトル"
                      />
                    </div>
                    <div>
                      <Label htmlFor="item-category">カテゴリー</Label>
                      <Select
                        value={newItem.category}
                        onValueChange={(value: ItemCategory) =>
                          setNewItem({ ...newItem, category: value })
                        }
                      >
                        <SelectTrigger id="item-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="item">商品</SelectItem>
                          <SelectItem value="set">セット</SelectItem>
                          <SelectItem value="nomination">指名</SelectItem>
                          <SelectItem value="bottle">ボトル</SelectItem>
                          <SelectItem value="other">その他</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="item-price">単価（税込）</Label>
                      <Input
                        id="item-price"
                        type="number"
                        value={newItem.unitPriceTaxInJPY}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            unitPriceTaxInJPY: Number(e.target.value),
                          })
                        }
                        placeholder="3000"
                      />
                    </div>
                    <div>
                      <Label htmlFor="item-qty">数量</Label>
                      <Input
                        id="item-qty"
                        type="number"
                        value={newItem.qty}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            qty: Number(e.target.value),
                          })
                        }
                        min="1"
                      />
                    </div>
                  </div>
                  <Button onClick={addItem} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    商品を追加
                  </Button>
                </CardContent>
              </Card>

              {/* アイテムリスト */}
              <Card>
                <CardHeader>
                  <CardTitle>商品リスト</CardTitle>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      商品がまだ追加されていません
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>商品名</TableHead>
                          <TableHead>カテゴリー</TableHead>
                          <TableHead className="text-right">単価</TableHead>
                          <TableHead className="text-right">数量</TableHead>
                          <TableHead className="text-right">小計</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {fmtItemCategory(item.category)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {fmtJPY(item.unitPriceTaxInJPY)}
                            </TableCell>
                            <TableCell className="text-right">{item.qty}</TableCell>
                            <TableCell className="text-right">
                              {fmtJPY(item.unitPriceTaxInJPY * item.qty)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 右側：料金設定と合計 */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>料金設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="discount">割引（円）</Label>
                    <Input
                      id="discount"
                      type="number"
                      {...register("discountJPY", { valueAsNumber: true })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="service-charge">サービス料（%）</Label>
                    <Input
                      id="service-charge"
                      type="number"
                      {...register("serviceChargeRatePercent", {
                        valueAsNumber: true,
                      })}
                      placeholder="10"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="charge-enabled"
                      {...register("chargeEnabled")}
                      className="rounded"
                    />
                    <Label htmlFor="charge-enabled">固定チャージを適用</Label>
                  </div>
                  {formValues.chargeEnabled && (
                    <div>
                      <Label htmlFor="charge-fixed">固定チャージ（円）</Label>
                      <Input
                        id="charge-fixed"
                        type="number"
                        {...register("chargeFixedJPY", { valueAsNumber: true })}
                        placeholder="1000"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="payment">決済方法</Label>
                    <Select
                      value={formValues.paymentMethod}
                      onValueChange={(value: PaymentMethod) =>
                        setValue("paymentMethod", value)
                      }
                    >
                      <SelectTrigger id="payment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">現金</SelectItem>
                        <SelectItem value="Card">カード</SelectItem>
                        <SelectItem value="QR">QRコード</SelectItem>
                        <SelectItem value="Other">その他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* 合計計算 */}
              <Card className="border-brand-accent">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="mr-2 h-5 w-5" />
                    合計計算
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>小計</span>
                    <span className="font-semibold">{fmtJPY(totals.subtotal)}</span>
                  </div>
                  {formValues.discountJPY > 0 && (
                    <div className="flex justify-between text-red-500">
                      <span>割引</span>
                      <span>-{fmtJPY(formValues.discountJPY)}</span>
                    </div>
                  )}
                  {totals.serviceCharge > 0 && (
                    <div className="flex justify-between">
                      <span>サービス料（{formValues.serviceChargeRatePercent}%）</span>
                      <span>{fmtJPY(totals.serviceCharge)}</span>
                    </div>
                  )}
                  {totals.chargeFixed > 0 && (
                    <div className="flex justify-between">
                      <span>チャージ</span>
                      <span>{fmtJPY(totals.chargeFixed)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-xl font-bold text-brand-accent">
                    <span>合計（税込）</span>
                    <span>{fmtJPY(totals.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>内消費税（10%）</span>
                    <span>{fmtJPY(totals.taxIncluded)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* 伝票作成ボタン */}
              <Button
                onClick={handleSubmit(onSubmit)}
                className="w-full bg-brand-primary hover:bg-brand-primary-light"
                size="lg"
                disabled={items.length === 0}
              >
                伝票を作成
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* 一覧タブ */}
        <TabsContent value="list" className="space-y-6">
          {/* ツールバー */}
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedReceipts.size === receipts.filter(r => r.status === "active").length && receipts.length > 0}
                  onCheckedChange={toggleAllSelection}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedReceipts.size}件選択中
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openBatchDialog("cancel")}
                  disabled={selectedReceipts.size === 0}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  一括キャンセル
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openBatchDialog("discount")}
                  disabled={selectedReceipts.size === 0}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  一括割引
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openBatchDialog("payment")}
                  disabled={selectedReceipts.size === 0}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  一括決済変更
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openBatchDialog("csv")}
                  disabled={selectedReceipts.size === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  選択CSV出力
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 伝票一覧テーブル */}
          <Card>
            <CardHeader>
              <CardTitle>伝票一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>伝票ID</TableHead>
                    <TableHead>日時</TableHead>
                    <TableHead>商品数</TableHead>
                    <TableHead className="text-right">合計</TableHead>
                    <TableHead>決済方法</TableHead>
                    <TableHead>状態</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell>
                        {receipt.status === "active" && (
                          <Checkbox
                            checked={selectedReceipts.has(receipt.id)}
                            onCheckedChange={() => toggleSelection(receipt.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{receipt.id}</TableCell>
                      <TableCell>{fmtDate(receipt.issuedAt)}</TableCell>
                      <TableCell>{receipt.items.length}品</TableCell>
                      <TableCell className="text-right font-semibold">
                        {fmtJPY(receipt.totals.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {fmtPaymentMethod(receipt.paymentMethod)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {receipt.status === "cancelled" ? (
                          <Badge variant="destructive">キャンセル済</Badge>
                        ) : (
                          <Badge variant="default">有効</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {receipts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        伝票がありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* バッチ操作ダイアログ */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {batchType === "cancel" && "一括キャンセル"}
              {batchType === "discount" && "一括割引"}
              {batchType === "payment" && "一括決済変更"}
              {batchType === "csv" && "CSV出力"}
            </DialogTitle>
            <DialogDescription>
              選択した{selectedReceipts.size}件の伝票に対して操作を実行します。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {batchType === "cancel" && (
              <p>選択した伝票をキャンセルしますか？この操作は取り消せません。</p>
            )}
            {batchType === "discount" && (
              <div>
                <Label htmlFor="batch-discount">割引額（円）</Label>
                <Input
                  id="batch-discount"
                  type="number"
                  value={batchValue}
                  onChange={(e) => setBatchValue(e.target.value)}
                  placeholder="1000"
                  min="0"
                />
              </div>
            )}
            {batchType === "payment" && (
              <div>
                <Label htmlFor="batch-payment">決済方法</Label>
                <Select
                  value={batchValue as string}
                  onValueChange={setBatchValue}
                >
                  <SelectTrigger id="batch-payment">
                    <SelectValue placeholder="決済方法を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">現金</SelectItem>
                    <SelectItem value="Card">カード</SelectItem>
                    <SelectItem value="QR">QRコード</SelectItem>
                    <SelectItem value="Other">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {batchType === "csv" && (
              <p>選択した伝票をCSVファイルとしてダウンロードします。</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={executeBatch}>
              実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}