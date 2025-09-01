"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  Trash2, 
  Calculator, 
  Check, 
  ChevronsUpDown,
  Copy,
  Save,
  X,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { 
  ReceiptItem, 
  PaymentMethod, 
  ItemCategory,
  MenuItem,
} from "@/lib/types";
import { calcReceiptTotals, generateReceiptId } from "@/lib/calc";
import { fmtJPY, fmtItemCategory, fmtDate } from "@/lib/format";
import { createReceipt, createMultipleReceipts, payReceipt } from "@/server/actions/receipts";

interface ReceiptDraft {
  id: string;
  items: ReceiptItem[];
  paymentMethod: PaymentMethod;
  discountJPY: number;
  serviceChargeRatePercent: number;
  chargeEnabled: boolean;
  chargeFixedJPY: number;
  createdAt: string; // 入店時刻（伝票作成時刻）
}

interface MultiReceiptFormProps {
  menuItems: MenuItem[];
  onComplete?: () => void;
}

export function MultiReceiptForm({ menuItems, onComplete }: MultiReceiptFormProps) {
  // 複数の伝票を管理
  const [receipts, setReceipts] = useState<ReceiptDraft[]>([
    {
      id: `draft-${Date.now()}`,
      items: [],
      paymentMethod: "Cash",
      discountJPY: 0,
      serviceChargeRatePercent: 10,
      chargeEnabled: true,
      chargeFixedJPY: 1000,
      createdAt: new Date().toISOString(),
    }
  ]);
  
  // 現在選択中の伝票インデックス
  const [activeReceiptIndex, setActiveReceiptIndex] = useState(0);
  
  // 商品追加フォームの状態
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState("");
  const [newItem, setNewItem] = useState({
    name: "",
    category: "item" as ItemCategory,
    unitPriceTaxInJPY: 0,
    qty: 1,
  });

  // 現在の伝票を取得
  const currentReceipt = receipts[activeReceiptIndex];

  // 新しい伝票を追加
  const addReceipt = () => {
    const newReceipt: ReceiptDraft = {
      id: `draft-${Date.now()}`,
      items: [],
      paymentMethod: "Cash",
      discountJPY: 0,
      serviceChargeRatePercent: 10,
      chargeEnabled: true,
      chargeFixedJPY: 1000,
      createdAt: new Date().toISOString(),
    };
    setReceipts([...receipts, newReceipt]);
    setActiveReceiptIndex(receipts.length);
  };

  // 前の伝票から設定をコピーして新規追加
  const duplicateReceipt = () => {
    const newReceipt: ReceiptDraft = {
      ...currentReceipt,
      id: `draft-${Date.now()}`,
      items: [...currentReceipt.items.map(item => ({...item, id: `item-${Date.now()}-${Math.random()}`}))],
      createdAt: new Date().toISOString(), // 新しい入店時刻を設定
    };
    setReceipts([...receipts, newReceipt]);
    setActiveReceiptIndex(receipts.length);
  };

  // 伝票を削除
  const removeReceipt = (index: number) => {
    if (receipts.length === 1) {
      toast.error("最低1つの伝票が必要です");
      return;
    }
    const newReceipts = receipts.filter((_, i) => i !== index);
    setReceipts(newReceipts);
    if (activeReceiptIndex >= newReceipts.length) {
      setActiveReceiptIndex(newReceipts.length - 1);
    }
  };

  // 伝票の設定を更新
  const updateReceipt = (index: number, updates: Partial<ReceiptDraft>) => {
    const newReceipts = [...receipts];
    newReceipts[index] = { ...newReceipts[index], ...updates };
    setReceipts(newReceipts);
  };

  // メニューから商品を追加
  const addFromMenu = (menuItem: MenuItem) => {
    const item: ReceiptItem = {
      id: `item-${Date.now()}`,
      name: menuItem.name,
      category: menuItem.category as ItemCategory,
      unitPriceTaxInJPY: menuItem.priceTaxInJPY,
      qty: 1,
    };
    updateReceipt(activeReceiptIndex, {
      items: [...currentReceipt.items, item]
    });
    setSelectedMenu("");
    setMenuOpen(false);
    toast.success(`${menuItem.name}を伝票${activeReceiptIndex + 1}に追加しました`);
  };

  // 手動で商品を追加
  const addItem = () => {
    if (newItem.name && newItem.unitPriceTaxInJPY > 0) {
      const item: ReceiptItem = {
        id: `item-${Date.now()}`,
        ...newItem,
      };
      updateReceipt(activeReceiptIndex, {
        items: [...currentReceipt.items, item]
      });
      setNewItem({
        name: "",
        category: "item",
        unitPriceTaxInJPY: 0,
        qty: 1,
      });
    }
  };

  // 商品を削除
  const removeItem = (itemId: string) => {
    updateReceipt(activeReceiptIndex, {
      items: currentReceipt.items.filter(item => item.id !== itemId)
    });
  };

  // 合計計算
  const calculateTotals = (receipt: ReceiptDraft) => {
    return calcReceiptTotals({
      items: receipt.items,
      discountJPY: receipt.discountJPY,
      serviceChargeRatePercent: receipt.serviceChargeRatePercent,
      chargeEnabled: receipt.chargeEnabled,
      chargeFixedJPY: receipt.chargeFixedJPY,
      taxRatePercent: 10,
    });
  };

  // 個別の伝票を保存・会計
  const saveSingleReceipt = async (index: number, andPay: boolean = false) => {
    const receipt = receipts[index];
    
    if (receipt.items.length === 0) {
      toast.error("商品が追加されていません");
      return;
    }

    try {
      const input = {
        items: receipt.items.map(item => ({
          name: item.name,
          category: item.category,
          unitPriceTaxInJPY: item.unitPriceTaxInJPY,
          qty: item.qty,
        })),
        paymentMethod: receipt.paymentMethod,
        discountJPY: receipt.discountJPY,
        serviceChargeRatePercent: receipt.serviceChargeRatePercent,
        chargeEnabled: receipt.chargeEnabled,
        chargeFixedJPY: receipt.chargeFixedJPY,
      };

      const createdReceipt = await createReceipt(input);
      
      if (createdReceipt) {
        toast.success(`伝票 ${index + 1} を作成しました`);
        
        // 会計処理を行う場合
        if (andPay) {
          try {
            await payReceipt(createdReceipt.id);
            toast.success(`伝票 ${index + 1} の会計処理が完了しました`);
            
            // 会計済みの伝票をリセット
            const newReceipts = [...receipts];
            newReceipts[index] = {
              id: `draft-${Date.now()}`,
              items: [],
              paymentMethod: "Cash",
              discountJPY: 0,
              serviceChargeRatePercent: 10,
              chargeEnabled: true,
              chargeFixedJPY: 1000,
              createdAt: new Date().toISOString(),
            };
            setReceipts(newReceipts);
          } catch (error) {
            console.error(`Failed to pay receipt:`, error);
            toast.error("会計処理に失敗しました");
          }
        }
      }
    } catch (error) {
      toast.error(`伝票 ${index + 1} の作成に失敗しました`);
    }
  };

  // すべての伝票を一括保存
  const saveAllReceipts = async (andPay: boolean = false) => {
    const validReceipts = receipts.filter(r => r.items.length > 0);
    
    if (validReceipts.length === 0) {
      toast.error("商品が追加された伝票がありません");
      return;
    }

    try {
      const inputs = validReceipts.map(receipt => ({
        items: receipt.items.map(item => ({
          name: item.name,
          category: item.category,
          unitPriceTaxInJPY: item.unitPriceTaxInJPY,
          qty: item.qty,
        })),
        paymentMethod: receipt.paymentMethod,
        discountJPY: receipt.discountJPY,
        serviceChargeRatePercent: receipt.serviceChargeRatePercent,
        chargeEnabled: receipt.chargeEnabled,
        chargeFixedJPY: receipt.chargeFixedJPY,
      }));

      const { receipts: createdReceipts, errors } = await createMultipleReceipts(inputs);
      
      if (createdReceipts.length > 0) {
        toast.success(`${createdReceipts.length}件の伝票を作成しました`);
        
        // 会計処理を行う場合
        if (andPay) {
          let paidCount = 0;
          for (const receipt of createdReceipts) {
            try {
              await payReceipt(receipt.id);
              paidCount++;
            } catch (error) {
              console.error(`Failed to pay receipt ${receipt.id}:`, error);
            }
          }
          if (paidCount > 0) {
            toast.success(`${paidCount}件の会計処理が完了しました`);
          }
        }
      }
      
      if (errors.length > 0) {
        errors.forEach(error => toast.error(error));
      }
      
      if (createdReceipts.length > 0 && onComplete) {
        onComplete();
      }
      
      // 成功したら伝票をリセット
      if (createdReceipts.length > 0) {
        setReceipts([{
          id: `draft-${Date.now()}`,
          items: [],
          paymentMethod: "Cash",
          discountJPY: 0,
          serviceChargeRatePercent: 10,
          chargeEnabled: true,
          chargeFixedJPY: 1000,
        }]);
        setActiveReceiptIndex(0);
      }
    } catch (error) {
      toast.error("伝票の作成に失敗しました");
    }
  };

  const totals = calculateTotals(currentReceipt);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={addReceipt} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            新規伝票
          </Button>
          <Button onClick={duplicateReceipt} variant="outline" size="sm">
            <Copy className="mr-2 h-4 w-4" />
            複製
          </Button>
        </div>
      </div>

      {/* 伝票タブ */}
      <Tabs value={activeReceiptIndex.toString()} onValueChange={(v) => setActiveReceiptIndex(Number(v))}>
        <TabsList className="w-full justify-start">
          {receipts.map((receipt, index) => (
            <TabsTrigger key={receipt.id} value={index.toString()} className="relative flex-col items-start h-auto py-2">
              <div className="flex items-center">
                伝票 {index + 1}
                {receipt.items.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {receipt.items.length}
                  </Badge>
                )}
                {receipts.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 h-4 w-4 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeReceipt(index);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                入店: {fmtDate(receipt.createdAt)}
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        {receipts.map((receipt, index) => (
          <TabsContent key={receipt.id} value={index.toString()} className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* 左側：商品入力 */}
              <div className="xl:col-span-2 space-y-6">
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
                                <ScrollArea className="h-[200px]">
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
                                </ScrollArea>
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
                        <Label htmlFor={`item-name-${index}`}>商品名</Label>
                        <Input
                          id={`item-name-${index}`}
                          value={newItem.name}
                          onChange={(e) =>
                            setNewItem({ ...newItem, name: e.target.value })
                          }
                          placeholder="例: ボトル"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`item-category-${index}`}>カテゴリー</Label>
                        <Select
                          value={newItem.category}
                          onValueChange={(value: ItemCategory) =>
                            setNewItem({ ...newItem, category: value })
                          }
                        >
                          <SelectTrigger id={`item-category-${index}`}>
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
                        <Label htmlFor={`item-price-${index}`}>単価（税込）</Label>
                        <Input
                          id={`item-price-${index}`}
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
                        <Label htmlFor={`item-qty-${index}`}>数量</Label>
                        <Input
                          id={`item-qty-${index}`}
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

                {/* 商品リスト */}
                <Card>
                  <CardHeader>
                    <CardTitle>商品リスト</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {receipt.items.length === 0 ? (
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
                          {receipt.items.map((item) => (
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
              <div className="xl:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>料金設定</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor={`discount-${index}`}>割引（円）</Label>
                      <Input
                        id={`discount-${index}`}
                        type="number"
                        value={receipt.discountJPY}
                        onChange={(e) => updateReceipt(index, { discountJPY: Number(e.target.value) })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`service-charge-${index}`}>サービス料（%）</Label>
                      <Input
                        id={`service-charge-${index}`}
                        type="number"
                        value={receipt.serviceChargeRatePercent}
                        onChange={(e) => updateReceipt(index, { serviceChargeRatePercent: Number(e.target.value) })}
                        placeholder="10"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`charge-enabled-${index}`}
                        checked={receipt.chargeEnabled}
                        onChange={(e) => updateReceipt(index, { chargeEnabled: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor={`charge-enabled-${index}`}>固定チャージを適用</Label>
                    </div>
                    {receipt.chargeEnabled && (
                      <div>
                        <Label htmlFor={`charge-fixed-${index}`}>固定チャージ（円）</Label>
                        <Input
                          id={`charge-fixed-${index}`}
                          type="number"
                          value={receipt.chargeFixedJPY}
                          onChange={(e) => updateReceipt(index, { chargeFixedJPY: Number(e.target.value) })}
                          placeholder="1000"
                        />
                      </div>
                    )}
                    <div>
                      <Label htmlFor={`payment-${index}`}>決済方法</Label>
                      <Select
                        value={receipt.paymentMethod}
                        onValueChange={(value: PaymentMethod) =>
                          updateReceipt(index, { paymentMethod: value })
                        }
                      >
                        <SelectTrigger id={`payment-${index}`}>
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
                    {receipt.discountJPY > 0 && (
                      <div className="flex justify-between text-red-500">
                        <span>割引</span>
                        <span>-{fmtJPY(receipt.discountJPY)}</span>
                      </div>
                    )}
                    {totals.serviceCharge > 0 && (
                      <div className="flex justify-between">
                        <span>サービス料（{receipt.serviceChargeRatePercent}%）</span>
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

                {/* 個別の会計ボタン */}
                <Button 
                  onClick={() => saveSingleReceipt(index, true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                  disabled={receipt.items.length === 0}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  この伝票を会計
                </Button>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* 全伝票のサマリー */}
      <Card>
        <CardHeader>
          <CardTitle>全伝票サマリー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">伝票数</div>
              <div className="text-2xl font-bold">{receipts.length}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">商品数合計</div>
              <div className="text-2xl font-bold">
                {receipts.reduce((sum, r) => sum + r.items.length, 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">有効な伝票</div>
              <div className="text-2xl font-bold">
                {receipts.filter(r => r.items.length > 0).length}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">合計金額</div>
              <div className="text-2xl font-bold text-brand-accent">
                {fmtJPY(
                  receipts.reduce((sum, r) => {
                    const totals = calculateTotals(r);
                    return sum + totals.total;
                  }, 0)
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}