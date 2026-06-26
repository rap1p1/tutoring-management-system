require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const { Pool } = require('pg');

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

// Middleware
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
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

app.post('/api/auth/login', async (req, res) => {
  try {
    const username = (req.body.username || '').trim();
    const password = req.body.password;
    const result = await pool.query('SELECT * FROM taikhoan WHERE tendangnhap = $1', [username]);
    if (result.rows.length === 0) return res.json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
    const tk = result.rows[0];
    if (tk.trangthai === 'Khoa') return res.json({ success: false, message: 'Tài khoản đã bị khóa' });
    // Tài khoản Google không có mật khẩu → không cho login bằng form thường
    if (!tk.matkhau) return res.json({ success: false, message: 'Tài khoản này sử dụng đăng nhập Google. Vui lòng nhấn nút "Đăng nhập bằng Google".' });
    const ok = await bcrypt.compare(password, tk.matkhau);
    if (!ok) return res.json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });

    // Kiểm tra 2FA
    if (tk.is2faenabled) {
      if (!tk.email) return res.json({ success: false, message: 'Tài khoản chưa có email để nhận OTP 2FA' });

      // Sinh OTP và TempToken
      const crypto = require('crypto');
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      const tempToken = crypto.randomUUID();

      await pool.query(
        `INSERT INTO otp_2fa (matk, otphash, temptoken, hethan) 
         VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes')`,
        [tk.matk, otpHash, tempToken]
      );

      // Gửi email OTP
      const { sendEmail } = require('./utils/mailer');
      sendEmail({
        to: tk.email,
        subject: '🔐 Mã OTP Đăng Nhập (2FA) — GiaSưConnect',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2>Mã xác thực đăng nhập</h2>
            <p>Mã OTP của bạn là: <strong style="font-size: 24px;">${otp}</strong></p>
            <p>Mã này có hiệu lực trong 5 phút.</p>
          </div>
        `
      }).catch(err => console.error('Failed to send 2FA OTP:', err));

      return res.json({
        success: true,
        require2FA: true,
        tempToken,
        email: tk.email,
        message: 'Mã xác thực 2 lớp đã được gửi đến email của bạn.'
      });
    }

    // Đăng nhập bình thường
    req.session.user = { matk: tk.matk, tendangnhap: tk.tendangnhap, vaitro: tk.vaitro };
    res.json({ success: true, data: { vaitro: tk.vaitro } });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
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
app.use('/api/monhoc', require('./routes/monhoc'));
app.use('/api/hocvien', require('./routes/hocvien'));
app.use('/api/giasu', require('./routes/giasu'));
app.use('/api/lop', require('./routes/lop'));
app.use('/api/nhanvien', require('./routes/nhanvien'));
app.use('/api/auth', require('./routes/auth'));

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
      const sa = await client.query("INSERT INTO taikhoan(tendangnhap,matkhau,vaitro) VALUES('admin','" + hash + "','SA') RETURNING matk");
      await client.query("INSERT INTO nhanvien(matk,hoten,sdt,chucvu,ngayvaolam) VALUES($1,'Quản trị viên','0900000001','SA','2024-01-01')", [sa.rows[0].matk]);
      // BGD
      const bgd = await client.query("INSERT INTO taikhoan(tendangnhap,matkhau,vaitro) VALUES('giamdoc','" + hash + "','BGD') RETURNING matk");
      await client.query("INSERT INTO nhanvien(matk,hoten,sdt,chucvu,ngayvaolam) VALUES($1,'Giám đốc','0900000002','Giám đốc','2024-01-01')", [bgd.rows[0].matk]);
      // NVQL
      const nv = await client.query("INSERT INTO taikhoan(tendangnhap,matkhau,vaitro) VALUES('nhanvien','" + hash + "','NVQL') RETURNING matk");
      await client.query("INSERT INTO nhanvien(matk,hoten,sdt,chucvu,ngayvaolam) VALUES($1,'Nhân viên QL','0900000003','NVQL','2024-01-01')", [nv.rows[0].matk]);
      // HV
      const hv = await client.query("INSERT INTO taikhoan(tendangnhap,matkhau,vaitro) VALUES('hocvien1','" + hash + "','HV') RETURNING matk");
      await client.query("INSERT INTO hocvien(matk,hoten,sdt) VALUES($1,'Học viên Mẫu','0900000004')", [hv.rows[0].matk]);
      // GS
      const gs = await client.query("INSERT INTO taikhoan(tendangnhap,matkhau,vaitro) VALUES('giasu1','" + hash + "','GS') RETURNING matk");
      await client.query("INSERT INTO giasu(matk,hoten,ngaysinh,gioitinh,cccd,sdt,trinhdohocvan,chuyennganh,kinhnghiem,khuvuc,hocphimongmuon,trangthaihoso) VALUES($1,'Gia sư Mẫu','1990-01-01','Nam','123456789012','0900000005','Đại học','Toán học',2,'Quận 1, Quận 3',200000,'DaDuyet')", [gs.rows[0].matk]);
      await client.query('COMMIT');
      console.log('Seed data thành công. Tài khoản mặc định: admin/admin123, hocvien1/admin123, giasu1/admin123, nhanvien/admin123, giamdoc/admin123');
    } catch (e) { await client.query('ROLLBACK'); console.error('Seed error:', e.message); }
    finally { client.release(); }
  } catch (e) { console.error('Seed check error:', e.message); }
}

// Start
app.listen(PORT, async () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
  await seedData();
});

module.exports = { pool, requireAuth, requireRole };
