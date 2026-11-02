import { execSync } from "child_process";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DB_ID = process.env.NOTION_DATABASE_ID || "40ca5c9b-28fb-81bc-9f77-e399d9a29502";
const NOTION_VERSION = "2022-06-28";

if (!NOTION_API_KEY) {
  console.error("NOTION_API_KEY is required in environment variables.");
  process.exit(1);
}

// 1. Lấy dữ liệu từ details_data.py
const pyOutput = execSync(`python3 -c '
import details_data, json
print(json.dumps(details_data.daily_details))
'`, { encoding: "utf-8" });

const dailyDetails = JSON.parse(pyOutput);

// 2. Lấy tất cả task hiện có trong DB trong tháng 11/2026 để tránh trùng
async function getExistingTasks() {
  const existing = new Set();
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const res = await fetch(`https://api.notion.com/v1/databases/${DB_ID}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start_cursor: startCursor,
        page_size: 100,
        filter: {
          and: [
            { property: "Date", date: { on_or_after: "2026-11-01" } },
            { property: "Date", date: { on_or_before: "2026-11-30" } },
          ],
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Failed to query existing tasks: ${JSON.stringify(data)}`);
    }

    for (const page of data.results || []) {
      const date = page.properties?.Date?.date?.start;
      const title = page.properties?.Name?.title?.[0]?.plain_text;
      if (date && title) {
        existing.add(`${date}::${title.trim().toLowerCase()}`);
      }
    }

    hasMore = Boolean(data.has_more);
    startCursor = data.next_cursor;
  }

  return existing;
}

function determineTimeSlot(text) {
  // Tìm giờ như 08:30, 14:00, 19:30, 20:30
  const match = text.match(/(\d{1,2}):\d{2}/);
  if (match) {
    const hour = parseInt(match[1], 10);
    if (hour < 11) return "Morning";
    if (hour < 18) return "Afternoon";
    return "Evening";
  }
  return "Evening";
}

function determinePriority(text) {
  if (
    text.includes("🔥") ||
    text.toLowerCase().includes("giảng viên") ||
    text.toLowerCase().includes("bế giảng") ||
    text.toLowerCase().includes("kiểm tra") ||
    text.toLowerCase().includes("thi")
  ) {
    return "High";
  }
  return "Normal";
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function insertTask(task) {
  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: DB_ID },
      properties: {
        Name: { title: [{ text: { content: task.name } }] },
        Date: { date: { start: task.date } },
        Status: { checkbox: false },
        Category: { select: { name: task.category || "Planned" } },
        TimeSlot: { select: { name: task.timeSlot } },
        Priority: { select: { name: task.priority } },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Lỗi tạo task: ${task.name} (${task.date}):`, err);
    return false;
  }
  return true;
}

async function run() {
  console.log("Đang đọc các task hiện có trong DB...");
  const existing = await getExistingTasks();
  console.log(`Đã tìm thấy ${existing.size} task hiện có trong tháng 11.`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const [dayKey, dayInfo] of Object.entries(dailyDetails)) {
    const [day] = dayKey.split("/");
    const dateStr = `2026-11-${day.padStart(2, "0")}`;

    const tasksToInsert = [];

    for (const item of dayInfo.schedule || []) {
      if (
        item.includes("Ăn trưa") ||
        item.includes("Ăn sáng") ||
        item.includes("Đi dạo, ăn tối") ||
        item.includes("Ăn trưa thịnh soạn")
      ) {
        continue;
      }

      const slot = determineTimeSlot(item);
      const prio = determinePriority(item);
      tasksToInsert.push({
        name: item.trim(),
        date: dateStr,
        timeSlot: slot,
        priority: prio,
        category: "Planned",
      });
    }

    if (dayInfo.note_todo && dayInfo.note_todo.trim().length > 0) {
      tasksToInsert.push({
        name: `📝 Ghi chú: ${dayInfo.note_todo.trim()}`,
        date: dateStr,
        timeSlot: "Evening",
        priority: "Normal",
        category: "Planned",
      });
    }

    for (const t of tasksToInsert) {
      const key = `${t.date}::${t.name.toLowerCase().trim()}`;
      if (existing.has(key)) {
        skippedCount++;
        continue;
      }

      const ok = await insertTask(t);
      if (ok) {
        existing.add(key);
        createdCount++;
        process.stdout.write(`+ [${t.date}] (${t.timeSlot}) ${t.name.slice(0, 45)}...\n`);
      }
      await sleep(350);
    }
  }

  console.log(`\n Hoàn thành đồng bộ! Đã tạo mới: ${createdCount} task, bỏ qua trùng: ${skippedCount} task.`);
}

run().catch(console.error);
