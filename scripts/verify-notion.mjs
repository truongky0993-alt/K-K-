import fs from "fs";
import path from "path";

// Đọc .env.local thủ công nếu chưa nạp
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...rest] = trimmed.split("=");
      const val = rest.join("=").trim().replace(/^["']|["']$/g, "");
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const NOTION_VERSION = "2022-06-28";

async function verify() {
  console.log("==================================================");
  console.log("   KIỂM TRA CẤU HÌNH NOTION CHO DAILY TRACKER    ");
  console.log("==================================================\n");

  if (!NOTION_API_KEY) {
    console.error("❌ THIẾU: NOTION_API_KEY chưa được điền trong .env.local");
    process.exit(1);
  }
  if (!NOTION_DATABASE_ID) {
    console.error("❌ THIẾU: NOTION_DATABASE_ID chưa được điền trong .env.local");
    process.exit(1);
  }

  // 1. Kiểm tra Token
  console.log("1. Đang kiểm tra token NOTION_API_KEY...");
  try {
    const userRes = await fetch("https://api.notion.com/v1/users/me", {
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": NOTION_VERSION,
      },
    });

    if (userRes.status === 401) {
      console.error("❌ LỖI: Token NOTION_API_KEY không hợp lệ hoặc đã bị thu hồi.");
      process.exit(1);
    }
    if (!userRes.ok) {
      console.error(`❌ LỖI API (${userRes.status}): ${await userRes.text()}`);
      process.exit(1);
    }

    const userData = await userRes.json();
    console.log(`   ✓ Token hợp lệ! Bot: "${userData.name || "Integration"}" (ID: ${userData.id})\n`);
  } catch (err) {
    console.error(`❌ Lỗi mạng khi gọi Notion: ${err.message}`);
    process.exit(1);
  }

  // 2. Kiểm tra quyền truy cập Database
  console.log(`2. Đang kiểm tra quyền truy cập Database ID: ${NOTION_DATABASE_ID}...`);
  let dbData;
  try {
    const dbRes = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}`, {
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": NOTION_VERSION,
      },
    });

    if (dbRes.status === 404) {
      console.error("❌ LỖI (404): Không tìm thấy Database trên Notion.");
      console.error("   -> Bạn đã bấm dấu '...' trên góc phải Database -> 'Connect to' -> chọn Integration chưa?");
      process.exit(1);
    }
    if (!dbRes.ok) {
      console.error(`❌ LỖI API (${dbRes.status}): ${await dbRes.text()}`);
      process.exit(1);
    }

    dbData = await dbRes.json();
    const dbTitle = dbData.title?.[0]?.plain_text || "Không tên";
    console.log(`   ✓ Đã kết nối Database thành công! Tên: "${dbTitle}"\n`);
  } catch (err) {
    console.error(`❌ Lỗi mạng: ${err.message}`);
    process.exit(1);
  }

  // 3. Kiểm tra các cột bắt buộc
  console.log("3. Đang đối chiếu các cột và kiểu dữ liệu...");
  const props = dbData.properties || {};
  const errors = [];
  const warnings = [];

  // Name: title
  const titleProp = Object.values(props).find((p) => p.type === "title");
  if (!titleProp) {
    errors.push("Thiếu cột kiểu Title (Tên công việc)");
  } else {
    console.log(`   ✓ Cột tiêu đề: "${titleProp.name}" (Title)`);
  }

  // Date: date
  const dateProp = props.Date || props.date || props.Ngày;
  if (!dateProp || dateProp.type !== "date") {
    errors.push("Thiếu cột 'Date' (kiểu Date) hoặc đang đặt sai kiểu");
  } else {
    console.log(`   ✓ Cột ngày: "${dateProp.name}" (Date)`);
  }

  // Status: checkbox (BẮT BUỘC KHÔNG PHẢI KIỂU STATUS)
  const statusProp = props.Status || props.status || props.Xong;
  if (!statusProp) {
    errors.push("Thiếu cột 'Status'");
  } else if (statusProp.type === "status") {
    errors.push("Cột 'Status' đang để kiểu 'Status' của Notion -> CẦN ĐỔI SANG KIỂU 'Checkbox'");
  } else if (statusProp.type !== "checkbox") {
    errors.push(`Cột 'Status' đang có kiểu '${statusProp.type}' thay vì 'Checkbox'`);
  } else {
    console.log(`   ✓ Cột trạng thái: "${statusProp.name}" (Checkbox chuẩn)`);
  }

  // Category: select (Routine, Planned, Ad-hoc)
  const catProp = props.Category || props.category || props["Phân loại"];
  if (!catProp || catProp.type !== "select") {
    errors.push("Thiếu cột 'Category' (kiểu Select)");
  } else {
    console.log(`   ✓ Cột phân loại: "${catProp.name}" (Select)`);
    const options = catProp.select?.options?.map((o) => o.name) || [];
    const required = ["Routine", "Planned", "Ad-hoc"];
    for (const req of required) {
      if (!options.includes(req)) {
        warnings.push(`Cột Category thiếu option '${req}' (sẽ tự sinh khi thêm task, nhưng tốt nhất nên thêm trước)`);
      }
    }
  }

  // TimeSlot: select (Morning, Afternoon, Evening, Inbox)
  const slotProp = props.TimeSlot || props.timeslot || props["Khung giờ"] || props["Buổi"];
  if (!slotProp || slotProp.type !== "select") {
    errors.push("Thiếu cột 'TimeSlot' (kiểu Select)");
  } else {
    console.log(`   ✓ Cột khung giờ: "${slotProp.name}" (Select)`);
    const options = slotProp.select?.options?.map((o) => o.name) || [];
    const required = ["Morning", "Afternoon", "Evening", "Inbox"];
    for (const req of required) {
      if (!options.includes(req)) {
        warnings.push(`Cột TimeSlot thiếu option '${req}'`);
      }
    }
  }

  // Priority: select (High, Normal, Low)
  const prioProp = props.Priority || props.priority || props["Mức ưu tiên"];
  if (!prioProp || prioProp.type !== "select") {
    errors.push("Thiếu cột 'Priority' (kiểu Select)");
  } else {
    console.log(`   ✓ Cột mức ưu tiên: "${prioProp.name}" (Select)`);
  }

  console.log("\n--------------------------------------------------");
  if (errors.length > 0) {
    console.error("❌ CẦN SỬA CÁC LỖI SAU TRÊN NOTION:");
    errors.forEach((err) => console.error(`   - ${err}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn("⚠️  CẢNH BÁO NHẸ (không chặn):");
    warnings.forEach((w) => console.warn(`   - ${w}`));
  }

  console.log("🎉 TẤT CẢ CÁC BƯỚC KIỂM TRA ĐỀU THÀNH CÔNG VÀ CHUẨN XÁC 100%!");
  console.log("==================================================");
}

verify();
