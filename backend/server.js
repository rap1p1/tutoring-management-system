require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const { Pool } = require('pg');
const { sendEmail } = require('./utils/mailer');

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
// Auth middleware
async function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
  try {
    const check = await pool.query('SELECT trangthai FROM taikhoan WHERE matk = $1', [req.session.user.matk]);
    if (!check.rows.length || check.rows[0].trangthai === 'Khoa') {
      req.session.destroy();
      return res.status(401).json({ success: false, message: 'Tài khoản đã bị khóa hoặc không tồn tại' });
    }
    next();
  } catch(e) { res.status(500).json({ success: false, message: 'Lỗi xác thực session' }); }
}
function requireRole(...roles) {
  return async (req, res, next) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    if (!roles.includes(req.session.user.vaitro)) return res.status(403).json({ success: false, message: 'Không có quyền' });
    try {
      const check = await pool.query('SELECT trangthai FROM taikhoan WHERE matk = $1', [req.session.user.matk]);
      if (!check.rows.length || check.rows[0].trangthai === 'Khoa') {
        req.session.destroy();
        return res.status(401).json({ success: false, message: 'Tài khoản đã bị khóa' });
      }
      next();
    } catch(e) { res.status(500).json({ success: false, message: 'Lỗi xác thực session' }); }
  };
}

// Admin Logger Middleware
async function adminLogger(req, res, next) {
  res.on('finish', async () => {
    if (req.session && req.session.user) {
      if (req.path === '/nhanvien/logs') return; // Tránh loop log
      if (req.method === 'GET') return; // Bỏ qua các thao tác chỉ xem dữ liệu (GET)
      
      const matk = req.session.user.matk;
      const endpoint = req.originalUrl;
      const method = req.method;
      const ip = req.ip || req.connection.remoteAddress;
      const hanhdong = method + ' ' + req.path;
      const chitiet = { body: { ...req.body }, query: req.query, status: res.statusCode };
      
      // Mask passwords
      if (chitiet.body.matkhau) chitiet.body.matkhau = '***';
      if (chitiet.body.password) chitiet.body.password = '***';

      try {
        await pool.query(
          "INSERT INTO LOG_TRUY_CAP (MaTK, Endpoint, Method, HanhDong, ChiTiet, IPAddress) VALUES ($1, $2, $3, $4, $5, $6)",
          [matk, endpoint, method, hanhdong, JSON.stringify(chitiet), ip]
        );
      } catch (err) { console.error("Lỗi ghi log:", err); }
    }
  });
  next();
}

app.use('/api', adminLogger);

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

app.post('/api/auth/register', registerLimiter, async (req, res) => {
  try {
    const { username, password, hoten, ngaysinh, sdt, email } = req.body;
    if (!username || !password || !hoten || !ngaysinh || !sdt) return res.json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    if (!email) return res.json({ success: false, message: 'Email là bắt buộc để xác minh tài khoản' });
    
    if (password.length < 6) return res.json({ success: false, message: 'Mật khẩu phải từ 6 ký tự trở lên' });
    if (!/^\d{10,11}$/.test(sdt)) return res.json({ success: false, message: 'Số điện thoại không hợp lệ' });
    if (!email.endsWith('@gmail.com')) return res.json({ success: false, message: 'Email phải có đuôi @gmail.com' });
    
    const today = new Date().toISOString().split('T')[0];
    if (ngaysinh >= today) return res.json({ success: false, message: 'Ngày sinh phải nhỏ hơn ngày hiện tại' });

    const exists = await pool.query('SELECT matk FROM taikhoan WHERE tendangnhap = $1', [username]);
    if (exists.rows.length > 0) return res.json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
    
    // Kiểm tra email đã được sử dụng chưa
    const emailExists = await pool.query('SELECT matk FROM taikhoan WHERE email = $1', [email]);
    if (emailExists.rows.length > 0) return res.json({ success: false, message: 'Email này đã được sử dụng' });

    // Rate limit: không cho gửi OTP liên tục (tối thiểu 1 phút)
    const recentOtp = await pool.query(
      `SELECT maotpreg FROM otp_register 
       WHERE email = $1 AND loaitk = 'HV' AND ngaytao > NOW() - INTERVAL '1 minute' AND dasudung = FALSE`,
      [email]
    );
    if (recentOtp.rows.length > 0) {
      return res.json({ success: false, message: 'Vui lòng chờ 1 phút trước khi gửi lại mã OTP' });
    }

    // Tạo OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);

    // Hash mật khẩu để lưu tạm
    const passwordHash = await bcrypt.hash(password, 10);

    // Lưu thông tin đăng ký tạm + OTP
    const regData = JSON.stringify({ username, passwordHash, hoten, ngaysinh, sdt, email });
    await pool.query(
      `INSERT INTO otp_register (email, otphash, regdata, loaitk, hethan) 
       VALUES ($1, $2, $3, 'HV', NOW() + INTERVAL '10 minutes')`,
      [email, otpHash, regData]
    );

    // Gửi email OTP
    const sent = await sendEmail({
      to: email,
      subject: '📧 Mã OTP Xác Minh Đăng Ký — GiaSưConnect',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #f8fafc; border-radius: 12px;">
          <h2 style="color: #0f172a; text-align: center; margin-bottom: 10px;">📧 Xác minh đăng ký tài khoản</h2>
          <p style="color: #475569; text-align: center;">Xin chào <strong>${hoten}</strong>,</p>
          <p style="color: #475569; text-align: center;">Mã OTP xác minh đăng ký của bạn là:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0f172a; background: #e2e8f0; padding: 12px 24px; border-radius: 8px; display: inline-block;">
              ${otp}
            </span>
          </div>
          <p style="color: #94a3b8; text-align: center; font-size: 14px;">
            Mã này có hiệu lực trong <strong>10 phút</strong>.<br/>
            Nếu bạn không yêu cầu đăng ký, vui lòng bỏ qua email này.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; text-align: center; font-size: 12px;">GiaSưConnect — Hệ thống quản lý gia sư</p>
        </div>
      `
    });

    if (!sent) {
      return res.json({ success: false, message: 'Không thể gửi email OTP. Vui lòng thử lại sau.' });
    }

    res.json({ success: true, requireOTP: true, email, message: 'Đã gửi mã OTP đến email của bạn. Vui lòng kiểm tra hộp thư.' });
  } catch (e) { console.error(e); res.json({ success: false, message: 'Lỗi server: ' + e.message }); }
});

// Xác minh OTP đăng ký HV
app.post('/api/auth/verify-register-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.json({ success: false, message: 'Thiếu email hoặc mã OTP' });

    // Tìm OTP mới nhất, chưa hết hạn, chưa dùng
    const otpResult = await pool.query(
      `SELECT * FROM otp_register 
       WHERE email = $1 AND loaitk = 'HV' AND hethan > NOW() AND dasudung = FALSE
       ORDER BY ngaytao DESC LIMIT 1`,
      [email]
    );

    if (otpResult.rows.length === 0) {
      return res.json({ success: false, message: 'Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng đăng ký lại.' });
    }

    const otpRecord = otpResult.rows[0];

    // Kiểm tra số lần thử (tối đa 5)
    if (otpRecord.solanthu >= 5) {
      await pool.query('UPDATE otp_register SET dasudung = TRUE WHERE maotpreg = $1', [otpRecord.maotpreg]);
      return res.json({ success: false, message: 'Đã thử quá nhiều lần. Vui lòng đăng ký lại.' });
    }

    // So sánh OTP
    const isMatch = await bcrypt.compare(otp.toString(), otpRecord.otphash);
    if (!isMatch) {
      await pool.query('UPDATE otp_register SET solanthu = solanthu + 1 WHERE maotpreg = $1', [otpRecord.maotpreg]);
      const remaining = 5 - (otpRecord.solanthu + 1);
      return res.json({ success: false, message: `Mã OTP không đúng. Còn ${remaining} lần thử.` });
    }

    // OTP đúng → tạo tài khoản thật
    const regData = otpRecord.regdata;
    const { username, passwordHash, hoten, ngaysinh, sdt } = regData;

    // Kiểm tra lại username chưa bị lấy
    const existsCheck = await pool.query('SELECT matk FROM taikhoan WHERE tendangnhap = $1', [username]);
    if (existsCheck.rows.length > 0) {
      await pool.query('UPDATE otp_register SET dasudung = TRUE WHERE maotpreg = $1', [otpRecord.maotpreg]);
      return res.json({ success: false, message: 'Tên đăng nhập đã tồn tại. Vui lòng đăng ký lại với tên khác.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tkResult = await client.query(
        "INSERT INTO taikhoan (tendangnhap, matkhau, vaitro, email) VALUES ($1, $2, 'HV', $3) RETURNING matk",
        [username, passwordHash, email]
      );
      const matk = tkResult.rows[0].matk;
      await client.query(
        "INSERT INTO hocvien (matk, hoten, ngaysinh, sdt, email) VALUES ($1, $2, $3, $4, $5)",
        [matk, hoten, ngaysinh, sdt, email]
      );
      // Đánh dấu OTP đã dùng
      await client.query('UPDATE otp_register SET dasudung = TRUE WHERE maotpreg = $1', [otpRecord.maotpreg]);
      await client.query('COMMIT');
      res.json({ success: true, message: 'Xác minh thành công! Tài khoản đã được tạo. Vui lòng đăng nhập.' });
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
// SPA FALLBACK — phục vụ index.html cho client-side routing
// ============================================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

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
    } catch (e) { await client.query('ROLLBACK'); console.error('Seed error:', e.message); }
    finally { client.release(); }
  } catch (e) { console.error('Seed check error:', e.message); }
}

// ============================================================
// CRONJOB: TỰ ĐỘNG CHỐT CÔNG SAU 24H
// ============================================================
const cron = require('node-cron');
cron.schedule('0 * * * *', async () => {
  try {
    console.log('[Cron] Quét các buổi học chờ xác nhận quá 24h...');
    const result = await pool.query(
      `UPDATE buoiday 
       SET trangthai = 'DaDay', 
           noidung = COALESCE(noidung, '') || ' [Hệ thống tự động xác nhận sau 24h]'
       WHERE trangthai = 'ChoXacNhan' 
       AND thoigianxacnhan <= NOW() - INTERVAL '24 hours'
       RETURNING mabuoi`
    );
    if (result.rowCount > 0) {
      console.log(`[Cron] Đã tự động duyệt ${result.rowCount} buổi học.`);
    }
  } catch (err) {
    console.error('[Cron] Lỗi tự động duyệt:', err.message);
  }
});

// Start
app.listen(PORT, async () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
  await seedData();
});

module.exports = { pool, requireAuth, requireRole };
