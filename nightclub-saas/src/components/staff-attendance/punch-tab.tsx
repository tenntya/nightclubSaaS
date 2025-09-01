"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Clock, LogIn, LogOut, User } from "lucide-react";
import { checkIn, checkOut, getTodayAttendance, getStaffByToken } from "@/server/actions/staff-attendance";
import type { Staff, StaffAttendanceRecord } from "@/lib/types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface PunchTabProps {
  currentUser: { id: string; name: string; role: string } | null;
}

export function PunchTab({ currentUser }: PunchTabProps) {
  const [token, setToken] = useState("");
  const [reason, setReason] = useState<"normal" | "early" | "late" | "dohan">("normal");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [todayRecord, setTodayRecord] = useState<StaffAttendanceRecord | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<StaffAttendanceRecord[]>([]);

  useEffect(() => {
    loadTodayAttendance();
  }, []);

  const loadTodayAttendance = async () => {
    try {
      const records = await getTodayAttendance();
      setTodayAttendance(records);
      
      // 現在のユーザーの本日の記録を探す
      if (currentUser) {
        const userRecord = records.find(r => r.staffId === currentUser.id);
        if (userRecord) {
          setTodayRecord(userRecord);
        }
      }
    } catch (error) {
      console.error("Failed to load today's attendance:", error);
    }
  };

  const handleTokenSubmit = async () => {
    if (!token) {
      toast({
        title: "エラー",
        description: "トークンを入力してください",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const staff = await getStaffByToken(token);
      if (!staff) {
        throw new Error("無効なトークンです");
      }
      
      setCurrentStaff(staff);
      
      // このスタッフの本日の記録を探す
      const staffRecord = todayAttendance.find(r => r.staffId === staff.id);
      setTodayRecord(staffRecord || null);
      
      toast({
        title: "認証成功",
        description: `${staff.name}さん、こんにちは`,
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "トークン認証に失敗しました",
        variant: "destructive",
      });
      setCurrentStaff(null);
      setTodayRecord(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!token) {
      toast({
        title: "エラー",
        description: "トークンを入力してください",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const record = await checkIn({ token, reason, note });
      setTodayRecord(record);
      await loadTodayAttendance();
      
      toast({
        title: "出勤打刻完了",
        description: `${format(new Date(record.checkInAt!), "HH:mm", { locale: ja })}に出勤しました`,
      });
      
      // フォームをリセット
      setNote("");
      setReason("normal");
    } catch (error) {
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "出勤打刻に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!token) {
      toast({
        title: "エラー",
        description: "トークンを入力してください",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const record = await checkOut({ token, note });
      setTodayRecord(record);
      await loadTodayAttendance();
      
      toast({
        title: "退勤打刻完了",
        description: `${format(new Date(record.checkOutAt!), "HH:mm", { locale: ja })}に退勤しました`,
      });
      
      // フォームをリセット
      setNote("");
    } catch (error) {
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "退勤打刻に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!todayRecord) {
      return <Badge variant="secondary">未出勤</Badge>;
    }
    if (todayRecord.checkInAt && !todayRecord.checkOutAt) {
      return <Badge className="bg-green-500">出勤中</Badge>;
    }
    if (todayRecord.checkInAt && todayRecord.checkOutAt) {
      return <Badge variant="default">退勤済</Badge>;
    }
    return <Badge variant="secondary">未出勤</Badge>;
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "normal": return "通常";
      case "early": return "早出";
      case "late": return "遅刻";
      case "dohan": return "同伴";
      default: return reason;
    }
  };

  return (
    <div className="grid gap-6">
      {/* 打刻カード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            打刻
          </CardTitle>
          <CardDescription>
            トークンを入力して出退勤を記録します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* トークン入力 */}
          <div className="space-y-2">
            <Label htmlFor="token">打刻トークン</Label>
            <div className="flex gap-2">
              <Input
                id="token"
                type="text"
                placeholder="例: TK001"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={loading}
              />
              <Button 
                onClick={handleTokenSubmit} 
                disabled={loading || !token}
                variant="outline"
              >
                認証
              </Button>
            </div>
          </div>

          {/* スタッフ情報と状態表示 */}
          {currentStaff && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-semibold">{currentStaff.name}</span>
                </div>
                {getStatusBadge()}
              </div>
              
              {todayRecord && (
                <div className="text-sm space-y-1">
                  {todayRecord.checkInAt && (
                    <p>
                      出勤: {format(new Date(todayRecord.checkInAt), "HH:mm", { locale: ja })}
                      {todayRecord.reason && todayRecord.reason !== "normal" && (
                        <span className="ml-2 text-muted-foreground">
                          ({getReasonLabel(todayRecord.reason)})
                        </span>
                      )}
                    </p>
                  )}
                  {todayRecord.checkOutAt && (
                    <p>退勤: {format(new Date(todayRecord.checkOutAt), "HH:mm", { locale: ja })}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 出勤時の理由選択 */}
          {currentStaff && (!todayRecord || !todayRecord.checkInAt) && (
            <div className="space-y-2">
              <Label htmlFor="reason">区分</Label>
              <Select value={reason} onValueChange={(value: any) => setReason(value)}>
                <SelectTrigger id="reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">通常</SelectItem>
                  <SelectItem value="early">早出</SelectItem>
                  <SelectItem value="late">遅刻</SelectItem>
                  <SelectItem value="dohan">同伴</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 備考 */}
          {currentStaff && (
            <div className="space-y-2">
              <Label htmlFor="note">備考（任意）</Label>
              <Textarea
                id="note"
                placeholder="特記事項があれば入力してください"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* 打刻ボタン */}
          {currentStaff && (
            <div className="flex gap-2">
              {!todayRecord || !todayRecord.checkInAt ? (
                <Button 
                  onClick={handleCheckIn}
                  disabled={loading}
                  className="flex-1"
                  size="lg"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  出勤
                </Button>
              ) : !todayRecord.checkOutAt ? (
                <Button 
                  onClick={handleCheckOut}
                  disabled={loading}
                  className="flex-1"
                  size="lg"
                  variant="outline"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  退勤
                </Button>
              ) : (
                <div className="flex-1 text-center text-muted-foreground py-3">
                  本日の打刻は完了しています
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 本日の出勤状況 */}
      {currentUser?.role !== "Staff" && (
        <Card>
          <CardHeader>
            <CardTitle>本日の出勤状況</CardTitle>
            <CardDescription>
              {format(new Date(), "yyyy年MM月dd日（E）", { locale: ja })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayAttendance.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  本日の出勤記録はありません
                </p>
              ) : (
                todayAttendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{record.staffId}</p>
                      <div className="text-sm text-muted-foreground">
                        {record.checkInAt && (
                          <span>
                            出勤: {format(new Date(record.checkInAt), "HH:mm", { locale: ja })}
                          </span>
                        )}
                        {record.checkOutAt && (
                          <span className="ml-3">
                            退勤: {format(new Date(record.checkOutAt), "HH:mm", { locale: ja })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      {record.checkInAt && !record.checkOutAt ? (
                        <Badge className="bg-green-500">出勤中</Badge>
                      ) : record.checkInAt && record.checkOutAt ? (
                        <Badge variant="default">退勤済</Badge>
                      ) : (
                        <Badge variant="secondary">未出勤</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}