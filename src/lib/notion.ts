import { Task, TaskCategory, TimeSlot, Priority } from "@/types";
import { getVietnamTodayStr } from "./date";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
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

