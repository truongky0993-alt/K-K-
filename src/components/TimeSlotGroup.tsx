"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Task, TimeSlot, Priority } from "@/types";
import { TaskCard } from "./TaskCard";

interface TimeSlotGroupProps {
  slot: TimeSlot;
  title: string;
  tasks: Task[];
  onToggle: (taskId: string, newStatus: boolean) => void;
  onEdit?: (task: Task) => void;
  onMoveSlot?: (taskId: string, slot: TimeSlot) => void;
}

const PRIORITY_WEIGHT: Record<Priority, number> = {
  High: 3,
  Normal: 2,
  Low: 1,
};

export function TimeSlotGroup({ slot, title, tasks, onToggle, onEdit, onMoveSlot }: TimeSlotGroupProps) {
  // Trạng thái giữ vị trí chưa chuyển xuống cuối trong 1 giây
  // Set các taskId đang trong thời gian 1s delay
  const [pendingMoveIds, setPendingMoveIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Lắng nghe thay đổi status để kích hoạt delay 1s trước khi trôi xuống
  const handleToggleWithDelay = (taskId: string, newStatus: boolean) => {
    if (newStatus) {
      // Vừa tick xong: đưa vào pendingMoveIds trong 1s
      setPendingMoveIds((prev) => new Set(prev).add(taskId));

      const timer = setTimeout(() => {
        setPendingMoveIds((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
        timersRef.current.delete(taskId);
      }, 1000);

      timersRef.current.set(taskId, timer);
    } else {
      // Huỷ tick trong vòng 1s: huỷ timer và huỷ pending move
      if (timersRef.current.has(taskId)) {
        clearTimeout(timersRef.current.get(taskId)!);
        timersRef.current.delete(taskId);
      }
      setPendingMoveIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }

    onToggle(taskId, newStatus);
  };

  // Clear timers khi unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  // Sắp xếp task trong nhóm:
  // - Chưa xong (hoặc đang pending move 1s): xếp theo Priority (High > Normal > Low) -> thời gian
  // - Đã xong (và đã qua 1s): nằm ở cuối nhóm
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aEffectivelyDone = a.status && !pendingMoveIds.has(a.id);
      const bEffectivelyDone = b.status && !pendingMoveIds.has(b.id);

      // Nếu trạng thái hoàn thành khác nhau: đã xong nằm cuối
      if (aEffectivelyDone !== bEffectivelyDone) {
        return aEffectivelyDone ? 1 : -1;
      }

      // Cả hai cùng chưa xong: sắp xếp theo Priority (High > Normal > Low)
      if (!aEffectivelyDone && !bEffectivelyDone) {
        const pDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
        if (pDiff !== 0) return pDiff;
      }

      // Theo thời gian tạo
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    });
  }, [tasks, pendingMoveIds]);

  // Nếu khung giờ rỗng: ẨN HOÀN TOÀN (theo mục 1 và 5.C)
  if (tasks.length === 0) {
    return null;
  }

  return (
    <section className="mb-5">
      <div className="mb-2 px-1 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </h2>
        <span className="text-[11px] font-medium text-slate-400">
          {tasks.filter((t) => t.status).length}/{tasks.length}
        </span>
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={handleToggleWithDelay}
              onEdit={onEdit}
              onMoveSlot={onMoveSlot}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
