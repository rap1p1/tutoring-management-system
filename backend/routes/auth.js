const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { sendEmail } = require('../utils/mailer');

function pool(req) { return req.app.locals.pool; }

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ============================================================
// ĐĂNG NHẬP BẰNG GOOGLE
// ============================================================
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.json({ success: false, message: 'Thiếu credential từ Google' });
    }

    // Verify Google ID token
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
    } catch (err) {
      console.error('Google token verify error:', err.message);
      return res.json({ success: false, message: 'Token Google không hợp lệ' });
    }

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name || email.split('@')[0];
    const picture = payload.picture || null;

    if (!email) {
      return res.json({ success: false, message: 'Không lấy được email từ Google' });
    }

    // Tìm tài khoản theo email
    const existing = await pool(req).query(
      'SELECT * FROM taikhoan WHERE email = $1', [email]
    );

    if (existing.rows.length > 0) {
      // Tài khoản đã tồn tại → đăng nhập
      const tk = existing.rows[0];

      if (tk.trangthai === 'Khoa') {
        return res.json({ success: false, message: 'Tài khoản đã bị khóa' });
      }

      // Set session
      req.session.user = { matk: tk.matk, tendangnhap: tk.tendangnhap, vaitro: tk.vaitro };
      return res.json({
        success: true,
        data: { matk: tk.matk, tendangnhap: tk.tendangnhap, vaitro: tk.vaitro },
        isNew: false
      });
    }

    // Tài khoản chưa tồn tại → tạo mới (role HV)
    const username = email.split('@')[0] + '_gg';
    // Kiểm tra trùng username
    let finalUsername = username;
    const usernameCheck = await pool(req).query(
      'SELECT matk FROM taikhoan WHERE tendangnhap = $1', [username]
    );
    if (usernameCheck.rows.length > 0) {
      finalUsername = username + '_' + Date.now().toString().slice(-4);
    }

    const client = await pool(req).connect();
    try {
      await client.query('BEGIN');

      // Tạo tài khoản (MatKhau = NULL cho Google account)
      const tkResult = await client.query(
        `INSERT INTO taikhoan (tendangnhap, matkhau, vaitro, email, authprovider) 
         VALUES ($1, NULL, 'HV', $2, 'google') RETURNING matk, tendangnhap, vaitro`,
        [finalUsername, email]
      );
      const tk = tkResult.rows[0];

      // Tạo hồ sơ học viên
      await client.query(
        `INSERT INTO hocvien (matk, hoten, sdt, email) 
         VALUES ($1, $2, 'Chưa cập nhật', $3)`,
        [tk.matk, name, email]
      );

      await client.query('COMMIT');

      // Set session
      req.session.user = { matk: tk.matk, tendangnhap: tk.tendangnhap, vaitro: tk.vaitro };
      res.json({
        success: true,
        data: { matk: tk.matk, tendangnhap: tk.tendangnhap, vaitro: tk.vaitro },
        isNew: true
      });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Google auth error:', e);
    res.json({ success: false, message: 'Lỗi server: ' + e.message });
  }
});

// ============================================================
// QUÊN MẬT KHẨU — BƯỚC 1: GỬI OTP
// ============================================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.json({ success: false, message: 'Vui lòng nhập email' });
    }

    // Tìm tài khoản theo email
    const tkResult = await pool(req).query(
      'SELECT matk, tendangnhap, authprovider FROM taikhoan WHERE email = $1', [email]
    );
    if (tkResult.rows.length === 0) {
      return res.json({ success: false, message: 'Không tìm thấy tài khoản với email này' });
    }

    const tk = tkResult.rows[0];

    // Kiểm tra tài khoản Google (không có mật khẩu để reset)
    if (tk.authprovider === 'google') {
      return res.json({
        success: false,
        message: 'Tài khoản này sử dụng đăng nhập Google. Vui lòng đăng nhập bằng Google.'
      });
    }

    // Rate limit: không cho gửi OTP liên tục (tối thiểu 1 phút giữa các lần)
    const recentOtp = await pool(req).query(
      `SELECT maotp FROM otp_reset 
       WHERE matk = $1 AND ngaytao > NOW() - INTERVAL '1 minute' AND dasudung = FALSE`,
      [tk.matk]
    );
    if (recentOtp.rows.length > 0) {
      return res.json({ success: false, message: 'Vui lòng chờ 1 phút trước khi gửi lại OTP' });
    }

    // Tạo OTP 6 số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP để lưu (không lưu plaintext)
    const bcrypt = req.app.locals.bcrypt;
    const otpHash = await bcrypt.hash(otp, 10);

    // Lưu OTP vào DB (hết hạn sau 10 phút)
    await pool(req).query(
      `INSERT INTO otp_reset (matk, otphash, hethan) 
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [tk.matk, otpHash]
    );

    // Gửi email OTP
    const sent = await sendEmail({
      to: email,
      subject: '🔑 Mã OTP đặt lại mật khẩu — GiaSưConnect',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #f8fafc; border-radius: 12px;">
          <h2 style="color: #0f172a; text-align: center; margin-bottom: 10px;">🔑 Đặt lại mật khẩu</h2>
          <p style="color: #475569; text-align: center;">Xin chào <strong>${tk.tendangnhap}</strong>,</p>
          <p style="color: #475569; text-align: center;">Mã OTP của bạn là:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0f172a; background: #e2e8f0; padding: 12px 24px; border-radius: 8px; display: inline-block;">
              ${otp}
            </span>
          </div>
          <p style="color: #94a3b8; text-align: center; font-size: 14px;">
            Mã này có hiệu lực trong <strong>10 phút</strong>.<br/>
            Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; text-align: center; font-size: 12px;">GiaSưConnect — Hệ thống quản lý gia sư</p>
        </div>
      `
    });

    if (!sent) {
      return res.json({ success: false, message: 'Không thể gửi email. Vui lòng thử lại sau.' });
    }

    res.json({ success: true, message: 'Đã gửi mã OTP đến email của bạn. Vui lòng kiểm tra hộp thư.' });
  } catch (e) {
    console.error('Forgot password error:', e);
    res.json({ success: false, message: 'Lỗi server' });
  }
});

// ============================================================
// QUÊN MẬT KHẨU — BƯỚC 2: XÁC MINH OTP
// ============================================================
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.json({ success: false, message: 'Thiếu email hoặc mã OTP' });
    }

    // Tìm tài khoản
    const tkResult = await pool(req).query(
      'SELECT matk FROM taikhoan WHERE email = $1', [email]
    );
    if (tkResult.rows.length === 0) {
      return res.json({ success: false, message: 'Email không hợp lệ' });
    }
    const matk = tkResult.rows[0].matk;

    // Tìm OTP mới nhất, chưa hết hạn, chưa dùng
    const otpResult = await pool(req).query(
      `SELECT * FROM otp_reset 
       WHERE matk = $1 AND hethan > NOW() AND dasudung = FALSE
       ORDER BY ngaytao DESC LIMIT 1`,
      [matk]
    );

    if (otpResult.rows.length === 0) {
      return res.json({ success: false, message: 'Mã OTP đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.' });
    }

    const otpRecord = otpResult.rows[0];

    // Kiểm tra số lần thử (tối đa 5 lần)
    if (otpRecord.solanthu >= 5) {
      // Đánh dấu đã dùng (vô hiệu hóa)
      await pool(req).query(
        'UPDATE otp_reset SET dasudung = TRUE WHERE maotp = $1', [otpRecord.maotp]
      );
      return res.json({ success: false, message: 'Đã thử quá nhiều lần. Vui lòng yêu cầu mã OTP mới.' });
    }

    // So sánh OTP
    const bcrypt = req.app.locals.bcrypt;
    const isMatch = await bcrypt.compare(otp.toString(), otpRecord.otphash);

    if (!isMatch) {
      // Tăng số lần thử
      await pool(req).query(
        'UPDATE otp_reset SET solanthu = solanthu + 1 WHERE maotp = $1', [otpRecord.maotp]
      );
      const remaining = 5 - (otpRecord.solanthu + 1);
      return res.json({
        success: false,
        message: `Mã OTP không đúng. Còn ${remaining} lần thử.`
      });
    }

    // OTP đúng → sinh reset token
    const resetToken = crypto.randomUUID();

    await pool(req).query(
      'UPDATE otp_reset SET resettoken = $1 WHERE maotp = $2',
      [resetToken, otpRecord.maotp]
    );

    res.json({ success: true, resetToken, message: 'Xác minh OTP thành công' });
  } catch (e) {
    console.error('Verify OTP error:', e);
    res.json({ success: false, message: 'Lỗi server' });
  }
});

// ============================================================
// QUÊN MẬT KHẨU — BƯỚC 3: ĐẶT MẬT KHẨU MỚI
// ============================================================
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.json({ success: false, message: 'Thiếu thông tin' });
    }

    if (newPassword.length < 6) {
      return res.json({ success: false, message: 'Mật khẩu mới phải từ 6 ký tự trở lên' });
    }

    // Tìm OTP record theo resetToken, chưa hết hạn, chưa dùng
    const otpResult = await pool(req).query(
      `SELECT * FROM otp_reset 
       WHERE resettoken = $1 AND hethan > NOW() AND dasudung = FALSE
       LIMIT 1`,
      [resetToken]
    );

    if (otpResult.rows.length === 0) {
      return res.json({ success: false, message: 'Phiên đặt lại mật khẩu đã hết hạn. Vui lòng thử lại từ đầu.' });
    }

    const otpRecord = otpResult.rows[0];

    // Hash mật khẩu mới
    const bcrypt = req.app.locals.bcrypt;
    const hash = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu
    await pool(req).query(
      'UPDATE taikhoan SET matkhau = $1, ngaycapnhat = NOW() WHERE matk = $2',
      [hash, otpRecord.matk]
    );

    // Vô hiệu hóa OTP
    await pool(req).query(
      'UPDATE otp_reset SET dasudung = TRUE WHERE maotp = $1',
      [otpRecord.maotp]
    );

    res.json({ success: true, message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.' });
  } catch (e) {
    console.error('Reset password error:', e);
    res.json({ success: false, message: 'Lỗi server' });
  }
});

module.exports = router;
