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
      `SELECT l.*, mh.TenMH, gs.HoTen AS TenGiaSu, hv.HoTen AS TenHocVien, yc.CapLop, yc.DiaChi, yc.ThoiGianMongMuon
       FROM LOP l
       JOIN YEUCAUHOCKEM yc ON yc.MaYC = l.MaYC
       JOIN HOCVIEN hv ON hv.MaHV = yc.MaHV
       JOIN MONHOC mh ON mh.MaMH = yc.MaMH
       LEFT JOIN GIASU gs ON gs.MaGS = l.MaGS
       WHERE l.MaLop = $1`, [id]
    );
    if (!r.rows.length) return res.json({ success: false, message: 'Không tìm thấy lớp học' });
    
    // Kiểm tra quyền: Phải là nhân viên hoặc học viên/gia sư của lớp này
    const item = r.rows[0];
    const userRole = auth(req).vaitro;
    if (['NVQL', 'SA', 'BGD'].includes(userRole)) {
      return res.json({ success: true, data: item });
    }
    
    if (userRole === 'GS') {
      const gsR = await pool(req).query('SELECT MaGS FROM GIASU WHERE MaTK = $1', [auth(req).matk]);
      if (gsR.rows.length && gsR.rows[0].mags === item.mags) {
        return res.json({ success: true, data: item });
      }
    } else if (userRole === 'HV') {
      const hvR = await pool(req).query('SELECT MaHV FROM HOCVIEN WHERE MaTK = $1', [auth(req).matk]);
      const hvDetails = await pool(req).query('SELECT MaHV FROM YEUCAUHOCKEM WHERE MaYC = $1', [item.mayc]);
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
      'SELECT * FROM BUOIDAY WHERE MaLop = $1 ORDER BY NgayDay DESC, GioBatDau DESC', [id]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Ghi nhận buổi dạy (Gia sư báo cáo)
router.post('/:id/buoiday', async (req, res) => {
  if (!auth(req) || auth(req).vaitro !== 'GS') return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { id } = req.params;
    const { ngayday, giobatdau, giokethuc, sogio, noidung, nhanxethv, trangthai } = req.body;
    
    if (!ngayday || !giobatdau || !giokethuc || !trangthai) {
      return res.json({ success: false, message: 'Thiếu thông tin buổi dạy' });
    }
    
    // Kiểm tra xem gia sư này có dạy lớp này không
    const gsR = await pool(req).query('SELECT MaGS FROM GIASU WHERE MaTK = $1', [auth(req).matk]);
    if (!gsR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ gia sư' });
    const mags = gsR.rows[0].mags;
    
    const lopR = await pool(req).query('SELECT MaGS FROM LOP WHERE MaLop = $1', [id]);
    if (!lopR.rows.length) return res.json({ success: false, message: 'Không tìm thấy lớp học' });
    if (lopR.rows[0].mags !== mags) {
      return res.json({ success: false, message: 'Gia sư không dạy lớp này' });
    }
    
    const calculatedHours = parseFloat(sogio) || 2.0; // default to 2 hours
    
    const r = await pool(req).query(
      `INSERT INTO BUOIDAY (MaLop, NgayDay, GioBatDau, GioKetThuc, SoGio, TrangThai, NoiDung, NhanXetHV, ThoiGianXacNhan)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [id, ngayday, giobatdau, giokethuc, calculatedHours, trangthai, noidung || null, nhanxethv || null]
    );
    res.json({ success: true, data: r.rows[0], message: 'Báo cáo buổi dạy thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

module.exports = router;
