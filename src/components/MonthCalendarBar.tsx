"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar, ChevronDown, ChevronUp, Sparkles, Flame } from "lucide-react";
import {
  getVietnamTodayStr,
  getDaysInMonth,
  getVietnamDayCodeFromStr,
  getFirstDayWeekdayOfMonth,
} from "@/lib/date";

interface DaySummary {
  total: number;
  completed: number;
  hasHighPriority: boolean;
}

interface MonthCalendarBarProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  monthSummary?: Record<string, DaySummary>;
}

export function MonthCalendarBar({
  selectedDate,
  onSelectDate,
  monthSummary = {},
}: MonthCalendarBarProps) {
  const todayStr = getVietnamTodayStr();

  // Parse năm & tháng hiện tại từ selectedDate (hoặc mặc định hôm nay)
  const [selectedY, selectedM] = selectedDate.split("-").map(Number);
  const [viewYear, setViewYear] = useState<number>(selectedY || 2026);
  const [viewMonth, setViewMonth] = useState<number>(selectedM || 11);

  // Chế độ xem: Thu gọn (dải ngang vuốt) hoặc Mở rộng (lưới cả tháng)
  const [isGridExpanded, setIsGridExpanded] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedBtnRef = useRef<HTMLButtonElement>(null);

  // Khi selectedDate đổi từ ngoài vào, cập nhật viewYear và viewMonth nếu khác
  useEffect(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split("-").map(Number);
      if (y !== viewYear || m !== viewMonth) {
        setViewYear(y);
        setViewMonth(m);
      }
    }
  }, [selectedDate]);

  // Tự động cuộn ngày đang chọn vào giữa thanh dải ngang
  useEffect(() => {
    if (!isGridExpanded && selectedBtnRef.current && scrollContainerRef.current) {
      selectedBtnRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [selectedDate, isGridExpanded, viewMonth]);

  // Chuyển tháng trước / sau
  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    onSelectDate(todayStr);
    const [y, m] = todayStr.split("-").map(Number);
    setViewYear(y);
    setViewMonth(m);
  };

  // Tính danh sách ngày trong tháng
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const mStr = String(viewMonth).padStart(2, "0");

  const daysList: {
    dateStr: string;
    dayNum: number;
    dayCode: string;
    isToday: boolean;
    isSelected: boolean;
    summary?: DaySummary;
  }[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = String(d).padStart(2, "0");
    const fullDateStr = `${viewYear}-${mStr}-${dStr}`;
    const dayCode = getVietnamDayCodeFromStr(fullDateStr);
    daysList.push({
      dateStr: fullDateStr,
      dayNum: d,
      dayCode,
      isToday: fullDateStr === todayStr,
      isSelected: fullDateStr === selectedDate,
      summary: monthSummary[fullDateStr],
    });
  }

  // Padding cho lưới tháng: Tuần bắt đầu từ Thứ Hai (T2=0, T3=1, ..., CN=6)
  const firstDaySundayBased = getFirstDayWeekdayOfMonth(viewYear, viewMonth); // 0=Sun, 1=Mon, ..., 6=Sat
  const firstDayMondayBased = (firstDaySundayBased + 6) % 7; // Chuyển sang Mon=0, Sun=6

  const isCurrentViewMonthToday =
    todayStr.startsWith(`${viewYear}-${String(viewMonth).padStart(2, "0")}`);

  return (
    <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-xs px-3 pt-2.5 pb-2 transition-all">
      {/* 1. Header Toolbar của Tháng */}
      <div className="flex items-center justify-between px-1 mb-2">
        {/* Tháng/Năm với nút điều hướng */}
        <div className="flex items-center space-x-1.5">
          <div className="flex items-center bg-slate-100/90 rounded-lg p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-white rounded-md text-slate-600 transition-colors"
              title="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-bold text-slate-800 tracking-tight">
              Tháng {viewMonth}, {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-white rounded-md text-slate-600 transition-colors"
              title="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Nút quay lại hôm nay nếu đang xem ngày khác */}
          {(!isCurrentViewMonthToday || selectedDate !== todayStr) && (
            <button
              type="button"
              onClick={handleJumpToToday}
              className="px-2 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all active:scale-95"
            >
              Hôm nay
            </button>
          )}
        </div>

        {/* Nút chuyển đổi Lưới cả tháng / Dải cuộn ngang */}
        <button
          type="button"
          onClick={() => setIsGridExpanded((prev) => !prev)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
            isGridExpanded
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>{isGridExpanded ? "Thu gọn" : "Cả tháng"}</span>
          {isGridExpanded ? (
            <ChevronUp className="h-3 w-3 ml-0.5" />
          ) : (
            <ChevronDown className="h-3 w-3 ml-0.5" />
          )}
        </button>
      </div>

      {/* 2. Dải cuộn ngang ngày (Chế độ mặc định) */}
      {!isGridExpanded ? (
        <div
          ref={scrollContainerRef}
          className="flex space-x-1.5 overflow-x-auto py-1 scrollbar-none scroll-smooth -mx-1 px-1"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {daysList.map((item) => {
            const hasTasks = item.summary && item.summary.total > 0;
            const isCompleted =
              hasTasks && item.summary?.completed === item.summary?.total;
            const hasHighPriority = item.summary?.hasHighPriority;

            return (
              <button
                key={item.dateStr}
                ref={item.isSelected ? selectedBtnRef : null}
                type="button"
                onClick={() => onSelectDate(item.dateStr)}
                className={`flex-shrink-0 flex flex-col items-center justify-between w-[48px] py-1.5 px-1 rounded-2xl transition-all duration-200 active:scale-95 relative ${
                  item.isSelected
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/15"
                    : item.isToday
                    ? "bg-indigo-50/90 text-indigo-900 border border-indigo-200/80"
                    : "bg-slate-50/80 text-slate-700 hover:bg-slate-100 border border-slate-200/60"
                }`}
              >
                {/* Thứ viết tắt */}
                <span
                  className={`text-[10px] font-medium leading-none ${
                    item.isSelected
                      ? "text-slate-300"
                      : item.isToday
                      ? "text-indigo-600 font-bold"
                      : "text-slate-400"
                  }`}
                >
                  {item.dayCode}
                </span>

                {/* Số ngày */}
                <span
                  className={`text-sm my-0.5 leading-none ${
                    item.isSelected
                      ? "font-extrabold text-white"
                      : item.isToday
                      ? "font-bold text-indigo-900"
                      : "font-semibold text-slate-800"
                  }`}
                >
                  {item.dayNum}
                </span>

                {/* Chấm trạng thái công việc */}
                <div className="flex items-center justify-center space-x-0.5 h-1.5">
                  {hasHighPriority ? (
                    <span
                      title="Có lịch học Giảng viên / Quan trọng"
                      className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"
                    />
                  ) : isCompleted ? (
                    <span
                      title="Đã xong tất cả"
                      className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                    />
                  ) : hasTasks ? (
                    <span
                      title="Có lịch học / việc cần làm"
                      className={`h-1.5 w-1.5 rounded-full ${
                        item.isSelected ? "bg-indigo-400" : "bg-indigo-500"
                      }`}
                    />
                  ) : (
                    <span className="h-1.5 w-1.5 opacity-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* 3. Lưới cả tháng (Chế độ mở rộng) */
        <div className="pt-1 pb-2">
          {/* Hàng tên thứ T2 - CN */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((th) => (
              <span key={th} className="text-[11px] font-semibold text-slate-400">
                {th}
              </span>
            ))}
          </div>

          {/* Lưới các ô ngày */}
          <div className="grid grid-cols-7 gap-1">
            {/* Các ô trống trước ngày 1 */}
            {Array.from({ length: firstDayMondayBased }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-11 rounded-xl" />
            ))}

            {/* Các ngày trong tháng */}
            {daysList.map((item) => {
              const hasTasks = item.summary && item.summary.total > 0;
              const isCompleted =
                hasTasks && item.summary?.completed === item.summary?.total;
              const hasHighPriority = item.summary?.hasHighPriority;

              return (
                <button
                  key={item.dateStr}
                  type="button"
                  onClick={() => {
                    onSelectDate(item.dateStr);
                    setIsGridExpanded(false); // Đóng lưới sau khi chọn ngày
                  }}
                  className={`flex flex-col items-center justify-center h-11 rounded-xl transition-all relative ${
                    item.isSelected
                      ? "bg-slate-900 text-white font-bold shadow-md shadow-slate-900/15 ring-2 ring-slate-900"
                      : item.isToday
                      ? "bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200"
                      : "bg-slate-50/70 hover:bg-slate-100 text-slate-700 border border-slate-200/50"
                  }`}
                >
                  <span className="text-xs leading-none">{item.dayNum}</span>

                  {/* Chấm hoặc badge chỉ thị */}
                  <div className="flex items-center space-x-0.5 mt-1">
                    {hasHighPriority && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    )}
                    {isCompleted ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    ) : hasTasks && !hasHighPriority ? (
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.isSelected ? "bg-indigo-300" : "bg-indigo-500"
                        }`}
                      />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Chú giải trạng thái */}
          <div className="mt-3 flex items-center justify-center space-x-4 text-[10px] text-slate-500 border-t border-slate-100 pt-2">
            <div className="flex items-center space-x-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Học với GV / Gấp</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span>Có lịch học LMS</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Đã hoàn thành</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
