# Daily Tracker - Hướng dẫn Cấu hình & Sử dụng Thật

Ứng dụng Daily Tracker tối giản, cá nhân (mobile-first PWA) đồng bộ 2 chiều với Notion.

---

## 1. Cấu hình Database trên Notion

Tạo một Database mới trên Notion (dạng Table) với **CHÍNH XÁC** các cột và kiểu dữ liệu sau:

| Tên cột | Kiểu dữ liệu (Notion) | Các giá trị lựa chọn (Select Options) | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Name** | **Title** | *(Văn bản)* | Tên nhiệm vụ |
| **Date** | **Date** | *(Ngày)* | Chỉ chọn ngày `YYYY-MM-DD`, không bật Include time |
| **Status** | **Checkbox** | *(Checkbox)* | **Bắt buộc kiểu Checkbox** (không dùng kiểu Status) |
| **Category** | **Select** | `Routine`, `Planned`, `Ad-hoc` | Viết đúng từng chữ hoa/thường |
| **TimeSlot** | **Select** | `Morning`, `Afternoon`, `Evening`, `Inbox` | 4 buổi trong ngày |
| **Priority** | **Select** | `High`, `Normal`, `Low` | Mức độ ưu tiên |

---

## 2. Tạo Notion Integration & Kết nối Database

### Bước 1: Tạo Integration
1. Mở trình duyệt truy cập: [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations).
2. Bấm nút **"+ New integration"**.
3. Đặt tên (ví dụ: `Daily Tracker App`), chọn đúng **Workspace** chứa database của bạn.
4. Capabilities: Đảm bảo đã tick chọn:
   - `Read content`
   - `Update content`
   - `Insert content`
5. Bấm **Save** (hoặc **Submit**).
6. Sao chép mã **Internal Integration Secret** (dạng `secret_...`). Đây là `NOTION_API_KEY`.

### Bước 2: Cấp quyền (Connections) cho Database
1. Mở trang Database Notion bạn vừa tạo ở Mục 1.
2. Bấm vào biểu tượng **`...`** ở góc trên cùng bên phải trang.
3. Cuộn xuống chọn **Connect to** (hoặc **Connections**).
4. Tìm và bấm chọn tên Integration vừa tạo (`Daily Tracker App`) rồi xác nhận **Confirm**.

### Bước 3: Lấy Database ID
- Nhìn lên thanh địa chỉ trình duyệt khi đang mở Database Notion:
  `https://www.notion.so/{workspace_name}/{DATABASE_ID}?v={view_id}`
- Chuỗi 32 ký tự (chữ và số) nằm ngay trước dấu `?v=` chính là `NOTION_DATABASE_ID`.
  *(Nếu URL có dấu gạch ngang `-`, bạn có thể copy nguyên cả chuỗi 32 ký tự đó)*.

---

## 3. Điền file cấu hình `.env.local`

Mở file `.env.local` trong thư mục dự án và điền các giá trị của bạn:

```env
# 1. Mã Internal Integration Secret (bắt đầu bằng secret_...)
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 2. ID của database Notion vừa tạo ở trên
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 3. Mã PIN bảo mật của riêng bạn để mở app (4-6 chữ số, ví dụ 1234)
APP_PIN=1234

# 4. Chuỗi ký phiên đăng nhập (chuỗi ngẫu nhiên dài bất kỳ, ví dụ chuỗi 32 ký tự)
SESSION_SECRET=my_super_secret_session_key_random_string_2026_xyz

# 5. Múi giờ Việt Nam
TZ=Asia/Ho_Chi_Minh
```

---

## 4. Chạy kiểm tra kết nối Notion

Sau khi điền `.env.local`, bạn có thể chạy route kiểm tra tự động:
- Khởi động app: `npm run dev` (hoặc `npm start`)
- Vào app nhập PIN, route kiểm tra sẽ đối chiếu từng cột trong database Notion và báo cụ thể nếu thiếu cột hoặc sai kiểu dữ liệu.

---

## 5. Hướng dẫn Deploy lên Vercel

1. **Đẩy mã nguồn lên GitHub**:
   - Tạo một Repository **Private** trên GitHub.
   - Commit và push mã nguồn lên GitHub.
2. **Import vào Vercel**:
   - Truy cập [https://vercel.com](https://vercel.com) và đăng nhập.
   - Bấm **Add New...** -> **Project**.
   - Chọn repository vừa tạo và bấm **Import**.
3. **Cấu hình biến môi trường trên Vercel**:
   - Tại mục **Environment Variables**, thêm đầy đủ 5 biến:
     - `NOTION_API_KEY`
     - `NOTION_DATABASE_ID`
     - `APP_PIN`
     - `SESSION_SECRET`
     - `TZ` = `Asia/Ho_Chi_Minh`
4. Bấm **Deploy**. Vercel sẽ tự động build và cung cấp cho bạn một domain HTTPS (ví dụ `https://daily-tracker-xyz.vercel.app`).

---

## 6. Thêm ứng dụng vào Màn hình chính trên Điện thoại (PWA)

### Trên iPhone (Safari):
1. Dùng trình duyệt **Safari** mở đường dẫn web Vercel của bạn (phải là Safari, Chrome trên iOS không hỗ trợ Add to Home Screen PWA đầy đủ).
2. Bấm nút **Chia sẻ** (biểu tượng hình vuông có mũi tên chỉ lên ở thanh công cụ dưới).
3. Cuộn xuống và chọn **Thêm vào MH chính** (Add to Home Screen).
4. Đặt tên app và bấm **Thêm** (Add). App sẽ xuất hiện như một ứng dụng độc lập, không có thanh URL trình duyệt.

### Trên Android (Chrome):
1. Dùng trình duyệt **Google Chrome** mở đường dẫn web Vercel.
2. Bấm vào biểu tượng **`︙`** (3 chấm ở góc trên bên phải).
3. Chọn **Cài đặt ứng dụng** (Install app) hoặc **Thêm vào màn hình chính** (Add to Home screen).
4. Xác nhận cài đặt.
