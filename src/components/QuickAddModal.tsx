"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Flame, X, Sun, Sunset, Moon, Send } from "lucide-react";
import { TimeSlot, Priority } from "@/types";

interface QuickAddModalProps {
  onAdd: (data: { name: string; timeSlot: TimeSlot; priority: Priority }) => void;
}

export function QuickAddModal({ onAdd }: QuickAddModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("Inbox");
  const [isUrgent, setIsUrgent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tự động focus vào ô nhập tên khi mở sheet
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleOpen = () => {
    try {
      navigator.vibrate?.(10);
    } catch {}
    setName("");
    setTimeSlot("Inbox");
    setIsUrgent(false);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const toggleSlot = (slot: TimeSlot) => {
    try {
      navigator.vibrate?.(10);
    } catch {}
    // Bấm lại để bỏ chọn (quay về Inbox)
    setTimeSlot((prev) => (prev === slot ? "Inbox" : slot));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      navigator.vibrate?.(10);
    } catch {}

    // Sheet đóng ngay, task xuất hiện ngay theo spec 5.D
    setIsOpen(false);

    onAdd({
      name: trimmed,
      timeSlot,
      priority: isUrgent ? "High" : "Normal",
    });

    setName("");
    setTimeSlot("Inbox");
    setIsUrgent(false);
  };

  return (
    <>
      {/* Nút FAB góc dưới phải (Section 5.D) */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Thêm nhanh việc mới"
        className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl shadow-slate-900/30 active:scale-95 transition-all"
        style={{
          bottom: "max(24px, calc(env(safe-area-inset-bottom) + 16px))",
        }}
      >
        <Plus className="h-7 w-7 stroke-[2.5]" />
      </button>

      {/* Bottom Sheet trượt lên */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Lớp nền mờ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Khung Bottom Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md rounded-t-3xl bg-white px-5 pt-4 pb-8 shadow-2xl safe-bottom"
            >
              {/* Thanh gạt nhỏ trên cùng */}
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" />

              {/* Tiêu đề & nút đóng */}
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-sm font-bold text-slate-800">Thêm việc nhanh</h3>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form nhập liệu */}
              <form onSubmit={handleSubmit} className="mt-2 space-y-4">
                {/* Ô nhập tên việc tự focus */}
                <div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Bạn cần làm gì hôm nay?"
                    className="w-full rounded-xl bg-slate-100 px-4 py-3 text-base font-normal text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  />
                </div>

                {/* 3 nút chọn Sáng / Chiều / Tối */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Xếp vào buổi (mặc định Hộp thư)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSlot("Morning")}
                      className={`flex items-center justify-center space-x-1.5 rounded-xl py-2.5 text-xs font-medium border transition-all ${
                        timeSlot === "Morning"
                          ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Sun className="h-3.5 w-3.5" />
                      <span>Sáng</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleSlot("Afternoon")}
                      className={`flex items-center justify-center space-x-1.5 rounded-xl py-2.5 text-xs font-medium border transition-all ${
                        timeSlot === "Afternoon"
                          ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Sunset className="h-3.5 w-3.5" />
                      <span>Chiều</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleSlot("Evening")}
                      className={`flex items-center justify-center space-x-1.5 rounded-xl py-2.5 text-xs font-medium border transition-all ${
                        timeSlot === "Evening"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Moon className="h-3.5 w-3.5" />
                      <span>Tối</span>
                    </button>
                  </div>
                </div>

                {/* Công tắc 🔥 Việc gấp */}
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Flame
                      className={`h-5 w-5 transition-colors ${
                        isUrgent ? "text-rose-500 fill-rose-500" : "text-slate-400"
                      }`}
                    />
                    <span className="text-xs font-medium text-slate-700">Việc gấp (Ưu tiên cao)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsUrgent((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isUrgent ? "bg-rose-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isUrgent ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Nút lưu */}
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="flex w-full items-center justify-center space-x-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 active:scale-95 disabled:opacity-40 disabled:active:scale-100 transition-all"
                >
                  <Send className="h-4 w-4" />
                  <span>Lưu việc</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
