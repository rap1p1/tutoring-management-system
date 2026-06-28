const express = require('express');

module.exports = function(pool, auth, requireOps, generateSessions) {
  const router = express.Router();

  // Tạo lớp mới từ yêu cầu học kèm và phân công gia sư
  router.post('/lop/create', requireOps, async (req, res) => {
    const client = await pool(req).connect();
    try {
      const { mayc, mags, ngaybatdau, ngaykethucdukien, hocphimoibuoi, tylehh, noidung, diadiem, hinhthuchoc } = req.body;
      const parsedMaGS = parseInt(mags);
      if (!mayc || isNaN(parsedMaGS)) {
        return res.json({ success: false, message: 'Thiếu thông tin bắt buộc hoặc mã gia sư không hợp lệ để tạo lớp' });
      }

      const ycR = await client.query(`
        SELECT yc.songayhoc, yc.lichhoctrongtuan, yc.caplop, yc.mamh, mh.tenmh 
        FROM yeucauhockem yc 
        JOIN monhoc mh ON mh.mamh = yc.mamh 
        WHERE yc.mayc = $1
      `, [mayc]);
      if (!ycR.rows.length) {
        return res.json({ success: false, message: 'Không tìm thấy yêu cầu học kèm' });
      }
      const { caplop, mamh, tenmh } = ycR.rows[0];

      // Khóa cứng: Kiểm tra xem gia sư có đăng ký môn này hoặc có chuyên ngành khớp môn này không
      const subjectCheck = await client.query(`
        SELECT 1 
        FROM giasu gs 
        LEFT JOIN giasu_monhoc gm ON gs.mags = gm.mags AND gm.mamh = $1 
        WHERE gs.mags = $2 AND (gm.mamh IS NOT NULL OR gs.chuyennganh = $3)
      `, [mamh, parsedMaGS, tenmh]);
      
      if (!subjectCheck.rows.length) {
        return res.json({ success: false, message: 'Gia sư chưa đăng ký môn học này và chuyên ngành cũng không khớp. Vui lòng chọn gia sư khác.' });
      }

      const getDbDefaultHocPhi = async (cap) => {
        let key = 'HocPhi_Khac';
        if (cap === 'Cấp 1') key = 'HocPhi_Cap1';
        else if (cap === 'Cấp 2') key = 'HocPhi_Cap2';
        else if (cap === 'Cấp 3') key = 'HocPhi_Cap3';
        else if (cap === 'Luyện thi Đại học') key = 'HocPhi_LuyenThiDH';
        else if (cap === 'Tiếng Anh Giao tiếp') key = 'HocPhi_TiengAnhGT';
        else if (cap === 'Chứng chỉ Quốc tế') key = 'HocPhi_ChungChiQT';

        const r = await client.query('SELECT giatri FROM thamso WHERE mats = $1', [key]);
        return r.rows.length ? parseInt(r.rows[0].giatri) : 250000;
      };

      const defaultHocPhi = await getDbDefaultHocPhi(caplop);
      let finalHocPhi = defaultHocPhi;
      if (auth(req).vaitro === 'BGD' && hocphimoibuoi !== undefined && hocphimoibuoi !== '') {
        const parsedVal = parseInt(hocphimoibuoi);
        if (!isNaN(parsedVal) && parsedVal > 0) {
          finalHocPhi = parsedVal;
        }
      }
      
      const tsR = await client.query("SELECT giatri FROM thamso WHERE mats = 'TyLeHHMacDinh'");
      const defaultTyLe = tsR.rows.length ? parseFloat(tsR.rows[0].giatri) : 70.00;

      let finalTyLe = defaultTyLe;
      if (auth(req).vaitro === 'BGD' && tylehh !== undefined && tylehh !== '') {
        const parsedVal = parseFloat(tylehh);
        if (!isNaN(parsedVal) && parsedVal >= 0 && parsedVal <= 100) {
          finalTyLe = parsedVal;
        }
      }

      const start = ngaybatdau || new Date().toISOString().split('T')[0];

      const nvR = await client.query('SELECT manv FROM nhanvien WHERE matk = $1', [auth(req).matk]);
      const manv = nvR.rows.length ? nvR.rows[0].manv : null;
      
      const gsCheck = await client.query("SELECT mags FROM giasu WHERE mags = $1 AND trangthaihoso = 'DaDuyet'", [parsedMaGS]);
      if (!gsCheck.rows.length) {
        return res.json({ success: false, message: 'Mã gia sư không tồn tại hoặc hồ sơ gia sư chưa được duyệt' });
      }
      
      const soNgayHoc = 20;
      let lichHocTrongTuan;
      try {
        lichHocTrongTuan = typeof ycR.rows[0].lichhoctrongtuan === 'string' 
          ? JSON.parse(ycR.rows[0].lichhoctrongtuan) 
          : ycR.rows[0].lichhoctrongtuan;
      } catch (e) {
        return res.json({ success: false, message: 'Lịch học trong tuần không hợp lệ' });
      }

      const sessions = generateSessions(start, soNgayHoc, lichHocTrongTuan);

      // KIỂM TRA TRÙNG LỊCH GIA SƯ
      const existingSessions = await client.query(
        `SELECT bd.ngayday, bd.cahoc 
         FROM buoiday bd 
         JOIN lop l ON bd.malop = l.malop 
         WHERE l.mags = $1 AND l.trangthai IN ('DangDay', 'DaPhanCong') AND bd.trangthai IN ('ChoXacNhan', 'DaDay')`,
        [parsedMaGS]
      );
      
      // Tạo Set các chuỗi "YYYY-MM-DD_Cahoc" để dò tìm nhanh
      const existingMap = new Set(
        existingSessions.rows.map(s => {
          const d = new Date(s.ngayday);
          const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
          return `${dateStr}_${s.cahoc}`;
        })
      );
      
      for (const session of sessions) {
        if (existingMap.has(`${session.ngayday}_${session.cahoc}`)) {
          await client.query('ROLLBACK');
          return res.json({ 
            success: false, 
            message: `Gia sư đã bị trùng lịch vào ngày ${session.ngayday.split('-').reverse().join('/')} (Ca ${session.cahoc === 'Sang' ? 'Sáng' : session.cahoc === 'Chieu' ? 'Chiều' : 'Tối'}). Vui lòng chọn gia sư khác!` 
          });
        }
      }

      await client.query('BEGIN');
      
      const lopR = await client.query(
        `INSERT INTO lop (mayc, mags, manv_phancong, ngaybatdau, ngayketthucdukien, trangthai, hanxacnhan, noidung, diadiem, hinhthuchoc, hocphimoibuoi, tylehhgiasu)
         VALUES ($1, $2, $3, $4, $5, 'DaPhanCong', NOW() + INTERVAL '24 hours', $6, $7, $8, $9, $10) RETURNING *`,
        [mayc, parsedMaGS, manv, start, ngaykethucdukien || null, noidung || null, diadiem || null, hinhthuchoc || null, finalHocPhi, finalTyLe]
      );
      
      const malop = lopR.rows[0].malop;
      

      
      for (const session of sessions) {
        await client.query(
          `INSERT INTO buoiday (malop, ngayday, cahoc, trangthai)
           VALUES ($1, $2, $3, 'ChoXacNhan')
           ON CONFLICT (malop, ngayday, cahoc) DO NOTHING`,
          [malop, session.ngayday, session.cahoc]
        );
      }
      
      await client.query(
        "UPDATE yeucauhockem SET trangthai = 'DaGhep', manv_tiepnhan = $1 WHERE mayc = $2",
        [manv, mayc]
      );
      
      await client.query('COMMIT');
      res.json({ success: true, data: lopR.rows[0], message: 'Đã ghép lớp thành công' });
    } catch (e) {
      await client.query('ROLLBACK');
      res.json({ success: false, message: e.message });
    } finally {
      client.release();
    }
  });

  // Lấy toàn bộ danh sách lớp học
  router.get('/lop', async (req, res) => {
    try {
      const r = await pool(req).query(
        `SELECT l.*, mh.tenmh, gs.hoten AS tengiasu, hv.hoten AS tenhocvien, yc.caplop, yc.mahv
         FROM lop l
         JOIN yeucauhockem yc ON yc.mayc = l.mayc
         JOIN hocvien hv ON hv.mahv = yc.mahv
         JOIN monhoc mh ON mh.mamh = yc.mamh
         LEFT JOIN giasu gs ON gs.mags = l.mags
         ORDER BY l.ngaytao DESC`
      );
      res.json({ success: true, data: r.rows });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Kết thúc lớp sớm + tự động tạo hóa đơn & hoa hồng
  router.post('/lop/:id/ketthuc', requireOps, async (req, res) => {
    const client = await pool(req).connect();
    try {
      const { id } = req.params;
      const { lydo } = req.body;
      
      const lopR = await client.query(
        `SELECT l.*, yc.mahv, yc.songayhoc
         FROM lop l
         JOIN yeucauhockem yc ON yc.mayc = l.mayc
         WHERE l.malop = $1`,
        [id]
      );
      if (!lopR.rows.length) return res.json({ success: false, message: 'Không tìm thấy lớp học' });
      
      const lop = lopR.rows[0];
      
      const statsR = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE trangthai = 'DaDay') as count_daday,
          COUNT(*) FILTER (WHERE trangthai = 'HVVangCoPhep') as count_vangcophep,
          COUNT(*) FILTER (WHERE trangthai = 'GSNghi') as count_gsnghi,
          MIN(ngayday) as ngay_dau,
          MAX(ngayday) as ngay_cuoi
        FROM buoiday WHERE malop = $1
      `, [id]);
      
      const stats = statsR.rows[0];
      const soBuoiDaDay = parseInt(stats.count_daday) || 0;
      const soBuoiVangCoPhep = parseInt(stats.count_vangcophep) || 0;
      const soBuoiGSNghi = parseInt(stats.count_gsnghi) || 0;
      const soBuoiTinhPhi = soBuoiDaDay;
      
      await client.query('BEGIN');
      
      await client.query(
        `UPDATE lop 
         SET trangthai = 'KetThuc', ngayketthucthucte = NOW(), lydoketthucsom = $1
         WHERE malop = $2`,
        [lydo || 'Kết thúc sớm theo yêu cầu', id]
      );
      
      await client.query(
        "UPDATE buoiday SET trangthai = 'Huy' WHERE malop = $1 AND trangthai IN ('ChoXacNhan', 'HVXinNghi', 'GSXinNghi')",
        [id]
      );
      
      let hocphiCreated = null;
      let hoahongCreated = null;
      
      if (soBuoiTinhPhi > 0 && lop.mahv) {
        const kyTuNgay = stats.ngay_dau || lop.ngaybatdau;
        const kyDenNgay = stats.ngay_cuoi || new Date().toISOString().split('T')[0];
        const tongHocPhi = soBuoiTinhPhi * parseInt(lop.hocphimoibuoi);
        
        const hpR = await client.query(
          `INSERT INTO hochphi (malop, mahv, kytt_tu, kytt_den, sobuoi, hocphimoibuoi, tonghocphi, trangthai, ghichu)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'ChuaNop', $8) RETURNING *`,
          [id, lop.mahv, kyTuNgay, kyDenNgay, soBuoiTinhPhi, parseInt(lop.hocphimoibuoi), tongHocPhi, `Tự động tạo khi kết thúc lớp sớm. Buổi đã dạy: ${soBuoiDaDay}, Vắng có phép: ${soBuoiVangCoPhep}, GS nghỉ: ${soBuoiGSNghi}`]
        );
        hocphiCreated = hpR.rows[0];
        
        if (lop.mags) {
          const tyLeHH = parseFloat(lop.tylehhgiasu) || 70.00;
          const tongHoaHong = Math.round(soBuoiTinhPhi * parseInt(lop.hocphimoibuoi) * (tyLeHH / 100.0));
          
          const hhR = await client.query(
            `INSERT INTO hoahong (mags, malop, kytt_tu, kytt_den, sobuoidaday, hocphihvmoibuoi, tylehh, tonghoahong, trangthai)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ChuaTT') RETURNING *`,
            [lop.mags, id, kyTuNgay, kyDenNgay, soBuoiTinhPhi, parseInt(lop.hocphimoibuoi), tyLeHH, tongHoaHong]
          );
          hoahongCreated = hhR.rows[0];
        }
      }
      
      await client.query('COMMIT');
      
      res.json({ 
        success: true, 
        message: 'Đã chốt kết thúc lớp thành công',
        data: {
          soBuoiDaDay,
          soBuoiVangCoPhep,
          soBuoiGSNghi,
          hocphi: hocphiCreated,
          hoahong: hoahongCreated
        }
      });
    } catch (e) { 
      await client.query('ROLLBACK');
      res.json({ success: false, message: e.message }); 
    } finally {
      client.release();
    }
  });

  // Thay đổi tỷ lệ hoa hồng - chỉ Giám đốc (BGD)
  router.put('/lop/:id/tylehh', async (req, res) => {
    if (auth(req).vaitro !== 'BGD') {
      return res.json({ success: false, message: 'Chỉ Giám đốc mới có quyền thay đổi tỷ lệ hoa hồng' });
    }
    try {
      const { id } = req.params;
      const { tylehh } = req.body;
      const parsedTyLe = parseFloat(tylehh);
      if (isNaN(parsedTyLe) || parsedTyLe < 0 || parsedTyLe > 100) {
        return res.json({ success: false, message: 'Tỷ lệ hoa hồng phải từ 0 đến 100' });
      }
      
      await pool(req).query('UPDATE lop SET tylehhgiasu = $1 WHERE malop = $2', [parsedTyLe, id]);
      res.json({ success: true, message: `Đã cập nhật tỷ lệ hoa hồng thành ${parsedTyLe}%` });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Lấy chi tiết lớp học đầy đủ
  router.get('/lop/:id/detail', async (req, res) => {
    try {
      const { id } = req.params;
      
      const qInfo = `
        SELECT 
          l.malop, l.ngaybatdau, l.ngayketthucdukien, l.ngayketthucthucte, l.trangthai AS ClassTrangThai, l.noidung AS ClassNoiDung, l.diadiem AS ClassDiaDiem, l.hinhthuchoc AS ClassHinhThuc, l.hocphimoibuoi, l.tylehhgiasu, l.lydoketthucsom,
          mh.tenmh, yc.caplop, yc.songayhoc, yc.lichhoctrongtuan,
          hv.mahv, hv.hoten AS StudentName, hv.ngaysinh AS StudentNgaySinh, hv.gioitinh AS StudentGioiTinh, hv.sdt AS StudentSDT, hv.email AS StudentEmail, hv.diachi AS StudentDiaChi,
          gs.mags, gs.hoten AS TutorName, gs.ngaysinh AS TutorNgaySinh, gs.gioitinh AS TutorGioiTinh, gs.sdt AS TutorSDT, gs.email AS TutorEmail, gs.trinhdohocvan AS TutorTrinhDo, gs.chuyennganh AS TutorChuyenNganh, gs.kinhnghiem AS TutorKinhNghiem, gs.diemtrungbinh AS TutorDiem
        FROM lop l
        JOIN yeucauhockem yc ON yc.mayc = l.mayc
        JOIN hocvien hv ON hv.mahv = yc.mahv
        JOIN monhoc mh ON mh.mamh = yc.mamh
        LEFT JOIN giasu gs ON gs.mags = l.mags
        WHERE l.malop = $1
      `;
      const rInfo = await pool(req).query(qInfo, [id]);
      if (!rInfo.rows.length) {
        return res.json({ success: false, message: 'Không tìm thấy lớp học' });
      }
      
      const qStats = `
        SELECT 
          COUNT(*) FILTER (WHERE trangthai = 'DaDay') as count_daday,
          COUNT(*) FILTER (WHERE trangthai = 'ChoXacNhan') as count_choxacnhan,
          COUNT(*) FILTER (WHERE trangthai = 'HVVangCoPhep') as count_hvvangcophep,
          COUNT(*) FILTER (WHERE trangthai = 'GSNghi') as count_gsnghi,
          COUNT(*) FILTER (WHERE trangthai = 'Huy') as count_huy
        FROM buoiday
        WHERE malop = $1
      `;
      const rStats = await pool(req).query(qStats, [id]);
      
      res.json({
        success: true,
        data: {
          info: rInfo.rows[0],
          stats: rStats.rows[0]
        }
      });
    } catch (e) {
      res.json({ success: false, message: e.message });
    }
  });

  return router;
};
