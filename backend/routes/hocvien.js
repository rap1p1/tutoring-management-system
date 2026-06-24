const express = require('express');
const router = express.Router();

function pool(req) { return req.app.locals.pool; }
function auth(req) { return req.session.user; }

// Lấy thông tin hồ sơ học viên hiện tại
router.get('/me', async (req, res) => {
  if (!auth(req)) return res.json({ success: false, message: 'Chưa đăng nhập' });
  try {
    const r = await pool(req).query('SELECT * FROM hocvien WHERE matk=$1', [auth(req).matk]);
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Cập nhật thông tin hồ sơ học viên
router.put('/me', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'HV') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { hoten, ngaysinh, sdt, diachi } = req.body;
    
    if (!hoten || !sdt) {
      return res.json({ success: false, message: 'Họ tên và Số điện thoại là bắt buộc' });
    }

    if (!/^\d{10,11}$/.test(sdt)) {
      return res.json({ success: false, message: 'Số điện thoại phải gồm 10-11 chữ số' });
    }

    const today = new Date().toISOString().split('T')[0];
    if (ngaysinh && ngaysinh >= today) {
      return res.json({ success: false, message: 'Ngày sinh phải nhỏ hơn ngày hiện tại' });
    }

    await pool(req).query(
      `UPDATE hocvien 
       SET hoten = $1, ngaysinh = $2, sdt = $3, diachi = $4 
       WHERE matk = $5`,
      [hoten, ngaysinh || null, sdt, diachi || null, auth(req).matk]
    );

    res.json({ success: true, message: 'Cập nhật hồ sơ thành công' });
  } catch (e) { 
    console.error('Update profile error:', e);
    res.json({ success: false, message: e.message }); 
  }
});

// Gửi yêu cầu học kèm (ĐƠN GIẢN HÓA: SoNgayHoc + LichHocTrongTuan)
router.post('/yeucau', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'HV') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { mamh, caplop, hinhthuchoc, yc_gioitinhgs, yc_trinhdogs, songayhoc, lichhoctrongtuan, diachi, ghichu } = req.body;
    if (!mamh || !caplop || !lichhoctrongtuan) return res.json({ success: false, message: 'Thiếu thông tin bắt buộc' });

    const parsedSoNgay = songayhoc !== undefined ? parseInt(songayhoc) : 0;
    if (isNaN(parsedSoNgay) || parsedSoNgay < 0) return res.json({ success: false, message: 'Số ngày học không hợp lệ' });

    // Validate lịch học
    let lichHoc;
    try {
      lichHoc = typeof lichhoctrongtuan === 'string' ? JSON.parse(lichhoctrongtuan) : lichhoctrongtuan;
    } catch (e) {
      return res.json({ success: false, message: 'Lịch học không hợp lệ' });
    }
    if (!Array.isArray(lichHoc) || lichHoc.length === 0) {
      return res.json({ success: false, message: 'Vui lòng chọn ít nhất 1 buổi học trong tuần' });
    }

    const lichHocStr = JSON.stringify(lichHoc);

    const hvR = await pool(req).query('SELECT mahv FROM hocvien WHERE matk=$1', [auth(req).matk]);
    if (!hvR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ học viên' });
    const mahv = hvR.rows[0].mahv;
    const r = await pool(req).query(
      `INSERT INTO yeucauhockem(mahv,mamh,caplop,hinhthuchoc,yc_gioitinhgs,yc_trinhdogs,songayhoc,lichhoctrongtuan,diachi,ghichu)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [mahv, mamh, caplop, hinhthuchoc || null, yc_gioitinhgs || null, yc_trinhdogs || null, parsedSoNgay, lichHocStr, diachi || null, ghichu || null]
    );
    res.json({ success: true, data: r.rows[0], message: 'Gửi yêu cầu thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy danh sách yêu cầu học kèm của HV
router.get('/yeucau', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'HV') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const hvR = await pool(req).query('SELECT mahv FROM hocvien WHERE matk=$1', [auth(req).matk]);
    if (!hvR.rows.length) return res.json({ success: true, data: [] });
    const mahv = hvR.rows[0].mahv;
    const r = await pool(req).query(
      `SELECT yc.*, mh.tenmh FROM yeucauhockem yc
       JOIN monhoc mh ON mh.mamh = yc.mamh
       WHERE yc.mahv=$1 ORDER BY yc.ngaydangky DESC`, [mahv]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lớp đang học của HV
router.get('/lop', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'HV') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const hvR = await pool(req).query('SELECT mahv FROM hocvien WHERE matk=$1', [auth(req).matk]);
    if (!hvR.rows.length) return res.json({ success: true, data: [] });
    const mahv = hvR.rows[0].mahv;
    const r = await pool(req).query(
      `SELECT l.*, mh.tenmh, gs.hoten AS tengiasu, yc.caplop
       FROM lop l
       JOIN yeucauhockem yc ON yc.mayc = l.mayc
       JOIN monhoc mh ON mh.mamh = yc.mamh
       LEFT JOIN giasu gs ON gs.mags = l.mags
       WHERE yc.mahv=$1 AND l.trangthai NOT IN ('KetThuc', 'Huy')
       ORDER BY l.ngaytao DESC`, [mahv]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Học phí của HV
router.get('/hochphi', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'HV') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const hvR = await pool(req).query('SELECT mahv FROM hocvien WHERE matk=$1', [auth(req).matk]);
    if (!hvR.rows.length) return res.json({ success: true, data: [] });
    const mahv = hvR.rows[0].mahv;
    const r = await pool(req).query(
      `SELECT hp.*, mh.tenmh FROM hochphi hp
       JOIN lop l ON l.malop = hp.malop
       JOIN yeucauhockem yc ON yc.mayc = l.mayc
       JOIN monhoc mh ON mh.mamh = yc.mamh
       WHERE hp.mahv=$1
       ORDER BY hp.kytt_tu DESC`, [mahv]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Đánh giá gia sư
router.post('/danhgia', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'HV') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { malop, diem, nhanxet } = req.body;
    if (!malop || !diem) return res.json({ success: false, message: 'Thiếu thông tin' });
    const hvR = await pool(req).query('SELECT mahv FROM hocvien WHERE matk=$1', [auth(req).matk]);
    const mahv = hvR.rows[0].mahv;
    const lopR = await pool(req).query('SELECT mags FROM lop WHERE malop=$1', [malop]);
    if (!lopR.rows.length) return res.json({ success: false, message: 'Không tìm thấy lớp' });
    const mags = lopR.rows[0].mags;
    await pool(req).query(
      'INSERT INTO danhgia(malop,mahv,mags,diem,nhanxet) VALUES($1,$2,$3,$4,$5)',
      [malop, mahv, mags, diem, nhanxet || null]
    );
    // Cập nhật điểm TB gia sư
    await pool(req).query(
      'UPDATE giasu SET diemtrungbinh=(SELECT AVG(CAST(diem AS DECIMAL(3,2))) FROM danhgia WHERE mags=$1) WHERE mags=$1',
      [mags]
    );
    res.json({ success: true, message: 'Đánh giá thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Yêu cầu đổi gia sư hoặc nghỉ học
router.post('/doigiasu', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'HV') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { malop, lydo } = req.body;
    if (!malop || !lydo) return res.json({ success: false, message: 'Thiếu thông tin' });

    const hvR = await pool(req).query(
      'SELECT mahv FROM hocvien WHERE matk = $1',
      [auth(req).matk]
    );
    if (!hvR.rows.length) return res.json({ success: false, message: 'Không tìm thấy học viên' });
    const mahv = hvR.rows[0].mahv;

    // Kiểm tra lớp học
    const lopCheck = await pool(req).query(`
      SELECT l.malop, l.mags, yc.mahv 
      FROM lop l 
      JOIN yeucauhockem yc ON l.mayc = yc.mayc 
      WHERE l.malop = $1 AND yc.mahv = $2
    `, [malop, mahv]);

    if (!lopCheck.rows.length) return res.json({ success: false, message: 'Không tìm thấy lớp' });
    const mags = lopCheck.rows[0].mags;

    await pool(req).query(
      `INSERT INTO yeucaudoigiasu (malop, mahv, mags, landoithu, lydo, trangthai) 
       VALUES ($1, $2, $3, 1, $4, 'ChoXuLy')`,
      [malop, mahv, mags, lydo]
    );
    res.json({ success: true, message: 'Đã gửi yêu cầu thành công' });
  } catch (e) {
    console.error('Lỗi đổi gia sư:', e.message);
    res.json({ success: false, message: e.message });
  }
});

// Xin nghỉ 1 buổi (ĐƠN GIẢN HÓA: dùng CaHoc thay vì giờ cụ thể)
router.post('/xinnghibuoi', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'HV') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { malop, ngayday, cahoc, lydo } = req.body;
    if (!malop || !ngayday || !cahoc || !lydo) return res.json({ success: false, message: 'Thiếu thông tin' });

    if (!['Sang', 'Chieu', 'Toi'].includes(cahoc)) {
      return res.json({ success: false, message: 'Ca học không hợp lệ' });
    }

    // Kiểm tra xem buổi đó đã tồn tại chưa (trạng thái ChoXacNhan)
    const existingSession = await pool(req).query(
      "SELECT mabuoi, trangthai FROM buoiday WHERE malop = $1 AND ngayday = $2 AND cahoc = $3",
      [malop, ngayday, cahoc]
    );

    if (existingSession.rows.length > 0) {
      const session = existingSession.rows[0];
      if (session.trangthai === 'ChoXacNhan') {
        // Cập nhật trạng thái buổi đã có sẵn
        await pool(req).query(
          "UPDATE buoiday SET trangthai = 'HVXinNghi', noidung = $1, thoigianxacnhan = NOW() WHERE mabuoi = $2",
          [lydo, session.mabuoi]
        );
        return res.json({ success: true, message: 'Đã gửi yêu cầu xin nghỉ thành công, vui lòng chờ duyệt!' });
      } else {
        return res.json({ success: false, message: 'Buổi học này đã được xử lý hoặc đã có yêu cầu khác' });
      }
    }

    // Nếu chưa có buổi dạy → tạo mới với trạng thái HVXinNghi
    await pool(req).query(
      "INSERT INTO buoiday(malop, ngayday, cahoc, trangthai, noidung) VALUES($1, $2, $3, 'HVXinNghi', $4)",
      [malop, ngayday, cahoc, lydo]
    );
    res.json({ success: true, message: 'Đã gửi yêu cầu xin nghỉ thành công, vui lòng chờ duyệt!' });
  } catch (e) {
    if (e.code === '23505') return res.json({ success: false, message: 'Buổi học trùng lặp' });
    res.json({ success: false, message: e.message });
  }
});

// Học viên nộp học phí (Chuyển trạng thái sang ChoXacNhan để NV xác nhận)
router.post('/hocphi/:id/nop', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'HV') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { id } = req.params;
    // Kiểm tra hóa đơn học phí có thuộc về học viên này không
    const hvR = await pool(req).query('SELECT mahv FROM hocvien WHERE matk = $1', [auth(req).matk]);
    if (!hvR.rows.length) return res.json({ success: false, message: 'Không tìm thấy học viên' });
    const mahv = hvR.rows[0].mahv;

    const hpR = await pool(req).query('SELECT trangthai FROM hochphi WHERE mahp = $1 AND mahv = $2', [id, mahv]);
    if (!hpR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hóa đơn học phí' });

    if (hpR.rows[0].trangthai !== 'ChuaNop') {
      return res.json({ success: false, message: 'Hóa đơn đã được thanh toán hoặc đang chờ xác nhận' });
    }

    await pool(req).query(
      "UPDATE hochphi SET trangthai = 'ChoXacNhan' WHERE mahp = $1",
      [id]
    );
    res.json({ success: true, message: 'Nộp học phí thành công, vui lòng chờ nhân viên xác nhận!' });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// Lấy học phí mặc định của các cấp (dành cho học viên)
router.get('/config/hocphi', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'HV') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const keys = ['HocPhi_Cap1', 'HocPhi_Cap2', 'HocPhi_Cap3', 'HocPhi_LuyenThiDH', 'HocPhi_TiengAnhGT', 'HocPhi_ChungChiQT', 'HocPhi_Khac'];
    const r = await pool(req).query('SELECT mats, giatri FROM thamso WHERE mats = ANY($1)', [keys]);
    const data = {};
    const fallbacks = {
      'HocPhi_Cap1': 100000,
      'HocPhi_Cap2': 200000,
      'HocPhi_Cap3': 300000,
      'HocPhi_LuyenThiDH': 400000,
      'HocPhi_TiengAnhGT': 350000,
      'HocPhi_ChungChiQT': 500000,
      'HocPhi_Khac': 250000
    };
    Object.keys(fallbacks).forEach(k => {
      data[k] = fallbacks[k];
    });
    r.rows.forEach(row => {
      data[row.mats] = parseInt(row.giatri) || fallbacks[row.mats];
    });
    res.json({ success: true, data });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

module.exports = router;
