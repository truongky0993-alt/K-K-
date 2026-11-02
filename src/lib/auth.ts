import { cookies, headers } from "next/headers";
import crypto from "crypto";

const SESSION_COOKIE_NAME = "app_session";
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 phút
const MAX_FAILED_ATTEMPTS = 5;
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 ngày

// In-memory rate limiting map: IP -> { failedAttempts, lockedUntil }
interface RateLimitRecord {
  failedAttempts: number;
  lockedUntil: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET bắt buộc phải được cấu hình trong biến môi trường");
    }
    return "dev_fallback_secret_daily_tracker_32_characters";
  }
  return secret;
}

function getAppPin(): string {
  const pin = process.env.APP_PIN;
  if (!pin) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("APP_PIN bắt buộc phải được cấu hình trong biến môi trường");
    }
    return "1234";
  }
  return pin;
}

export function getClientIp(): string {
  const reqHeaders = headers();
  const forwarded = reqHeaders.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return reqHeaders.get("x-real-ip") || "127.0.0.1";
}

/**
 * Ký token session bằng HMAC SHA256
 */
function signToken(payload: string): string {
  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(payload);
  return `${payload}.${hmac.digest("hex")}`;
}

/**
 * Xác minh tính hợp lệ của token session
 */
function verifyToken(token: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))) {
    return false;
  }

  // Payload lưu timestamp hết hạn: exp:<epochMs>
  try {
    const data = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
    if (typeof data.exp !== "number" || Date.now() > data.exp) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Kiểm tra trạng thái khoá theo IP
 */
export function checkRateLimit(ip: string): { isLocked: boolean; remainingMinutes: number } {
  const record = rateLimitMap.get(ip);
  if (!record) return { isLocked: false, remainingMinutes: 0 };

  const now = Date.now();
  if (record.lockedUntil > now) {
    const remainingMs = record.lockedUntil - now;
    return {
      isLocked: true,
      remainingMinutes: Math.ceil(remainingMs / (60 * 1000)),
    };
  }

  // Hết thời gian khoá -> reset
  if (record.lockedUntil > 0 && record.lockedUntil <= now) {
    rateLimitMap.delete(ip);
  }

  return { isLocked: false, remainingMinutes: 0 };
}

/**
 * Ghi nhận lần nhập sai PIN
 */
export function recordFailedAttempt(ip: string): { locked: boolean; remainingAttempts: number; lockMinutes: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { failedAttempts: 0, lockedUntil: 0 };
  record.failedAttempts += 1;

  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCK_DURATION_MS;
    rateLimitMap.set(ip, record);
    return { locked: true, remainingAttempts: 0, lockMinutes: 15 };
  }

  rateLimitMap.set(ip, record);
  return {
    locked: false,
    remainingAttempts: MAX_FAILED_ATTEMPTS - record.failedAttempts,
    lockMinutes: 0,
  };
}

/**
 * Reset số lần nhập sai khi đăng nhập đúng
 */
export function clearRateLimit(ip: string): void {
  rateLimitMap.delete(ip);
}

/**
 * Xác thực PIN từ client
 */
export async function authenticatePin(pin: string): Promise<{ success: boolean; error?: string }> {
  const ip = getClientIp();
  const limitCheck = checkRateLimit(ip);
  if (limitCheck.isLocked) {
    return {
      success: false,
      error: `Bạn đã nhập sai quá 5 lần. Vui lòng đợi ${limitCheck.remainingMinutes} phút nữa.`,
    };
  }

  const expectedPin = getAppPin();
  if (pin !== expectedPin) {
    const failInfo = recordFailedAttempt(ip);
    if (failInfo.locked) {
      return {
        success: false,
        error: "Bạn đã nhập sai 5 lần. Hệ thống tạm khoá 15 phút.",
      };
    }
    return {
      success: false,
      error: `Mã PIN không đúng. Bạn còn ${failInfo.remainingAttempts} lần thử.`,
    };
  }

  // Đăng nhập thành công
  clearRateLimit(ip);

  // Tạo session token với hạn 30 ngày
  const exp = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ authenticated: true, exp })).toString("base64");
  const token = signToken(payload);

  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  return { success: true };
}

/**
 * Kiểm tra xem request hiện tại có phiên đăng nhập hợp lệ không
 */
export async function isSessionValid(): Promise<boolean> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie || !sessionCookie.value) {
    return false;
  }
  return verifyToken(sessionCookie.value);
}

/**
 * Đăng xuất: xoá cookie phiên
 */
export async function logoutSession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
