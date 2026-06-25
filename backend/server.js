require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const { Pool } = require('pg');

const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// DB
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting cho auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10,
  message: { success: false, message: 'Quá nhiều lần thử, vui lòng chờ 15 phút.' }
});
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Quá nhiều lần đăng ký, vui lòng chờ 15 phút.' }
});

// Middleware
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));


// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    if (!roles.includes(req.session.user.vaitro)) return res.status(403).json({ success: false, message: 'Không có quyền' });
    next();
  };
}

// ============================================================
// AUTH ROUTES
// ============================================================

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const username = (req.body.username || '').trim();
    const password = req.body.password;
    const result = await pool.query('SELECT * FROM taikhoan WHERE tendangnhap = $1', [username]);
    if (result.rows.length === 0) return res.json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
    const tk = result.rows[0];
    if (tk.trangthai === 'Khoa') return res.json({ success: false, message: 'Tài khoản đã bị khóa' });
    const ok = await bcrypt.compare(password, tk.matkhau);
    if (!ok) return res.json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
    req.session.user = { matk: tk.matk, tendangnhap: tk.tendangnhap, vaitro: tk.vaitro };
    res.json({ success: true, data: { matk: tk.matk, tendangnhap: tk.tendangnhap, vaitro: tk.vaitro } });
  } catch (e) { console.error(e); res.json({ success: false, message: 'Lỗi server' }); }
});

app.post('/api/auth/register', registerLimiter, async (req, res) => {
  try {
    const { username, password, hoten, ngaysinh, sdt, email } = req.body;
    if (!username || !password || !hoten || !ngaysinh || !sdt) return res.json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    
    if (password.length < 6) return res.json({ success: false, message: 'Mật khẩu phải từ 6 ký tự trở lên' });
    if (!/^\d{10,11}$/.test(sdt)) return res.json({ success: false, message: 'Số điện thoại không hợp lệ' });
    if (email && !email.endsWith('@gmail.com')) return res.json({ success: false, message: 'Email phải có đuôi @gmail.com' });
    
    const today = new Date().toISOString().split('T')[0];
    if (ngaysinh >= today) return res.json({ success: false, message: 'Ngày sinh phải nhỏ hơn ngày hiện tại' });

    const exists = await pool.query('SELECT matk FROM taikhoan WHERE tendangnhap = $1', [username]);
    if (exists.rows.length > 0) return res.json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
    
    const hash = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tkResult = await client.query(
        "INSERT INTO taikhoan (tendangnhap, matkhau, vaitro, email) VALUES ($1, $2, 'HV', $3) RETURNING matk",
        [username, hash, email || null]
      );
      const matk = tkResult.rows[0].matk;
      await client.query(
        "INSERT INTO hocvien (matk, hoten, ngaysinh, sdt, email) VALUES ($1, $2, $3, $4, $5)",
        [matk, hoten, ngaysinh, sdt, email || null]
      );
      await client.query('COMMIT');
      res.json({ success: true, message: 'Đăng ký thành công' });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (e) { console.error(e); res.json({ success: false, message: 'Lỗi server: ' + e.message }); }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ success: true, data: req.session.user });
});

app.get('/api/auth/check-username', async (req, res) => {
  try {
    const { username } = req.query;
    const exists = await pool.query('SELECT matk FROM taikhoan WHERE tendangnhap = $1', [username]);
    if (exists.rows.length > 0) {
      res.json({ success: true, exists: true });
    } else {
      res.json({ success: true, exists: false });
    }
  } catch (e) {
    res.json({ success: false, message: 'Lỗi server' });
  }
});

// Pass pool to routes via app.locals (must be set BEFORE mounting routes)
app.locals.pool = pool;
app.locals.requireAuth = requireAuth;
app.locals.requireRole = requireRole;
app.locals.bcrypt = bcrypt;

// ============================================================
// ROUTES - mount separate files
// ============================================================
app.use('/api/monhoc',    require('./routes/monhoc'));
app.use('/api/hocvien',   require('./routes/hocvien'));
app.use('/api/giasu',     require('./routes/giasu'));
app.use('/api/lop',       require('./routes/lop'));
app.use('/api/nhanvien',  require('./routes/nhanvien'));

// ============================================================
// SEED DATA (tạo tài khoản mặc định)
// ============================================================
async function seedData() {
  try {
    const check = await pool.query("SELECT COUNT(*) FROM taikhoan");
    if (parseInt(check.rows[0].count) > 0) return;
    const hash = await bcrypt.hash('admin123', 10);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // SA
      const sa = await client.query("INSERT INTO taikhoan(tendangnhap,matkhau,vaitro) VALUES('admin', $1, 'SA') RETURNING matk", [hash]);
      await client.query("INSERT INTO nhanvien(matk,hoten,sdt,chucvu,ngayvaolam) VALUES($1,'Quản trị viên','0900000001','SA','2024-01-01')",[sa.rows[0].matk]);
      // BGD
      const bgd = await client.query("INSERT INTO taikhoan(tendangnhap,matkhau,vaitro) VALUES('giamdoc', $1, 'BGD') RETURNING matk", [hash]);
      await client.query("INSERT INTO nhanvien(matk,hoten,sdt,chucvu,ngayvaolam) VALUES($1,'Giám đốc','0900000002','Giám đốc','2024-01-01')",[bgd.rows[0].matk]);
      // NVQL
      const nv = await client.query("INSERT INTO taikhoan(tendangnhap,matkhau,vaitro) VALUES('nhanvien', $1, 'NVQL') RETURNING matk", [hash]);
      await client.query("INSERT INTO nhanvien(matk,hoten,sdt,chucvu,ngayvaolam) VALUES($1,'Nhân viên QL','0900000003','NVQL','2024-01-01')",[nv.rows[0].matk]);
      // HV
      const hv = await client.query("INSERT INTO taikhoan(tendangnhap,matkhau,vaitro) VALUES('hocvien1', $1, 'HV') RETURNING matk", [hash]);
      await client.query("INSERT INTO hocvien(matk,hoten,sdt) VALUES($1,'Học viên Mẫu','0900000004')",[hv.rows[0].matk]);
      // GS
      const gs = await client.query("INSERT INTO taikhoan(tendangnhap,matkhau,vaitro) VALUES('giasu1', $1, 'GS') RETURNING matk", [hash]);
      await client.query("INSERT INTO giasu(matk,hoten,ngaysinh,gioitinh,cccd,sdt,trinhdohocvan,chuyennganh,kinhnghiem,khuvuc,hocphimongmuon,trangthaihoso) VALUES($1,'Gia sư Mẫu','1990-01-01','Nam','123456789012','0900000005','Đại học','Toán học',2,'Quận 1, Quận 3',200000,'DaDuyet')",[gs.rows[0].matk]);
      await client.query('COMMIT');
      console.log('Seed data thành công. Tài khoản mặc định: admin/admin123, hocvien1/admin123, giasu1/admin123, nhanvien/admin123, giamdoc/admin123');
    } catch(e) { await client.query('ROLLBACK'); console.error('Seed error:', e.message); }
    finally { client.release(); }
  } catch(e) { console.error('Seed check error:', e.message); }
}

// Start
app.listen(PORT, async () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
  await seedData();
});

module.exports = { pool, requireAuth, requireRole };
