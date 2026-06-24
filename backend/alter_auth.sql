-- ============================================================
-- MIGRATION: Thêm tính năng Google Auth + OTP Reset Password
-- Chạy: psql -U postgres -d gia_su -f alter_auth.sql
-- ============================================================

-- 1. Cho phép MatKhau nullable (tài khoản Google không có password)
ALTER TABLE TAIKHOAN ALTER COLUMN MatKhau DROP NOT NULL;

-- 2. Thêm cột nhận biết phương thức đăng nhập
-- 'local' = đăng ký thường, 'google' = đăng nhập Google
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'taikhoan' AND column_name = 'authprovider'
  ) THEN
    ALTER TABLE TAIKHOAN ADD COLUMN AuthProvider VARCHAR(10) DEFAULT 'local';
  END IF;
END $$;

-- 3. Tạo bảng OTP cho quên mật khẩu
CREATE TABLE IF NOT EXISTS OTP_RESET (
  MaOTP       SERIAL PRIMARY KEY,
  MaTK        INT NOT NULL REFERENCES TAIKHOAN(MaTK) ON DELETE CASCADE,
  OTPHash     VARCHAR(255) NOT NULL,
  HetHan      TIMESTAMP NOT NULL,
  SoLanThu    SMALLINT NOT NULL DEFAULT 0,
  DaSuDung    BOOLEAN NOT NULL DEFAULT FALSE,
  ResetToken  VARCHAR(255),
  NgayTao     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index để tìm OTP nhanh theo tài khoản
CREATE INDEX IF NOT EXISTS idx_otp_matk ON OTP_RESET(MaTK);

-- Dọn dẹp OTP cũ (hết hạn > 1 ngày) - chạy thủ công khi cần
-- DELETE FROM OTP_RESET WHERE HetHan < NOW() - INTERVAL '1 day';

SELECT 'Migration hoàn tất!' AS status;
