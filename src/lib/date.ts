export const TIMEZONE = "Asia/Ho_Chi_Minh";

/**
 * Lấy chuỗi ngày YYYY-MM-DD theo múi giờ Asia/Ho_Chi_Minh
 */
export function getVietnamTodayStr(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Format chuỗi tiêu đề tiếng Việt: "Hôm nay, Thứ Hai • 02/11"
 */
export function formatVietnamHeaderDate(date: Date = new Date()): string {
  const weekdayFormatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: TIMEZONE,
    weekday: "long",
  });
  
  const rawWeekday = weekdayFormatter.format(date);
  // Viết hoa chữ cái đầu: "thứ hai" -> "Thứ Hai"
  const weekday = rawWeekday
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const todayStr = getVietnamTodayStr(date);
  const [, month, day] = todayStr.split("-");

  return `Hôm nay, ${weekday} • ${day}/${month}`;
}

/**
 * Lấy mã thứ tiếng Việt viết tắt (T2, T3, T4, T5, T6, T7, CN)
 */
export function getVietnamDayCode(date: Date = new Date()): string {
  // Lấy thứ trong tuần (0: CN, 1: T2, ..., 6: T7) theo giờ VN
  const weekdayStr = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "short",
  }).format(date);

  const map: Record<string, string> = {
    Mon: "T2",
    Tue: "T3",
    Wed: "T4",
    Thu: "T5",
    Fri: "T6",
    Sat: "T7",
    Sun: "CN",
  };

  return map[weekdayStr] || "T2";
}

/**
 * Tính ngày trước (N ngày) theo múi giờ VN
 */
export function getVietnamDaysAgo(daysAgo: number): string {
  const now = new Date();
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return getVietnamTodayStr(past);
}
