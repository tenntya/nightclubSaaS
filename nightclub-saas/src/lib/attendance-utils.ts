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