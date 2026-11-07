"use client";

import React, { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { LogOut, Sparkles, Moon, BookOpen, RotateCcw } from "lucide-react";
import { Task } from "@/types";
import {
  formatHeaderForDateStr,
  getVietnamTodayStr,
  getVietnamTomorrowStr,
  getVietnamHour,
} from "@/lib/date";

interface HeaderProps {
  tasks: Task[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onLogout: () => void;
}

export function Header({ tasks, selectedDate, onSelectDate, onLogout }: HeaderProps) {
  const todayStr = getVietnamTodayStr();
  const tomorrowStr = getVietnamTomorrowStr();
  const currentHour = getVietnamHour();

  const isToday = selectedDate === todayStr;
  const isTomorrow = selectedDate === tomorrowStr;
  const isLateNight = currentHour >= 23 || currentHour < 4; // 11h đêm đến 4h sáng

  const headerDateStr = formatHeaderForDateStr(selectedDate);

  const total = tasks.length;
  const done = tasks.filter((t) => t.status).length;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
  const is100Percent = total > 0 && done === total;

  const confettiFiredRef = useRef(false);

  // Xử lý bắn confetti nhẹ khi đạt 100% (chỉ 1 lần/ngày)
  useEffect(() => {
    if (isToday && is100Percent && !confettiFiredRef.current) {
      const storageKey = `confetti_fired_${todayStr}`;
      const alreadyFired = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;

      if (!alreadyFired) {
        confettiFiredRef.current = true;
        localStorage.setItem(storageKey, "true");

        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.15 },
          colors: ["#10B981", "#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6"],
          disableForReducedMotion: true,
        });
      }
    }
  }, [isToday, is100Percent, todayStr]);

  return (
    <header className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-md px-5 pt-4 pb-3 border-b border-slate-100 safe-top">
      {/* Thanh chọn Hôm nay / Ngày mai */}
      <div className="flex items-center justify-between mb-2">
        <div className="inline-flex rounded-xl bg-slate-200/80 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onSelectDate(todayStr)}
            className={`rounded-lg px-3 py-1 transition-all ${
              isToday
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => onSelectDate(tomorrowStr)}
            className={`rounded-lg px-3 py-1 transition-all flex items-center space-x-1 ${
              isTomorrow
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>Ngày mai</span>
            {isLateNight && (
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            )}
          </button>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Nút nhảy nhanh xuống Nhật ký */}
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("daily-journal-section");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }}
            title="Đến mục Nhật ký học tập"
            className="flex items-center space-x-1 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Nhật ký</span>
          </button>

          {/* Nút tải lại trang / nạp bản mới */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            title="Tải lại trang để cập nhật"
            className="p-1.5 text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Nút khoá */}
          <button
            type="button"
            onClick={onLogout}
            title="Khoá ứng dụng"
            className="p-1.5 text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tiêu đề ngày tiếng Việt */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{headerDateStr}</h1>
        {isLateNight && isToday && (
          <button
            type="button"
            onClick={() => onSelectDate(tomorrowStr)}
            className="inline-flex items-center space-x-1 rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 active:scale-95 transition-all"
          >
            <Moon className="h-3 w-3 text-indigo-500" />
            <span>23h: Lên việc ngày mai</span>
          </button>
        )}
      </div>

      {/* Tiến độ ngày */}
      <div className="mt-3">
        {total === 0 ? (
          <p className="text-xs font-medium text-slate-400">
            {isToday
              ? "Chưa có việc hôm nay"
              : isTomorrow
              ? "Chưa có việc ngày mai"
              : `Chưa có việc cho ngày ${selectedDate.split("-").slice(1).reverse().join("/")}`}
          </p>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-600">
                {done}/{total} Hoàn thành ({percentage}%)
              </span>
              {is100Percent && (
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-flex items-center space-x-1">
                  <Sparkles className="h-3 w-3" />
                  <span>Hoàn tất 100%!</span>
                </span>
              )}
            </div>

            {/* Thanh tiến độ */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  is100Percent ? "shimmer-metallic" : "bg-slate-900"
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
