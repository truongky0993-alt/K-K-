"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTodayTasksAction,
  updateTaskStatusAction,
  createTaskAction,
  updateTaskDetailsAction,
  archiveTaskAction,
  restoreTaskAction,
  ensureRoutinesAction,
  getRolloverTasksAction,
  rollOverTasksAction,
  getMonthSummaryAction,
  checkAuthAction,
  logoutAction,
} from "@/actions/tracker";
import { Task, TimeSlot, Priority } from "@/types";
import { getVietnamTodayStr } from "@/lib/date";
import { Header } from "./Header";
import { MonthCalendarBar } from "./MonthCalendarBar";
import { TimeSlotGroup } from "./TimeSlotGroup";
import { PinScreen } from "./PinScreen";
import { QuickAddModal } from "./QuickAddModal";
import { EditTaskModal } from "./EditTaskModal";
import { RolloverBanner } from "./RolloverBanner";
import { RefreshCw, AlertCircle, RotateCcw } from "lucide-react";

export function DailyTracker() {
  const queryClient = useQueryClient();
  const todayStr = getVietnamTodayStr();

  // Ngày đang chọn xem: mặc định là hôm nay, có thể chuyển sang ngày mai
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Trạng thái xác thực PIN
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal chỉnh sửa task
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Rollover tasks (Mục 5.B)
  const [rolloverTasks, setRolloverTasks] = useState<Task[]>([]);

  // Trạng thái hoàn tác xoá (Undo toast 5s - Mục 5.C)
  const [undoState, setUndoState] = useState<{
    task: Task;
    secondsLeft: number;
  } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const undoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Kiểm tra phiên đăng nhập ban đầu
  useEffect(() => {
    checkAuthAction().then((valid) => {
      setIsAuthenticated(valid);
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // 1. Tự động sinh Routine khi mở app hoặc đổi ngày (Mục 2.3 & 3)
  useEffect(() => {
    if (isAuthenticated) {
      ensureRoutinesAction(selectedDate).then((res) => {
        if (res.success && res.data && res.data.createdCount > 0) {
          queryClient.invalidateQueries({ queryKey: ["tasks", selectedDate] });
        }
      });
    }
  }, [isAuthenticated, selectedDate, queryClient]);

  // 2. Kiểm tra việc chưa xong từ các ngày trước để Rollover (Mục 5.B)
  useEffect(() => {
    if (isAuthenticated && selectedDate === todayStr) {
      getRolloverTasksAction().then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          // Lọc các task đã từng bấm "Bỏ qua"
          const ignoredStr = typeof window !== "undefined" ? localStorage.getItem("ignored_rollover_ids") : null;
          const ignoredIds = new Set(ignoredStr ? JSON.parse(ignoredStr) : []);
          const activeRollovers = res.data.filter((t) => !ignoredIds.has(t.id));
          setRolloverTasks(activeRollovers);
        } else {
          setRolloverTasks([]);
        }
      });
    } else {
      setRolloverTasks([]);
    }
  }, [isAuthenticated, selectedDate, todayStr]);

  // 3. Tự động qua ngày mới khi app mở lại (Auto-refresh qua ngày - Mục 6 & 103)
  useEffect(() => {
    const handleCheckDayChange = () => {
      const currentToday = getVietnamTodayStr();
      if (currentToday !== todayStr) {
        setSelectedDate(currentToday);
        queryClient.invalidateQueries();
      }
    };

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        handleCheckDayChange();
      }
    });

    const interval = setInterval(handleCheckDayChange, 60 * 1000);
    return () => {
      clearInterval(interval);
    };
  }, [todayStr, queryClient]);

  // TanStack Query lấy danh sách task theo selectedDate
  const {
    data: tasksResult,
    isLoading,
    isRefetching,
    refetch,
    isError,
    error,
  } = useQuery({
    queryKey: ["tasks", selectedDate],
    queryFn: async () => {
      const res = await getTodayTasksAction(selectedDate);
      if (!res.success) {
        if (res.code === "UNAUTHORIZED") {
          setIsAuthenticated(false);
        }
        throw new Error(res.error || "Không thể tải công việc");
      }
      return res.data || [];
    },
    enabled: isAuthenticated === true,
    refetchInterval: 60 * 1000,
  });

  const tasks: Task[] = tasksResult || [];

  // Parse năm & tháng hiện tại để lấy tổng quan tiến độ của cả tháng cho thanh Calendar
  const [selectedY, selectedM] = (selectedDate || todayStr).split("-").map(Number);

  const { data: monthSummaryResult } = useQuery({
    queryKey: ["month-summary", selectedY, selectedM],
    queryFn: async () => {
      const res = await getMonthSummaryAction(selectedY, selectedM);
      if (!res.success) return {};
      return res.data || {};
    },
    enabled: isAuthenticated === true,
    staleTime: 30 * 1000,
  });

  // ================= MUTATIONS =================

  // 1. Mutation cập nhật tick/untick (Optimistic Update)
  const toggleMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: boolean }) => {
      const res = await updateTaskStatusAction(taskId, newStatus);
      if (!res.success) {
        if (res.code === "UNAUTHORIZED") setIsAuthenticated(false);
        throw new Error(res.error || "Lỗi đồng bộ Notion");
      }
      return res;
    },
    onMutate: async ({ taskId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", selectedDate] });
      const previousTasks = queryClient.getQueryData<Task[]>(["tasks", selectedDate]) || [];

      queryClient.setQueryData<Task[]>(["tasks", selectedDate], (old) => {
        if (!old) return [];
        return old.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
      });

      return { previousTasks };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks", selectedDate], context.previousTasks);
      }
      showToast(`Không thể cập nhật: ${err.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["month-summary", selectedY, selectedM] });
    },
  });

  // 2. Mutation thêm task nhanh
  const createMutation = useMutation({
    mutationFn: async (newTaskData: { name: string; timeSlot: TimeSlot; priority: Priority }) => {
      const res = await createTaskAction({
        name: newTaskData.name,
        timeSlot: newTaskData.timeSlot,
        priority: newTaskData.priority,
        category: "Ad-hoc",
        date: selectedDate,
      });
      if (!res.success) {
        if (res.code === "UNAUTHORIZED") setIsAuthenticated(false);
        throw new Error(res.error || "Lỗi tạo việc mới trên Notion");
      }
      return res.data!;
    },
    onMutate: async (newTaskData) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", selectedDate] });
      const previousTasks = queryClient.getQueryData<Task[]>(["tasks", selectedDate]) || [];

      const tempId = `temp-${Date.now()}`;
      const optimisticTask: Task = {
        id: tempId,
        name: newTaskData.name,
        date: selectedDate,
        status: false,
        category: "Ad-hoc",
        timeSlot: newTaskData.timeSlot,
        priority: newTaskData.priority,
        createdAt: new Date().toISOString(),
        isTemp: true,
      };

      queryClient.setQueryData<Task[]>(["tasks", selectedDate], (old) => {
        return old ? [optimisticTask, ...old] : [optimisticTask];
      });

      return { previousTasks, tempId };
    },
    onSuccess: (realTask, _variables, context) => {
      queryClient.setQueryData<Task[]>(["tasks", selectedDate], (old) => {
        if (!old) return [realTask];
        return old.map((t) => (t.id === context?.tempId ? realTask : t));
      });
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks", selectedDate], context.previousTasks);
      }
      showToast(`Không thể tạo việc: ${err.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["month-summary", selectedY, selectedM] });
    },
  });

  // 3. Mutation cập nhật thông tin chi tiết
  const updateDetailsMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      const res = await updateTaskDetailsAction(taskId, updates);
      if (!res.success) {
        if (res.code === "UNAUTHORIZED") setIsAuthenticated(false);
        throw new Error(res.error || "Lỗi cập nhật trên Notion");
      }
      return res;
    },
    onMutate: async ({ taskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", selectedDate] });
      const previousTasks = queryClient.getQueryData<Task[]>(["tasks", selectedDate]) || [];

      queryClient.setQueryData<Task[]>(["tasks", selectedDate], (old) => {
        if (!old) return [];
        return old.map((t) => (t.id === taskId ? { ...t, ...updates } : t));
      });

      return { previousTasks };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["tasks", selectedDate], context.previousTasks);
      }
      showToast(`Không thể lưu thay đổi: ${err.message}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["month-summary", selectedY, selectedM] });
    },
  });

  // 4. Xoá task kèm Toast hoàn tác 5 giây
  const handleDeleteTask = (taskToDelete: Task) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    queryClient.setQueryData<Task[]>(["tasks", selectedDate], (old) => {
      if (!old) return [];
      return old.filter((t) => t.id !== taskToDelete.id);
    });

    setUndoState({ task: taskToDelete, secondsLeft: 5 });

    undoIntervalRef.current = setInterval(() => {
      setUndoState((prev) => {
        if (!prev) return null;
        if (prev.secondsLeft <= 1) {
          clearInterval(undoIntervalRef.current!);
          return null;
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);

    undoTimerRef.current = setTimeout(async () => {
      setUndoState(null);
      try {
        const res = await archiveTaskAction(taskToDelete.id);
        if (!res.success) {
          showToast(`Lỗi khi xoá task: ${res.error}`);
          queryClient.setQueryData<Task[]>(["tasks", selectedDate], (old) => {
            return old ? [...old, taskToDelete] : [taskToDelete];
          });
        }
      } catch (err: any) {
        showToast(`Lỗi: ${err.message}`);
      }
    }, 5000);
  };

  const handleUndoDelete = () => {
    if (!undoState) return;

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    const taskToRestore = undoState.task;
    setUndoState(null);

    queryClient.setQueryData<Task[]>(["tasks", selectedDate], (old) => {
      return old ? [...old, taskToRestore] : [taskToRestore];
    });

    restoreTaskAction(taskToRestore.id);
  };

  // 5. Rollover handlers (Mục 5.B)
  const handleRolloverTasks = async (taskIds: string[]) => {
    const tasksToMove = rolloverTasks.filter((t) => taskIds.includes(t.id));
    setRolloverTasks([]);

    // Optimistic update vào danh sách hôm nay
    queryClient.setQueryData<Task[]>(["tasks", todayStr], (old) => {
      const moved = tasksToMove.map((t) => ({ ...t, date: todayStr }));
      return old ? [...moved, ...old] : moved;
    });

    try {
      await rollOverTasksAction(taskIds, todayStr);
      showToast(`Đã chuyển ${taskIds.length} việc sang hôm nay`);
    } catch {
      showToast("Lỗi khi chuyển việc sang hôm nay");
    } finally {
      queryClient.invalidateQueries({ queryKey: ["tasks", todayStr] });
    }
  };

  const handleDismissRollover = (taskIds: string[]) => {
    setRolloverTasks([]);
    // Lưu ID đã bỏ qua vào localStorage
    const ignoredStr = typeof window !== "undefined" ? localStorage.getItem("ignored_rollover_ids") : null;
    const ignoredIds: string[] = ignoredStr ? JSON.parse(ignoredStr) : [];
    const updated = Array.from(new Set([...ignoredIds, ...taskIds]));
    localStorage.setItem("ignored_rollover_ids", JSON.stringify(updated));
  };

  const handleToggle = (taskId: string, newStatus: boolean) => {
    toggleMutation.mutate({ taskId, newStatus });
  };

  const handleQuickMoveSlot = (taskId: string, slot: TimeSlot) => {
    updateDetailsMutation.mutate({ taskId, updates: { timeSlot: slot } });
  };

  const handleSaveEdit = (taskId: string, updates: Partial<Task>) => {
    updateDetailsMutation.mutate({ taskId, updates });
  };

  const handleLogout = async () => {
    await logoutAction();
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PinScreen onSuccess={() => setIsAuthenticated(true)} />;
  }

  // Tách task theo từng buổi
  const inboxTasks = tasks.filter((t) => t.timeSlot === "Inbox");
  const morningTasks = tasks.filter((t) => t.timeSlot === "Morning");
  const afternoonTasks = tasks.filter((t) => t.timeSlot === "Afternoon");
  const eveningTasks = tasks.filter((t) => t.timeSlot === "Evening");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col max-w-md mx-auto shadow-sm pb-24 relative">
      {/* Header với bộ chọn Hôm nay / Ngày mai */}
      <Header
        tasks={tasks}
        selectedDate={selectedDate}
        onSelectDate={(newDate) => setSelectedDate(newDate)}
        onLogout={handleLogout}
      />

      {/* Thanh công cụ Calendar theo tháng (Vuốt ngang / Lưới cả tháng) */}
      <MonthCalendarBar
        selectedDate={selectedDate}
        onSelectDate={(newDate) => setSelectedDate(newDate)}
        monthSummary={monthSummaryResult || {}}
      />

      {/* Banner Rollover việc cũ chưa xong (Mục 5.B) */}
      <RolloverBanner
        rolloverTasks={rolloverTasks}
        onRollover={handleRolloverTasks}
        onDismiss={handleDismissRollover}
      />

      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed top-24 left-4 right-4 z-40 max-w-md mx-auto rounded-lg bg-rose-600 px-4 py-2.5 text-xs text-white shadow-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/80 hover:text-white text-xs ml-2 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Toast Hoàn tác xoá 5s */}
      {undoState && (
        <div
          className="fixed left-4 right-4 z-40 max-w-md mx-auto rounded-xl bg-slate-900 px-4 py-3 text-xs text-white shadow-2xl flex items-center justify-between border border-slate-700 animate-slide-up"
          style={{
            bottom: "max(88px, calc(env(safe-area-inset-bottom) + 80px))",
          }}
        >
          <span className="truncate pr-2">
            Đã xoá <span className="font-semibold text-slate-200">"{undoState.task.name}"</span>
          </span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="flex items-center space-x-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 font-bold text-white shadow active:scale-95 transition-all flex-shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Hoàn tác ({undoState.secondsLeft}s)</span>
          </button>
        </div>
      )}

      {/* Trạng thái tải lần đầu */}
      {isLoading ? (
        <div className="flex flex-1 flex-col items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          <p className="mt-2 text-xs text-slate-400 font-medium">Đang tải công việc từ Notion...</p>
        </div>
      ) : isError ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
          <AlertCircle className="h-10 w-10 text-rose-500 mb-2" />
          <p className="text-sm font-semibold text-slate-800">Không thể kết nối Notion</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">{(error as any)?.message}</p>
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow hover:bg-slate-800 active:scale-95 transition-all"
          >
            Thử lại
          </button>
        </div>
      ) : (
        /* Thân danh sách nhóm theo buổi (Section 5.C) */
        <main className="flex-1 px-4 pt-3">
          {/* Trạng thái đang đồng bộ ngầm */}
          {isRefetching && (
            <div className="mb-2 flex items-center justify-end text-[11px] text-slate-400 pr-1">
              <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
              Đang làm mới dữ liệu...
            </div>
          )}

          {/* 1. 📥 Hộp thư (Inbox) */}
          <TimeSlotGroup
            slot="Inbox"
            title="📥 Hộp thư (Inbox)"
            tasks={inboxTasks}
            onToggle={handleToggle}
            onEdit={(task) => setEditingTask(task)}
            onMoveSlot={handleQuickMoveSlot}
          />

          {/* 2. 🌅 Buổi Sáng */}
          <TimeSlotGroup
            slot="Morning"
            title="🌅 Buổi Sáng"
            tasks={morningTasks}
            onToggle={handleToggle}
            onEdit={(task) => setEditingTask(task)}
            onMoveSlot={handleQuickMoveSlot}
          />

          {/* 3. ☀️ Buổi Chiều */}
          <TimeSlotGroup
            slot="Afternoon"
            title="☀️ Buổi Chiều"
            tasks={afternoonTasks}
            onToggle={handleToggle}
            onEdit={(task) => setEditingTask(task)}
            onMoveSlot={handleQuickMoveSlot}
          />

          {/* 4. 🌙 Buổi Tối */}
          <TimeSlotGroup
            slot="Evening"
            title="🌙 Buổi Tối"
            tasks={eveningTasks}
            onToggle={handleToggle}
            onEdit={(task) => setEditingTask(task)}
            onMoveSlot={handleQuickMoveSlot}
          />

          {/* Nếu hoàn toàn không có task nào trong ngày */}
          {tasks.length === 0 && (
            <div className="mt-16 text-center text-slate-400">
              <p className="text-sm font-medium">
                {selectedDate === todayStr
                  ? "Hôm nay chưa có việc nào"
                  : `Ngày ${selectedDate.split("-").slice(1).reverse().join("/")} chưa có việc nào`}
              </p>
              <p className="text-xs mt-1 text-slate-300">
                Bấm nút "+" để thêm việc hoặc mở bảng Routine Templates trên Notion
              </p>
            </div>
          )}
        </main>
      )}

      {/* FAB + Bottom Sheet thêm việc nhanh */}
      <QuickAddModal onAdd={(data) => createMutation.mutate(data)} />

      {/* Bottom Sheet chỉnh sửa và xoá task */}
      <EditTaskModal
        task={editingTask}
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        onSave={handleSaveEdit}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}
