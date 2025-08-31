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
import { MultiReceiptForm } from "@/components/receipts/multi-receipt-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Ban,
  Receipt,
  List,
  DollarSign,
  CreditCard,
  CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import type { 
  Receipt,
  PaymentMethod, 
  MenuItem,
  BatchReceiptOp,
} from "@/lib/types";
import { fmtJPY, fmtDate, fmtPaymentMethod } from "@/lib/format";
import { listMenu } from "@/server/actions/menu";
import { 
  listReceipts, 
  batchReceipts,
  payReceipt 
} from "@/server/actions/receipts";

export default function ReceiptsPage() {
  // タブの状態
  const [activeTab, setActiveTab] = useState("create");
  
  // メニューアイテム
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  // 伝票一覧
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set());
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchType, setBatchType] = useState<"cancel" | "discount" | "payment" | "csv">("cancel");
  const [batchValue, setBatchValue] = useState<string | number>("");

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

  // 会計処理
  const handlePayment = async (id: string) => {
    try {
      await payReceipt(id);
      toast.success("会計処理が完了しました");
      await fetchReceipts();
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("会計処理に失敗しました");
      }
    }
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
            伝票作成
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="mr-2 h-4 w-4" />
            一覧
          </TabsTrigger>
        </TabsList>

        {/* 伝票作成タブ（複数伝票作成がデフォルト） */}
        <TabsContent value="create" className="space-y-6">
          <MultiReceiptForm 
            menuItems={menuItems} 
            onComplete={async () => {
              await fetchReceipts();
              setActiveTab("list");
            }}
          />
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
                    <TableHead className="text-center">操作</TableHead>
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
                        ) : receipt.status === "paid" ? (
                          <Badge variant="secondary">会計済</Badge>
                        ) : (
                          <Badge variant="default">有効</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {receipt.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePayment(receipt.id)}
                            className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            会計
                          </Button>
                        )}
                        {receipt.status === "paid" && (
                          <span className="text-sm text-muted-foreground">会計済</span>
                        )}
                        {receipt.status === "cancelled" && (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {receipts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
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