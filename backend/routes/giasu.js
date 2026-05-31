const express = require('express');
const router = express.Router();

function pool(req) { return req.app.locals.pool; }
function auth(req) { return req.session.user; }

// Đăng ký tài khoản Gia Sư mới
router.post('/register', async (req, res) => {
  try {
    const { username, password, hoten, ngaysinh, gioitinh, cccd, sdt, email, trinhdohocvan, chuyennganh, kinhnghiem, khuvuc, hocphimongmuon } = req.body;
    if (!username || !password || !hoten || !ngaysinh || !gioitinh || !cccd || !sdt || !trinhdohocvan || !chuyennganh || !khuvuc || !hocphimongmuon) {
      return res.json({ success: false, message: 'Thiếu thông tin bắt buộc' });
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

    const exists = await pool(req).query('SELECT MaTK FROM TAIKHOAN WHERE TenDangNhap = $1', [username]);
    if (exists.rows.length > 0) return res.json({ success: false, message: 'Tên đăng nhập đã tồn tại' });

    const cccdExists = await pool(req).query('SELECT MaGS FROM GIASU WHERE CCCD = $1', [cccd]);
    if (cccdExists.rows.length > 0) return res.json({ success: false, message: 'Số CCCD đã được đăng ký' });

    const bcrypt = req.app.locals.bcrypt;
    const hash = await bcrypt.hash(password, 10);
    const client = await pool(req).connect();

    try {
      await client.query('BEGIN');
      const tkResult = await client.query(
        "INSERT INTO TAIKHOAN (TenDangNhap, MatKhau, VaiTro, Email) VALUES ($1, $2, 'GS', $3) RETURNING MaTK",
        [username, hash, email || null]
      );
      const matk = tkResult.rows[0].matk;

      await client.query(
        `INSERT INTO GIASU (MaTK, HoTen, NgaySinh, GioiTinh, CCCD, SDT, Email, TrinhDoHocVan, ChuyenNganh, KinhNghiem, KhuVuc, HocPhiMongMuon) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [matk, hoten, ngaysinh, gioitinh, cccd, sdt, email || null, trinhdohocvan, chuyennganh, parseInt(kinhnghiem) || 0, khuvuc, parseInt(hocphimongmuon)]
      );

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

// Lấy thông tin cá nhân của gia sư
router.get('/me', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const r = await pool(req).query('SELECT * FROM GIASU WHERE MaTK = $1', [auth(req).matk]);
    if (!r.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ gia sư' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy danh sách môn học đã đăng ký dạy
router.get('/monhoc', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const gsR = await pool(req).query('SELECT MaGS FROM GIASU WHERE MaTK = $1', [auth(req).matk]);
    if (!gsR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ gia sư' });
    const mags = gsR.rows[0].mags;

    const r = await pool(req).query(
      `SELECT gsm.*, mh.TenMH 
       FROM GIASU_MONHOC gsm
       JOIN MONHOC mh ON mh.MaMH = gsm.MaMH
       WHERE gsm.MaGS = $1`, [mags]
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

    const gsR = await pool(req).query('SELECT MaGS FROM GIASU WHERE MaTK = $1', [auth(req).matk]);
    const mags = gsR.rows[0].mags;

    await pool(req).query(
      `INSERT INTO GIASU_MONHOC (MaGS, MaMH, CapLop, HocPhiDeXuat, GhiChu) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (MaGS, MaMH, CapLop) 
       DO UPDATE SET HocPhiDeXuat = EXCLUDED.HocPhiDeXuat, GhiChu = EXCLUDED.GhiChu`,
      [mags, mamh, caplop, hocphidexuat || null, ghichu || null]
    );
    res.json({ success: true, message: 'Cập nhật môn dạy thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy lịch rảnh
router.get('/lichranh', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const gsR = await pool(req).query('SELECT MaGS FROM GIASU WHERE MaTK = $1', [auth(req).matk]);
    if (!gsR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ gia sư' });
    const mags = gsR.rows[0].mags;

    const r = await pool(req).query('SELECT * FROM LICHRANH_GIASU WHERE MaGS = $1 ORDER BY ThuTrongTuan, CaHoc', [mags]);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Thêm lịch rảnh
router.post('/lichranh', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { thutrongtuan, cahoc, ghichu } = req.body;
    if (!thutrongtuan || !cahoc) return res.json({ success: false, message: 'Thiếu thông tin thứ hoặc ca học' });

    const gsR = await pool(req).query('SELECT MaGS FROM GIASU WHERE MaTK = $1', [auth(req).matk]);
    const mags = gsR.rows[0].mags;

    await pool(req).query(
      `INSERT INTO LICHRANH_GIASU (MaGS, ThuTrongTuan, CaHoc, TrangThai, GhiChu) 
       VALUES ($1, $2, $3, 'Ranh', $4)
       ON CONFLICT (MaGS, ThuTrongTuan, CaHoc) DO NOTHING`,
      [mags, thutrongtuan, cahoc, ghichu || null]
    );
    res.json({ success: true, message: 'Thêm lịch rảnh thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Xóa lịch rảnh
router.delete('/lichranh/:id', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { id } = req.params;
    const gsR = await pool(req).query('SELECT MaGS FROM GIASU WHERE MaTK = $1', [auth(req).matk]);
    const mags = gsR.rows[0].mags;

    await pool(req).query('DELETE FROM LICHRANH_GIASU WHERE MaLich = $1 AND MaGS = $2', [id, mags]);
    res.json({ success: true, message: 'Xóa lịch rảnh thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy các lớp được phân công
router.get('/lop', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const gsR = await pool(req).query('SELECT MaGS FROM GIASU WHERE MaTK = $1', [auth(req).matk]);
    if (!gsR.rows.length) return res.json({ success: true, data: [] });
    const mags = gsR.rows[0].mags;

    const r = await pool(req).query(
      `SELECT l.*, mh.TenMH, hv.HoTen AS TenHocVien, yc.CapLop, yc.DiaChi, yc.ThoiGianMongMuon
       FROM LOP l
       JOIN YEUCAUHOCKEM yc ON yc.MaYC = l.MaYC
       JOIN HOCVIEN hv ON hv.MaHV = yc.MaHV
       JOIN MONHOC mh ON mh.MaMH = yc.MaMH
       WHERE l.MaGS = $1
       ORDER BY l.NgayTao DESC`, [mags]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy danh sách hoa hồng của gia sư
router.get('/hoahong', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const gsR = await pool(req).query('SELECT MaGS FROM GIASU WHERE MaTK = $1', [auth(req).matk]);
    if (!gsR.rows.length) return res.json({ success: true, data: [] });
    const mags = gsR.rows[0].mags;

    const r = await pool(req).query(
      `SELECT hh.*, mh.TenMH FROM HOAHONG hh
       JOIN LOP l ON l.MaLop = hh.MaLop
       JOIN YEUCAUHOCKEM yc ON yc.MaYC = l.MaYC
       JOIN MONHOC mh ON mh.MaMH = yc.MaMH
       WHERE hh.MaGS = $1
       ORDER BY hh.KyTT_Tu DESC`, [mags]
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
    
    const gsR = await pool(req).query('SELECT MaGS FROM GIASU WHERE MaTK=$1', [auth(req).matk]);
    const mags = gsR.rows[0].mags;
    
    const lopCheck = await pool(req).query(`
      SELECT l.MaLop, yc.MaHV 
      FROM LOP l JOIN YEUCAUHOCKEM yc ON l.MaYC = yc.MaYC 
      WHERE l.MaLop = $1 AND l.MaGS = $2
    `, [malop, mags]);
    
    if (!lopCheck.rows.length) return res.json({ success: false, message: 'Không tìm thấy lớp' });
    const mahv = lopCheck.rows[0].mahv;
    
    // Lưu vào bảng YEUCAUDOIGIASU với ý nghĩa gia sư xin nghỉ (có thể admin sẽ gán GS khác hoặc kết thúc lớp)
    await pool(req).query(
      "INSERT INTO YEUCAUDOIGIASU(MaLop,MaHV,MaGS,LanDoiThu,LyDo,TrangThai) VALUES($1,$2,$3,1,$4,'ChoXuLy')",
      [malop, mahv, mags, '[GS XIN NGHỈ]: ' + lydo]
    );
    res.json({ success: true, message: 'Đã gửi yêu cầu xin nghỉ thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Xin nghỉ 1 buổi
router.post('/xinnghibuoi', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { malop, ngayday, giobatdau, gioketthuc, lydo } = req.body;
    if (!malop || !ngayday || !giobatdau || !gioketthuc || !lydo) return res.json({ success: false, message: 'Thiếu thông tin' });
    
    await pool(req).query(
      "INSERT INTO BUOIDAY(MaLop, NgayDay, GioBatDau, GioKetThuc, TrangThai, NoiDung) VALUES($1, $2, $3, $4, 'GSNghi', $5)",
      [malop, ngayday, giobatdau, gioketthuc, lydo]
    );
    res.json({ success: true, message: 'Đã báo nghỉ thành công' });
  } catch (e) { 
    if (e.code === '23505') return res.json({ success: false, message: 'Buổi học trùng lặp thời gian' });
    res.json({ success: false, message: e.message }); 
  }
});

module.exports = router;
