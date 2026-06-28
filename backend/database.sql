-- ============================================================
-- CSDL QUẢN LÝ TRUNG TÂM GIA SƯ - 14 BẢNG (PostgreSQL Compatible)
-- Chạy: psql -U postgres -d giasu_db -f database.sql
-- ============================================================

-- Xóa bảng nếu đã tồn tại (đúng thứ tự FK)
DROP TABLE IF EXISTS OTP_RESET CASCADE;
DROP TABLE IF EXISTS DANHGIA CASCADE;
DROP TABLE IF EXISTS YEUCAUDOIGIASU CASCADE;
DROP TABLE IF EXISTS HOAHONG CASCADE;
DROP TABLE IF EXISTS HOCHPHI CASCADE;
DROP TABLE IF EXISTS BUOIDAY CASCADE;
DROP TABLE IF EXISTS LOP CASCADE;
DROP TABLE IF EXISTS YEUCAUHOCKEM CASCADE;
DROP TABLE IF EXISTS LICHRANH_GIASU CASCADE;
DROP TABLE IF EXISTS GIASU_MONHOC CASCADE;
DROP TABLE IF EXISTS MONHOC CASCADE;
DROP TABLE IF EXISTS NHANVIEN CASCADE;
DROP TABLE IF EXISTS GIASU CASCADE;
DROP TABLE IF EXISTS HOCVIEN CASCADE;
DROP TABLE IF EXISTS TAIKHOAN CASCADE;
DROP TABLE IF EXISTS THAMSO CASCADE;

-- ============================================================
-- CẤU HÌNH HỆ THỐNG
-- ============================================================
CREATE TABLE THAMSO (
  MaTS          VARCHAR(50) PRIMARY KEY,
  TenTS         VARCHAR(100) NOT NULL,
  GiaTri        VARCHAR(255) NOT NULL
);

INSERT INTO THAMSO (MaTS, TenTS, GiaTri) VALUES ('TyLeHHMacDinh', 'Tỷ lệ hoa hồng mặc định (%)', '70.00');

-- ============================================================
-- NHÓM 1: QUẢN LÝ NGƯỜI DÙNG
-- ============================================================
CREATE TABLE TAIKHOAN (
  MaTK          SERIAL PRIMARY KEY,
  TenDangNhap   VARCHAR(50)  NOT NULL UNIQUE,
  MatKhau       VARCHAR(255),
  VaiTro        VARCHAR(10)  NOT NULL CHECK (VaiTro IN ('KH','HV','GS','NVQL','BGD','SA')),
  TrangThai     VARCHAR(15)  NOT NULL DEFAULT 'HoatDong' CHECK (TrangThai IN ('HoatDong','Khoa','XoaTam')),
  Email         VARCHAR(100) UNIQUE,
  AuthProvider  VARCHAR(10)  NOT NULL DEFAULT 'local',
  NgayTao       TIMESTAMP    NOT NULL DEFAULT NOW(),
  NgayCapNhat   TIMESTAMP,
  MaTK_SA       INT REFERENCES TAIKHOAN(MaTK) ON DELETE SET NULL
);
CREATE UNIQUE INDEX idx_tk_tendangnhap ON TAIKHOAN(TenDangNhap);
CREATE UNIQUE INDEX idx_tk_email ON TAIKHOAN(Email) WHERE Email IS NOT NULL;

-- Bảng OTP cho quên mật khẩu
CREATE TABLE OTP_RESET (
  MaOTP       SERIAL PRIMARY KEY,
  MaTK        INT NOT NULL REFERENCES TAIKHOAN(MaTK) ON DELETE CASCADE,
  OTPHash     VARCHAR(255) NOT NULL,
  HetHan      TIMESTAMP NOT NULL,
  SoLanThu    SMALLINT NOT NULL DEFAULT 0,
  DaSuDung    BOOLEAN NOT NULL DEFAULT FALSE,
  ResetToken  VARCHAR(255),
  NgayTao     TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_otp_matk ON OTP_RESET(MaTK);

CREATE TABLE HOCVIEN (
  MaHV        SERIAL PRIMARY KEY,
  MaTK        INT          NOT NULL UNIQUE REFERENCES TAIKHOAN(MaTK) ON DELETE RESTRICT,
  HoTen       VARCHAR(100) NOT NULL,
  NgaySinh    DATE,
  GioiTinh    VARCHAR(10)  CHECK (GioiTinh IN ('Nam','Nu','Khac')),
  SDT         VARCHAR(15)  NOT NULL,
  Email       VARCHAR(100),
  DiaChi      VARCHAR(255),
  NgayDangKy  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE GIASU (
  MaGS              SERIAL PRIMARY KEY,
  MaTK              INT            NOT NULL UNIQUE REFERENCES TAIKHOAN(MaTK) ON DELETE RESTRICT,
  HoTen             VARCHAR(100)   NOT NULL,
  NgaySinh          DATE           NOT NULL,
  GioiTinh          VARCHAR(10)    NOT NULL CHECK (GioiTinh IN ('Nam','Nu','Khac')),
  CCCD              VARCHAR(12)    NOT NULL UNIQUE,
  SDT               VARCHAR(15)    NOT NULL,
  Email             VARCHAR(100),
  TrinhDoHocVan     VARCHAR(100)   NOT NULL,
  ChuyenNganh       VARCHAR(100)   NOT NULL,
  KinhNghiem        SMALLINT       NOT NULL DEFAULT 0 CHECK (KinhNghiem >= 0),
  KhuVuc            VARCHAR(200)   NOT NULL,
  HocPhiMongMuon    INT            NOT NULL CHECK (HocPhiMongMuon > 0),
  DiemTrungBinh     DECIMAL(3,2)   DEFAULT 5.00 CHECK (DiemTrungBinh BETWEEN 1.0 AND 5.0),
  TrangThaiHoSo     VARCHAR(15)    NOT NULL DEFAULT 'ChoDuyet' CHECK (TrangThaiHoSo IN ('ChoDuyet','DaDuyet','TuChoi')),
  NgayDangKy        TIMESTAMP      NOT NULL DEFAULT NOW(),
  NgayDuyet         TIMESTAMP,
  MaNV_Duyet        INT,
  AnhCCCD           VARCHAR(255),
  AnhBangCap        VARCHAR(255),
  AnhTheSinhVien    VARCHAR(255),
  AnhDaiDien        VARCHAR(255)
);
CREATE INDEX idx_gs_trangthai ON GIASU(TrangThaiHoSo);
CREATE INDEX idx_gs_khuvuc    ON GIASU(KhuVuc);
CREATE INDEX idx_gs_diem      ON GIASU(DiemTrungBinh);

CREATE TABLE NHANVIEN (
  MaNV        SERIAL PRIMARY KEY,
  MaTK        INT            NOT NULL UNIQUE REFERENCES TAIKHOAN(MaTK) ON DELETE RESTRICT,
  HoTen       VARCHAR(100)   NOT NULL,
  SDT         VARCHAR(15)    NOT NULL,
  Email       VARCHAR(100),
  ChucVu      VARCHAR(100)   NOT NULL,
  NgayVaoLam  DATE           NOT NULL,
  TrangThai   VARCHAR(15)    NOT NULL DEFAULT 'DangLam' CHECK (TrangThai IN ('DangLam','NghiViec'))
);

-- FK của GIASU -> NHANVIEN
ALTER TABLE GIASU ADD CONSTRAINT fk_gs_nvduyet
  FOREIGN KEY (MaNV_Duyet) REFERENCES NHANVIEN(MaNV) ON DELETE SET NULL;

-- ============================================================
-- NHÓM 2: DANH MỤC VÀ HỒ SƠ
-- ============================================================
CREATE TABLE MONHOC (
  MaMH      SERIAL PRIMARY KEY,
  TenMH     VARCHAR(100) NOT NULL,
  CapHoc    VARCHAR(50),
  MoTa      VARCHAR(255),
  TrangThai VARCHAR(20)  NOT NULL DEFAULT 'HoatDong',
  UNIQUE(TenMH, CapHoc)
);

CREATE TABLE GIASU_MONHOC (
  MaGS            INT          NOT NULL REFERENCES GIASU(MaGS) ON DELETE CASCADE,
  MaMH            INT          NOT NULL REFERENCES MONHOC(MaMH) ON DELETE RESTRICT,
  CapLop          VARCHAR(50)  NOT NULL,
  HocPhiDeXuat    INT,
  GhiChu          VARCHAR(200),
  PRIMARY KEY (MaGS, MaMH, CapLop)
);
CREATE INDEX idx_gsm_mhmcaplop ON GIASU_MONHOC(MaMH, CapLop);

CREATE TABLE LICHRANH_GIASU (
  MaLich        SERIAL PRIMARY KEY,
  MaGS          INT          NOT NULL REFERENCES GIASU(MaGS) ON DELETE CASCADE,
  ThuTrongTuan  SMALLINT     NOT NULL CHECK (ThuTrongTuan BETWEEN 2 AND 8),
  CaHoc         VARCHAR(50)  NOT NULL,
  TrangThai     VARCHAR(50)  NOT NULL DEFAULT 'Ranh',
  GhiChu        VARCHAR(200),
  UNIQUE (MaGS, ThuTrongTuan, CaHoc)
);
CREATE INDEX idx_lr_thu_ca ON LICHRANH_GIASU(ThuTrongTuan, CaHoc);

-- ============================================================
-- NHÓM 3: NGHIỆP VỤ LỚP HỌC
-- ============================================================
CREATE TABLE YEUCAUHOCKEM (
  MaYC              SERIAL PRIMARY KEY,
  MaHV              INT            NOT NULL REFERENCES HOCVIEN(MaHV) ON DELETE RESTRICT,
  MaMH              INT            NOT NULL REFERENCES MONHOC(MaMH) ON DELETE RESTRICT,
  CapLop            VARCHAR(50)    NOT NULL,
  HinhThucHoc       VARCHAR(30),
  YC_GioiTinhGS     VARCHAR(50),
  YC_TrinhDoGS      VARCHAR(100),
  SoNgayHoc         INT            NOT NULL DEFAULT 0 CHECK (SoNgayHoc >= 0),
  LichHocTrongTuan  VARCHAR(500)   NOT NULL DEFAULT '[]',
  DiaChi            VARCHAR(255),
  GhiChu            VARCHAR(500),
  TrangThai         VARCHAR(30)    NOT NULL DEFAULT 'ChoGhep' CHECK (TrangThai IN ('ChoGhep','DaGhep','Huy')),
  NgayDangKy        TIMESTAMP      NOT NULL DEFAULT NOW(),
  MaNV_TiepNhan     INT REFERENCES NHANVIEN(MaNV) ON DELETE SET NULL
);
CREATE INDEX idx_yc_hv_tt ON YEUCAUHOCKEM(MaHV, TrangThai);

CREATE TABLE LOP (
  MaLop             SERIAL PRIMARY KEY,
  MaYC              INT            NOT NULL UNIQUE REFERENCES YEUCAUHOCKEM(MaYC) ON DELETE RESTRICT,
  MaGS              INT            REFERENCES GIASU(MaGS) ON DELETE RESTRICT,
  MaNV_PhanCong     INT            REFERENCES NHANVIEN(MaNV) ON DELETE SET NULL,
  NgayBatDau        DATE,
  NgayKetThucDuKien DATE,
  NgayKetThucThucTe DATE,
  HanXacNhan        TIMESTAMP,
  SoGio             DECIMAL(4,1)   CHECK (SoGio > 0),
  TrangThai         VARCHAR(30)    NOT NULL DEFAULT 'ChoGhep' CHECK (TrangThai IN ('ChoGhep','DaPhanCong','DangDay','KetThuc','Huy')),
  NoiDung           VARCHAR(300),
  DiaDiem           VARCHAR(255),
  HinhThucHoc       VARCHAR(30),
  HocPhiMoiBuoi     INT            NOT NULL CHECK (HocPhiMoiBuoi > 0),
  TyLeHHGiaSu       DECIMAL(5,2)   NOT NULL DEFAULT 70.00 CHECK (TyLeHHGiaSu BETWEEN 0 AND 100),
  LyDoKetThucSom    VARCHAR(500),
  NgayTao           TIMESTAMP      NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lop_trangthai ON LOP(TrangThai);
CREATE INDEX idx_lop_mags      ON LOP(MaGS);

CREATE TABLE BUOIDAY (
  MaBuoi          SERIAL PRIMARY KEY,
  MaLop           INT            NOT NULL REFERENCES LOP(MaLop) ON DELETE CASCADE,
  NgayDay         DATE           NOT NULL,
  CaHoc           VARCHAR(10)    NOT NULL CHECK (CaHoc IN ('Sang','Chieu','Toi')),
  TrangThai       VARCHAR(30)    NOT NULL DEFAULT 'ChoXacNhan' CHECK (TrangThai IN ('ChoXacNhan','DaDay','HVVangCoPhep','GSNghi','Huy','HVXinNghi','GSXinNghi')),
  NoiDung         VARCHAR(300),
  NhanXetHV       VARCHAR(300),
  ThoiGianXacNhan TIMESTAMP,
  UNIQUE (MaLop, NgayDay, CaHoc)
);
CREATE INDEX idx_bd_lop_ngay ON BUOIDAY(MaLop, NgayDay);

CREATE TABLE YEUCAUDOIGIASU (
  MaYCDG       SERIAL PRIMARY KEY,
  MaLop        INT            NOT NULL REFERENCES LOP(MaLop) ON DELETE RESTRICT,
  MaHV         INT            NOT NULL REFERENCES HOCVIEN(MaHV) ON DELETE RESTRICT,
  MaGS         INT            REFERENCES GIASU(MaGS) ON DELETE SET NULL,
  LanDoiThu    SMALLINT       NOT NULL CHECK (LanDoiThu IN (1,2)),
  LyDo         VARCHAR(300)   NOT NULL,
  NgayYeuCau   TIMESTAMP      NOT NULL DEFAULT NOW(),
  TrangThai    VARCHAR(15)    NOT NULL DEFAULT 'ChoXuLy' CHECK (TrangThai IN ('ChoXuLy','DaXuLy','TuChoi')),
  MaNV_XuLy    INT REFERENCES NHANVIEN(MaNV) ON DELETE SET NULL,
  NgayXuLy     TIMESTAMP,
  GhiChu       VARCHAR(300)
);

-- ============================================================
-- NHÓM 4: TÀI CHÍNH
-- ============================================================
CREATE TABLE HOCHPHI (
  MaHP            SERIAL PRIMARY KEY,
  MaLop           INT          NOT NULL REFERENCES LOP(MaLop) ON DELETE RESTRICT,
  MaHV            INT          NOT NULL REFERENCES HOCVIEN(MaHV) ON DELETE RESTRICT,
  KyTT_Tu         DATE         NOT NULL,
  KyTT_Den        DATE         NOT NULL CHECK (KyTT_Den > KyTT_Tu),
  SoBuoi          INT          NOT NULL CHECK (SoBuoi > 0),
  HocPhiMoiBuoi   INT          NOT NULL,
  TongHocPhi      INT          NOT NULL,
  NgayNop         DATE,
  HinhThucTT      VARCHAR(20)  CHECK (HinhThucTT IN ('TienMat','ChuyenKhoan')),
  NguoiThu        INT REFERENCES NHANVIEN(MaNV) ON DELETE SET NULL,
  TrangThai       VARCHAR(15)  NOT NULL DEFAULT 'ChuaNop' CHECK (TrangThai IN ('ChuaNop','DaNop','QuaHan','ChoXacNhan')),
  GhiChu          VARCHAR(300),
  UNIQUE (MaLop, KyTT_Tu, KyTT_Den),
  CHECK (TongHocPhi = SoBuoi * HocPhiMoiBuoi)
);
CREATE INDEX idx_hp_lop_tt ON HOCHPHI(MaLop, TrangThai);

CREATE TABLE HOAHONG (
  MaHH              SERIAL PRIMARY KEY,
  MaGS              INT           NOT NULL REFERENCES GIASU(MaGS) ON DELETE RESTRICT,
  MaLop             INT           NOT NULL REFERENCES LOP(MaLop) ON DELETE RESTRICT,
  KyTT_Tu           DATE          NOT NULL,
  KyTT_Den          DATE          NOT NULL CHECK (KyTT_Den > KyTT_Tu),
  SoBuoiDaDay       INT           NOT NULL CHECK (SoBuoiDaDay > 0),
  HocPhiHVMoiBuoi   INT           NOT NULL,
  TyLeHH            DECIMAL(5,2)  NOT NULL CHECK (TyLeHH BETWEEN 0 AND 100),
  TongHoaHong       INT           NOT NULL,
  NgayThanhToan     DATE,
  HinhThucTT        VARCHAR(20)   CHECK (HinhThucTT IN ('TienMat','ChuyenKhoan')),
  NguoiDuyet        INT REFERENCES NHANVIEN(MaNV) ON DELETE SET NULL,
  TrangThai         VARCHAR(10)   NOT NULL DEFAULT 'ChuaTT' CHECK (TrangThai IN ('ChuaTT','DaTT'))
);

CREATE TABLE DANHGIA (
  MaDG          SERIAL PRIMARY KEY,
  MaLop         INT            NOT NULL REFERENCES LOP(MaLop) ON DELETE RESTRICT,
  MaHV          INT            NOT NULL REFERENCES HOCVIEN(MaHV) ON DELETE RESTRICT,
  MaGS          INT            NOT NULL REFERENCES GIASU(MaGS) ON DELETE RESTRICT,
  Diem          SMALLINT       NOT NULL CHECK (Diem BETWEEN 1 AND 5),
  NhanXet       VARCHAR(500),
  NgayDanhGia   TIMESTAMP      NOT NULL DEFAULT NOW(),
  UNIQUE (MaLop, MaHV)
);

-- ============================================================
-- DỮ LIỆU MẪU
-- ============================================================
INSERT INTO MONHOC (TenMH, CapHoc, MoTa) VALUES
('Toán', 'THCS, THPT', 'Toán học phổ thông'),
('Vật lý', 'THCS, THPT', 'Vật lý học phổ thông'),
('Tiếng Anh', 'Tiểu học, THCS, THPT', 'Tiếng Anh giao tiếp và học thuật'),
('Hóa học', 'THCS, THPT', 'Hóa học phổ thông'),
('Ngữ văn', 'THCS, THPT', 'Ngữ văn phổ thông');

-- ============================================================
-- Ghi chú: Tài khoản admin/test được tạo khi khởi động server
-- Xem file server.js hàm seedData()
-- ============================================================
 C R E A T E   T A B L E   L O G _ T R U Y _ C A P   ( 
     M a L o g   S E R I A L   P R I M A R Y   K E Y , 
     M a T K   I N T   N O T   N U L L   R E F E R E N C E S   T A I K H O A N ( M a T K )   O N   D E L E T E   C A S C A D E , 
     E n d p o i n t   V A R C H A R ( 2 5 5 )   N O T   N U L L , 
     M e t h o d   V A R C H A R ( 1 0 )   N O T   N U L L , 
     H a n h D o n g   V A R C H A R ( 2 5 5 ) , 
     C h i T i e t   J S O N B , 
     I P A d d r e s s   V A R C H A R ( 5 0 ) , 
     T h o i G i a n   T I M E S T A M P   N O T   N U L L   D E F A U L T   N O W ( ) 
 ) ;  
 