"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Calendar, ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { 
  getMonthlyAttendance, 
  getStaffList,
  getMonthlyStats,
  calculateWorkMinutes
} from "@/server/actions/staff-attendance";
import type { StaffAttendanceRecord, Staff } from "@/lib/types";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ja } from "date-fns/locale";

interface MonthlyListTabProps {
  currentUser: { id: string; name: string; role: string } | null;
}

export function MonthlyListTab({ currentUser }: MonthlyListTabProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");
  const [monthlyRecords, setMonthlyRecords] = useState<StaffAttendanceRecord[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState<{
    [staffId: string]: {
      totalMinutes: number;
      workDays: number;
    };
  }>({});

  useEffect(() => {
    loadStaffList();
  }, []);

  useEffect(() => {
    if (currentUser && selectedStaffId === "all") {
      setSelectedStaffId(currentUser.role === "Staff" ? currentUser.id : "all");
    }
  }, [currentUser]);

  useEffect(() => {
    loadMonthlyData();
  }, [selectedMonth, selectedStaffId]);

  const loadStaffList = async () => {
    try {
      const staff = await getStaffList();
      setStaffList(staff);
    } catch (error) {
      toast({
        title: "エラー",
        description: "スタッフ一覧の読み込みに失敗しました",
        variant: "destructive",
      });
    }
  };

  const loadMonthlyData = async () => {
    setLoading(true);
    try {
      const monthStr = format(selectedMonth, "yyyy-MM");
      const records = await getMonthlyAttendance(monthStr);
      
      // スタッフでフィルタリング
      const filteredRecords = selectedStaffId === "all" 
        ? records 
        : records.filter(r => r.staffId === selectedStaffId);
      
      setMonthlyRecords(filteredRecords);

      // 統計情報を計算
      const stats: typeof monthlyStats = {};
      const staffIds = selectedStaffId === "all" 
        ? [...new Set(records.map(r => r.staffId))]
        : [selectedStaffId];

      for (const staffId of staffIds) {
        const staffRecords = records.filter(r => r.staffId === staffId);
        let totalMinutes = 0;
        let workDays = 0;

        staffRecords.forEach(record => {
          if (record.checkInAt && record.checkOutAt) {
            totalMinutes += calculateWorkMinutes(record.checkInAt, record.checkOutAt);
            workDays++;
          }
        });

        stats[staffId] = { totalMinutes, workDays };
      }

      setMonthlyStats(stats);
    } catch (error) {
      toast({
        title: "エラー",
        description: "月次データの読み込みに失敗しました",
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

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins}分`;
  };

  const getReasonLabel = (reason?: string) => {
    switch (reason) {
      case "normal": return "通常";
      case "early": return "早出";
      case "late": return "遅刻";
      case "dohan": return "同伴";
      default: return "通常";
    }
  };

  const handlePreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => addMonths(prev, 1));
  };

  // Staffロールの場合は自分のデータのみ表示
  const canViewAllStaff = currentUser?.role !== "Staff";

  return (
    <div className="space-y-6">
      {/* コントロール */}
      <Card>
        <CardHeader>
          <CardTitle>月次勤怠一覧</CardTitle>
          <CardDescription>
            月ごとの勤怠記録を確認します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 月選択 */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[140px] text-center font-medium">
                {format(selectedMonth, "yyyy年MM月", { locale: ja })}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* スタッフ選択 */}
            {canViewAllStaff && (
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="スタッフを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全スタッフ</SelectItem>
                  {staffList.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 月次サマリー */}
      {selectedStaffId !== "all" && monthlyStats[selectedStaffId] && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                総勤務時間
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {formatMinutes(monthlyStats[selectedStaffId].totalMinutes)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                出勤日数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {monthlyStats[selectedStaffId].workDays}日
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                平均勤務時間
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {monthlyStats[selectedStaffId].workDays > 0
                    ? formatMinutes(Math.floor(monthlyStats[selectedStaffId].totalMinutes / monthlyStats[selectedStaffId].workDays))
                    : "0時間0分"
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 勤怠一覧テーブル */}
      <Card>
        <CardHeader>
          <CardTitle>勤怠記録</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日付</TableHead>
                {selectedStaffId === "all" && <TableHead>スタッフ</TableHead>}
                <TableHead>出勤</TableHead>
                <TableHead>退勤</TableHead>
                <TableHead>区分</TableHead>
                <TableHead>勤務時間</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>備考</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={selectedStaffId === "all" ? 8 : 7} className="text-center">
                    読み込み中...
                  </TableCell>
                </TableRow>
              ) : monthlyRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={selectedStaffId === "all" ? 8 : 7} className="text-center text-muted-foreground">
                    該当する勤怠記録がありません
                  </TableCell>
                </TableRow>
              ) : (
                monthlyRecords.map((record) => {
                  const workMinutes = calculateWorkMinutes(record.checkInAt, record.checkOutAt);
                  
                  return (
                    <TableRow key={record.id}>
                      <TableCell>
                        {format(new Date(record.businessDate), "MM/dd（E）", { locale: ja })}
                      </TableCell>
                      {selectedStaffId === "all" && (
                        <TableCell className="font-medium">
                          {getStaffName(record.staffId)}
                        </TableCell>
                      )}
                      <TableCell>
                        {record.checkInAt 
                          ? format(new Date(record.checkInAt), "HH:mm", { locale: ja })
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        {record.checkOutAt 
                          ? format(new Date(record.checkOutAt), "HH:mm", { locale: ja })
                          : record.checkInAt ? <span className="text-yellow-600">未退勤</span> : "-"
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.reason === "late" ? "destructive" : "secondary"}>
                          {getReasonLabel(record.reason)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {workMinutes > 0 ? formatMinutes(workMinutes) : "-"}
                      </TableCell>
                      <TableCell>
                        {record.status === "approved" && (
                          <Badge variant="secondary">承認済</Badge>
                        )}
                        {record.status === "rejected" && (
                          <Badge variant="destructive">却下</Badge>
                        )}
                        {record.status === "closed" && (
                          <Badge>完了</Badge>
                        )}
                        {record.status === "open" && (
                          <Badge className="bg-green-500">出勤中</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {record.note || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* 全スタッフ表示時の合計 */}
          {selectedStaffId === "all" && Object.keys(monthlyStats).length > 0 && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-3">スタッフ別集計</h4>
              <div className="space-y-2">
                {Object.entries(monthlyStats).map(([staffId, stats]) => (
                  <div key={staffId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{getStaffName(staffId)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">勤務: </span>
                      <span className="font-medium">{stats.workDays}日</span>
                      <span className="mx-2">・</span>
                      <span className="text-muted-foreground">合計: </span>
                      <span className="font-medium">{formatMinutes(stats.totalMinutes)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}