"use server";

import { isSessionValid, authenticatePin, logoutSession } from "@/lib/auth";
import {
  getTasksForDate,
  setTaskStatus,
  createTaskInNotion,
  updateTaskInNotion,
  archiveTaskInNotion,
  restoreTaskInNotion,
} from "@/lib/notion";
import { getVietnamTodayStr } from "@/lib/date";
import { Task, TimeSlot, Priority, TaskCategory } from "@/types";

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Xác thực PIN từ client
 */
export async function loginAction(pin: string): Promise<ActionResult> {
  const result = await authenticatePin(pin);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true };
}

/**
 * Đăng xuất
 */
export async function logoutAction(): Promise<ActionResult> {
  await logoutSession();
  return { success: true };
}

/**
 * Kiểm tra trạng thái đăng nhập
 */
export async function checkAuthAction(): Promise<boolean> {
  return await isSessionValid();
}

/**
 * Lấy danh sách task của ngày (mặc định hôm nay theo giờ VN)
 */
export async function getTodayTasksAction(dateStr?: string): Promise<ActionResult<Task[]>> {
  const isValid = await isSessionValid();
  if (!isValid) {
    return { success: false, error: "Phiên đăng nhập đã hết hạn. Vui lòng nhập lại PIN.", code: "UNAUTHORIZED" };
  }

  try {
    const targetDate = dateStr || getVietnamTodayStr();
    const tasks = await getTasksForDate(targetDate);
    return { success: true, data: tasks };
  } catch (err: any) {
    return { success: false, error: err.message || "Không thể tải danh sách việc từ Notion" };
  }
}

/**
 * Cập nhật checkbox Status của task (Server Action)
 */
export async function updateTaskStatusAction(taskId: string, status: boolean): Promise<ActionResult> {
  const isValid = await isSessionValid();
  if (!isValid) {
    return { success: false, error: "Chưa xác thực", code: "UNAUTHORIZED" };
  }

  try {
    await setTaskStatus(taskId, status);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Lỗi cập nhật trên Notion" };
  }
}

/**
 * Tạo công việc mới (Server Action)
 */
export async function createTaskAction(data: {
  name: string;
  timeSlot?: TimeSlot;
  priority?: Priority;
  category?: TaskCategory;
  date?: string;
}): Promise<ActionResult<Task>> {
  const isValid = await isSessionValid();
  if (!isValid) {
    return { success: false, error: "Chưa xác thực", code: "UNAUTHORIZED" };
  }

  try {
    const newTask = await createTaskInNotion(data);
    return { success: true, data: newTask };
  } catch (err: any) {
    return { success: false, error: err.message || "Lỗi tạo việc mới trên Notion" };
  }
}

/**
 * Cập nhật thông tin chi tiết của task (Server Action)
 */
export async function updateTaskDetailsAction(
  taskId: string,
  updates: Partial<Task>
): Promise<ActionResult> {
  const isValid = await isSessionValid();
  if (!isValid) {
    return { success: false, error: "Chưa xác thực", code: "UNAUTHORIZED" };
  }

  try {
    await updateTaskInNotion(taskId, updates);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Lỗi cập nhật chi tiết trên Notion" };
  }
}

/**
 * Xoá task (Archive trang Notion)
 */
export async function archiveTaskAction(taskId: string): Promise<ActionResult> {
  const isValid = await isSessionValid();
  if (!isValid) {
    return { success: false, error: "Chưa xác thực", code: "UNAUTHORIZED" };
  }

  try {
    await archiveTaskInNotion(taskId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Lỗi xoá task trên Notion" };
  }
}

/**
 * Hoàn tác xoá task (Khôi phục trang Notion)
 */
export async function restoreTaskAction(taskId: string): Promise<ActionResult> {
  const isValid = await isSessionValid();
  if (!isValid) {
    return { success: false, error: "Chưa xác thực", code: "UNAUTHORIZED" };
  }

  try {
    await restoreTaskInNotion(taskId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Lỗi khôi phục task trên Notion" };
  }
}

/**
 * Kiểm tra xác thực cấu hình Notion và đối chiếu cấu trúc Database
 * Chỉ chạy trên Server và bắt buộc có phiên đăng nhập hợp lệ (PIN)
 */
export async function verifyNotionSetupAction(): Promise<
  ActionResult<{
    botName: string;
    dbTitle: string;
    errors: string[];
    warnings: string[];
  }>
> {
  const isValid = await isSessionValid();
  if (!isValid) {
    return { success: false, error: "Chưa xác thực. Vui lòng nhập mã PIN trước.", code: "UNAUTHORIZED" };
  }

  const apiKey = process.env.NOTION_API_KEY;
  const dbId = process.env.NOTION_DATABASE_ID;

  if (!apiKey) {
    return {
      success: false,
      error: "Biến NOTION_API_KEY chưa được điền trong .env.local",
      data: { botName: "", dbTitle: "", errors: ["Chưa cấu hình NOTION_API_KEY"], warnings: [] },
    };
  }

  if (!dbId) {
    return {
      success: false,
      error: "Biến NOTION_DATABASE_ID chưa được điền trong .env.local",
      data: { botName: "", dbTitle: "", errors: ["Chưa cấu hình NOTION_DATABASE_ID"], warnings: [] },
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  let botName = "Notion Integration";
  let dbTitle = "Database";

  // 1. Kiểm tra Token
  try {
    const userRes = await fetch("https://api.notion.com/v1/users/me", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
      },
      cache: "no-store",
    });

    if (userRes.status === 401) {
      return {
        success: false,
        error: "NOTION_API_KEY không hợp lệ hoặc đã bị thu hồi.",
        data: { botName: "", dbTitle: "", errors: ["Token NOTION_API_KEY không hợp lệ (401)"], warnings: [] },
      };
    }

    if (!userRes.ok) {
      return {
        success: false,
        error: `Lỗi kết nối Notion API (${userRes.status})`,
        data: { botName: "", dbTitle: "", errors: [`Notion HTTP ${userRes.status}`], warnings: [] },
      };
    }

    const userData = await userRes.json();
    botName = userData.name || botName;
  } catch (err: any) {
    return {
      success: false,
      error: `Không thể kết nối mạng tới Notion: ${err.message}`,
      data: { botName: "", dbTitle: "", errors: [err.message], warnings: [] },
    };
  }

  // 2. Kiểm tra Database & Cấp quyền
  let dbData: any;
  try {
    const dbRes = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
      },
      cache: "no-store",
    });

    if (dbRes.status === 404) {
      return {
        success: false,
        error: "Không tìm thấy Database (404). Bạn đã bấm '...' -> 'Connect to' -> chọn Integration chưa?",
        data: {
          botName,
          dbTitle: "",
          errors: ["Không tìm thấy Database hoặc chưa cấp quyền (Connect to) cho Integration"],
          warnings: [],
        },
      };
    }

    if (!dbRes.ok) {
      const errText = await dbRes.text();
      return {
        success: false,
        error: `Lỗi đọc database: ${errText}`,
        data: { botName, dbTitle: "", errors: [errText], warnings: [] },
      };
    }

    dbData = await dbRes.json();
    dbTitle = dbData.title?.[0]?.plain_text || "Database không tên";
  } catch (err: any) {
    return {
      success: false,
      error: `Lỗi mạng khi đọc Database: ${err.message}`,
      data: { botName, dbTitle: "", errors: [err.message], warnings: [] },
    };
  }

  // 3. Đối chiếu schema các cột
  const props = dbData.properties || {};

  // Title: Name
  const hasTitle = Object.values(props).some((p: any) => p.type === "title");
  if (!hasTitle) {
    errors.push("Thiếu cột kiểu Title (Tên công việc)");
  }

  // Date: Date
  const dateProp = props.Date || props.date || props.Ngày;
  if (!dateProp || dateProp.type !== "date") {
    errors.push("Thiếu cột 'Date' (kiểu Date)");
  }

  // Status: Checkbox (BẮT BUỘC KHÔNG PHẢI KIỂU STATUS)
  const statusProp = props.Status || props.status || props.Xong;
  if (!statusProp) {
    errors.push("Thiếu cột 'Status'");
  } else if (statusProp.type === "status") {
    errors.push("Cột 'Status' đang là kiểu Status của Notion -> Cần đổi sang kiểu 'Checkbox'!");
  } else if (statusProp.type !== "checkbox") {
    errors.push(`Cột 'Status' đang là kiểu '${statusProp.type}', cần đổi sang 'Checkbox'!`);
  }

  // Category: Select
  const catProp = props.Category || props.category || props["Phân loại"];
  if (!catProp || catProp.type !== "select") {
    errors.push("Thiếu cột 'Category' (kiểu Select)");
  } else {
    const opts = (catProp.select?.options || []).map((o: any) => o.name);
    for (const req of ["Routine", "Planned", "Ad-hoc"]) {
      if (!opts.includes(req)) {
        warnings.push(`Cột Category thiếu tuỳ chọn '${req}'`);
      }
    }
  }

  // TimeSlot: Select
  const slotProp = props.TimeSlot || props.timeslot || props["Khung giờ"] || props["Buổi"];
  if (!slotProp || slotProp.type !== "select") {
    errors.push("Thiếu cột 'TimeSlot' (kiểu Select)");
  } else {
    const opts = (slotProp.select?.options || []).map((o: any) => o.name);
    for (const req of ["Morning", "Afternoon", "Evening", "Inbox"]) {
      if (!opts.includes(req)) {
        warnings.push(`Cột TimeSlot thiếu tuỳ chọn '${req}'`);
      }
    }
  }

  // Priority: Select
  const prioProp = props.Priority || props.priority || props["Mức ưu tiên"];
  if (!prioProp || prioProp.type !== "select") {
    errors.push("Thiếu cột 'Priority' (kiểu Select)");
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: `Database còn thiếu/sai ${errors.length} cột`,
      data: { botName, dbTitle, errors, warnings },
    };
  }

  return {
    success: true,
    data: { botName, dbTitle, errors: [], warnings },
  };
}


