"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { 
  Calculator, 
  ChevronLeft, 
  ChevronRight, 
  DollarSign, 
  FileText, 
  Settings,
  Check,
  CreditCard,
  Edit,
  TrendingUp
} from "lucide-react";
import { 
  calculateAllPayrolls,
  getPayrollByMonth,
  updatePayrollStatus,
  getPayrollSummary,
  getSalaryByStaffId,
  updateSalary,
  getAllSalaries
} from "@/server/actions/payroll";
import { getStaffList } from "@/server/actions/staff-attendance";
import type { PayrollRecord, PayrollSummary, Staff, StaffSalary } from "@/lib/types";
import { format, addMonths, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { fmtJPY } from "@/lib/format";

export default function PayrollPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [salaries, setSalaries] = useState<StaffSalary[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingSalary, setEditingSalary] = useState<{ staffId: string; salary: StaffSalary | null } | null>(null);
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);

  const monthStr = format(selectedMonth, "yyyy-MM");

  useEffect(() => {
    // 仮のユーザー情報
    setCurrentUser({
      id: "staff-005",
      name: "山田 太郎",
      role: "Owner",
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staff, records, summary, allSalaries] = await Promise.all([
        getStaffList(),
        getPayrollByMonth(monthStr),
        getPayrollSummary(monthStr),
        getAllSalaries(),
      ]);
      
      setStaffList(staff);
      setPayrollRecords(records);
      setPayrollSummary(summary);
      setSalaries(allSalaries);
    } catch (error) {
      toast({
        title: "エラー",
        description: "データの読み込みに失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStaffName = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    return staff?.name || staffId;
  };

  const handleCalculatePayroll = async () => {
    setLoading(true);
    try {
      await calculateAllPayrolls(monthStr);
      await loadData();
      toast({
        title: "計算完了",
        description: `${format(selectedMonth, "yyyy年MM月", { locale: ja })}の給与を計算しました`,
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "給与計算に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: "confirmed" | "paid") => {
    try {
      await updatePayrollStatus(id, status);
      await loadData();
      toast({
        title: "更新完了",
        description: status === "confirmed" ? "給与を確定しました" : "支払い済みに変更しました",
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "ステータスの更新に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleEditSalary = (staffId: string) => {
    const salary = salaries.find(s => s.staffId === staffId);
    setEditingSalary({ staffId, salary: salary || null });
    setSalaryDialogOpen(true);
  };

  const handleSaveSalary = async (data: Partial<StaffSalary>) => {
    if (!editingSalary) return;

    setLoading(true);
    try {
      await updateSalary(editingSalary.staffId, data);
      toast({
        title: "保存完了",
        description: "給与設定を更新しました",
      });
      setSalaryDialogOpen(false);
      setEditingSalary(null);
      await loadData();
    } catch (error) {
      toast({
        title: "エラー",
        description: "給与設定の更新に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">下書き</Badge>;
      case "confirmed":
        return <Badge variant="default">確定</Badge>;
      case "paid":
        return <Badge className="bg-green-500">支払済</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins}分`;
  };

  // 権限チェック
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Owner";

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">給与管理</h1>
          <p className="text-muted-foreground mt-2">
            スタッフの給与計算・管理
          </p>
        </div>
        {currentUser && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">ログイン中</p>
            <p className="font-semibold">{currentUser.name}</p>
            <p className="text-sm text-muted-foreground">{currentUser.role}</p>
          </div>
        )}
      </div>

      {/* コントロール */}
      <Card>
        <CardHeader>
          <CardTitle>給与計算期間</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedMonth(prev => subMonths(prev, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[140px] text-center font-medium">
                {format(selectedMonth, "yyyy年MM月", { locale: ja })}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedMonth(prev => addMonths(prev, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {isAdmin && (
              <Button 
                onClick={handleCalculatePayroll}
                disabled={loading}
              >
                <Calculator className="mr-2 h-4 w-4" />
                給与計算実行
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* サマリー */}
      {payrollSummary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                対象スタッフ数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {payrollSummary.totalStaff}名
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                基本給合計
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fmtJPY(payrollSummary.totalBasePayJPY)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                支給総額
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fmtJPY(payrollSummary.totalPayrollJPY)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                手取り総額
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fmtJPY(payrollSummary.totalNetPayJPY)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 給与明細一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>給与明細</CardTitle>
          <CardDescription>
            {format(selectedMonth, "yyyy年MM月", { locale: ja })}の給与明細
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>スタッフ名</TableHead>
                <TableHead>出勤日数</TableHead>
                <TableHead>勤務時間</TableHead>
                <TableHead>基本給</TableHead>
                <TableHead>交通費</TableHead>
                <TableHead>インセンティブ</TableHead>
                <TableHead>支給総額</TableHead>
                <TableHead>手取り額</TableHead>
                <TableHead>状態</TableHead>
                {isAdmin && <TableHead>操作</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 10 : 9} className="text-center text-muted-foreground">
                    給与データがありません
                  </TableCell>
                </TableRow>
              ) : (
                payrollRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {getStaffName(record.staffId)}
                    </TableCell>
                    <TableCell>{record.workDays}日</TableCell>
                    <TableCell>{formatMinutes(record.workMinutes)}</TableCell>
                    <TableCell>{fmtJPY(record.basePayJPY)}</TableCell>
                    <TableCell>{fmtJPY(record.transportationJPY)}</TableCell>
                    <TableCell>
                      {fmtJPY(record.drinkBackJPY + record.receiptBackJPY)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {fmtJPY(record.totalPayJPY)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {fmtJPY(record.netPayJPY)}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-1">
                          {record.status === "draft" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(record.id, "confirmed")}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {record.status === "confirmed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(record.id, "paid")}
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditSalary(record.staffId)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 給与設定ダイアログ */}
      <Dialog open={salaryDialogOpen} onOpenChange={setSalaryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>給与設定</DialogTitle>
            <DialogDescription>
              {editingSalary && getStaffName(editingSalary.staffId)}の給与設定
            </DialogDescription>
          </DialogHeader>
          
          {editingSalary && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hourlyWage">時給（円）</Label>
                <Input
                  id="hourlyWage"
                  type="number"
                  defaultValue={editingSalary.salary?.hourlyWage || 1500}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setEditingSalary(prev => ({
                      ...prev!,
                      salary: { ...prev!.salary!, hourlyWage: value }
                    }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transportation">交通費（日額）</Label>
                <Input
                  id="transportation"
                  type="number"
                  defaultValue={editingSalary.salary?.transportationAllowance || 1000}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setEditingSalary(prev => ({
                      ...prev!,
                      salary: { ...prev!.salary!, transportationAllowance: value }
                    }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="drinkBack">ドリンクバック率（%）</Label>
                <Input
                  id="drinkBack"
                  type="number"
                  defaultValue={editingSalary.salary?.drinkBackRate || 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setEditingSalary(prev => ({
                      ...prev!,
                      salary: { ...prev!.salary!, drinkBackRate: value }
                    }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiptBack">売上バック率（%）</Label>
                <Input
                  id="receiptBack"
                  type="number"
                  defaultValue={editingSalary.salary?.receiptBackRate || 0}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setEditingSalary(prev => ({
                      ...prev!,
                      salary: { ...prev!.salary!, receiptBackRate: value }
                    }));
                  }}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSalaryDialogOpen(false);
                setEditingSalary(null);
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={() => {
                if (editingSalary?.salary) {
                  handleSaveSalary(editingSalary.salary);
                }
              }}
              disabled={loading}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}