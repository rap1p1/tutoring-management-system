const express = require('express');
const router = express.Router();

function pool(req) { return req.app.locals.pool; }
function auth(req) { return req.session.user; }

// Lấy chi tiết lớp học
router.get('/:id', async (req, res) => {
  if (!auth(req)) return res.json({ success: false, message: 'Chưa đăng nhập' });
  try {
    const { id } = req.params;
    const r = await pool(req).query(
      `SELECT l.*, mh.tenmh, gs.hoten AS tengiasu, hv.hoten AS tenhocvien, yc.caplop, yc.diachi, yc.songayhoc, yc.lichhoctrongtuan
       FROM lop l
       JOIN yeucauhockem yc ON yc.mayc = l.mayc
       JOIN hocvien hv ON hv.mahv = yc.mahv
       JOIN monhoc mh ON mh.mamh = yc.mamh
       LEFT JOIN giasu gs ON gs.mags = l.mags
       WHERE l.malop = $1`, [id]
    );
    if (!r.rows.length) return res.json({ success: false, message: 'Không tìm thấy lớp học' });
    
    // Kiểm tra quyền: Phải là nhân viên hoặc học viên/gia sư của lớp này
    const item = r.rows[0];
    const userRole = auth(req).vaitro;
    if (['NVQL', 'SA', 'BGD'].includes(userRole)) {
      return res.json({ success: true, data: item });
    }
    
    if (userRole === 'GS') {
      const gsR = await pool(req).query('SELECT mags FROM giasu WHERE matk = $1', [auth(req).matk]);
      if (gsR.rows.length && gsR.rows[0].mags === item.mags) {
        return res.json({ success: true, data: item });
      }
    } else if (userRole === 'HV') {
      const hvR = await pool(req).query('SELECT mahv FROM hocvien WHERE matk = $1', [auth(req).matk]);
      const hvDetails = await pool(req).query('SELECT mahv FROM yeucauhockem WHERE mayc = $1', [item.mayc]);
      if (hvR.rows.length && hvDetails.rows.length && hvR.rows[0].mahv === hvDetails.rows[0].mahv) {
        return res.json({ success: true, data: item });
      }
    }
    
    res.json({ success: false, message: 'Không có quyền truy cập thông tin lớp này' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy danh sách buổi dạy của lớp
router.get('/:id/buoiday', async (req, res) => {
  if (!auth(req)) return res.json({ success: false, message: 'Chưa đăng nhập' });
  try {
    const { id } = req.params;
    const r = await pool(req).query(
      'SELECT * FROM buoiday WHERE malop = $1 ORDER BY ngayday ASC, cahoc ASC', [id]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Gia sư xác nhận đã dạy 1 buổi (chuyển ChoXacNhan → DaDay)
router.post('/:id/buoiday/:mabuoi/confirm', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { id, mabuoi } = req.params;
    
    // Kiểm tra gia sư dạy lớp này
    const gsR = await pool(req).query('SELECT mags FROM giasu WHERE matk = $1', [auth(req).matk]);
    if (!gsR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ gia sư' });
    const mags = gsR.rows[0].mags;
    
    const lopR = await pool(req).query('SELECT mags FROM lop WHERE malop = $1', [id]);
    if (!lopR.rows.length) return res.json({ success: false, message: 'Không tìm thấy lớp học' });
    if (lopR.rows[0].mags !== mags) {
      return res.json({ success: false, message: 'Gia sư không dạy lớp này' });
    }
    
    // Kiểm tra buổi dạy
    const buoiR = await pool(req).query(
      "SELECT * FROM buoiday WHERE mabuoi = $1 AND malop = $2", [mabuoi, id]
    );
    if (!buoiR.rows.length) return res.json({ success: false, message: 'Không tìm thấy buổi dạy' });
    if (buoiR.rows[0].trangthai !== 'ChoXacNhan') {
      return res.json({ success: false, message: 'Buổi dạy này đã được xử lý trước đó (trạng thái: ' + buoiR.rows[0].trangthai + ')' });
    }
    
    // KIỂM TRA CHẶN ĐIỂM DANH SỚM
    // Lấy mốc ngày học (bỏ qua giờ phút) và so sánh với hôm nay
    const ngaydayDate = new Date(buoiR.rows[0].ngayday);
    ngaydayDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (ngaydayDate > today) {
      return res.json({ success: false, message: 'Không thể điểm danh cho buổi học ở tương lai. Vui lòng quay lại đúng ngày học để xác nhận!' });
    }
    
    try {
      await pool(req).query('BEGIN');
      await pool(req).query(
        "UPDATE buoiday SET trangthai = 'DaDay', thoigianxacnhan = NOW() WHERE mabuoi = $1",
        [mabuoi]
      );
      await pool(req).query(
        `UPDATE yeucauhockem 
         SET songayhoc = songayhoc + 1 
         WHERE mayc = (SELECT mayc FROM lop WHERE malop = $1)`,
        [id]
      );
      await pool(req).query('COMMIT');
      res.json({ success: true, message: 'Ghi nhận đã dạy thành công' });
    } catch (e) {
      await pool(req).query('ROLLBACK');
      res.json({ success: false, message: e.message });
    }
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Hủy mềm buổi dạy (Gia sư hủy buổi học chưa tới)
router.post('/:id/buoiday/:mabuoi/cancel', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { id, mabuoi } = req.params;
    
    // Kiểm tra xem gia sư này có dạy lớp này không
    const gsR = await pool(req).query('SELECT mags FROM giasu WHERE matk = $1', [auth(req).matk]);
    if (!gsR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ gia sư' });
    const mags = gsR.rows[0].mags;
    
    const lopR = await pool(req).query('SELECT mags FROM lop WHERE malop = $1', [id]);
    if (!lopR.rows.length) return res.json({ success: false, message: 'Không tìm thấy lớp học' });
    if (lopR.rows[0].mags !== mags) {
      return res.json({ success: false, message: 'Gia sư không dạy lớp này' });
    }
    
    // Kiểm tra xem buổi dạy có tồn tại không
    const buoiCheck = await pool(req).query('SELECT ngayday FROM buoiday WHERE mabuoi = $1 AND malop = $2', [mabuoi, id]);
    if (!buoiCheck.rows.length) {
      return res.json({ success: false, message: 'Không tìm thấy buổi học này' });
    }
    
    // Cập nhật trạng thái thành Huy
    await pool(req).query(
      "UPDATE buoiday SET trangthai = 'Huy' WHERE mabuoi = $1 AND malop = $2",
      [mabuoi, id]
    );
    res.json({ success: true, message: 'Đã hủy lịch dạy thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

module.exports = router;
