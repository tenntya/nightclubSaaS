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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Download, Calculator } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ReceiptItem, PaymentMethod, ItemCategory } from "@/lib/types";
import { calcReceiptTotals, generateReceiptId } from "@/lib/calc";
import { fmtJPY, fmtDate, fmtPaymentMethod, fmtItemCategory } from "@/lib/format";

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

  // 合計計算
  const totals = calcReceiptTotals({
    items,
    discountJPY: formValues.discountJPY || 0,
    serviceChargeRatePercent: formValues.serviceChargeRatePercent || 10,
    chargeEnabled: formValues.chargeEnabled || false,
    chargeFixedJPY: formValues.chargeFixedJPY || 1000,
    taxRatePercent: 10,
  });

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
  const onSubmit = (data: any) => {
    const receiptId = generateReceiptId();
    const receipt = {
      id: receiptId,
      issuedAt: new Date().toISOString(),
      items,
      ...data,
      totals,
    };
    console.log("伝票作成:", receipt);
    // TODO: Server Action or API呼び出し
    alert(`伝票 ${receiptId} を作成しました`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-brand-accent">伝票管理</h1>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          CSV出力
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：アイテム入力 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>商品追加</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
    </div>
  );
}