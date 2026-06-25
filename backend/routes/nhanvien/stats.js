const express = require('express');

module.exports = function(pool, auth) {
  const router = express.Router();

  // Lấy thông tin cá nhân của nhân viên
  router.get('/me', async (req, res) => {
    try {
      const r = await pool(req).query(`
        SELECT n.*, t.is2faenabled 
        FROM nhanvien n
        JOIN taikhoan t ON n.matk = t.matk
        WHERE n.matk = $1
      `, [auth(req).matk]);
      if (!r.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ nhân viên' });
      res.json({ success: true, data: r.rows[0] });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Lấy thông tin thống kê tổng quan
  router.get('/stats', async (req, res) => {
    try {
      const classCount = await pool(req).query("SELECT COUNT(*) FROM lop WHERE trangthai = 'DangDay'");
      const pendingGS = await pool(req).query("SELECT COUNT(*) FROM giasu WHERE trangthaihoso = 'ChoDuyet'");
      const pendingYC = await pool(req).query("SELECT COUNT(*) FROM yeucauhockem WHERE trangthai = 'ChoGhep'");
      const totalRevenue = await pool(req).query("SELECT SUM(tonghocphi) FROM hochphi WHERE trangthai = 'DaNop'");
      
      res.json({
        success: true,
        data: {
          activeClasses: parseInt(classCount.rows[0].count) || 0,
          pendingTutors: parseInt(pendingGS.rows[0].count) || 0,
          pendingRequests: parseInt(pendingYC.rows[0].count) || 0,
          revenue: parseInt(totalRevenue.rows[0].sum) || 0
        }
      });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // API Thống kê doanh thu theo tháng (Bar Chart)
  router.get('/revenue-chart', async (req, res) => {
    try {
      const q = `
        SELECT 
          TO_CHAR(hp.ngaynop, 'MM/YYYY') as month, 
          SUM(hp.tonghocphi) as revenue,
          SUM(hp.tonghocphi - COALESCE(hh.tonghoahong, 0)) as profit
        FROM hochphi hp
        LEFT JOIN hoahong hh ON hh.malop = hp.malop 
                            AND hh.kytt_tu = hp.kytt_tu 
                            AND hh.kytt_den = hp.kytt_den
        WHERE hp.trangthai = 'DaNop' 
        GROUP BY TO_CHAR(hp.ngaynop, 'MM/YYYY'), TO_CHAR(hp.ngaynop, 'YYYY-MM')
        ORDER BY TO_CHAR(hp.ngaynop, 'YYYY-MM') ASC
        LIMIT 12
      `;
      const r = await pool(req).query(q);
      res.json({ success: true, data: r.rows });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  return router;
};
