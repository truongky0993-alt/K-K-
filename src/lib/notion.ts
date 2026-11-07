import { Task, TaskCategory, TimeSlot, Priority, RoutineTemplate, DailyJournal, MoodType } from "@/types";
import { getVietnamTodayStr, getVietnamDayCodeFromStr, getVietnamDaysAgo } from "./date";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || "40ca5c9b-28fb-81bc-9f77-e399d9a29502";
const NOTION_ROUTINE_DB_ID = process.env.NOTION_ROUTINE_DB_ID || "40ca5c9b-28fb-8191-baeb-e34ef16d7408";
const NOTION_JOURNAL_DB_ID = process.env.NOTION_JOURNAL_DB_ID || "411a5c9b-28fb-817c-b6bf-f5ab613f2973";
const NOTION_VERSION = "2022-06-28";

// Mock data khi người dùng chưa điền NOTION_API_KEY hoặc NOTION_DATABASE_ID
const MOCK_TASKS_STORE: Task[] = [
  {
    id: "mock-1",
    name: "Uống 500ml nước ấm & khởi động",
    date: getVietnamTodayStr(),
    status: true,
    category: "Routine",
    timeSlot: "Morning",
    priority: "Normal",
  },
  {
    id: "mock-2",
    name: "Luyện nghe tiếng Anh 30 phút",
    date: getVietnamTodayStr(),
    status: false,
    category: "Routine",
    timeSlot: "Morning",
    priority: "High",
  },
  {
    id: "mock-3",
    name: "Họp review tiến độ tuần với team",
    date: getVietnamTodayStr(),
    status: false,
    category: "Planned",
    timeSlot: "Afternoon",
    priority: "High",
  },
  {
    id: "mock-4",
    name: "Đọc sách phát triển bản thân 20 trang",
    date: getVietnamTodayStr(),
    status: false,
    category: "Routine",
    timeSlot: "Evening",
    priority: "Normal",
  },
  {
    id: "mock-5",
    name: "Ghi chép chi tiêu trong ngày",
    date: getVietnamTodayStr(),
    status: false,
    category: "Routine",
    timeSlot: "Evening",
    priority: "Low",
  },
  {
    id: "mock-6",
    name: "Gửi email báo giá khách hàng",
    date: getVietnamTodayStr(),
    status: false,
    category: "Ad-hoc",
    timeSlot: "Inbox",
    priority: "High",
  },
];

/**
 * Gọi Notion API trực tiếp bằng fetch với header chuẩn 2022-06-28
 */
async function callNotionApi(
  endpoint: string,
  method: string = "GET",
  body?: any,
  retries: number = 3
): Promise<any> {
  if (!NOTION_API_KEY) {
    throw new Error("NOTION_API_KEY chưa được cấu hình trong .env.local");
  }

  const url = `https://api.notion.com/v1${endpoint}`;
  let lastError: any = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
      });

      // Xử lý 429 Rate Limit
      if (res.status === 429) {
        const retryAfterHeader = res.headers.get("Retry-After");
        const waitMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : 1000 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Notion API error (${res.status}): ${errorText}`);
      }

      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        // Backoff retry: 350ms, 700ms, 1400ms
        await new Promise((r) => setTimeout(r, 350 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError;
}

/**
 * Trích xuất thuộc tính của trang Notion sang cấu trúc Task
 */
function parseNotionPageToTask(page: any): Task {
  const props = page.properties || {};

  // Name (Title)
  let name = "Không có tiêu đề";
  const titleProp = props.Name || props.title || props.Tên;
  if (titleProp?.title && Array.isArray(titleProp.title) && titleProp.title.length > 0) {
    name = titleProp.title.map((t: any) => t.plain_text).join("").trim() || name;
  }

  // Date (Date)
  let date = getVietnamTodayStr();
  const dateProp = props.Date || props.date || props.Ngày;
  if (dateProp?.date?.start) {
    date = dateProp.date.start.split("T")[0];
  }

  // Status (Checkbox)
  let status = false;
  const statusProp = props.Status || props.status || props.Xong;
  if (statusProp?.type === "checkbox") {
    status = Boolean(statusProp.checkbox);
  }

  // Category (Select: Routine, Planned, Ad-hoc)
  let category: TaskCategory = "Planned";
  const catProp = props.Category || props.category || props["Phân loại"];
  if (catProp?.select?.name) {
    const val = catProp.select.name;
    if (val === "Routine" || val === "Planned" || val === "Ad-hoc") {
      category = val;
    }
  }

  // TimeSlot (Select: Morning, Afternoon, Evening, Inbox)
  let timeSlot: TimeSlot = "Inbox";
  const slotProp = props.TimeSlot || props.timeslot || props["Khung giờ"] || props["Buổi"];
  if (slotProp?.select?.name) {
    const val = slotProp.select.name;
    if (val === "Morning" || val === "Afternoon" || val === "Evening" || val === "Inbox") {
      timeSlot = val;
    }
  }

  // Priority (Select: High, Normal, Low)
  let priority: Priority = "Normal";
  const prioProp = props.Priority || props.priority || props["Mức ưu tiên"];
  if (prioProp?.select?.name) {
    const val = prioProp.select.name;
    if (val === "High" || val === "Normal" || val === "Low") {
      priority = val;
    }
  }

  return {
    id: page.id,
    name,
    date,
    status,
    category,
    timeSlot,
    priority,
    createdAt: page.created_time,
  };
}

/**
 * Đọc toàn bộ task của ngày chỉ định (YYYY-MM-DD theo Asia/Ho_Chi_Minh)
 * Xử lý phân trang (has_more / next_cursor)
 */
export async function getTasksForDate(dateStr: string): Promise<Task[]> {
  // Nếu chưa có env key, trả về mock data cho mục đích kiểm thử UI
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    return MOCK_TASKS_STORE.map((t) => ({ ...t, date: dateStr }));
  }

  const tasks: Task[] = [];
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    const payload: any = {
      filter: {
        property: "Date",
        date: {
          equals: dateStr,
        },
      },
      page_size: 100,
    };

    if (startCursor) {
      payload.start_cursor = startCursor;
    }

    const data = await callNotionApi(
      `/databases/${NOTION_DATABASE_ID}/query`,
      "POST",
      payload
    );

    if (data.results && Array.isArray(data.results)) {
      for (const page of data.results) {
        tasks.push(parseNotionPageToTask(page));
      }
    }

    hasMore = Boolean(data.has_more);
    startCursor = data.next_cursor || undefined;
  }

  return tasks;
}

/**
 * Cập nhật trạng thái hoàn thành (Status checkbox) của task
 */
export async function setTaskStatus(taskId: string, status: boolean): Promise<boolean> {
  // Mock mode
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID || taskId.startsWith("mock-") || taskId.startsWith("temp-")) {
    const target = MOCK_TASKS_STORE.find((t) => t.id === taskId);
    if (target) {
      target.status = status;
    }
    return true;
  }

  await callNotionApi(`/pages/${taskId}`, "PATCH", {
    properties: {
      Status: {
        checkbox: status,
      },
    },
  });

  return true;
}

/**
 * Tạo một task mới trong Notion
 */
export async function createTaskInNotion(taskData: {
  name: string;
  date?: string;
  category?: TaskCategory;
  timeSlot?: TimeSlot;
  priority?: Priority;
}): Promise<Task> {
  const targetDate = taskData.date || getVietnamTodayStr();
  const category = taskData.category || "Ad-hoc";
  const timeSlot = taskData.timeSlot || "Inbox";
  const priority = taskData.priority || "Normal";

  // Mock mode
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    const newTask: Task = {
      id: `mock-${Date.now()}`,
      name: taskData.name,
      date: targetDate,
      status: false,
      category,
      timeSlot,
      priority,
      createdAt: new Date().toISOString(),
    };
    MOCK_TASKS_STORE.push(newTask);
    return newTask;
  }

  const payload = {
    parent: { database_id: NOTION_DATABASE_ID },
    properties: {
      Name: {
        title: [
          {
            text: {
              content: taskData.name,
            },
          },
        ],
      },
      Date: {
        date: {
          start: targetDate,
        },
      },
      Status: {
        checkbox: false,
      },
      Category: {
        select: {
          name: category,
        },
      },
      TimeSlot: {
        select: {
          name: timeSlot,
        },
      },
      Priority: {
        select: {
          name: priority,
        },
      },
    },
  };

  const response = await callNotionApi("/pages", "POST", payload);
  return parseNotionPageToTask(response);
}

/**
 * Cập nhật thuộc tính của task trong Notion
 */
export async function updateTaskInNotion(
  taskId: string,
  updates: Partial<Task>
): Promise<boolean> {
  // Mock mode
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID || taskId.startsWith("mock-") || taskId.startsWith("temp-")) {
    const target = MOCK_TASKS_STORE.find((t) => t.id === taskId);
    if (target) {
      if (updates.name !== undefined) target.name = updates.name;
      if (updates.timeSlot !== undefined) target.timeSlot = updates.timeSlot;
      if (updates.priority !== undefined) target.priority = updates.priority;
      if (updates.category !== undefined) target.category = updates.category;
      if (updates.date !== undefined) target.date = updates.date;
      if (updates.status !== undefined) target.status = updates.status;
    }
    return true;
  }

  const properties: any = {};

  if (updates.name !== undefined) {
    properties.Name = {
      title: [{ text: { content: updates.name } }],
    };
  }

  if (updates.timeSlot !== undefined) {
    properties.TimeSlot = {
      select: { name: updates.timeSlot },
    };
  }

  if (updates.priority !== undefined) {
    properties.Priority = {
      select: { name: updates.priority },
    };
  }

  if (updates.category !== undefined) {
    properties.Category = {
      select: { name: updates.category },
    };
  }

  if (updates.date !== undefined) {
    properties.Date = {
      date: { start: updates.date },
    };
  }

  if (updates.status !== undefined) {
    properties.Status = {
      checkbox: updates.status,
    };
  }

  await callNotionApi(`/pages/${taskId}`, "PATCH", { properties });
  return true;
}

/**
 * Xoá task (Archive page trên Notion)
 */
export async function archiveTaskInNotion(taskId: string): Promise<boolean> {
  // Mock mode
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID || taskId.startsWith("mock-") || taskId.startsWith("temp-")) {
    const index = MOCK_TASKS_STORE.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      MOCK_TASKS_STORE.splice(index, 1);
    }
    return true;
  }

  await callNotionApi(`/pages/${taskId}`, "PATCH", {
    archived: true,
  });
  return true;
}

/**
 * Hoàn tác xoá task (Unarchive page trên Notion)
 */
export async function restoreTaskInNotion(taskId: string): Promise<boolean> {
  // Mock mode
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID || taskId.startsWith("mock-") || taskId.startsWith("temp-")) {
    // Không cần xử lý thêm trong mock
    return true;
  }

  await callNotionApi(`/pages/${taskId}`, "PATCH", {
    archived: false,
  });
  return true;
}

// In-flight lock để chống tạo trùng khi mở nhiều tab cùng lúc (Mục 2.3)
const inFlightRoutineLock = new Set<string>();

/**
 * Đọc các Routine Templates đang hoạt động từ Notion
 */
export async function getActiveRoutineTemplates(): Promise<RoutineTemplate[]> {
  const routineDbId = NOTION_ROUTINE_DB_ID || process.env.NOTION_ROUTINE_DB_ID;
  if (!NOTION_API_KEY || !routineDbId) {
    return [];
  }

  const payload = {
    filter: {
      property: "Active",
      checkbox: {
        equals: true,
      },
    },
  };

  try {
    const data = await callNotionApi(`/databases/${routineDbId}/query`, "POST", payload);
    const templates: RoutineTemplate[] = [];

    for (const page of data.results || []) {
      const props = page.properties || {};
      const name = props.Name?.title?.[0]?.plain_text || "Thói quen";
      const timeSlot = (props.TimeSlot?.select?.name as TimeSlot) || "Morning";
      const priority = (props.Priority?.select?.name as Priority) || "Normal";
      const active = Boolean(props.Active?.checkbox);
      const days = (props.Days?.multi_select || []).map((d: any) => d.name);

      templates.push({
        id: page.id,
        name,
        timeSlot,
        priority,
        active,
        days,
      });
    }

    return templates;
  } catch (err: any) {
    console.error("Lỗi khi đọc Routine Templates:", err.message);
    return [];
  }
}

/**
 * Sinh Routine tự động cho ngày chỉ định (Idempotent, chống tạo trùng - Mục 2.3)
 */
export async function ensureRoutinesForDate(dateStr: string): Promise<number> {
  const routineDbId = NOTION_ROUTINE_DB_ID || process.env.NOTION_ROUTINE_DB_ID;
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID || !routineDbId) {
    return 0;
  }

  // Khóa in-flight phía server
  if (inFlightRoutineLock.has(dateStr)) {
    return 0;
  }
  inFlightRoutineLock.add(dateStr);

  try {
    const dayCode = getVietnamDayCodeFromStr(dateStr); // T2, T3, T4, T5, T6, T7, CN
    const templates = await getActiveRoutineTemplates();

    // Lọc template hợp lệ với thứ của ngày dateStr (Days rỗng = mọi ngày)
    const validTemplates = templates.filter(
      (t) => t.days.length === 0 || t.days.includes(dayCode)
    );

    if (validTemplates.length === 0) {
      return 0;
    }

    // Query task hôm nay có Category = Routine
    const existingTasks = await getTasksForDate(dateStr);
    const existingRoutineNames = new Set(
      existingTasks
        .filter((t) => t.category === "Routine")
        .map((t) => t.name.trim().toLowerCase())
    );

    let createdCount = 0;
    for (const template of validTemplates) {
      const normalizedName = template.name.trim().toLowerCase();
      // Nếu chưa có task cùng tên trong ngày, tạo mới
      if (!existingRoutineNames.has(normalizedName)) {
        await createTaskInNotion({
          name: template.name,
          date: dateStr,
          category: "Routine",
          timeSlot: template.timeSlot,
          priority: template.priority,
        });
        existingRoutineNames.add(normalizedName);
        createdCount++;
      }
    }

    return createdCount;
  } finally {
    inFlightRoutineLock.delete(dateStr);
  }
}

/**
 * Lấy các task chưa xong từ các ngày trước (tối đa 7 ngày gần nhất) để Rollover (Mục 5.B)
 * Loại trừ task Routine (Category ≠ Routine)
 */
export async function getRolloverTasksFromNotion(todayStr: string): Promise<Task[]> {
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    return [];
  }

  const sevenDaysAgoStr = getVietnamDaysAgo(7);

  const payload = {
    filter: {
      and: [
        {
          property: "Date",
          date: {
            before: todayStr,
          },
        },
        {
          property: "Date",
          date: {
            on_or_after: sevenDaysAgoStr,
          },
        },
        {
          property: "Status",
          checkbox: {
            equals: false,
          },
        },
      ],
    },
  };

  try {
    const data = await callNotionApi(`/databases/${NOTION_DATABASE_ID}/query`, "POST", payload);
    const tasks: Task[] = [];

    for (const page of data.results || []) {
      const task = parseNotionPageToTask(page);
      // Chỉ lấy task không phải Routine (theo mục 5.B)
      if (task.category !== "Routine") {
        tasks.push(task);
      }
    }

    return tasks;
  } catch (err: any) {
    console.error("Lỗi khi đọc Rollover tasks:", err.message);
    return [];
  }
}

/**
 * Chuyển các task cũ sang ngày hôm nay (Rollover action)
 */
export async function rollOverTasksToDate(taskIds: string[], targetDate: string): Promise<boolean> {
  for (const taskId of taskIds) {
    await updateTaskInNotion(taskId, { date: targetDate });
  }
  return true;
}

/**
 * Lấy tóm tắt số lượng công việc của từng ngày trong một tháng từ Notion
 */
export async function getMonthTaskSummaryFromNotion(
  year: number,
  month: number
): Promise<Record<string, { total: number; completed: number; hasHighPriority: boolean }>> {
  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    return {};
  }

  const mStr = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  const startDate = `${year}-${mStr}-01`;
  const endDate = `${year}-${mStr}-${String(lastDay).padStart(2, "0")}`;

  const summary: Record<string, { total: number; completed: number; hasHighPriority: boolean }> = {};

  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    const payload: any = {
      start_cursor: startCursor,
      page_size: 100,
      filter: {
        and: [
          { property: "Date", date: { on_or_after: startDate } },
          { property: "Date", date: { on_or_before: endDate } },
        ],
      },
    };

    try {
      const data = await callNotionApi(`/databases/${NOTION_DATABASE_ID}/query`, "POST", payload);
      for (const page of data.results || []) {
        const date = page.properties?.Date?.date?.start?.split("T")[0];
        if (!date) continue;

        if (!summary[date]) {
          summary[date] = { total: 0, completed: 0, hasHighPriority: false };
        }
        summary[date].total++;

        const isCompleted = Boolean(page.properties?.Status?.checkbox);
        if (isCompleted) {
          summary[date].completed++;
        }

        const prio = page.properties?.Priority?.select?.name;
        const title = page.properties?.Name?.title?.[0]?.plain_text || "";
        if (
          prio === "High" ||
          title.includes("🔥") ||
          title.toLowerCase().includes("giảng viên") ||
          title.toLowerCase().includes("bế giảng")
        ) {
          summary[date].hasHighPriority = true;
        }
      }

      hasMore = Boolean(data.has_more);
      startCursor = data.next_cursor;
    } catch (err: any) {
      console.error("Lỗi khi đọc tóm tắt tháng từ Notion:", err.message);
      break;
    }
  }

  return summary;
}

/**
 * Lấy nhật ký của một ngày cụ thể (YYYY-MM-DD)
 */
export async function getJournalForDate(dateStr: string): Promise<DailyJournal | null> {
  const journalDbId = NOTION_JOURNAL_DB_ID;
  if (!NOTION_API_KEY || !journalDbId) {
    return null;
  }

  try {
    const data = await callNotionApi(`/databases/${journalDbId}/query`, "POST", {
      filter: {
        property: "Date",
        date: {
          equals: dateStr,
        },
      },
      page_size: 1,
    });

    const results = data.results || [];
    if (results.length === 0) return null;

    const page = results[0];
    const props = page.properties || {};

    const moodName = (props.Mood?.select?.name as MoodType) || "😊 Hài lòng";
    const learned = props.Learned?.rich_text?.map((t: any) => t.plain_text).join("") || "";
    const unfinished = props.Unfinished?.rich_text?.map((t: any) => t.plain_text).join("") || "";
    const obstacles = props.Obstacles?.rich_text?.map((t: any) => t.plain_text).join("") || "";
    const actionPlan = props.ActionPlan?.rich_text?.map((t: any) => t.plain_text).join("") || "";
    const aiFeedback = props.AIFeedback?.rich_text?.map((t: any) => t.plain_text).join("") || "";

    return {
      id: page.id,
      date: dateStr,
      mood: moodName,
      learned,
      unfinished,
      obstacles,
      actionPlan,
      aiFeedback,
      updatedAt: page.last_edited_time,
    };
  } catch (err) {
    console.error("Lỗi khi lấy nhật ký từ Notion:", err);
    return null;
  }
}

/**
 * Lưu hoặc cập nhật nhật ký cho một ngày (YYYY-MM-DD)
 */
export async function saveJournalInNotion(journal: DailyJournal): Promise<DailyJournal> {
  const journalDbId = NOTION_JOURNAL_DB_ID;
  if (!NOTION_API_KEY || !journalDbId) {
    throw new Error("Chưa cấu hình NOTION_API_KEY hoặc NOTION_JOURNAL_DB_ID");
  }

  // Kiểm tra xem ngày này đã có trang nhật ký chưa
  const existing = await getJournalForDate(journal.date);

  const [y, m, d] = journal.date.split("-");
  const formattedDateTitle = `Nhật ký ngày ${d}/${m}/${y}`;

  const properties: any = {
    Name: {
      title: [{ text: { content: formattedDateTitle } }],
    },
    Date: {
      date: { start: journal.date },
    },
    Mood: {
      select: { name: journal.mood },
    },
    Learned: {
      rich_text: [{ text: { content: journal.learned || "" } }],
    },
    Unfinished: {
      rich_text: [{ text: { content: journal.unfinished || "" } }],
    },
    Obstacles: {
      rich_text: [{ text: { content: journal.obstacles || "" } }],
    },
    ActionPlan: {
      rich_text: [{ text: { content: journal.actionPlan || "" } }],
    },
  };

  if (journal.aiFeedback) {
    properties.AIFeedback = {
      rich_text: [{ text: { content: journal.aiFeedback } }],
    };
  }

  if (existing?.id) {
    // Update existing page
    const updated = await callNotionApi(`/pages/${existing.id}`, "PATCH", {
      properties,
    });
    return {
      ...journal,
      id: updated.id,
      updatedAt: updated.last_edited_time,
    };
  } else {
    // Create new page
    const created = await callNotionApi("/pages", "POST", {
      parent: { database_id: journalDbId },
      properties,
    });
    return {
      ...journal,
      id: created.id,
      updatedAt: created.last_edited_time,
    };
  }
}



