/**
 * フォーマットユーティリティ
 * 日付、通貨、その他の表示フォーマット関数
 */

import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

/**
 * 日本円フォーマット（整数）
 * @param n 数値
 * @returns フォーマット済み文字列（例: "¥1,234"）
 */
export const fmtJPY = (n: number): string =>
  new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

/**
 * 日付フォーマット（日本時間）
 * @param iso ISO 8601形式の日付文字列
 * @returns フォーマット済み文字列（例: "2025年1月1日 21:30"）
 */
export const fmtDate = (iso: string): string => {
  try {
    const date = parseISO(iso);
    const jstDate = toZonedTime(date, "Asia/Tokyo");
    return format(jstDate, "yyyy年M月d日 HH:mm", { locale: ja });
  } catch {
    return "-";
  }
};

/**
 * 日付フォーマット（短縮形）
 * @param iso ISO 8601形式の日付文字列
 * @returns フォーマット済み文字列（例: "1/1 21:30"）
 */
export const fmtDateShort = (iso: string): string => {
  try {
    const date = parseISO(iso);
    const jstDate = toZonedTime(date, "Asia/Tokyo");
    return format(jstDate, "M/d HH:mm", { locale: ja });
  } catch {
    return "-";
  }
};

/**
 * 日付フォーマット（日付のみ）
 * @param iso ISO 8601形式の日付文字列
 * @returns フォーマット済み文字列（例: "2025年1月1日"）
 */
export const fmtDateOnly = (iso: string): string => {
  try {
    const date = parseISO(iso);
    const jstDate = toZonedTime(date, "Asia/Tokyo");
    return format(jstDate, "yyyy年M月d日", { locale: ja });
  } catch {
    return "-";
  }
};

/**
 * 時刻フォーマット
 * @param iso ISO 8601形式の日付文字列
 * @returns フォーマット済み文字列（例: "21:30"）
 */
export const fmtTime = (iso: string): string => {
  try {
    const date = parseISO(iso);
    const jstDate = toZonedTime(date, "Asia/Tokyo");
    return format(jstDate, "HH:mm", { locale: ja });
  } catch {
    return "-";
  }
};

/**
 * CSV用日付フォーマット
 * @param iso ISO 8601形式の日付文字列
 * @returns フォーマット済み文字列（例: "2025-01-01T21:30:00"）
 */
export const fmtDateForCSV = (iso: string): string => {
  try {
    const date = parseISO(iso);
    const jstDate = toZonedTime(date, "Asia/Tokyo");
    return format(jstDate, "yyyy-MM-dd'T'HH:mm:ss");
  } catch {
    return "";
  }
};

/**
 * 滞在時間の計算と表示
 * @param checkedInAt チェックイン時刻（ISO 8601）
 * @param checkedOutAt チェックアウト時刻（ISO 8601、nullの場合は現在時刻）
 * @returns フォーマット済み文字列（例: "2時間30分"）
 */
export const fmtDuration = (checkedInAt: string, checkedOutAt?: string): string => {
  try {
    const start = parseISO(checkedInAt);
    const end = checkedOutAt ? parseISO(checkedOutAt) : new Date();
    const durationMs = end.getTime() - start.getTime();
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    }
    return `${minutes}分`;
  } catch {
    return "-";
  }
};

/**
 * 数値のカンマ区切り表示
 * @param n 数値
 * @returns フォーマット済み文字列（例: "1,234"）
 */
export const fmtNumber = (n: number): string =>
  new Intl.NumberFormat("ja-JP").format(n);

/**
 * パーセント表示
 * @param n 数値（パーセント値）
 * @param decimals 小数点以下の桁数
 * @returns フォーマット済み文字列（例: "10.5%"）
 */
export const fmtPercent = (n: number, decimals: number = 0): string => {
  if (decimals === 0) {
    return `${Math.round(n)}%`;
  }
  return `${n.toFixed(decimals)}%`;
};

/**
 * 決済方法の日本語表示
 * @param method 決済方法
 * @returns 日本語表示
 */
export const fmtPaymentMethod = (method: string): string => {
  const map: Record<string, string> = {
    Cash: "現金",
    Card: "カード",
    QR: "QRコード",
    Other: "その他",
  };
  return map[method] || method;
};

/**
 * カテゴリーの日本語表示
 * @param category カテゴリー
 * @returns 日本語表示
 */
export const fmtItemCategory = (category: string): string => {
  const map: Record<string, string> = {
    item: "商品",
    set: "セット",
    nomination: "指名",
    bottle: "ボトル",
    other: "その他",
  };
  return map[category] || category;
};

/**
 * ロールの日本語表示
 * @param role ユーザーロール
 * @returns 日本語表示
 */
export const fmtUserRole = (role: string): string => {
  const map: Record<string, string> = {
    Admin: "管理者",
    Owner: "オーナー",
    Staff: "スタッフ",
  };
  return map[role] || role;
};

/**
 * ステータスの日本語表示
 * @param status ステータス
 * @returns 日本語表示
 */
export const fmtStatus = (status: string): string => {
  const map: Record<string, string> = {
    active: "有効",
    cancelled: "取消済",
    pending: "保留中",
    completed: "完了",
  };
  return map[status] || status;
};