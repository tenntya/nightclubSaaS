"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  UserPlus,
  UserMinus,
  Clock,
  Users,
  Calendar,
  Hash,
} from "lucide-react";
import { mockAttendances, getCurrentGuestCount } from "@/lib/mock";
import { fmtDate, fmtTime, fmtDuration } from "@/lib/format";
import { generateAttendanceId } from "@/lib/calc";
import type { Attendance } from "@/lib/types";

export default function AttendancePage() {
  const [attendances, setAttendances] = useState<Attendance[]>(mockAttendances);
  const [checkInData, setCheckInData] = useState({
    guestCount: 1,
    note: "",
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  // 現在の在店客数
  const currentGuestCount = attendances
    .filter((a) => !a.checkedOutAt)
    .reduce((sum, a) => sum + a.guestCount, 0);

  // チェックイン処理
  const handleCheckIn = () => {
    const newAttendance: Attendance = {
      id: generateAttendanceId(),
      checkedInAt: new Date().toISOString(),
      guestCount: checkInData.guestCount,
      note: checkInData.note || undefined,
    };

    setAttendances([newAttendance, ...attendances]);
    setCheckInData({ guestCount: 1, note: "" });
    setDialogOpen(false);
  };

  // チェックアウト処理
  const handleCheckOut = (id: string) => {
    setAttendances(
      attendances.map((a) =>
        a.id === id
          ? { ...a, checkedOutAt: new Date().toISOString() }
          : a
      )
    );
  };

  // 現在在店中の来店リスト
  const activeAttendances = attendances.filter((a) => !a.checkedOutAt);
  const completedAttendances = attendances.filter((a) => a.checkedOutAt);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-brand-accent">来店管理</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand-primary hover:bg-brand-primary-light">
              <UserPlus className="mr-2 h-4 w-4" />
              チェックイン
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規チェックイン</DialogTitle>
              <DialogDescription>
                来店客の情報を入力してください
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="guest-count">来店人数</Label>
                <Input
                  id="guest-count"
                  type="number"
                  min="1"
                  value={checkInData.guestCount}
                  onChange={(e) =>
                    setCheckInData({
                      ...checkInData,
                      guestCount: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="note">備考（任意）</Label>
                <Textarea
                  id="note"
                  placeholder="VIP対応、誕生日など"
                  value={checkInData.note}
                  onChange={(e) =>
                    setCheckInData({
                      ...checkInData,
                      note: e.target.value,
                    })
                  }
                />
              </div>
              <Button
                onClick={handleCheckIn}
                className="w-full bg-brand-primary hover:bg-brand-primary-light"
              >
                チェックイン登録
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Users className="mr-2 h-4 w-4" />
              現在在店数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-accent">
              {currentGuestCount}名
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Hash className="mr-2 h-4 w-4" />
              在店組数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeAttendances.length}組
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              本日来店数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendances.length}組
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              平均滞在時間
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2時間30分</div>
          </CardContent>
        </Card>
      </div>

      {/* 現在在店中リスト */}
      <Card>
        <CardHeader>
          <CardTitle>現在在店中</CardTitle>
        </CardHeader>
        <CardContent>
          {activeAttendances.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              現在在店中のお客様はいません
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>入店時刻</TableHead>
                  <TableHead>滞在時間</TableHead>
                  <TableHead>人数</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAttendances.map((attendance) => (
                  <TableRow key={attendance.id}>
                    <TableCell className="font-mono text-sm">
                      {attendance.id}
                    </TableCell>
                    <TableCell>{fmtTime(attendance.checkedInAt)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {fmtDuration(attendance.checkedInAt)}
                      </Badge>
                    </TableCell>
                    <TableCell>{attendance.guestCount}名</TableCell>
                    <TableCell>
                      {attendance.note && (
                        <Badge variant="outline">{attendance.note}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckOut(attendance.id)}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        退店
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 退店済みリスト */}
      <Card>
        <CardHeader>
          <CardTitle>退店済み（本日）</CardTitle>
        </CardHeader>
        <CardContent>
          {completedAttendances.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              本日の退店済み記録はまだありません
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>入店時刻</TableHead>
                  <TableHead>退店時刻</TableHead>
                  <TableHead>滞在時間</TableHead>
                  <TableHead>人数</TableHead>
                  <TableHead>備考</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedAttendances.map((attendance) => (
                  <TableRow key={attendance.id}>
                    <TableCell className="font-mono text-sm">
                      {attendance.id}
                    </TableCell>
                    <TableCell>{fmtTime(attendance.checkedInAt)}</TableCell>
                    <TableCell>
                      {attendance.checkedOutAt &&
                        fmtTime(attendance.checkedOutAt)}
                    </TableCell>
                    <TableCell>
                      {attendance.checkedOutAt && (
                        <Badge variant="secondary">
                          {fmtDuration(
                            attendance.checkedInAt,
                            attendance.checkedOutAt
                          )}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{attendance.guestCount}名</TableCell>
                    <TableCell>
                      {attendance.note && (
                        <Badge variant="outline">{attendance.note}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}