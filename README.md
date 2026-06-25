# Hệ Thống Quản Lý Trung Tâm Gia Sư

## Giới Thiệu
Đây là hệ thống phần mềm quản lý toàn diện các lớp dạy kèm tại trung tâm gia sư. Hệ thống bao gồm 3 phân hệ chính được phân quyền rõ rệt: Học viên, Gia sư, và Nhân viên quản lý (Quản trị viên). Phần mềm giúp số hóa và tối ưu toàn bộ quy trình từ khâu tiếp nhận yêu cầu học, tuyển chọn gia sư, quản lý điểm danh, cho đến theo dõi tài chính và xử lý sự cố.

---

## Tính Năng Chính

### Phân Hệ Học Viên
- Gửi yêu cầu tìm gia sư với các thông tin chi tiết (môn học, cấp độ, thời gian, yêu cầu trình độ).
- Theo dõi trạng thái tìm gia sư (chờ ghép lớp / đã ghép lớp).
- Quản lý thông tin lớp học đang tham gia và thông tin học phí.
- Gửi báo cáo vắng mặt cho từng buổi học (hỗ trợ khai báo tình huống khẩn cấp bất khả kháng).
- Gửi yêu cầu đổi gia sư hoặc xin ngừng học.
- Đăng nhập bằng tài khoản Google (OAuth 2.0).

### Phân Hệ Gia Sư
- Tạo và nộp hồ sơ đăng ký làm gia sư (cung cấp thông tin CCCD, bằng cấp, chuyên ngành, khu vực có thể giảng dạy).
- Theo dõi trạng thái kiểm duyệt hồ sơ từ trung tâm.
- Quản lý danh sách và thông tin chi tiết của các lớp được phân công.
- Ghi nhận trạng thái buổi dạy (điểm danh học viên, báo cáo đã hoàn thành).
- Báo vắng mặt buổi dạy (hỗ trợ khai báo sự cố khẩn cấp).
- Yêu cầu xin nghỉ dạy dài hạn kèm lý do.

### Phân Hệ Nhân Viên Quản Lý (Quản Trị Viên)
- Bảng điều khiển (Dashboard) thống kê: số lượng lớp đang hoạt động, doanh thu, hồ sơ chờ duyệt, yêu cầu chờ xử lý.
- Quản lý hồ sơ gia sư: xem xét, phê duyệt hoặc từ chối hồ sơ đăng ký mới.
- Quản lý lớp học: ghép cặp gia sư cho yêu cầu của học viên, khởi tạo lớp học mới, theo dõi trạng thái và kết thúc lớp.
- Quản lý tài chính: xác nhận đóng học phí của học viên, phê duyệt thanh toán hoa hồng cho gia sư.
- Quản lý hỗ trợ: theo dõi lịch sử báo nghỉ, xử lý yêu cầu đổi gia sư hoặc nghỉ ngang.
- Quản trị tài khoản: khóa hoặc mở khóa tài khoản người dùng vi phạm.

### Tính Năng Nâng Cao Và Bảo Mật
- Thống kê trực quan bằng biểu đồ doanh thu theo thời gian thực.
- Trích xuất dữ liệu danh sách lớp học và tài chính ra định dạng Excel (.xlsx).
- Cơ chế gửi Email tự động: thông báo mã OTP đặt lại mật khẩu, gửi mã xác thực đăng nhập 2 lớp (2FA).
- Đăng nhập thông qua Google OAuth 2.0.
- Xác thực 2 lớp (2FA) sử dụng OTP gửi qua Email để tăng cường bảo mật tài khoản người dùng.
- Lưu trữ hồ sơ, tài liệu (hình ảnh bằng cấp, CCCD, ảnh đại diện) an toàn thông qua dịch vụ đám mây Amazon S3.

---

## Kiến Trúc Công Nghệ

- Máy chủ (Backend): Node.js, Express.js.
- Giao diện (Frontend): React.js, Vite.
- Cơ sở dữ liệu: PostgreSQL.
- Dịch vụ bên thứ ba (Third-party Services):
  - Amazon S3 (Lưu trữ tệp tin tĩnh).
  - Google Identity Services (Đăng nhập OAuth 2.0).
  - Google SMTP (Gửi Email tự động).

---

## Cấu Trúc Mã Nguồn

```text
Gia_Su/
├── backend/            
│   ├── routes/         # Khai báo các API (hocvien.js, giasu.js, nhanvien.js, lop.js, auth.js)
│   ├── utils/          # Các hàm hỗ trợ (mailer.js, s3.js)
│   ├── database.sql    # Tập lệnh tạo bảng và chèn dữ liệu gốc
│   ├── alter_2fa.sql   # Tập lệnh cấu trúc cơ sở dữ liệu bổ sung
│   ├── package.json    # Cấu hình dự án Node.js
│   └── server.js       # Tệp khởi chạy máy chủ Express
├── frontend/           
│   ├── public/         # Tài nguyên tĩnh của giao diện
│   ├── src/            
│   │   ├── components/ # Các thành phần giao diện dùng chung
│   │   ├── pages/      # Giao diện các trang nghiệp vụ
│   │   ├── App.jsx     # Điều hướng (Router)
│   │   └── main.jsx    # Điểm khởi chạy React
│   ├── package.json    # Cấu hình dự án React
│   └── vite.config.js  # Cấu hình công cụ đóng gói Vite
└── README.md           # Tài liệu dự án
```

---

## Hướng Dẫn Cài Đặt Và Vận Hành

### Yêu Cầu Môi Trường
- Node.js (Khuyến nghị phiên bản 18.x trở lên).
- PostgreSQL (Kèm công cụ dòng lệnh `psql` hoặc pgAdmin 4).
- Tài khoản Google Cloud (Để lấy Client ID cho OAuth).
- Tài khoản AWS (Để lấy khóa truy cập IAM và cấu hình S3 Bucket).
- Tài khoản Gmail (Cần tạo App Password để cấu hình hệ thống gửi mail tự động).

### 1. Thiết Lập Cơ Sở Dữ Liệu
Mở công cụ quản lý PostgreSQL, tạo cơ sở dữ liệu mới mang tên `Gia_Su`.
Khởi chạy tệp tin `backend/database.sql` để thiết lập các bảng dữ liệu gốc.
Khởi chạy tiếp tệp tin `backend/alter_2fa.sql` để bổ sung các bảng hỗ trợ tính năng bảo mật.

### 2. Cài Đặt Máy Chủ (Backend)
Mở cửa sổ lệnh (Terminal) và di chuyển vào thư mục backend:
```bash
cd backend
npm install
```

Tạo một tệp tin mang tên `.env` trong thư mục `backend` và điền cấu hình như mẫu sau:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=Gia_Su
DB_USER=postgres
DB_PASSWORD=mat_khau_cua_ban
PORT=3000

# Google OAuth
GOOGLE_CLIENT_ID=ma_ung_dung_google.apps.googleusercontent.com

# Gmail SMTP
SMTP_USER=email_cua_ban@gmail.com
SMTP_PASS=mat_khau_ung_dung_16_ky_tu

# AWS S3
AWS_ACCESS_KEY_ID=ma_truy_cap_aws
AWS_SECRET_ACCESS_KEY=khoa_bi_mat_aws
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=ten_bucket_cua_ban
```

Sau khi cấu hình xong, khởi chạy máy chủ:
```bash
npm run dev
```
Hệ thống máy chủ sẽ hoạt động tại địa chỉ: `http://localhost:3000`.

### 3. Cài Đặt Giao Diện (Frontend)
Mở một cửa sổ lệnh mới và di chuyển vào thư mục frontend:
```bash
cd frontend
npm install
```

Bạn cần thay thế thông số cấu hình mã máy khách Google (Client ID) bên trong mã nguồn frontend nếu cần thiết, đảm bảo khớp với `GOOGLE_CLIENT_ID` đã cấu hình ở máy chủ.

Khởi chạy môi trường phát triển giao diện:
```bash
npm run dev
```
Ứng dụng giao diện sẽ có thể truy cập thông qua trình duyệt tại địa chỉ: `http://localhost:5173`.

---

## Ghi Chú
- Tùy theo cấu hình mạng và cài đặt môi trường của bạn, hãy đảm bảo các cổng `3000` và `5173` chưa bị chiếm dụng.
- Dịch vụ Amazon S3 cần được cấu hình quyền cho phép đọc (Public Read) để ảnh có thể hiển thị chính xác trên nền tảng web.
- Đối với luồng đăng nhập Google OAuth, bạn phải cấu hình thêm địa chỉ `http://localhost:5173` vào mục Authorized JavaScript origins trong Google Cloud Console.
