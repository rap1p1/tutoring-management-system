const express = require('express');

module.exports = function(pool, auth, requireOps) {
  const router = express.Router();

  // Lấy danh sách yêu cầu đổi / báo nghỉ
  router.get('/yeucaudoi', async (req, res) => {
    try {
      const r = await pool(req).query(
        `SELECT ycd.*, l.malop, hv.hoten AS tenhocvien, gs.hoten AS tengiasu, mh.tenmh 
         FROM yeucaudoigiasu ycd
         JOIN lop l ON l.malop = ycd.malop
         JOIN hocvien hv ON hv.mahv = ycd.mahv
         LEFT JOIN giasu gs ON gs.mags = ycd.mags
         JOIN yeucauhockem yc ON yc.mayc = l.mayc
         JOIN monhoc mh ON mh.mamh = yc.mamh
         ORDER BY ycd.ngayyeucau DESC`
      );
      res.json({ success: true, data: r.rows });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Xử lý yêu cầu đổi gia sư / báo nghỉ
  router.post('/yeucaudoi/:id/xuly', requireOps, async (req, res) => {
    const client = await pool(req).connect();
    try {
      const { id } = req.params;
      const nvR = await client.query('SELECT manv FROM nhanvien WHERE matk = $1', [auth(req).matk]);
      const manv = nvR.rows.length ? nvR.rows[0].manv : null;

      const reqInfo = await client.query('SELECT malop, lydo, trangthai FROM yeucaudoigiasu WHERE maycdg = $1', [id]);
      if (!reqInfo.rows.length) {
        return res.json({ success: false, message: 'Yêu cầu không tồn tại' });
      }
      const rInfo = reqInfo.rows[0];
      if (rInfo.trangthai === 'DaXuLy') {
        return res.json({ success: false, message: 'Yêu cầu này đã được xử lý trước đó' });
      }

      const classId = rInfo.malop;
      const lydoKetThuc = rInfo.lydo || 'Nghỉ dạy/học theo yêu cầu đổi gia sư/nghỉ lớp';

      const lopR = await client.query(
        `SELECT l.*, yc.mahv, yc.songayhoc
         FROM lop l
         JOIN yeucauhockem yc ON yc.mayc = l.mayc
         WHERE l.malop = $1`,
        [classId]
      );
      if (!lopR.rows.length) {
        return res.json({ success: false, message: 'Không tìm thấy lớp học liên quan' });
      }
      const lop = lopR.rows[0];

      const statsR = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE trangthai = 'DaDay') as count_daday,
          COUNT(*) FILTER (WHERE trangthai = 'HVVangCoPhep') as count_vangcophep,
          COUNT(*) FILTER (WHERE trangthai = 'GSNghi') as count_gsnghi,
          MIN(ngayday) as ngay_dau,
          MAX(ngayday) as ngay_cuoi
        FROM buoiday WHERE malop = $1
      `, [classId]);
      
      const stats = statsR.rows[0];
      const soBuoiDaDay = parseInt(stats.count_daday) || 0;
      const soBuoiVangCoPhep = parseInt(stats.count_vangcophep) || 0;
      const soBuoiGSNghi = parseInt(stats.count_gsnghi) || 0;
      const soBuoiTinhPhi = soBuoiDaDay;

      await client.query('BEGIN');

      await client.query(
        `UPDATE yeucaudoigiasu 
         SET trangthai = 'DaXuLy', ngayxuly = NOW(), manv_xuly = $1
         WHERE maycdg = $2`,
        [manv, id]
      );

      await client.query(
        `UPDATE lop 
         SET trangthai = 'KetThuc', ngayketthucthucte = NOW(), lydoketthucsom = $1
         WHERE malop = $2`,
        [lydoKetThuc, classId]
      );

      await client.query(
        "UPDATE buoiday SET trangthai = 'Huy' WHERE malop = $1 AND trangthai IN ('ChoXacNhan', 'HVXinNghi', 'GSXinNghi')",
        [classId]
      );

      if (soBuoiTinhPhi > 0 && lop.mahv) {
        const kyTuNgay = stats.ngay_dau || lop.ngaybatdau;
        const kyDenNgay = stats.ngay_cuoi || new Date().toISOString().split('T')[0];
        const tongHocPhi = soBuoiTinhPhi * parseInt(lop.hocphimoibuoi);
        
        await client.query(
          `INSERT INTO hochphi (malop, mahv, kytt_tu, kytt_den, sobuoi, hocphimoibuoi, tonghocphi, trangthai, ghichu)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'ChuaNop', $8)
           ON CONFLICT (malop, kytt_tu, kytt_den) DO NOTHING`,
          [classId, lop.mahv, kyTuNgay, kyDenNgay, soBuoiTinhPhi, parseInt(lop.hocphimoibuoi), tongHocPhi, `Tự động tạo khi duyệt đơn xin nghỉ lớp. Buổi đã dạy: ${soBuoiDaDay}, Vắng có phép: ${soBuoiVangCoPhep}, GS nghỉ: ${soBuoiGSNghi}`]
        );
        
        if (lop.mags) {
          const tyLeHH = parseFloat(lop.tylehhgiasu) || 70.00;
          const tongHoaHong = Math.round(soBuoiTinhPhi * parseInt(lop.hocphimoibuoi) * (tyLeHH / 100.0));
          
          await client.query(
            `INSERT INTO hoahong (mags, malop, kytt_tu, kytt_den, sobuoidaday, hocphihvmoibuoi, tylehh, tonghoahong, trangthai)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ChuaTT')
             ON CONFLICT (mags, malop, kytt_tu, kytt_den) DO NOTHING`,
            [lop.mags, classId, kyTuNgay, kyDenNgay, soBuoiTinhPhi, parseInt(lop.hocphimoibuoi), tyLeHH, tongHoaHong]
          );
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Đã duyệt yêu cầu và chốt kết thúc lớp thành công' });
    } catch (e) {
      await client.query('ROLLBACK');
      res.json({ success: false, message: e.message });
    } finally {
      client.release();
    }
  });

  // Lấy danh sách báo nghỉ từng buổi
  router.get('/baonghi', async (req, res) => {
    try {
      const r = await pool(req).query(
        `SELECT bd.*, l.malop, hv.hoten AS tenhocvien, gs.hoten AS tengiasu, mh.tenmh 
         FROM buoiday bd
         JOIN lop l ON l.malop = bd.malop
         JOIN yeucauhockem yc ON yc.mayc = l.mayc
         JOIN hocvien hv ON hv.mahv = yc.mahv
         LEFT JOIN giasu gs ON gs.mags = l.mags
         JOIN monhoc mh ON mh.mamh = yc.mamh
         WHERE bd.trangthai IN ('HVVangCoPhep', 'GSNghi', 'HVXinNghi', 'GSXinNghi')
         ORDER BY bd.ngayday DESC`
      );
      res.json({ success: true, data: r.rows });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Phê duyệt hoặc từ chối yêu cầu nghỉ
  router.post('/baonghi/:mabuoi/xuly', requireOps, async (req, res) => {
    try {
      const { mabuoi } = req.params;
      const { action } = req.body;
      if (!['approve', 'reject'].includes(action)) {
        return res.json({ success: false, message: 'Hành động không hợp lệ' });
      }

      const checkR = await pool(req).query('SELECT trangthai FROM buoiday WHERE mabuoi = $1', [mabuoi]);
      if (!checkR.rows.length) {
        return res.json({ success: false, message: 'Không tìm thấy buổi học' });
      }
      const currentStatus = checkR.rows[0].trangthai;

      let newStatus = currentStatus;
      if (action === 'approve') {
        if (currentStatus === 'HVXinNghi') newStatus = 'HVVangCoPhep';
        else if (currentStatus === 'GSXinNghi') newStatus = 'GSNghi';
        else return res.json({ success: false, message: 'Trạng thái buổi học không hợp lệ để phê duyệt' });
      } else {
        if (['HVXinNghi', 'GSXinNghi'].includes(currentStatus)) newStatus = 'ChoXacNhan';
        else return res.json({ success: false, message: 'Trạng thái buổi học không hợp lệ để từ chối' });
      }

      await pool(req).query(
        'UPDATE buoiday SET trangthai = $1, thoigianxacnhan = NOW() WHERE mabuoi = $2',
        [newStatus, mabuoi]
      );

      res.json({ success: true, message: `Đã ${action === 'approve' ? 'phê duyệt' : 'từ chối'} yêu cầu nghỉ học thành công` });
    } catch (e) {
      res.json({ success: false, message: e.message });
    }
  });

  return router;
};
