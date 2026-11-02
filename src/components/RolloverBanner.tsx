"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, ArrowRight, X } from "lucide-react";
import { Task } from "@/types";

interface RolloverBannerProps {
  rolloverTasks: Task[];
  onRollover: (taskIds: string[]) => void;
  onDismiss: (taskIds: string[]) => void;
}

export function RolloverBanner({ rolloverTasks, onRollover, onDismiss }: RolloverBannerProps) {
  if (rolloverTasks.length === 0) {
    return null;
  }

  const taskIds = rolloverTasks.map((t) => t.id);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="mx-4 my-3 overflow-hidden rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5 backdrop-blur-sm"
      >
        <div className="flex items-start space-x-3">
          <div className="rounded-xl bg-amber-500/20 p-2 text-amber-600 flex-shrink-0">
            <History className="h-5 w-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-amber-900">
              Bạn có {rolloverTasks.length} việc chưa xong từ trước
            </h4>
            <p className="mt-0.5 text-[11px] text-amber-700/90 truncate">
              {rolloverTasks.map((t) => t.name).join(", ")}
            </p>

            <div className="mt-2.5 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => onRollover(taskIds)}
                className="inline-flex items-center space-x-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm active:scale-95 transition-all"
              >
                <span>Chuyển sang hôm nay</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onDismiss(taskIds)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-500/10 active:scale-95 transition-all"
              >
                Bỏ qua
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onDismiss(taskIds)}
            className="text-amber-500 hover:text-amber-700 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
