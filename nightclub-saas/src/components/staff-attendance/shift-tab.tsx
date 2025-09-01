"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Calendar, ChevronLeft, ChevronRight, Save, Eye, EyeOff } from "lucide-react";
import { 
  getShiftWishes,
  getShiftPlan,
  submitShiftWish,
  updateShiftPlan,
  getStaffList
} from "@/server/actions/staff-attendance";
import type { StaffShiftWish, StaffShiftPlan, Staff } from "@/lib/types";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay } from "date-fns";
import { ja } from "date-fns/locale";

interface ShiftTabProps {
  currentUser: { id: string; name: string; role: string } | null;
}

export function ShiftTab({ currentUser }: ShiftTabProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [shiftWishes, setShiftWishes] = useState<StaffShiftWish[]>([]);
  const [shiftPlan, setShiftPlan] = useState<StaffShiftPlan | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // 希望シフト入力用
  const [myWishes, setMyWishes] = useState<{ [date: string]: { available: boolean; memo?: string } }>({});
  
  // シフト計画編集用
  const [editingPlan, setEditingPlan] = useState<{ 
    [date: string]: Array<{ staffId: string; start?: string; end?: string; memo?: string }> 
  }>({});

  const monthStr = format(selectedMonth, "yyyy-MM");
  const monthDays = eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth),
  });

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wishes, plan, staff] = await Promise.all([
        getShiftWishes(monthStr),
        getShiftPlan(monthStr),
        getStaffList(),
      ]);
      
      setShiftWishes(wishes);
      setShiftPlan(plan || null);
      setStaffList(staff);

      // 自分の希望シフトを読み込み
      if (currentUser) {
        const myWish = wishes.find(w => w.staffId === currentUser.id);
        if (myWish) {
          const wishMap: typeof myWishes = {};
          myWish.wishes.forEach(w => {
            wishMap[w.date] = { available: w.available, memo: w.memo };
          });
          setMyWishes(wishMap);
        }
      }

      // シフト計画を編集用データに変換
      if (plan) {
        const planMap: typeof editingPlan = {};
        plan.assignments.forEach(a => {
          if (!planMap[a.date]) {
            planMap[a.date] = [];
          }
          planMap[a.date].push({
            staffId: a.staffId,
            start: a.start,
            end: a.end,
            memo: a.memo,
          });
        });
        setEditingPlan(planMap);
      }
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

  const getDayOfWeekClass = (date: Date) => {
    const day = getDay(date);
    if (day === 0) return "text-red-500"; // 日曜日
    if (day === 6) return "text-blue-500"; // 土曜日
    return "";
  };

  const handlePreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => addMonths(prev, 1));
  };

  const handleWishToggle = (date: string) => {
    setMyWishes(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        available: !prev[date]?.available,
      },
    }));
  };

  const handleWishMemoChange = (date: string, memo: string) => {
    setMyWishes(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        available: prev[date]?.available ?? false,
        memo,
      },
    }));
  };

  const handleSubmitWishes = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const wishes = Object.entries(myWishes).map(([date, data]) => ({
        date,
        available: data.available,
        memo: data.memo,
      }));

      await submitShiftWish({
        staffId: currentUser.id,
        month: monthStr,
        wishes,
      });

      toast({
        title: "保存完了",
        description: "希望シフトを保存しました",
      });

      await loadData();
    } catch (error) {
      toast({
        title: "エラー",
        description: "希望シフトの保存に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePublishPlan = async () => {
    setLoading(true);
    try {
      const assignments = Object.entries(editingPlan).flatMap(([date, staffList]) =>
        staffList.map(staff => ({
          date,
          staffId: staff.staffId,
          start: staff.start,
          end: staff.end,
          memo: staff.memo,
        }))
      );

      await updateShiftPlan({
        month: monthStr,
        assignments,
        published: true,
      });

      toast({
        title: "公開完了",
        description: "シフトを公開しました",
      });

      await loadData();
      setEditMode(false);
    } catch (error) {
      toast({
        title: "エラー",
        description: "シフトの公開に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Owner";

  return (
    <div className="space-y-6">
      {/* コントロール */}
      <Card>
        <CardHeader>
          <CardTitle>シフト管理</CardTitle>
          <CardDescription>
            月次シフトの希望提出と計画作成
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
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

            {shiftPlan?.published && (
              <Badge className="bg-green-500">
                <Eye className="mr-1 h-3 w-3" />
                公開済み
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 希望シフト入力（スタッフ用） */}
      {currentUser && (
        <Card>
          <CardHeader>
            <CardTitle>希望シフト入力</CardTitle>
            <CardDescription>
              出勤可能な日にチェックを入れてください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-7 gap-2">
                {["日", "月", "火", "水", "木", "金", "土"].map((day, i) => (
                  <div 
                    key={day} 
                    className={`text-center text-sm font-medium ${
                      i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""
                    }`}
                  >
                    {day}
                  </div>
                ))}
                
                {/* 月初の空白セル */}
                {Array.from({ length: getDay(monthDays[0]) }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                
                {/* 日付セル */}
                {monthDays.map(date => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  const wish = myWishes[dateStr];
                  
                  return (
                    <div 
                      key={dateStr}
                      className="border rounded-lg p-2 space-y-1"
                    >
                      <div className={`text-sm font-medium ${getDayOfWeekClass(date)}`}>
                        {format(date, "d")}
                      </div>
                      <div className="flex justify-center">
                        <Switch
                          checked={wish?.available ?? false}
                          onCheckedChange={() => handleWishToggle(dateStr)}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={handleSubmitWishes}
                disabled={loading}
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                希望シフトを保存
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* シフト計画（管理者用） */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>シフト計画</CardTitle>
            <CardDescription>
              スタッフの希望を確認してシフトを作成します
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 希望シフト一覧 */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">スタッフ希望一覧</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">スタッフ</th>
                      {monthDays.slice(0, 7).map(date => (
                        <th key={format(date, "d")} className="text-center p-1 min-w-[40px]">
                          {format(date, "d")}
                        </th>
                      ))}
                      <th className="text-center p-1">...</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map(staff => {
                      const wish = shiftWishes.find(w => w.staffId === staff.id);
                      return (
                        <tr key={staff.id} className="border-b">
                          <td className="p-2 font-medium">{staff.name}</td>
                          {monthDays.slice(0, 7).map(date => {
                            const dateStr = format(date, "yyyy-MM-dd");
                            const dayWish = wish?.wishes.find(w => w.date === dateStr);
                            return (
                              <td key={dateStr} className="text-center p-1">
                                {dayWish?.available ? (
                                  <Badge variant="outline" className="w-6 h-6 p-0 rounded-full">
                                    ○
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="text-center p-1 text-muted-foreground">...</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* シフト編集/公開ボタン */}
            <div className="flex gap-2">
              {!editMode ? (
                <Button
                  onClick={() => setEditMode(true)}
                  variant="outline"
                  className="flex-1"
                >
                  シフトを編集
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => setEditMode(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handlePublishPlan}
                    disabled={loading}
                    className="flex-1"
                  >
                    {shiftPlan?.published ? (
                      <>
                        <Eye className="mr-2 h-4 w-4" />
                        更新して公開
                      </>
                    ) : (
                      <>
                        <EyeOff className="mr-2 h-4 w-4" />
                        シフトを公開
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 公開シフト表示 */}
      {shiftPlan?.published && (
        <Card>
          <CardHeader>
            <CardTitle>公開シフト</CardTitle>
            <CardDescription>
              {format(selectedMonth, "yyyy年MM月", { locale: ja })}のシフト
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">日付</th>
                    <th className="text-left p-2">スタッフ</th>
                    <th className="text-left p-2">時間</th>
                    <th className="text-left p-2">備考</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftPlan.assignments.map((assignment, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">
                        {format(new Date(assignment.date), "MM/dd（E）", { locale: ja })}
                      </td>
                      <td className="p-2 font-medium">
                        {getStaffName(assignment.staffId)}
                      </td>
                      <td className="p-2">
                        {assignment.start && assignment.end
                          ? `${assignment.start} - ${assignment.end}`
                          : "-"
                        }
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {assignment.memo || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}