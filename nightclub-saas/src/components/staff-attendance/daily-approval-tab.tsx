"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { 
  getTodayAttendance, 
  getRequestList, 
  approveRequest, 
  rejectRequest,
  getStaffList,
  calculateWorkMinutes
} from "@/server/actions/staff-attendance";
import type { StaffAttendanceRecord, AttendanceRequest, Staff } from "@/lib/types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface DailyApprovalTabProps {
  currentUser: { id: string; name: string; role: string } | null;
}

export function DailyApprovalTab({ currentUser }: DailyApprovalTabProps) {
  const [todayRecords, setTodayRecords] = useState<StaffAttendanceRecord[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AttendanceRequest[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [records, requests, staff] = await Promise.all([
        getTodayAttendance(),
        getRequestList("pending"),
        getStaffList(),
      ]);
      setTodayRecords(records);
      setPendingRequests(requests);
      setStaffList(staff);
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

  const getReasonLabel = (reason?: string) => {
    switch (reason) {
      case "normal": return "通常";
      case "early": return "早出";
      case "late": return "遅刻";
      case "dohan": return "同伴";
      default: return "通常";
    }
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins}分`;
  };

  const handleApprove = async () => {
    if (!selectedRequest || !currentUser) return;

    setLoading(true);
    try {
      await approveRequest({
        requestId: selectedRequest.id,
        approverUserId: currentUser.id,
        comment: approvalComment,
      });
      
      toast({
        title: "承認完了",
        description: "申請を承認しました",
      });
      
      setDialogOpen(false);
      setSelectedRequest(null);
      setApprovalComment("");
      await loadData();
    } catch (error) {
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "承認に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !currentUser) return;

    setLoading(true);
    try {
      await rejectRequest({
        requestId: selectedRequest.id,
        approverUserId: currentUser.id,
        comment: approvalComment,
      });
      
      toast({
        title: "差戻し完了",
        description: "申請を差戻しました",
      });
      
      setDialogOpen(false);
      setSelectedRequest(null);
      setApprovalComment("");
      await loadData();
    } catch (error) {
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "差戻しに失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openApprovalDialog = (request: AttendanceRequest, approve: boolean) => {
    setSelectedRequest(request);
    setIsApproving(approve);
    setDialogOpen(true);
  };

  // 権限チェック
  if (currentUser?.role === "Staff") {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="text-center text-muted-foreground">
            この機能は管理者のみ利用可能です
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 申請一覧 */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              承認待ち申請
            </CardTitle>
            <CardDescription>
              {pendingRequests.length}件の申請があります
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{getStaffName(request.staffId)}</p>
                    <p className="text-sm text-muted-foreground">
                      申請日時: {format(new Date(request.createdAt), "MM/dd HH:mm", { locale: ja })}
                    </p>
                    <p className="text-sm">
                      種別: 勤怠修正
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => openApprovalDialog(request, true)}
                    >
                      <CheckCircle className="mr-1 h-4 w-4" />
                      承認
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openApprovalDialog(request, false)}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      差戻し
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 本日の勤怠一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>本日の勤怠一覧</CardTitle>
          <CardDescription>
            {format(new Date(), "yyyy年MM月dd日（E）", { locale: ja })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>スタッフ名</TableHead>
                <TableHead>出勤</TableHead>
                <TableHead>退勤</TableHead>
                <TableHead>区分</TableHead>
                <TableHead>勤務時間</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>備考</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todayRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    本日の勤怠記録はありません
                  </TableCell>
                </TableRow>
              ) : (
                todayRecords.map((record) => {
                  const workMinutes = calculateWorkMinutes(record.checkInAt, record.checkOutAt);
                  const isNoCheckOut = record.checkInAt && !record.checkOutAt;
                  
                  return (
                    <TableRow key={record.id} className={isNoCheckOut ? "bg-yellow-50 dark:bg-yellow-900/10" : ""}>
                      <TableCell className="font-medium">
                        {getStaffName(record.staffId)}
                      </TableCell>
                      <TableCell>
                        {record.checkInAt 
                          ? format(new Date(record.checkInAt), "HH:mm", { locale: ja })
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        {record.checkOutAt 
                          ? format(new Date(record.checkOutAt), "HH:mm", { locale: ja })
                          : isNoCheckOut 
                            ? <span className="text-yellow-600 font-medium">未退勤</span>
                            : "-"
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
                        {record.status === "open" && (
                          <Badge className="bg-green-500">出勤中</Badge>
                        )}
                        {record.status === "closed" && (
                          <Badge>退勤済</Badge>
                        )}
                        {record.status === "approved" && (
                          <Badge variant="secondary">承認済</Badge>
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

          {/* 退勤なしの警告 */}
          {todayRecords.some(r => r.checkInAt && !r.checkOutAt) && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  退勤打刻がないスタッフがいます
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 承認/差戻しダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isApproving ? "申請を承認" : "申請を差戻し"}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest && `${getStaffName(selectedRequest.staffId)}さんの申請`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comment">コメント（任意）</Label>
              <Textarea
                id="comment"
                placeholder={isApproving ? "承認コメント" : "差戻し理由"}
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button
              onClick={isApproving ? handleApprove : handleReject}
              disabled={loading}
              variant={isApproving ? "default" : "destructive"}
            >
              {isApproving ? "承認" : "差戻し"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}