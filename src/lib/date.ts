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
 * Lấy chuỗi ngày Ngày Mai YYYY-MM-DD theo múi giờ Asia/Ho_Chi_Minh
 */
export function getVietnamTomorrowStr(): string {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return getVietnamTodayStr(tomorrow);
}

/**
 * Lấy giờ hiện tại (0-23) theo múi giờ VN
 */
export function getVietnamHour(): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "numeric",
    hour12: false,
  });
  return parseInt(formatter.format(new Date()), 10);
}

/**
 * Format chuỗi tiêu đề tiếng Việt: "Hôm nay, Thứ Hai • 02/11" hoặc "Ngày mai, Thứ Ba • 03/11"
 */
export function formatVietnamHeaderDate(date: Date = new Date(), customPrefix?: string): string {
  const weekdayFormatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: TIMEZONE,
    weekday: "long",
  });
  
  const rawWeekday = weekdayFormatter.format(date);
  const weekday = rawWeekday
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const dateStr = getVietnamTodayStr(date);
  const [, month, day] = dateStr.split("-");

  const prefix = customPrefix !== undefined ? customPrefix : "Hôm nay";
  return `${prefix ? prefix + ", " : ""}${weekday} • ${day}/${month}`;
}

/**
 * Format chuỗi ngày từ YYYY-MM-DD
 */
export function formatHeaderForDateStr(dateStr: string): string {
  const todayStr = getVietnamTodayStr();
  const tomorrowStr = getVietnamTomorrowStr();

  // Tạo đối tượng Date an toàn
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  let prefix = "";
  if (dateStr === todayStr) prefix = "Hôm nay";
  else if (dateStr === tomorrowStr) prefix = "Ngày mai";

  return formatVietnamHeaderDate(dateObj, prefix);
}

/**
 * Lấy mã thứ tiếng Việt viết tắt (T2, T3, T4, T5, T6, T7, CN) cho 1 ngày
 */
export function getVietnamDayCode(date: Date = new Date()): string {
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
 * Lấy mã thứ từ dateStr YYYY-MM-DD
 */
export function getVietnamDayCodeFromStr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return getVietnamDayCode(dateObj);
}

/**
 * Tính ngày trước (N ngày) theo múi giờ VN
 */
export function getVietnamDaysAgo(daysAgo: number): string {
  const now = new Date();
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return getVietnamTodayStr(past);
}
