"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, CheckSquare, Users } from "lucide-react";
import { PunchTab } from "@/components/staff-attendance/punch-tab";
import { DailyApprovalTab } from "@/components/staff-attendance/daily-approval-tab";
import { MonthlyListTab } from "@/components/staff-attendance/monthly-list-tab";
import { ShiftTab } from "@/components/staff-attendance/shift-tab";

export default function StaffAttendancePage() {
  const [activeTab, setActiveTab] = useState("punch");
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);

  useEffect(() => {
    // 仮のユーザー情報（実際は認証システムから取得）
    setCurrentUser({
      id: "staff-005",
      name: "山田 太郎",
      role: "Owner",
    });
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">勤怠管理（スタッフ）</h1>
          <p className="text-muted-foreground mt-2">
            スタッフの出退勤管理・シフト管理
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

      {/* タブ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="punch" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>打刻</span>
          </TabsTrigger>
          <TabsTrigger 
            value="daily" 
            className="flex items-center gap-2"
            disabled={currentUser?.role === "Staff"}
          >
            <CheckSquare className="h-4 w-4" />
            <span>日次承認</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>月次一覧</span>
          </TabsTrigger>
          <TabsTrigger value="shift" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>シフト</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="punch" className="mt-6">
          <PunchTab currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="daily" className="mt-6">
          <DailyApprovalTab currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="monthly" className="mt-6">
          <MonthlyListTab currentUser={currentUser} />
        </TabsContent>

        <TabsContent value="shift" className="mt-6">
          <ShiftTab currentUser={currentUser} />
        </TabsContent>
      </Tabs>
    </div>
  );
}