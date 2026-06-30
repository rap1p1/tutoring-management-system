-- ============================================================
-- Bảng lưu thông tin đăng ký tạm thời chờ xác minh OTP email
-- Chạy: psql -U postgres -d Gia_Su -f alter_register_otp.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS OTP_REGISTER (
  MaOTPReg    SERIAL PRIMARY KEY,
  Email       VARCHAR(100) NOT NULL,
  OTPHash     VARCHAR(255) NOT NULL,
  RegData     JSONB NOT NULL,          -- Lưu toàn bộ dữ liệu đăng ký (JSON)
  LoaiTK      VARCHAR(5) NOT NULL CHECK (LoaiTK IN ('HV', 'GS')),  -- Loại tài khoản
  HetHan      TIMESTAMP NOT NULL,
  SoLanThu    SMALLINT NOT NULL DEFAULT 0,
  DaSuDung    BOOLEAN NOT NULL DEFAULT FALSE,
  NgayTao     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_reg_email ON OTP_REGISTER(Email);
