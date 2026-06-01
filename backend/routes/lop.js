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
      `SELECT l.*, mh.tenmh, gs.hoten AS tengiasu, hv.hoten AS tenhocvien, yc.caplop, yc.diachi, yc.thoigianmongmuon
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
      'SELECT * FROM buoiday WHERE malop = $1 ORDER BY ngayday DESC, giobatdau DESC', [id]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Ghi nhận buổi dạy (Gia sư báo cáo)
router.post('/:id/buoiday', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { id } = req.params;
    const { ngayday, giobatdau, gioketthuc, sogio, noidung, nhanxethv, trangthai, repeat } = req.body;
    
    console.log('[POST buoiday] req.body:', req.body);
    
    if (!ngayday || !giobatdau || !gioketthuc || !trangthai) {
      return res.json({ success: false, message: 'Thiếu thông tin buổi dạy' });
    }
    
    // Kiểm tra xem gia sư này có dạy lớp này không
    const gsR = await pool(req).query('SELECT mags FROM giasu WHERE matk = $1', [auth(req).matk]);
    if (!gsR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ gia sư' });
    const mags = gsR.rows[0].mags;
    
    const lopR = await pool(req).query('SELECT mags, ngayketthucdukien FROM lop WHERE malop = $1', [id]);
    if (!lopR.rows.length) return res.json({ success: false, message: 'Không tìm thấy lớp học' });
    if (lopR.rows[0].mags !== mags) {
      return res.json({ success: false, message: 'Gia sư không dạy lớp này' });
    }
    
    const calculatedHours = parseFloat(sogio) || 2.0; // default to 2 hours
    
    if (repeat) {
      let endDate = lopR.rows[0].ngayketthucdukien;
      if (!endDate) {
        // default to 12 weeks from ngayday
        const d = new Date(ngayday);
        d.setDate(d.getDate() + 12 * 7);
        endDate = d;
      } else {
        endDate = new Date(endDate);
      }
      
      let current = new Date(ngayday);
      let insertedCount = 0;
      let lastRow = null;
      
      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        const resInsert = await pool(req).query(
          `INSERT INTO buoiday (malop, ngayday, giobatdau, gioketthuc, sogio, trangthai, noidung, nhanxethv, thoigianxacnhan)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
           ON CONFLICT (malop, ngayday, giobatdau) DO NOTHING RETURNING *`,
          [id, dateStr, giobatdau, gioketthuc, calculatedHours, trangthai, noidung || null, nhanxethv || null]
        );
        if (resInsert.rows.length) {
          insertedCount++;
          lastRow = resInsert.rows[0];
        }
        current.setDate(current.getDate() + 7);
      }
      return res.json({ success: true, data: lastRow, message: `Đã đăng ký ${insertedCount} buổi dạy tuần hoàn thành công cho đến hết khóa học` });
    }

    const r = await pool(req).query(
      `INSERT INTO buoiday (malop, ngayday, giobatdau, gioketthuc, sogio, trangthai, noidung, nhanxethv, thoigianxacnhan)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (malop, ngayday, giobatdau) DO NOTHING RETURNING *`,
      [id, ngayday, giobatdau, gioketthuc, calculatedHours, trangthai, noidung || null, nhanxethv || null]
    );
    if (!r.rows.length) {
      return res.json({ success: false, message: 'Buổi dạy vào ngày giờ này đã tồn tại!' });
    }
    res.json({ success: true, data: r.rows[0], message: 'Ghi nhận buổi dạy thành công' });
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
