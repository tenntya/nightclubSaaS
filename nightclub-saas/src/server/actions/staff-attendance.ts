"use server";

import {
  mockStaffStore,
  mockStaffAttendanceStore,
  mockShiftStore,
} from "@/lib/mock";
import type {
  Staff,
  StaffAttendanceRecord,
  AttendanceRequest,
  StaffShiftWish,
  StaffShiftPlan,
} from "@/lib/types";

// スタッフ関連
export async function getStaffList(): Promise<Staff[]> {
  return mockStaffStore.list();
}

export async function getStaffByToken(token: string): Promise<Staff | undefined> {
  return mockStaffStore.getByToken(token);
}

export async function getStaffById(id: string): Promise<Staff | undefined> {
  return mockStaffStore.getById(id);
}

// 打刻関連
export async function checkIn(params: {
  token: string;
  reason?: "normal" | "early" | "late" | "dohan";
  note?: string;
}): Promise<StaffAttendanceRecord> {
  return mockStaffAttendanceStore.checkIn(params);
}

export async function checkOut(params: {
  token: string;
  note?: string;
}): Promise<StaffAttendanceRecord> {
  return mockStaffAttendanceStore.checkOut(params);
}

// 勤怠一覧関連
export async function getTodayAttendance(): Promise<StaffAttendanceRecord[]> {
  return mockStaffAttendanceStore.listToday();
}

export async function getMonthlyAttendance(month: string): Promise<StaffAttendanceRecord[]> {
  return mockStaffAttendanceStore.listByMonth(month);
}

export async function getStaffAttendance(
  staffId: string,
  month?: string
): Promise<StaffAttendanceRecord[]> {
  return mockStaffAttendanceStore.getByStaffId(staffId, month);
}

// 申請関連
export async function createEditRequest(params: {
  recordId: string;
  staffId: string;
  payload: Partial<Pick<StaffAttendanceRecord, "checkInAt" | "checkOutAt" | "reason" | "note">>;
}): Promise<AttendanceRequest> {
  return mockStaffAttendanceStore.requestEdit(params);
}

export async function approveRequest(params: {
  requestId: string;
  approverUserId: string;
  comment?: string;
}): Promise<AttendanceRequest> {
  return mockStaffAttendanceStore.approveRequest(params);
}

export async function rejectRequest(params: {
  requestId: string;
  approverUserId: string;
  comment?: string;
}): Promise<AttendanceRequest> {
  return mockStaffAttendanceStore.rejectRequest(params);
}

export async function getRequestList(
  status?: "pending" | "approved" | "rejected"
): Promise<AttendanceRequest[]> {
  return mockStaffAttendanceStore.listRequests(status);
}

// シフト関連
export async function submitShiftWish(params: {
  staffId: string;
  month: string;
  wishes: Array<{ date: string; available: boolean; memo?: string }>;
}): Promise<StaffShiftWish> {
  return mockShiftStore.submitWish(params);
}

export async function getShiftWishes(month: string): Promise<StaffShiftWish[]> {
  return mockShiftStore.getWishes(month);
}

export async function updateShiftPlan(params: {
  month: string;
  assignments: Array<{ 
    date: string; 
    staffId: string; 
    start?: string; 
    end?: string; 
    memo?: string;
  }>;
  published?: boolean;
}): Promise<StaffShiftPlan> {
  return mockShiftStore.updatePlan(params);
}

export async function getShiftPlan(month: string): Promise<StaffShiftPlan | undefined> {
  return mockShiftStore.getPlan(month);
}

// 勤怠時間計算（分単位）
export function calculateWorkMinutes(
  checkIn: string | undefined,
  checkOut: string | undefined
): number {
  if (!checkIn || !checkOut) return 0;
  
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffMs = end.getTime() - start.getTime();
  
  return Math.floor(diffMs / (1000 * 60)); // 分単位で返す
}

// 月次集計
export async function getMonthlyStats(
  staffId: string,
  month: string
): Promise<{
  totalMinutes: number;
  workDays: number;
  records: StaffAttendanceRecord[];
}> {
  const records = await getStaffAttendance(staffId, month);
  
  let totalMinutes = 0;
  let workDays = 0;
  
  records.forEach(record => {
    if (record.checkInAt && record.checkOutAt) {
      totalMinutes += calculateWorkMinutes(record.checkInAt, record.checkOutAt);
      workDays++;
    }
  });
  
  return {
    totalMinutes,
    workDays,
    records,
  };
}