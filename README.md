# Tutoring Class Management System (Hệ thống quản lý lớp dạy kèm)

## Giới thiệu
Đây là hệ thống phần mềm quản lý toàn diện các lớp dạy kèm tại một trung tâm gia sư. Hệ thống bao gồm 3 phân hệ chính được phân quyền rõ rệt dành cho: **Học viên**, **Gia sư**, và **Nhân viên quản lý (Admin)**. Hệ thống giúp số hóa và tối ưu toàn bộ quy trình từ khâu tiếp nhận yêu cầu học, tuyển chọn gia sư, quản lý điểm danh, cho đến theo dõi tài chính và xử lý các sự cố khẩn cấp.

---

## 🚀 Các Tính Năng Nổi Bật

### 👨‍🎓 Phân hệ Học Viên (Student)
- Gửi yêu cầu tìm gia sư với chi tiết (Môn học, cấp độ, thời gian, yêu cầu trình độ GS).
- Theo dõi trạng thái tìm gia sư (Chờ ghép / Đã ghép).
- Quản lý thông tin lớp học đang tham gia và học phí mỗi buổi.
- Đánh giá chất lượng gia sư (Hệ thống Rating từ 1-5 sao kèm nhận xét).
- Gửi báo cáo vắng mặt 1 buổi (Có cơ chế đánh dấu tình huống khẩn cấp bất khả kháng nếu sát giờ <24h).
- Gửi yêu cầu đổi gia sư hoặc xin ngừng học.

### 👨‍🏫 Phân hệ Gia Sư (Tutor)
- Tạo và nộp hồ sơ xin làm gia sư (Cập nhật CCCD, bằng cấp, chuyên ngành, khu vực dạy).
- Theo dõi trạng thái duyệt hồ sơ từ trung tâm.
- Xem danh sách và thông tin chi tiết của các lớp đang được phân công giảng dạy.
- **Ghi nhận buổi dạy**: Điểm danh (Đã dạy, Học viên vắng có/không phép).
- Báo vắng mặt 1 buổi khẩn cấp (Hỗ trợ tình huống bất khả kháng <24h).
- Yêu cầu xin nghỉ dạy (Bỏ lớp) kèm theo lý do.

### 🛡️ Phân hệ Quản Trị Viên (Admin)
- **Tổng quan (Dashboard):** Thống kê số lớp đang hoạt động, doanh thu, hồ sơ chờ duyệt, yêu cầu chờ ghép.
- **Quản lý Gia sư:** Xem xét và phê duyệt / từ chối hồ sơ đăng ký của gia sư mới.
- **Quản lý Lớp học:** Ghép cặp gia sư cho yêu cầu của học viên và khởi tạo lớp học mới. Cập nhật trạng thái và kết thúc lớp vĩnh viễn.
- **Quản lý Tài chính:** 
  - Duyệt đóng học phí của Học viên.
  - Phê duyệt thanh toán hoa hồng cho Gia sư.
- **Quản lý Hỗ trợ:** Nắm bắt lịch sử báo nghỉ từng buổi (nhận diện các ca khẩn cấp). Giải quyết yêu cầu đổi/nghỉ ngang của hai bên.

### 🌟 Tính Năng Nâng Cao (Advanced Features)
- **Biểu Đồ Thống Kê (Charts):** Tích hợp biểu đồ cột trực quan thống kê doanh thu theo từng tháng bằng thư viện `Recharts`.
- **Xuất Báo Cáo Excel (Export XLSX):** Hỗ trợ xuất dữ liệu Danh Sách Lớp và Khoản Thu Học Phí ra file `.xlsx` chỉ với một cú click chuột.
- **Gửi Email Tự Động (Email Automations):** Tự động gửi Email thông báo chúc mừng cho Gia sư ngay khi hồ sơ của họ được duyệt (Sử dụng `Nodemailer` và `Ethereal`).

---

## 🛠️ Công Nghệ Sử Dụng
- **Giao diện (Frontend):** React.js, Vite, Vanilla CSS (Thiết kế theo xu hướng Glassmorphism hiện đại).
- **Máy chủ (Backend):** Node.js, Express.js.
- **Cơ sở dữ liệu (Database):** PostgreSQL.
- **Thư viện Hỗ trợ:** `Recharts` (Vẽ biểu đồ), `XLSX` (Xuất file Excel), `Nodemailer` (Gửi Email).

---

## 📂 Cấu Trúc Thư Mục (Project Structure)
```text
Gia_Su/
├── node_modules/       # Thư mục chứa các thư viện (Sẽ tự động tải khi chạy npm install)
├── backend/            # Mã nguồn máy chủ (Node.js/Express)
│   ├── routes/         # Các API định tuyến (hocvien.js, giasu.js, nhanvien.js, lop.js, ...)
│   ├── database.sql    # Script khởi tạo cơ sở dữ liệu PostgreSQL
│   ├── package.json    # Cấu hình dự án backend
│   └── server.js       # File khởi chạy máy chủ chính
├── frontend/           # Mã nguồn giao diện (React.js/Vite)
│   ├── public/         # Các tài nguyên tĩnh (hình ảnh, favicon...)
│   ├── src/            # Mã nguồn chính của frontend
│   │   ├── pages/      # Các trang giao diện (Home, Login, AdminDashboard, StudentDashboard, TutorDashboard)
│   │   ├── App.jsx     # Component gốc điều hướng (Router)
│   │   ├── index.css   # File CSS định dạng giao diện Glassmorphism
│   │   └── main.jsx    # File khởi chạy React
│   ├── package.json    # Cấu hình dự án frontend
│   └── vite.config.js  # Cấu hình build tool Vite
├── .gitignore          # File cấu hình ẩn các thư mục rác (như node_modules) khi đẩy lên GitHub
└── README.md           # Tài liệu hướng dẫn dự án (File này)
```

---

## ⚙️ Hướng Dẫn Cài Đặt (Local Environment)

### 1. Yêu cầu hệ thống
- [Node.js](https://nodejs.org/) (Khuyến nghị phiên bản 16 trở lên)
- [PostgreSQL](https://www.postgresql.org/) (Kèm công cụ pgAdmin 4)

### 2. Thiết lập cơ sở dữ liệu
- Bật pgAdmin 4, tạo một cơ sở dữ liệu mới với tên là `Gia_Su`.
- Mở Query Tool và chạy toàn bộ mã SQL có trong file `backend/database.sql` để tạo cấu trúc các bảng và chèn dữ liệu mẫu.

### 3. Cài đặt và khởi chạy Backend
1. Mở Terminal, di chuyển vào thư mục backend:
   ```bash
   cd backend
   ```
2. Cài đặt các thư viện cần thiết:
   ```bash
   npm install
   ```
3. Tạo một file `.env` ở trong thư mục `backend` và điền cấu hình kết nối Database của bạn:
   ```env
   DB_USER=postgres
   DB_HOST=localhost
   DB_NAME=Gia_Su
   DB_PASSWORD=Mat_Khau_Cua_Ban
   DB_PORT=5432
   ```
4. Khởi chạy máy chủ:
   ```bash
   npm run dev
   ```
   *(Server sẽ chạy tại cổng http://localhost:5000)*

### 4. Cài đặt và khởi chạy Frontend
1. Mở một cửa sổ Terminal mới, di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   ```
2. Cài đặt thư viện:
   ```bash
   npm install
   ```
3. Khởi chạy giao diện người dùng:
   ```bash
   npm run dev
   ```
   *(Truy cập vào ứng dụng qua địa chỉ http://localhost:5173 trên trình duyệt)*

---
*Dự án được xây dựng cho mục đích quản lý trung tâm gia sư, tập trung vào nghiệp vụ thực tế và tối ưu hóa trải nghiệm quản trị hệ thống.*
