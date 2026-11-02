"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Flame, Check, Sun, Sunset, Moon } from "lucide-react";
import { Task, TimeSlot } from "@/types";

interface TaskCardProps {
  task: Task;
  onToggle: (taskId: string, newStatus: boolean) => void;
  onEdit?: (task: Task) => void;
  onMoveSlot?: (taskId: string, slot: TimeSlot) => void;
}

export function TaskCard({ task, onToggle, onEdit, onMoveSlot }: TaskCardProps) {
  const [bounce, setBounce] = useState(false);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Haptic feedback with fallback
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
    } catch {}

    // Bounce animation
    setBounce(true);
    setTimeout(() => setBounce(false), 200);

    onToggle(task.id, !task.status);
  };

  const handleQuickSlot = (e: React.MouseEvent, slot: TimeSlot) => {
    e.stopPropagation();
    try {
      navigator.vibrate?.(10);
    } catch {}
    onMoveSlot?.(task.id, slot);
  };

  // Badge màu pastel theo category
  const renderCategoryBadge = () => {
    switch (task.category) {
      case "Routine":
        return (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
            Routine
          </span>
        );
      case "Planned":
        return (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
            Planned
          </span>
        );
      case "Ad-hoc":
        return (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
            Ad-hoc
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      layout
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className={`group relative flex flex-col rounded-xl bg-white p-2.5 shadow-sm border border-slate-100 active:bg-slate-50/60 transition-colors cursor-pointer ${
        task.status ? "opacity-60" : "opacity-100"
      }`}
      onClick={() => onEdit?.(task)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5 flex-1 min-w-0">
          {/* Vùng chạm checkbox tối thiểu 44x44px */}
          <button
            type="button"
            onClick={handleCheckboxClick}
            aria-label={task.status ? "Đánh dấu chưa hoàn thành" : "Đánh dấu đã hoàn thành"}
            className="flex h-11 w-11 -ml-1.5 -my-2 items-center justify-center rounded-full focus:outline-none flex-shrink-0"
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                task.status
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "border-slate-300 bg-white hover:border-slate-400"
              } ${bounce ? "scale-125" : "scale-100"}`}
            >
              {task.status && <Check className="h-3.5 w-3.5 stroke-[3]" />}
            </div>
          </button>

          {/* Tên task */}
          <div className="flex-1 min-w-0 pr-1">
            <p
              className={`text-sm font-normal text-slate-800 transition-all duration-300 truncate ${
                task.status ? "line-through text-slate-400" : ""
              }`}
            >
              {task.name}
            </p>
          </div>
        </div>

        {/* Badges bên phải */}
        <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
          {task.priority === "High" && (
            <span className="flex items-center text-rose-500" title="Ưu tiên cao">
              <Flame className="h-4 w-4 fill-rose-500" />
            </span>
          )}
          {renderCategoryBadge()}
        </div>
      </div>

      {/* Thao tác nhanh cho thẻ thuộc Hộp thư (Inbox) - Mục 5.C */}
      {task.timeSlot === "Inbox" && !task.status && (
        <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-medium">Xếp vào:</span>
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={(e) => handleQuickSlot(e, "Morning")}
              className="inline-flex items-center space-x-1 rounded-md bg-amber-50 hover:bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 transition-colors"
            >
              <Sun className="h-3 w-3" />
              <span>Sáng</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleQuickSlot(e, "Afternoon")}
              className="inline-flex items-center space-x-1 rounded-md bg-orange-50 hover:bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700 transition-colors"
            >
              <Sunset className="h-3 w-3" />
              <span>Chiều</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleQuickSlot(e, "Evening")}
              className="inline-flex items-center space-x-1 rounded-md bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 transition-colors"
            >
              <Moon className="h-3 w-3" />
              <span>Tối</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
