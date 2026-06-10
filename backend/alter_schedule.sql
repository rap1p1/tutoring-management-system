-- ============================================================
-- MIGRATION: Đơn giản hóa thời khóa biểu
-- Chạy: psql -U postgres -d giasu_db -f alter_schedule.sql
-- ============================================================

-- 1. YEUCAUHOCKEM: Thêm SoNgayHoc + LichHocTrongTuan
ALTER TABLE YEUCAUHOCKEM ADD COLUMN IF NOT EXISTS SoNgayHoc INT NOT NULL DEFAULT 20;
ALTER TABLE YEUCAUHOCKEM ADD COLUMN IF NOT EXISTS LichHocTrongTuan VARCHAR(500) NOT NULL DEFAULT '[]';

-- 2. BUOIDAY: Chuyển từ GioBatDau/GioKetThuc sang CaHoc
-- Bước 2a: Thêm cột CaHoc
ALTER TABLE BUOIDAY ADD COLUMN IF NOT EXISTS CaHoc VARCHAR(10);

-- Bước 2b: Cập nhật dữ liệu cũ (nếu có) dựa trên giờ bắt đầu
UPDATE BUOIDAY SET CaHoc = 
  CASE 
    WHEN GioBatDau < '12:00:00' THEN 'Sang'
    WHEN GioBatDau < '17:00:00' THEN 'Chieu'
    ELSE 'Toi'
  END
WHERE CaHoc IS NULL;

-- Bước 2c: Xóa constraint cũ và cột cũ
ALTER TABLE BUOIDAY DROP CONSTRAINT IF EXISTS buoiday_malop_ngayday_giobatdau_key;
ALTER TABLE BUOIDAY DROP CONSTRAINT IF EXISTS buoiday_gioketthuc_check;
ALTER TABLE BUOIDAY DROP COLUMN IF EXISTS GioBatDau;
ALTER TABLE BUOIDAY DROP COLUMN IF EXISTS GioKetThuc;
ALTER TABLE BUOIDAY DROP COLUMN IF EXISTS SoGio;

-- Bước 2d: Set NOT NULL + CHECK cho CaHoc
ALTER TABLE BUOIDAY ALTER COLUMN CaHoc SET NOT NULL;
ALTER TABLE BUOIDAY ALTER COLUMN CaHoc SET DEFAULT 'Sang';
ALTER TABLE BUOIDAY ADD CONSTRAINT buoiday_cahoc_check CHECK (CaHoc IN ('Sang', 'Chieu', 'Toi'));

-- Bước 2e: Thêm unique constraint mới
ALTER TABLE BUOIDAY ADD CONSTRAINT buoiday_malop_ngayday_cahoc_key UNIQUE (MaLop, NgayDay, CaHoc);

-- Bước 2f: Cập nhật CHECK trạng thái để thêm ChoXacNhan
ALTER TABLE BUOIDAY DROP CONSTRAINT IF EXISTS buoiday_trangthai_check;
ALTER TABLE BUOIDAY ADD CONSTRAINT buoiday_trangthai_check CHECK (TrangThai IN ('ChoXacNhan','DaDay','HVVangCoPhep','GSNghi','Huy'));

-- Cập nhật default trạng thái
ALTER TABLE BUOIDAY ALTER COLUMN TrangThai SET DEFAULT 'ChoXacNhan';

-- 3. Xong
-- ============================================================
