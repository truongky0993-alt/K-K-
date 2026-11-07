"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDailyJournalAction, saveDailyJournalAction } from "@/actions/tracker";
import { DailyJournal, MoodType } from "@/types";
import { BookOpen, Check, Loader2, Sparkles, ChevronDown, ChevronUp, ExternalLink, Calendar } from "lucide-react";

interface DailyJournalSectionProps {
  selectedDate: string;
  onToast: (msg: string) => void;
}

const MOOD_OPTIONS: { type: MoodType; label: string; bg: string; border: string; text: string }[] = [
  { type: "🌟 Xuất sắc", label: "🌟 Xuất sắc", bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-700" },
  { type: "😊 Hài lòng", label: "😊 Hài lòng", bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700" },
  { type: "😐 Bình thường", label: "😐 Bình thường", bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700" },
  { type: "⚠️ Cần cố gắng", label: "⚠️ Cần cố gắng", bg: "bg-rose-50", border: "border-rose-300", text: "text-rose-700" },
];

export function DailyJournalSection({ selectedDate, onToast }: DailyJournalSectionProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Form states
  const [mood, setMood] = useState<MoodType>("😊 Hài lòng");
  const [learned, setLearned] = useState<string>("");
  const [unfinished, setUnfinished] = useState<string>("");
  const [obstacles, setObstacles] = useState<string>("");
  const [actionPlan, setActionPlan] = useState<string>("");

  // Format date display: YYYY-MM-DD -> DD/MM/YYYY
  const [y, m, d] = selectedDate.split("-");
  const dateFormatted = `${d}/${m}/${y}`;

  // Query journal for selectedDate
  const {
    data: journalResult,
    isLoading,
    isRefetching,
  } = useQuery({
    queryKey: ["daily-journal", selectedDate],
    queryFn: async () => {
      const res = await getDailyJournalAction(selectedDate);
      if (!res.success) return null;
      return res.data || null;
    },
    staleTime: 60 * 1000,
  });

  // Sync form state when data arrives or selectedDate changes
  useEffect(() => {
    if (journalResult) {
      setMood(journalResult.mood || "😊 Hài lòng");
      setLearned(journalResult.learned || "");
      setUnfinished(journalResult.unfinished || "");
      setObstacles(journalResult.obstacles || "");
      setActionPlan(journalResult.actionPlan || "");
    } else {
      setMood("😊 Hài lòng");
      setLearned("");
      setUnfinished("");
      setObstacles("");
      setActionPlan("");
    }
  }, [journalResult, selectedDate]);

  // Mutation to save
  const saveMutation = useMutation({
    mutationFn: async (payload: DailyJournal) => {
      const res = await saveDailyJournalAction(payload);
      if (!res.success) {
        throw new Error(res.error || "Không thể lưu nhật ký lên Notion");
      }
      return res.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-journal", selectedDate] });
      onToast("✨ Đã lưu nhật ký hôm nay lên Notion thành công!");
    },
    onError: (err: any) => {
      onToast(`Lỗi: ${err.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      date: selectedDate,
      mood,
      learned,
      unfinished,
      obstacles,
      actionPlan,
      aiFeedback: journalResult?.aiFeedback,
    });
  };

  const hasContent = Boolean(learned || unfinished || obstacles || actionPlan);

  return (
    <section id="daily-journal-section" className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all scroll-mt-24">
      {/* Header card */}
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-800">
                Nhật Ký Học Tập & Đánh Giá
              </h2>
              {journalResult && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Đã ghi nhận
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Tổng kết ngày {dateFormatted} & lên kế hoạch ngày mai
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 border-t border-slate-100 pt-3.5">
          {isLoading && (
            <div className="flex items-center justify-center py-4 text-xs text-slate-400">
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin text-indigo-500" />
              Đang tải nhật ký từ Notion...
            </div>
          )}

          {/* 1. Đánh giá chung / Tâm trạng */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              1. Hôm nay bạn tự đánh giá thế nào?
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MOOD_OPTIONS.map((opt) => {
                const isSelected = mood === opt.type;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setMood(opt.type)}
                    className={`flex items-center justify-center rounded-xl border px-2.5 py-2 text-xs font-medium transition-all ${
                      isSelected
                        ? `${opt.bg} ${opt.border} ${opt.text} font-bold shadow-sm ring-2 ring-indigo-400/30`
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Học được gì? */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              2. Hôm nay học được gì? (Kiến thức mới & bài học tâm đắc)
            </label>
            <textarea
              rows={2}
              value={learned}
              onChange={(e) => setLearned(e.target.value)}
              placeholder="Vd: Hiểu cơ chế synap hóa học EPSY103, bóc tách S-FV YouPass, đọc xong Chương 3 Carl Rogers..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {/* 3. Chưa học gì / Còn tồn đọng? */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              3. Chưa học gì / Còn tồn đọng?
            </label>
            <textarea
              rows={2}
              value={unfinished}
              onChange={(e) => setUnfinished(e.target.value)}
              placeholder="Vd: Chưa làm trắc nghiệm LMS Bài 1, còn 1 bài tập viết câu YouPass..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {/* 4. Thiếu sót chỗ nào? */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              4. Thiếu sót chỗ nào? (Nguyên nhân & trở ngại)
            </label>
            <textarea
              rows={2}
              value={obstacles}
              onChange={(e) => setObstacles(e.target.value)}
              placeholder="Vd: Buổi chiều mất tập trung lướt điện thoại 30 phút, dậy trễ 15 phút..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {/* 5. Ngày mai sẽ sửa đổi những gì? */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              5. Ngày mai sẽ sửa đổi những gì? (Kế hoạch hành động)
            </label>
            <textarea
              rows={2}
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              placeholder="Vd: Đặt điện thoại xa bàn học, ưu tiên làm trắc nghiệm LMS ngay lúc 14h chiều..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {/* AI Feedback nếu có */}
          {journalResult?.aiFeedback && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs">
              <div className="flex items-center space-x-1.5 text-indigo-700 font-bold mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Nhận xét & Đánh giá từ Cố vấn AI</span>
              </div>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                {journalResult.aiFeedback}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-1">
            <a
              href="https://app.notion.com/p/411a5c9b28fb817cb6bff5ab613f2973"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-[11px] font-medium text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <span>Xem sổ trên Notion</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-sm active:scale-95 transition-all disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Lưu Nhật Ký Vào Notion</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
