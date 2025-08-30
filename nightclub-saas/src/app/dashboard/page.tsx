"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Receipt,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";
import {
  getTodayKPI,
  getMonthlyKPI,
  generateKPIData,
  mockReceipts,
  getCurrentGuestCount,
} from "@/lib/mock";
import { fmtJPY, fmtDate, fmtDateShort, fmtPaymentMethod } from "@/lib/format";
import type { KPIData } from "@/lib/types";

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<"day" | "week" | "month">("day");
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [trendData, setTrendData] = useState<KPIData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // KPIデータの取得
  useEffect(() => {
    setIsLoading(true);
    
    // 期間に応じたデータを取得
    let data: KPIData;
    let trend: KPIData[];
    
    switch (selectedPeriod) {
      case "day":
        data = getTodayKPI();
        trend = generateKPIData(7); // 過去7日分
        break;
      case "week":
        // 週間データ（簡易実装）
        const weekData = generateKPIData(7);
        const weekTotal = weekData.reduce(
          (acc, d) => ({
            sales: acc.sales + d.sales,
            customerCount: acc.customerCount + d.customerCount,
          }),
          { sales: 0, customerCount: 0 }
        );
        data = {
          date: new Date().toISOString(),
          sales: weekTotal.sales,
          customerCount: weekTotal.customerCount,
          avgSpend: Math.round(weekTotal.sales / weekTotal.customerCount),
        };
        trend = generateKPIData(28); // 過去4週間分
        break;
      case "month":
        data = getMonthlyKPI();
        trend = generateKPIData(30); // 過去30日分
        break;
    }
    
    setKpiData(data);
    setTrendData(trend);
    setIsLoading(false);
  }, [selectedPeriod]);

  // 前期比の計算
  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return 100;
    return Math.round(((current - previous) / previous) * 100);
  };

  // 最近の伝票（上位5件）
  const recentReceipts = mockReceipts.slice(0, 5);

  // 現在の在店客数
  const currentGuests = getCurrentGuestCount();

  if (isLoading || !kpiData) {
    return <div>読み込み中...</div>;
  }

  // 前期のデータ（比較用）
  const previousPeriodData = trendData[trendData.length - 2] || kpiData;
  const salesChange = calculateChange(kpiData.sales, previousPeriodData.sales);
  const customerChange = calculateChange(kpiData.customerCount, previousPeriodData.customerCount);
  const avgSpendChange = calculateChange(kpiData.avgSpend, previousPeriodData.avgSpend);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-brand-accent">ダッシュボード</h1>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-brand-accent">
            <Activity className="mr-1 h-3 w-3" />
            リアルタイム
          </Badge>
          <span className="text-sm text-muted-foreground">
            最終更新: {fmtDateShort(new Date().toISOString())}
          </span>
        </div>
      </div>

      {/* 期間選択タブ */}
      <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="day">本日</TabsTrigger>
          <TabsTrigger value="week">今週</TabsTrigger>
          <TabsTrigger value="month">今月</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedPeriod} className="space-y-6">
          {/* KPIカード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 売上 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">売上</CardTitle>
                <DollarSign className="h-4 w-4 text-brand-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmtJPY(kpiData.sales)}</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  {salesChange >= 0 ? (
                    <>
                      <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-green-500">+{salesChange}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                      <span className="text-red-500">{salesChange}%</span>
                    </>
                  )}
                  <span className="ml-1">前期比</span>
                </p>
              </CardContent>
            </Card>

            {/* 客数 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">客数</CardTitle>
                <Users className="h-4 w-4 text-brand-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.customerCount}名</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  {customerChange >= 0 ? (
                    <>
                      <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-green-500">+{customerChange}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                      <span className="text-red-500">{customerChange}%</span>
                    </>
                  )}
                  <span className="ml-1">前期比</span>
                </p>
              </CardContent>
            </Card>

            {/* 客単価 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">客単価</CardTitle>
                <Receipt className="h-4 w-4 text-brand-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{fmtJPY(kpiData.avgSpend)}</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  {avgSpendChange >= 0 ? (
                    <>
                      <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-green-500">+{avgSpendChange}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                      <span className="text-red-500">{avgSpendChange}%</span>
                    </>
                  )}
                  <span className="ml-1">前期比</span>
                </p>
              </CardContent>
            </Card>

            {/* 現在在店数 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">現在在店数</CardTitle>
                <Activity className="h-4 w-4 text-brand-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentGuests}名</div>
                <p className="text-xs text-muted-foreground mt-1">
                  リアルタイム
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 売上推移グラフ（簡易版） */}
          <Card>
            <CardHeader>
              <CardTitle>売上推移</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-end space-x-2">
                {trendData.slice(-7).map((data, index) => {
                  const height = (data.sales / Math.max(...trendData.map(d => d.sales))) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-brand-accent rounded-t"
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-xs text-muted-foreground mt-2">
                        {new Date(data.date).getDate()}日
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 最近の伝票 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>最近の伝票</CardTitle>
              <Button variant="ghost" size="sm">
                すべて表示
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>伝票ID</TableHead>
                    <TableHead>時刻</TableHead>
                    <TableHead>決済方法</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                    <TableHead>ステータス</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentReceipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell className="font-mono text-sm">
                        {receipt.id}
                      </TableCell>
                      <TableCell>{fmtDateShort(receipt.issuedAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {fmtPaymentMethod(receipt.paymentMethod)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {fmtJPY(receipt.totals.total)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={receipt.status === "active" ? "default" : "secondary"}
                        >
                          {receipt.status === "active" ? "有効" : "取消"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}