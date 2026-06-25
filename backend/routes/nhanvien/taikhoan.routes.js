const express = require('express');

module.exports = function(pool, auth) {
  const router = express.Router();

  // Lấy danh sách tài khoản
  router.get('/taikhoan', async (req, res) => {
    if (!['SA', 'BGD'].includes(auth(req).vaitro)) {
      return res.json({ success: false, message: 'Không có quyền truy cập danh sách tài khoản' });
    }
    try {
      const q = `
        SELECT tk.matk, tk.tendangnhap, tk.vaitro, tk.trangthai, tk.email,
               COALESCE(hv.hoten, gs.hoten, nv.hoten) as hoten
        FROM taikhoan tk
        LEFT JOIN hocvien hv ON hv.matk = tk.matk
        LEFT JOIN giasu gs ON gs.matk = tk.matk
        LEFT JOIN nhanvien nv ON nv.matk = tk.matk
        ORDER BY tk.vaitro, tk.tendangnhap
      `;
      const r = await pool(req).query(q);
      res.json({ success: true, data: r.rows });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Khóa/Mở khóa tài khoản
  router.post('/taikhoan/:id/toggle-lock', async (req, res) => {
    if (!['SA', 'BGD'].includes(auth(req).vaitro)) {
      return res.json({ success: false, message: 'Không có quyền khóa/mở khóa tài khoản' });
    }
    try {
      const { id } = req.params;
      if (parseInt(id) === auth(req).matk) {
        return res.json({ success: false, message: 'Bạn không thể tự khóa tài khoản của chính mình' });
      }
      const check = await pool(req).query('SELECT vaitro, trangthai FROM taikhoan WHERE matk = $1', [id]);
      if (!check.rows.length) {
        return res.json({ success: false, message: 'Tài khoản không tồn tại' });
      }
      const targetUser = check.rows[0];
      if (targetUser.vaitro === 'BGD' && auth(req).vaitro === 'SA') {
        return res.json({ success: false, message: 'Admin không có quyền khóa/mở khóa tài khoản của Giám đốc' });
      }

      const currentStatus = targetUser.trangthai;
      const newStatus = currentStatus === 'Khoa' ? 'HoatDong' : 'Khoa';
      await pool(req).query('UPDATE taikhoan SET trangthai = $1 WHERE matk = $2', [newStatus, id]);
      res.json({ success: true, message: `Đã ${newStatus === 'Khoa' ? 'khóa' : 'mở khóa'} tài khoản thành công` });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  return router;
};
