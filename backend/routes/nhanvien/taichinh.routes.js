const express = require('express');

module.exports = function(pool, auth, requireOps) {
  const router = express.Router();

  // Tạo hóa đơn học phí
  router.post('/hocphi/generate', requireOps, async (req, res) => {
    try {
      const { malop, mahv, kytt_tu, kytt_den, sobuoi, hocphimoibuoi, ghichu } = req.body;
      if (!malop || !mahv || !kytt_tu || !kytt_den || !sobuoi || !hocphimoibuoi) {
        return res.json({ success: false, message: 'Thiếu thông tin tạo học phí' });
      }
      const tonghocphi = parseInt(sobuoi) * parseInt(hocphimoibuoi);
      
      const r = await pool(req).query(
        `INSERT INTO hochphi (malop, mahv, kytt_tu, kytt_den, sobuoi, hocphimoibuoi, tonghocphi, trangthai, ghichu)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'ChuaNop', $8) RETURNING *`,
        [malop, mahv, kytt_tu, kytt_den, parseInt(sobuoi), parseInt(hocphimoibuoi), tonghocphi, ghichu || null]
      );
      res.json({ success: true, data: r.rows[0], message: 'Tạo hóa đơn học phí thành công' });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Xác nhận học viên đóng tiền
  router.post('/hocphi/:id/confirm', requireOps, async (req, res) => {
    try {
      const { id } = req.params;
      const { hinhthuctt, ghichu } = req.body;
      if (!['TienMat', 'ChuyenKhoan'].includes(hinhthuctt)) {
        return res.json({ success: false, message: 'Hình thức thanh toán không hợp lệ' });
      }
      
      const nvR = await pool(req).query('SELECT manv FROM nhanvien WHERE matk = $1', [auth(req).matk]);
      const manv = nvR.rows.length ? nvR.rows[0].manv : null;
      
      await pool(req).query(
        `UPDATE hochphi 
         SET trangthai = 'DaNop', ngaynop = CURRENT_DATE, hinhthuctt = $1, nguoithu = $2, ghichu = COALESCE($3, ghichu)
         WHERE mahp = $4`,
        [hinhthuctt, manv, ghichu || null, id]
      );
      res.json({ success: true, message: 'Xác nhận đóng học phí thành công' });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Lấy toàn bộ hóa đơn học phí
  router.get('/hocphi', async (req, res) => {
    try {
      const r = await pool(req).query(
        `SELECT hp.*, hv.hoten AS tenhocvien, mh.tenmh, l.malop 
         FROM hochphi hp
         JOIN hocvien hv ON hv.mahv = hp.mahv
         JOIN lop l ON l.malop = hp.malop
         JOIN yeucauhockem yc ON yc.mayc = l.mayc
         JOIN monhoc mh ON mh.mamh = yc.mamh
         ORDER BY hp.kytt_tu DESC`
      );
      res.json({ success: true, data: r.rows });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Tạo phiếu thanh toán hoa hồng cho gia sư
  router.post('/hoahong/generate', requireOps, async (req, res) => {
    try {
      const { mags, malop, kytt_tu, kytt_den, sobuoida_day, hocphihvmoibuoi, tylehh } = req.body;
      if (!mags || !malop || !kytt_tu || !kytt_den || !sobuoida_day || !hocphihvmoibuoi || !tylehh) {
        return res.json({ success: false, message: 'Thiếu thông tin tạo hoa hồng' });
      }
      
      const tonghoahong = Math.round(parseInt(sobuoida_day) * parseInt(hocphihvmoibuoi) * (parseFloat(tylehh) / 100.0));
      
      const r = await pool(req).query(
        `INSERT INTO hoahong (mags, malop, kytt_tu, kytt_den, sobuoidaday, hocphihvmoibuoi, tylehh, tonghoahong, trangthai)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ChuaTT') RETURNING *`,
        [mags, malop, kytt_tu, kytt_den, parseInt(sobuoida_day), parseInt(hocphihvmoibuoi), parseFloat(tylehh), tonghoahong]
      );
      res.json({ success: true, data: r.rows[0], message: 'Tạo phiếu hoa hồng/thanh toán thành công' });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Xác nhận thanh toán hoa hồng cho gia sư
  router.post('/hoahong/:id/confirm', requireOps, async (req, res) => {
    try {
      const { id } = req.params;
      const { hinhthuctt } = req.body;
      if (!['TienMat', 'ChuyenKhoan'].includes(hinhthuctt)) {
        return res.json({ success: false, message: 'Hình thức thanh toán không hợp lệ' });
      }
      
      const nvR = await pool(req).query('SELECT manv FROM nhanvien WHERE matk = $1', [auth(req).matk]);
      const manv = nvR.rows.length ? nvR.rows[0].manv : null;
      
      await pool(req).query(
        `UPDATE hoahong 
         SET trangthai = 'DaTT', ngaythanhtoan = CURRENT_DATE, hinhthuctt = $1, nguoiduyet = $2
         WHERE mahh = $3`,
        [hinhthuctt, manv, id]
      );
      res.json({ success: true, message: 'Xác nhận thanh toán hoa hồng thành công' });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Lấy toàn bộ phiếu thanh toán hoa hồng
  router.get('/hoahong', async (req, res) => {
    try {
      const r = await pool(req).query(
        `SELECT hh.*, gs.hoten AS tengiasu, mh.tenmh 
         FROM hoahong hh
         JOIN giasu gs ON gs.mags = hh.mags
         JOIN lop l ON l.malop = hh.malop
         JOIN yeucauhockem yc ON yc.mayc = l.mayc
         JOIN monhoc mh ON mh.mamh = yc.mamh
         ORDER BY hh.kytt_tu DESC`
      );
      res.json({ success: true, data: r.rows });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  return router;
};
