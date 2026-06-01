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

// Gửi yêu cầu học kèm
router.post('/yeucau', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'HV') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { mamh, caplop, hinhthuchoc, yc_gioitinhgs, yc_trinhdogs, thoigianmongmuon, diachi, ghichu } = req.body;
    if (!mamh || !caplop || !thoigianmongmuon) return res.json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    const hvR = await pool(req).query('SELECT mahv FROM hocvien WHERE matk=$1', [auth(req).matk]);
    if (!hvR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ học viên' });
    const mahv = hvR.rows[0].mahv;
    const r = await pool(req).query(
      `INSERT INTO yeucauhockem(mahv,mamh,caplop,hinhthuchoc,yc_gioitinhgs,yc_trinhdogs,thoigianmongmuon,diachi,ghichu)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [mahv, mamh, caplop, hinhthuchoc||null, yc_gioitinhgs||null, yc_trinhdogs||null, thoigianmongmuon, diachi||null, ghichu||null]
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
      [malop, mahv, mags, diem, nhanxet||null]
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

// Xin nghỉ 1 buổi
router.post('/xinnghibuoi', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'HV') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { malop, ngayday, giobatdau, gioketthuc, lydo } = req.body;
    if (!malop || !ngayday || !giobatdau || !gioketthuc || !lydo) return res.json({ success: false, message: 'Thiếu thông tin' });
    
    // Thêm vào bảng buoiday với trạng thái HVVangCoPhep
    await pool(req).query(
      "INSERT INTO buoiday(malop, ngayday, giobatdau, gioketthuc, trangthai, noidung) VALUES($1, $2, $3, $4, 'HVVangCoPhep', $5)",
      [malop, ngayday, giobatdau, gioketthuc, lydo]
    );
    res.json({ success: true, message: 'Đã báo nghỉ thành công' });
  } catch (e) { 
    if (e.code === '23505') return res.json({ success: false, message: 'Buổi học trùng lặp thời gian' });
    res.json({ success: false, message: e.message }); 
  }
});

module.exports = router;
