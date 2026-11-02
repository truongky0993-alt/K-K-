"use client";

import React, { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { LogOut } from "lucide-react";
import { Task } from "@/types";
import { formatVietnamHeaderDate, getVietnamTodayStr } from "@/lib/date";

interface HeaderProps {
  tasks: Task[];
  onLogout: () => void;
}

export function Header({ tasks, onLogout }: HeaderProps) {
  const todayStr = getVietnamTodayStr();
  const headerDateStr = formatVietnamHeaderDate();

  const total = tasks.length;
  const done = tasks.filter((t) => t.status).length;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
  const is100Percent = total > 0 && done === total;

  const confettiFiredRef = useRef(false);

  // Xử lý bắn confetti nhẹ khi đạt 100% (chỉ 1 lần/ngày)
  useEffect(() => {
    if (is100Percent && !confettiFiredRef.current) {
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
  }, [is100Percent, todayStr]);

  return (
    <header className="sticky top-0 z-30 bg-slate-50/90 backdrop-blur-md px-5 pt-4 pb-3 border-b border-slate-100 safe-top">
      {/* Tiêu đề & Nút khoá */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{headerDateStr}</h1>
        <button
          type="button"
          onClick={onLogout}
          title="Khoá ứng dụng"
          className="p-1.5 text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* Tiến độ ngày */}
      <div className="mt-3">
        {total === 0 ? (
          <p className="text-xs font-medium text-slate-400">Chưa có việc hôm nay</p>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-600">
                {done}/{total} Hoàn thành ({percentage}%)
              </span>
              {is100Percent && (
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Tuyệt vời! 🎉
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
