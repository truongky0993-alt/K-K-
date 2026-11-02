"use client";

import React, { useState } from "react";
import { Lock, Delete, RefreshCw } from "lucide-react";
import { loginAction } from "@/actions/tracker";

interface PinScreenProps {
  onSuccess: () => void;
}

export function PinScreen({ onSuccess }: PinScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleKeyPress = (digit: string) => {
    if (isLoading) return;
    if (pin.length >= 6) return;

    try {
      navigator.vibrate?.(10);
    } catch {}

    const newPin = pin + digit;
    setPin(newPin);
    setError(null);

    // Khi người dùng nhập đủ 4 ký tự, tự động thử đăng nhập
    if (newPin.length === 4) {
      submitPin(newPin);
    }
  };

  const handleDelete = () => {
    if (isLoading) return;
    try {
      navigator.vibrate?.(10);
    } catch {}
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    if (isLoading) return;
    try {
      navigator.vibrate?.(10);
    } catch {}
    setPin("");
    setError(null);
  };

  const submitPin = async (pinToSubmit: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await loginAction(pinToSubmit);
      if (res.success) {
        onSuccess();
      } else {
        setError(res.error || "Mã PIN không đúng");
        setPin("");
      }
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối máy chủ");
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-white px-6 py-12 safe-top safe-bottom">
      {/* Biểu tượng và tiêu đề */}
      <div className="flex flex-col items-center pt-8">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-inner">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-800">Mã PIN bảo vệ</h1>
        <p className="mt-1 text-xs text-slate-400">Nhập mã PIN để mở Daily Tracker cá nhân</p>

        {/* Các chấm hiển thị PIN */}
        <div className="mt-8 flex items-center space-x-4">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`h-4 w-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? "scale-110 bg-slate-900 shadow-sm"
                    : "border-2 border-slate-300 bg-transparent"
                }`}
              />
            );
          })}
        </div>

        {/* Thông báo lỗi */}
        {error && (
          <div className="mt-6 rounded-lg bg-red-50 px-4 py-2 text-center text-xs font-medium text-red-600 animate-shake">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="mt-4 flex items-center text-xs text-slate-500">
            <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
            Đang kiểm tra...
          </div>
        )}
      </div>

      {/* Bàn phím số */}
      <div className="w-full max-w-xs pb-4">
        <div className="grid grid-cols-3 gap-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isLoading}
              onClick={() => handleKeyPress(num)}
              className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-slate-50 text-2xl font-light text-slate-800 shadow-sm active:scale-95 active:bg-slate-200 transition-all select-none"
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            disabled={isLoading || pin.length === 0}
            onClick={handleClear}
            className="flex h-16 w-16 mx-auto items-center justify-center rounded-full text-sm font-medium text-slate-400 active:bg-slate-100 transition-all select-none"
          >
            Xoá
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleKeyPress("0")}
            className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-slate-50 text-2xl font-light text-slate-800 shadow-sm active:scale-95 active:bg-slate-200 transition-all select-none"
          >
            0
          </button>

          <button
            type="button"
            disabled={isLoading || pin.length === 0}
            onClick={handleDelete}
            className="flex h-16 w-16 mx-auto items-center justify-center rounded-full text-slate-700 active:bg-slate-100 transition-all select-none"
          >
            <Delete className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
