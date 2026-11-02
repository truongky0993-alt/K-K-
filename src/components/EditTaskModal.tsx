"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Check, Sun, Sunset, Moon, Inbox, Calendar, Flame } from "lucide-react";
import { Task, TimeSlot, Priority } from "@/types";

interface EditTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (task: Task) => void;
}

export function EditTaskModal({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: EditTaskModalProps) {
  const [name, setName] = useState("");
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("Inbox");
  const [priority, setPriority] = useState<Priority>("Normal");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (task) {
      setName(task.name);
      setTimeSlot(task.timeSlot);
      setPriority(task.priority);
      setDate(task.date);
    }
  }, [task]);

  if (!task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      navigator.vibrate?.(10);
    } catch {}

    onSave(task.id, {
      name: trimmed,
      timeSlot,
      priority,
      date,
    });
    onClose();
  };

  const handleDelete = () => {
    try {
      navigator.vibrate?.(10);
    } catch {}
    onDelete(task);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md rounded-t-3xl bg-white px-5 pt-4 pb-8 shadow-2xl safe-bottom"
          >
            {/* Grab handle */}
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Chỉnh sửa công việc</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Tên việc */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Tên công việc
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                />
              </div>

              {/* Buổi thực hiện */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Khung giờ
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTimeSlot("Inbox")}
                    className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-[11px] font-medium border transition-all ${
                      timeSlot === "Inbox"
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Inbox className="h-4 w-4 mb-0.5" />
                    <span>Inbox</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTimeSlot("Morning")}
                    className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-[11px] font-medium border transition-all ${
                      timeSlot === "Morning"
                        ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Sun className="h-4 w-4 mb-0.5" />
                    <span>Sáng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTimeSlot("Afternoon")}
                    className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-[11px] font-medium border transition-all ${
                      timeSlot === "Afternoon"
                        ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Sunset className="h-4 w-4 mb-0.5" />
                    <span>Chiều</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTimeSlot("Evening")}
                    className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-[11px] font-medium border transition-all ${
                      timeSlot === "Evening"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Moon className="h-4 w-4 mb-0.5" />
                    <span>Tối</span>
                  </button>
                </div>
              </div>

              {/* Mức ưu tiên */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Mức độ ưu tiên
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority("High")}
                    className={`flex items-center justify-center space-x-1.5 rounded-xl py-2 text-xs font-medium border transition-all ${
                      priority === "High"
                        ? "bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Flame className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                    <span>Gấp (Cao)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPriority("Normal")}
                    className={`flex items-center justify-center rounded-xl py-2 text-xs font-medium border transition-all ${
                      priority === "Normal"
                        ? "bg-slate-100 text-slate-900 border-slate-400 ring-2 ring-slate-800"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>Bình thường</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPriority("Low")}
                    className={`flex items-center justify-center rounded-xl py-2 text-xs font-medium border transition-all ${
                      priority === "Low"
                        ? "bg-slate-100 text-slate-600 border-slate-300 ring-2 ring-slate-400"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>Thấp</span>
                  </button>
                </div>
              </div>

              {/* Ngày thực hiện */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Ngày thực hiện
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl bg-slate-100 px-4 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  />
                  <Calendar className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Nút thao tác: Xoá & Lưu */}
              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center justify-center space-x-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-600 active:bg-rose-100 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Xoá</span>
                </button>

                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="flex flex-1 items-center justify-center space-x-2 rounded-xl bg-slate-900 py-3 text-xs font-semibold text-white shadow-md active:scale-95 disabled:opacity-40 transition-all"
                >
                  <Check className="h-4 w-4" />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
