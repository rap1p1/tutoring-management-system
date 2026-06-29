const express = require('express');

module.exports = function(pool, auth, requireOps, generateSessions) {
  const router = express.Router();

  // Lấy danh sách yêu cầu đổi / báo nghỉ
  router.get('/yeucaudoi', async (req, res) => {
    try {
      const r = await pool(req).query(
        `SELECT ycd.maycdg, ycd.malop, ycd.mahv, ycd.mags, ycd.landoithu, ycd.lydo, ycd.trangthai, ycd.ngayyeucau, ycd.ngayxuly, ycd.manv_xuly, ycd.loaiyeucau, l.malop, hv.hoten AS tenhocvien, gs.hoten AS tengiasu, mh.tenmh 
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
      const { action } = req.body;
      const nvR = await client.query('SELECT manv FROM nhanvien WHERE matk = $1', [auth(req).matk]);
      const manv = nvR.rows.length ? nvR.rows[0].manv : null;

      if (!['approve', 'reject'].includes(action)) {
        return res.json({ success: false, message: 'Hành động không hợp lệ' });
      }

      const reqInfo = await client.query('SELECT malop, lydo, loaiyeucau, trangthai, landoithu FROM yeucaudoigiasu WHERE maycdg = $1', [id]);
      if (!reqInfo.rows.length) {
        return res.json({ success: false, message: 'Yêu cầu không tồn tại' });
      }
      const rInfo = reqInfo.rows[0];
      if (rInfo.trangthai !== 'ChoXuLy') {
        return res.json({ success: false, message: 'Yêu cầu này đã được xử lý hoặc bị từ chối' });
      }

      const classId = rInfo.malop;

      await client.query('BEGIN');

      if (action === 'reject') {
        await client.query(
          `UPDATE yeucaudoigiasu SET trangthai = 'TuChoi', ngayxuly = NOW(), manv_xuly = $1 WHERE maycdg = $2`,
          [manv, id]
        );
        await client.query('COMMIT');
        return res.json({ success: true, message: 'Đã từ chối yêu cầu đổi gia sư.' });
      }

      // APPROVE ACTION
      const lydoKetThuc = rInfo.lydo || 'Nghỉ dạy/học theo yêu cầu đổi gia sư/nghỉ lớp';

      const lopR = await client.query(
        `SELECT l.*, yc.mahv, yc.songayhoc
         FROM lop l
         JOIN yeucauhockem yc ON yc.mayc = l.mayc
         WHERE l.malop = $1`,
        [classId]
      );
      if (!lopR.rows.length) {
        throw new Error('Không tìm thấy lớp học liên quan');
      }
      const lop = lopR.rows[0];

      // Thống kê buổi học
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

      // Clone YEUCAUHOCKEM (Only if DoiGiaSu)
      if (rInfo.loaiyeucau !== 'NghiLop') {
        const ycR = await client.query(
          `SELECT yc.* FROM yeucauhockem yc JOIN lop l ON yc.mayc = l.mayc WHERE l.malop = $1`, [classId]
        );
        if (ycR.rows.length > 0) {
          const yc = ycR.rows[0];
          const newGhiChu = `Đổi gia sư lần ${rInfo.landoithu} (Từ lớp cũ: ${classId}). ${yc.ghichu ? yc.ghichu : ''}`;
          await client.query(
            `INSERT INTO yeucauhockem (mahv, mamh, caplop, hinhthuchoc, yc_gioitinhgs, yc_trinhdogs, songayhoc, lichhoctrongtuan, diachi, ghichu, trangthai, manv_tiepnhan)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ChoGhep', $11)`,
             [yc.mahv, yc.mamh, yc.caplop, yc.hinhthuchoc, yc.yc_gioitinhgs, yc.yc_trinhdogs, yc.songayhoc, yc.lichhoctrongtuan, yc.diachi, newGhiChu, manv]
          );
        }
      }

      // Bills
      if (soBuoiTinhPhi > 0 && lop.mahv) {
        let kyTuNgay = stats.ngay_dau || lop.ngaybatdau;
        let kyDenNgay = stats.ngay_cuoi || new Date().toISOString().split('T')[0];
        const startD = new Date(kyTuNgay);
        const endD = new Date(kyDenNgay);
        if (endD <= startD) {
          startD.setDate(startD.getDate() + 1);
          kyDenNgay = startD.toISOString().split('T')[0];
        }

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
      const successMsg = rInfo.loaiyeucau === 'NghiLop'
        ? 'Đã duyệt yêu cầu nghỉ học và chốt lớp thành công'
        : 'Đã duyệt yêu cầu, chốt lớp cũ và tạo yêu cầu ghép lớp mới thành công';
      res.json({ success: true, message: successMsg });
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

      if (action === 'approve' && generateSessions) {
        try {
          const checkLop = await pool(req).query(
            `SELECT l.malop, yc.lichhoctrongtuan
             FROM buoiday bd 
             JOIN lop l ON l.malop = bd.malop
             JOIN yeucauhockem yc ON yc.mayc = l.mayc
             WHERE bd.mabuoi = $1`, [mabuoi]
          );
          if (checkLop.rows.length) {
            const malop = checkLop.rows[0].malop;
            let lichHocTrongTuan;
            try {
              lichHocTrongTuan = typeof checkLop.rows[0].lichhoctrongtuan === 'string' 
                ? JSON.parse(checkLop.rows[0].lichhoctrongtuan) 
                : checkLop.rows[0].lichhoctrongtuan;
            } catch (e) {}
            
            const maxDateR = await pool(req).query('SELECT MAX(ngayday) as max_date FROM buoiday WHERE malop = $1', [malop]);
            let nextDate = maxDateR.rows[0].max_date ? new Date(maxDateR.rows[0].max_date) : new Date();
            nextDate.setDate(nextDate.getDate() + 1);
            
            const sessions = generateSessions(nextDate.toISOString().split('T')[0], 1, lichHocTrongTuan);
            if (sessions.length > 0) {
              const session = sessions[0];
              await pool(req).query(
                `INSERT INTO buoiday (malop, ngayday, cahoc, trangthai)
                 VALUES ($1, $2, $3, 'ChoXacNhan')
                 ON CONFLICT (malop, ngayday, cahoc) DO NOTHING`,
                [malop, session.ngayday, session.cahoc]
              );
            }
          }
        } catch (err) {
          console.error("Error auto-generating make-up session:", err);
        }
      }

      res.json({ success: true, message: `Đã ${action === 'approve' ? 'phê duyệt' : 'từ chối'} yêu cầu nghỉ học thành công` });
    } catch (e) {
      res.json({ success: false, message: e.message });
    }
  });

  return router;
};
