const express = require('express');

module.exports = function(pool, auth) {
  const router = express.Router();

  // Lấy tỷ lệ hoa hồng mặc định
  router.get('/config/tylehh', async (req, res) => {
    try {
      const r = await pool(req).query("SELECT giatri FROM thamso WHERE mats = 'TyLeHHMacDinh'");
      const val = r.rows.length ? parseFloat(r.rows[0].giatri) : 70.00;
      res.json({ success: true, tylehh: val });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Cập nhật tỷ lệ hoa hồng mặc định - Chỉ BGD
  router.post('/config/tylehh', async (req, res) => {
    if (auth(req).vaitro !== 'BGD') {
      return res.json({ success: false, message: 'Chỉ Giám đốc mới có quyền thay đổi tỷ lệ hoa hồng mặc định' });
    }
    try {
      const { tylehh } = req.body;
      const parsedTyLe = parseFloat(tylehh);
      if (isNaN(parsedTyLe) || parsedTyLe < 0 || parsedTyLe > 100) {
        return res.json({ success: false, message: 'Tỷ lệ hoa hồng phải từ 0 đến 100' });
      }
      
      await pool(req).query(
        `INSERT INTO thamso (mats, tents, giatri) 
         VALUES ('TyLeHHMacDinh', 'Tỷ lệ hoa hồng mặc định (%)', $1)
         ON CONFLICT (mats) DO UPDATE SET giatri = EXCLUDED.giatri`,
        [parsedTyLe.toFixed(2)]
      );
      res.json({ success: true, message: `Đã cập nhật tỷ lệ hoa hồng mặc định thành ${parsedTyLe}%` });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Lấy học phí mặc định các cấp
  router.get('/config/hocphi', async (req, res) => {
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

  // Cập nhật học phí mặc định - Chỉ BGD
  router.post('/config/hocphi', async (req, res) => {
    if (auth(req).vaitro !== 'BGD') {
      return res.json({ success: false, message: 'Chỉ Giám đốc mới có quyền thay đổi học phí mặc định' });
    }
    try {
      const { cap1, cap2, cap3, luyenthidh, tienganhgt, chungchiqt, khac } = req.body;
      const updates = {
        'HocPhi_Cap1': { name: 'Học phí mặc định Cấp 1', val: cap1 },
        'HocPhi_Cap2': { name: 'Học phí mặc định Cấp 2', val: cap2 },
        'HocPhi_Cap3': { name: 'Học phí mặc định Cấp 3', val: cap3 },
        'HocPhi_LuyenThiDH': { name: 'Học phí mặc định Luyện thi Đại học', val: luyenthidh },
        'HocPhi_TiengAnhGT': { name: 'Học phí mặc định Tiếng Anh Giao tiếp', val: tienganhgt },
        'HocPhi_ChungChiQT': { name: 'Học phí mặc định Chứng chỉ Quốc tế', val: chungchiqt },
        'HocPhi_Khac': { name: 'Học phí mặc định Khác', val: khac }
      };

      for (const [key, item] of Object.entries(updates)) {
        if (item.val !== undefined && item.val !== null && !isNaN(parseInt(item.val)) && parseInt(item.val) > 0) {
          await pool(req).query(
            `INSERT INTO thamso (mats, tents, giatri) 
             VALUES ($1, $2, $3)
             ON CONFLICT (mats) DO UPDATE SET giatri = EXCLUDED.giatri`,
            [key, item.name, String(item.val)]
          );
        }
      }
      res.json({ success: true, message: 'Cập nhật học phí mặc định thành công' });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  return router;
};
