const express = require('express');
const router = express.Router();
const { uploadToS3, deleteFromS3 } = require('../utils/s3');

function pool(req) { return req.app.locals.pool; }
function auth(req) { return req.session.user; }

/**
 * Upload ảnh base64 → S3 (hoặc local fallback nếu chưa cấu hình AWS)
 */
async function saveBase64Image(base64Str, prefix, username = '') {
  if (!base64Str || typeof base64Str !== 'string') return null;

  // Nếu có cấu hình AWS → upload lên S3
  if (process.env.AWS_S3_BUCKET) {
    return await uploadToS3(base64Str, prefix, username);
  }

  // Fallback: lưu local (giữ tương thích khi chưa cấu hình S3)
  const fs = require('fs');
  const path = require('path');
  const match = base64Str.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return null;
  
  const ext = match[1];
  const data = match[2];
  const buffer = Buffer.from(data, 'base64');
  
  const safeUsername = username ? username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + '_' : '';
  const filename = `${safeUsername}${prefix}_${Date.now()}.${ext}`;
  const dirPath = path.join(__dirname, '../uploads');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const filePath = path.join(dirPath, filename);
  fs.writeFileSync(filePath, buffer);
  
  return `/uploads/${filename}`;
}

/**
 * Xóa ảnh cũ (S3 hoặc local)
 */
async function deleteOldImage(oldPath) {
  if (!oldPath) return;

  // Ảnh trên S3
  if (oldPath.includes('.s3.')) {
    await deleteFromS3(oldPath);
    return;
  }

  // Ảnh local
  if (oldPath.startsWith('/uploads/')) {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', oldPath);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch(e) { console.error('Lỗi khi xóa ảnh cũ:', e); }
    }
  }
}


// Đăng ký tài khoản Gia Sư mới
router.post('/register', async (req, res) => {
  try {
    const { username, password, hoten, ngaysinh, gioitinh, cccd, sdt, email, trinhdohocvan, chuyennganh, kinhnghiem, khuvuc, hocphimongmuon, anhcccd, anhbangcap, anhthesinhvien, anhdaidien } = req.body;
    if (!username || !password || !hoten || !ngaysinh || !gioitinh || !cccd || !sdt || !trinhdohocvan || !chuyennganh || !khuvuc || !hocphimongmuon) {
      return res.json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    if (!anhcccd) {
      return res.json({ success: false, message: 'Ảnh CCCD là minh chứng bắt buộc' });
    }
    if (!anhbangcap && !anhthesinhvien) {
      return res.json({ success: false, message: 'Vui lòng cung cấp ít nhất Ảnh bằng tốt nghiệp hoặc Ảnh thẻ sinh viên để làm minh chứng' });
    }

    // Backend Validation
    if (password.length < 6) return res.json({ success: false, message: 'Mật khẩu phải từ 6 ký tự trở lên' });
    if (!/^\d{12}$/.test(cccd)) return res.json({ success: false, message: 'CCCD phải bao gồm đúng 12 chữ số' });
    if (!/^\d{10,11}$/.test(sdt)) return res.json({ success: false, message: 'Số điện thoại không hợp lệ' });
    if (email && !email.endsWith('@gmail.com')) return res.json({ success: false, message: 'Email phải có đuôi @gmail.com' });
    if (parseInt(hocphimongmuon) <= 50000) return res.json({ success: false, message: 'Học phí mong muốn phải lớn hơn 50,000đ' });
    if (parseInt(kinhnghiem) < 0) return res.json({ success: false, message: 'Kinh nghiệm không hợp lệ' });
    
    const todayObj = new Date();
    const eighteenYearsAgo = new Date(todayObj.getFullYear() - 18, todayObj.getMonth(), todayObj.getDate()).toISOString().split('T')[0];
    if (ngaysinh > eighteenYearsAgo) return res.json({ success: false, message: 'Gia sư phải đủ 18 tuổi' });

    const exists = await pool(req).query('SELECT matk FROM taikhoan WHERE tendangnhap = $1', [username]);
    if (exists.rows.length > 0) return res.json({ success: false, message: 'Tên đăng nhập đã tồn tại' });

    const cccdExists = await pool(req).query('SELECT mags FROM giasu WHERE cccd = $1', [cccd]);
    if (cccdExists.rows.length > 0) return res.json({ success: false, message: 'Số CCCD đã được đăng ký' });

    const bcrypt = req.app.locals.bcrypt;
    const hash = await bcrypt.hash(password, 10);
    const client = await pool(req).connect();

    try {
      await client.query('BEGIN');
      const tkResult = await client.query(
        "INSERT INTO taikhoan (tendangnhap, matkhau, vaitro, email) VALUES ($1, $2, 'GS', $3) RETURNING matk",
        [username, hash, email || null]
      );
      const matk = tkResult.rows[0].matk;

      const anhcccdPath = await saveBase64Image(anhcccd, 'cccd', username);
      const anhbangcapPath = await saveBase64Image(anhbangcap, 'bangcap', username);
      const anhthesinhvienPath = await saveBase64Image(anhthesinhvien, 'thesv', username);
      let anhdaidienPath = await saveBase64Image(anhdaidien, 'avatar', username);

      const gsResult = await client.query(
        `INSERT INTO giasu (matk, hoten, ngaysinh, gioitinh, cccd, sdt, email, trinhdohocvan, chuyennganh, kinhnghiem, khuvuc, hocphimongmuon, anhcccd, anhbangcap, anhthesinhvien, anhdaidien) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING mags`,
        [matk, hoten, ngaysinh, gioitinh, cccd, sdt, email || null, trinhdohocvan, chuyennganh, parseInt(kinhnghiem) || 0, khuvuc, parseInt(hocphimongmuon), anhcccdPath, anhbangcapPath, anhthesinhvienPath, anhdaidienPath]
      );
      
      const mags = gsResult.rows[0].mags;
      
      if (!anhdaidienPath) {
        anhdaidienPath = `https://ui-avatars.com/api/?name=GS${mags}&background=random`;
        await client.query("UPDATE giasu SET anhdaidien = $1 WHERE mags = $2", [anhdaidienPath, mags]);
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Đăng ký hồ sơ gia sư thành công. Vui lòng chờ trung tâm duyệt hồ sơ.' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error(e);
    res.json({ success: false, message: 'Lỗi server: ' + e.message });
  }
});

// Lấy danh sách gia sư công khai (cho khách chưa đăng nhập)
router.get('/public', async (req, res) => {
  try {
    const query = `
      SELECT 
        mags, hoten, ngaysinh, gioitinh, trinhdohocvan, chuyennganh, 
        kinhnghiem, khuvuc, hocphimongmuon, anhdaidien, diemtrungbinh
      FROM giasu 
      WHERE trangthaihoso = 'DaDuyet'
      ORDER BY mags DESC
    `;
    const result = await pool(req).query(query);
    
    // Masking/Formatting for public view
    const publicTutors = result.rows.map(gs => {
      let age = null;
      if (gs.ngaysinh) {
        const birthYear = new Date(gs.ngaysinh).getFullYear();
        const currentYear = new Date().getFullYear();
        age = currentYear - birthYear;
      }
      return {
        ...gs,
        ngaysinh: undefined, // Xóa ngày sinh chi tiết
        tuoi: age // Chỉ trả về tuổi
      };
    });

    res.json({ success: true, data: publicTutors });
  } catch (e) { 
    res.json({ success: false, message: e.message }); 
  }
});

// Lấy thông tin hồ sơ của chính gia sư đang đăng nhập
router.get('/me', async (req, res) => {
  if (!auth(req)) return res.json({ success: false, message: 'Chưa đăng nhập' });
  try {
    const gsR = await pool(req).query(`
      SELECT g.*, t.is2faenabled 
      FROM giasu g
      JOIN taikhoan t ON g.matk = t.matk
      WHERE g.matk=$1
    `, [auth(req).matk]);
    if (!gsR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ' });
    res.json({ success: true, data: gsR.rows[0] });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy danh sách môn học đã đăng ký dạy
router.get('/monhoc', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const gsR = await pool(req).query('SELECT mags FROM giasu WHERE matk = $1', [auth(req).matk]);
    if (!gsR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ gia sư' });
    const mags = gsR.rows[0].mags;

    const r = await pool(req).query(
      `SELECT gsm.*, mh.tenmh 
       FROM giasu_monhoc gsm
       JOIN monhoc mh ON mh.mamh = gsm.mamh
       WHERE gsm.mags = $1`, [mags]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Đăng ký/cập nhật môn học dạy
router.post('/monhoc', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { mamh, caplop, hocphidexuat, ghichu } = req.body;
    if (!mamh || !caplop) return res.json({ success: false, message: 'Thiếu môn học hoặc cấp lớp' });

    const gsR = await pool(req).query('SELECT mags FROM giasu WHERE matk = $1', [auth(req).matk]);
    const mags = gsR.rows[0].mags;

    await pool(req).query(
      `INSERT INTO giasu_monhoc (mags, mamh, caplop, hocphidexuat, ghichu) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (mags, mamh, caplop) 
       DO UPDATE SET hocphidexuat = EXCLUDED.hocphidexuat, ghichu = EXCLUDED.ghichu`,
      [mags, mamh, caplop, hocphidexuat || null, ghichu || null]
    );
    res.json({ success: true, message: 'Cập nhật môn dạy thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy lịch rảnh
router.get('/lichranh', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const gsR = await pool(req).query('SELECT mags FROM giasu WHERE matk = $1', [auth(req).matk]);
    if (!gsR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ gia sư' });
    const mags = gsR.rows[0].mags;

    const r = await pool(req).query('SELECT * FROM lichranh_giasu WHERE mags = $1 ORDER BY thutrongtuan, cahoc', [mags]);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Thêm lịch rảnh (Hỗ trợ chọn nhiều)
router.post('/lichranh', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { thutrongtuan, cahoc, ghichu } = req.body;
    if (!thutrongtuan || !cahoc) return res.json({ success: false, message: 'Thiếu thông tin thứ hoặc ca học' });

    const gsR = await pool(req).query('SELECT mags, trangthaihoso FROM giasu WHERE matk = $1', [auth(req).matk]);
    if (!gsR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ gia sư' });
    if (gsR.rows[0].trangthaihoso !== 'DaDuyet') {
      return res.json({ success: false, message: 'Hồ sơ của bạn chưa được duyệt, không thể thực hiện chức năng này.' });
    }
    const mags = gsR.rows[0].mags;

    const selectedThus = Array.isArray(thutrongtuan) ? thutrongtuan : [thutrongtuan];
    const selectedCas = Array.isArray(cahoc) ? cahoc : [cahoc];

    if (selectedThus.length === 0 || selectedCas.length === 0) {
      return res.json({ success: false, message: 'Vui lòng chọn ít nhất một Thứ và một Ca học' });
    }

    const client = await pool(req).connect();
    try {
      await client.query('BEGIN');
      for (const thu of selectedThus) {
        for (const ca of selectedCas) {
          await client.query(
            `INSERT INTO lichranh_giasu (mags, thutrongtuan, cahoc, trangthai, ghichu) 
             VALUES ($1, $2, $3, 'Ranh', $4)
             ON CONFLICT (mags, thutrongtuan, cahoc) DO NOTHING`,
            [mags, parseInt(thu), ca, ghichu || null]
          );
        }
      }
      await client.query('COMMIT');
      res.json({ success: true, message: 'Đăng ký lịch rảnh thành công' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Xóa lịch rảnh
router.delete('/lichranh/:id', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { id } = req.params;
    const gsR = await pool(req).query('SELECT mags FROM giasu WHERE matk = $1', [auth(req).matk]);
    const mags = gsR.rows[0].mags;

    await pool(req).query('DELETE FROM lichranh_giasu WHERE malich = $1 AND mags = $2', [id, mags]);
    res.json({ success: true, message: 'Xóa lịch rảnh thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy các lớp được phân công
router.get('/lop', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const gsR = await pool(req).query('SELECT mags FROM giasu WHERE matk = $1', [auth(req).matk]);
    if (!gsR.rows.length) return res.json({ success: true, data: [] });
    const mags = gsR.rows[0].mags;

    const r = await pool(req).query(
      `SELECT l.*, mh.tenmh, hv.hoten AS tenhocvien, yc.caplop, yc.diachi, yc.songayhoc, yc.lichhoctrongtuan
       FROM lop l
       JOIN yeucauhockem yc ON yc.mayc = l.mayc
       JOIN hocvien hv ON hv.mahv = yc.mahv
       JOIN monhoc mh ON mh.mamh = yc.mamh
       WHERE l.mags = $1 AND l.trangthai NOT IN ('KetThuc', 'Huy')
       ORDER BY l.ngaytao DESC`, [mags]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Gia sư xác nhận nhận lớp
router.post('/lop/:id/nhan', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { id } = req.params;
    const gsR = await pool(req).query('SELECT mags FROM giasu WHERE matk = $1', [auth(req).matk]);
    if (!gsR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ' });
    const mags = gsR.rows[0].mags;

    const lopR = await pool(req).query("SELECT trangthai FROM lop WHERE malop = $1 AND mags = $2", [id, mags]);
    if (!lopR.rows.length) return res.json({ success: false, message: 'Lớp không tồn tại hoặc không thuộc về bạn' });
    if (lopR.rows[0].trangthai !== 'DaPhanCong') return res.json({ success: false, message: 'Lớp không ở trạng thái chờ xác nhận' });

    await pool(req).query("UPDATE lop SET trangthai = 'DangDay', hanxacnhan = NULL WHERE malop = $1", [id]);
    res.json({ success: true, message: 'Xác nhận nhận lớp thành công!' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Gia sư từ chối lớp
router.post('/lop/:id/tuchoi', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  const client = await pool(req).connect();
  try {
    const { id } = req.params;
    const gsR = await client.query('SELECT mags FROM giasu WHERE matk = $1', [auth(req).matk]);
    if (!gsR.rows.length) { client.release(); return res.json({ success: false, message: 'Không tìm thấy hồ sơ' }); }
    const mags = gsR.rows[0].mags;

    const lopR = await client.query("SELECT trangthai, mayc FROM lop WHERE malop = $1 AND mags = $2", [id, mags]);
    if (!lopR.rows.length) { client.release(); return res.json({ success: false, message: 'Lớp không tồn tại hoặc không thuộc về bạn' }); }
    if (lopR.rows[0].trangthai !== 'DaPhanCong') { client.release(); return res.json({ success: false, message: 'Lớp không ở trạng thái chờ xác nhận' }); }

    await client.query('BEGIN');
    
    // Xóa hoàn toàn lớp học nháp này để Admin ghép lại từ đầu
    await client.query("DELETE FROM lop WHERE malop = $1", [id]);
    
    // Đẩy yêu cầu học kèm về ChoGhep
    await client.query("UPDATE yeucauhockem SET trangthai = 'ChoGhep' WHERE mayc = $1", [lopR.rows[0].mayc]);

    // Giải phóng lịch rảnh
    const ycR = await client.query("SELECT lichhoctrongtuan FROM yeucauhockem WHERE mayc = $1", [lopR.rows[0].mayc]);
    if (ycR.rows.length) {
      let lichHocTrongTuan;
      try {
        lichHocTrongTuan = typeof ycR.rows[0].lichhoctrongtuan === 'string' 
          ? JSON.parse(ycR.rows[0].lichhoctrongtuan) 
          : ycR.rows[0].lichhoctrongtuan;
      } catch (e) {}
      if (Array.isArray(lichHocTrongTuan)) {
        for (const item of lichHocTrongTuan) {
          let thu = 8;
          if (item.thu && item.thu !== 'Chu Nhat') thu = parseInt(item.thu.replace('Thu ', ''));
          let caCode = 'Sang';
          if (item.ca === 'Chiều' || item.ca === 'Chieu') caCode = 'Chieu';
          if (item.ca === 'Tối' || item.ca === 'Toi') caCode = 'Toi';
          await client.query(
            "UPDATE lichranh_giasu SET trangthai = 'Ranh' WHERE mags = $1 AND thutrongtuan = $2 AND cahoc = $3",
            [mags, thu, caCode]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Từ chối lớp thành công, lớp đã được trả về trạng thái chờ ghép.' });
  } catch (e) {
    await client.query('ROLLBACK');
    res.json({ success: false, message: e.message });
  } finally {
    client.release();
  }
});

// Lấy danh sách hoa hồng của gia sư
router.get('/hoahong', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const gsR = await pool(req).query('SELECT mags FROM giasu WHERE matk = $1', [auth(req).matk]);
    if (!gsR.rows.length) return res.json({ success: true, data: [] });
    const mags = gsR.rows[0].mags;

    const r = await pool(req).query(
      `SELECT hh.*, mh.tenmh FROM hoahong hh
       JOIN lop l ON l.malop = hh.malop
       JOIN yeucauhockem yc ON yc.mayc = l.mayc
       JOIN monhoc mh ON mh.mamh = yc.mamh
       WHERE hh.mags = $1
       ORDER BY hh.kytt_tu DESC`, [mags]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Yêu cầu xin nghỉ dạy (Gia sư)
router.post('/xinnghi', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { malop, lydo } = req.body;
    if (!malop || !lydo) return res.json({ success: false, message: 'Thiếu thông tin' });
    
    const gsR = await pool(req).query('SELECT mags FROM giasu WHERE matk=$1', [auth(req).matk]);
    const mags = gsR.rows[0].mags;
    
    const lopCheck = await pool(req).query(`
      SELECT l.malop, yc.mahv 
      FROM lop l JOIN yeucauhockem yc ON l.mayc = yc.mayc 
      WHERE l.malop = $1 AND l.mags = $2
    `, [malop, mags]);
    
    if (!lopCheck.rows.length) return res.json({ success: false, message: 'Không tìm thấy lớp' });
    const mahv = lopCheck.rows[0].mahv;
    
    // Lưu vào bảng yeucaudoigiasu với ý nghĩa gia sư xin nghỉ
    await pool(req).query(
      "INSERT INTO yeucaudoigiasu(malop,mahv,mags,landoithu,lydo,trangthai) VALUES($1,$2,$3,1,$4,'ChoXuLy')",
      [malop, mahv, mags, '[GS XIN NGHỈ]: ' + lydo]
    );
    res.json({ success: true, message: 'Đã gửi yêu cầu xin nghỉ thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Xin nghỉ 1 buổi (ĐƠN GIẢN HÓA: dùng CaHoc thay vì giờ cụ thể)
router.post('/xinnghibuoi', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { malop, ngayday, cahoc, lydo } = req.body;
    if (!malop || !ngayday || !cahoc || !lydo) return res.json({ success: false, message: 'Thiếu thông tin' });
    
    if (!['Sang', 'Chieu', 'Toi'].includes(cahoc)) {
      return res.json({ success: false, message: 'Ca học không hợp lệ' });
    }
    
    // KIỂM TRA CHẶN XIN NGHỈ SÁT GIỜ (Yêu cầu báo trước 1 ngày)
    const ngaydayDate = new Date(ngayday);
    ngaydayDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (ngaydayDate <= today) {
      return res.json({ success: false, message: 'Chỉ có thể xin nghỉ trước ngày học ít nhất 1 ngày. Vui lòng liên hệ trực tiếp Admin nếu có việc gấp!' });
    }
    
    // Kiểm tra xem buổi đó đã tồn tại chưa (trạng thái ChoXacNhan)
    const existingSession = await pool(req).query(
      "SELECT mabuoi, trangthai FROM buoiday WHERE malop = $1 AND ngayday = $2 AND cahoc = $3",
      [malop, ngayday, cahoc]
    );
    
    if (existingSession.rows.length > 0) {
      const session = existingSession.rows[0];
      if (session.trangthai === 'ChoXacNhan') {
        await pool(req).query(
          "UPDATE buoiday SET trangthai = 'GSXinNghi', noidung = $1, thoigianxacnhan = NOW() WHERE mabuoi = $2",
          [lydo, session.mabuoi]
        );
        return res.json({ success: true, message: 'Đã gửi yêu cầu xin nghỉ dạy thành công, vui lòng chờ duyệt!' });
      } else {
        return res.json({ success: false, message: 'Buổi học này đã được xử lý hoặc đã có yêu cầu khác' });
      }
    }
    
    return res.json({ success: false, message: 'Ngày/Ca học không tồn tại trong lịch trình' });
  } catch (e) { 
    if (e.code === '23505') return res.json({ success: false, message: 'Buổi học trùng lặp' });
    res.json({ success: false, message: e.message }); 
  }
});

// Cập nhật thông tin hồ sơ gia sư
router.post('/me/update', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { hoten, ngaysinh, gioitinh, sdt, email, trinhdohocvan, chuyennganh, kinhnghiem, khuvuc, hocphimongmuon, anhdaidien, anhbangcap } = req.body;
    
    if (!hoten || !ngaysinh || !gioitinh || !sdt || !trinhdohocvan || !chuyennganh || !khuvuc || !hocphimongmuon) {
      return res.json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }
    
    if (!/^\d{10,11}$/.test(sdt)) return res.json({ success: false, message: 'Số điện thoại phải gồm 10-11 chữ số' });
    if (email && !email.endsWith('@gmail.com')) return res.json({ success: false, message: 'Email phải đúng định dạng @gmail.com' });
    
    const gsR = await pool(req).query('SELECT * FROM giasu WHERE matk = $1', [auth(req).matk]);
    if (!gsR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ gia sư' });
    const mags = gsR.rows[0].mags;
    
    let avatarPath = gsR.rows[0].anhdaidien;
    let diplomaPath = gsR.rows[0].anhbangcap;
    const username = auth(req).tendangnhap;
    
    if (anhdaidien && typeof anhdaidien === 'string' && anhdaidien.startsWith('data:image')) {
      const newAvatarPath = await saveBase64Image(anhdaidien, 'avatar', username);
      if (newAvatarPath) {
        await deleteOldImage(avatarPath);
        avatarPath = newAvatarPath;
      }
    }
    if (anhbangcap && typeof anhbangcap === 'string' && anhbangcap.startsWith('data:image')) {
      const newDiplomaPath = await saveBase64Image(anhbangcap, 'bangcap', username);
      if (newDiplomaPath) {
        await deleteOldImage(diplomaPath);
        diplomaPath = newDiplomaPath;
      }
    }
    
    await pool(req).query(`
      UPDATE giasu 
      SET hoten = $1, ngaysinh = $2, gioitinh = $3, sdt = $4, email = $5, 
          trinhdohocvan = $6, chuyennganh = $7, kinhnghiem = $8, khuvuc = $9, 
          hocphimongmuon = $10, anhdaidien = $11, anhbangcap = $12
      WHERE mags = $13
    `, [
      hoten, ngaysinh, gioitinh, sdt, email || null,
      trinhdohocvan, chuyennganh, parseInt(kinhnghiem) || 0, khuvuc,
      parseInt(hocphimongmuon), avatarPath, diplomaPath, mags
    ]);
    
    await pool(req).query('UPDATE taikhoan SET email = $1 WHERE matk = $2', [email || null, auth(req).matk]);
    
    res.json({ success: true, message: 'Cập nhật thông tin hồ sơ thành công!' });
  } catch (e) {
    console.error(e);
    res.json({ success: false, message: 'Lỗi server: ' + e.message });
  }
});

module.exports = router;
