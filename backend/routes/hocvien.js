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
      `INSERT INTO YEUCAUHOCKEM(mahv,MaMH,CapLop,HinhThucHoc,YC_GioiTinhGS,YC_TrinhDoGS,ThoiGianMongMuon,DiaChi,GhiChu)
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
      `SELECT yc.*, mh.TenMH FROM YEUCAUHOCKEM yc
       JOIN MONHOC mh ON mh.MaMH = yc.MaMH
       WHERE yc.mahv=$1 ORDER BY yc.NgayDangKy DESC`, [mahv]
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
      `SELECT l.*, mh.TenMH, gs.HoTen AS TenGiaSu, yc.CapLop
       FROM LOP l
       JOIN YEUCAUHOCKEM yc ON yc.MaYC = l.MaYC
       JOIN MONHOC mh ON mh.MaMH = yc.MaMH
       LEFT JOIN GIASU gs ON gs.MaGS = l.MaGS
       WHERE yc.mahv=$1
       ORDER BY l.NgayTao DESC`, [mahv]
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
      `SELECT hp.*, mh.TenMH FROM HOCHPHI hp
       JOIN LOP l ON l.MaLop = hp.MaLop
       JOIN YEUCAUHOCKEM yc ON yc.MaYC = l.MaYC
       JOIN MONHOC mh ON mh.MaMH = yc.MaMH
       WHERE hp.mahv=$1
       ORDER BY hp.KyTT_Tu DESC`, [mahv]
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
    const lopR = await pool(req).query('SELECT MaGS FROM LOP WHERE MaLop=$1', [malop]);
    if (!lopR.rows.length) return res.json({ success: false, message: 'Không tìm thấy lớp' });
    const mags = lopR.rows[0].mags;
    await pool(req).query(
      'INSERT INTO DANHGIA(MaLop,mahv,MaGS,Diem,NhanXet) VALUES($1,$2,$3,$4,$5)',
      [malop, mahv, mags, diem, nhanxet||null]
    );
    // Cập nhật điểm TB gia sư
    await pool(req).query(
      'UPDATE GIASU SET DiemTrungBinh=(SELECT AVG(CAST(Diem AS DECIMAL(3,2))) FROM DANHGIA WHERE MaGS=$1) WHERE MaGS=$1',
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
    
    // Dùng AS alias để đảm bảo tên cột trả về là lowercase
    const hvR = await pool(req).query(
      'SELECT "mahv" AS mahv FROM "hocvien" WHERE "matk" = $1', 
      [auth(req).matk]
    );
    if (!hvR.rows.length) return res.json({ success: false, message: 'Không tìm thấy học viên' });
    const mahv = hvR.rows[0].mahv;
    
    // Kiểm tra lớp học với alias chuẩn hóa
    const lopCheck = await pool(req).query(`
      SELECT l."MaLop" AS malop, l."MaGS" AS mags, yc."mahv" AS mahv 
      FROM "LOP" l 
      JOIN "YEUCAUHOCKEM" yc ON l."MaYC" = yc."MaYC" 
      WHERE l."MaLop" = $1 AND yc."mahv" = $2
    `, [malop, mahv]);
    
    if (!lopCheck.rows.length) return res.json({ success: false, message: 'Không tìm thấy lớp' });
    const mags = lopCheck.rows[0].mags;
    
    // Insert với tên bảng/cột đúng case
    await pool(req).query(
      `INSERT INTO "YEUCAUDOIGIASU"("MaLop","mahv","MaGS","LanDoiThu","LyDo","TrangThai") 
       VALUES($1,$2,$3,1,$4,'ChoXuLy')`,
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
    
    // Thêm vào bảng BUOIDAY với trạng thái HVVangCoPhep
    await pool(req).query(
      "INSERT INTO BUOIDAY(MaLop, NgayDay, GioBatDau, GioKetThuc, TrangThai, NoiDung) VALUES($1, $2, $3, $4, 'HVVangCoPhep', $5)",
      [malop, ngayday, giobatdau, gioketthuc, lydo]
    );
    res.json({ success: true, message: 'Đã báo nghỉ thành công' });
  } catch (e) { 
    if (e.code === '23505') return res.json({ success: false, message: 'Buổi học trùng lặp thời gian' });
    res.json({ success: false, message: e.message }); 
  }
});

module.exports = router;
