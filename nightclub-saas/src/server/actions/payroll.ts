"use server";

import { mockPayrollStore, mockStaffStore } from "@/lib/mock";
import type {
  StaffSalary,
  PayrollRecord,
  PayrollSummary,
  Staff,
} from "@/lib/types";

// 給与設定関連
export async function getSalaryByStaffId(staffId: string): Promise<StaffSalary | undefined> {
  return mockPayrollStore.getSalaryByStaffId(staffId);
}

export async function getAllSalaries(): Promise<StaffSalary[]> {
  return mockPayrollStore.getAllSalaries();
}

export async function updateSalary(
  staffId: string,
  salary: Partial<StaffSalary>
): Promise<StaffSalary> {
  return mockPayrollStore.updateSalary(staffId, salary);
}

// 給与計算関連
export async function calculatePayroll(
  staffId: string,
  yearMonth: string
): Promise<PayrollRecord> {
  return mockPayrollStore.calculatePayroll(staffId, yearMonth);
}

export async function calculateAllPayrolls(yearMonth: string): Promise<PayrollRecord[]> {
  const staff = await mockStaffStore.list();
  const results: PayrollRecord[] = [];
  
  for (const s of staff) {
    try {
      const payroll = await calculatePayroll(s.id, yearMonth);
      results.push(payroll);
    } catch (error) {
      console.error(`Failed to calculate payroll for ${s.id}:`, error);
    }
  }
  
  return results;
}

export async function getPayrollByMonth(yearMonth: string): Promise<PayrollRecord[]> {
  return mockPayrollStore.getPayrollByMonth(yearMonth);
}

export async function updatePayrollStatus(
  id: string,
  status: "draft" | "confirmed" | "paid"
): Promise<PayrollRecord> {
  return mockPayrollStore.updatePayrollStatus(id, status);
}

export async function getPayrollSummary(yearMonth: string): Promise<PayrollSummary> {
  return mockPayrollStore.getPayrollSummary(yearMonth);
}