const express = require('express');
const { sendEmail } = require('../../utils/mailer');

module.exports = function(pool, auth, requireOps) {
  const router = express.Router();

  // Lấy danh sách gia sư chờ duyệt
  router.get('/giasu/pending', async (req, res) => {
    try {
      const r = await pool(req).query("SELECT * FROM giasu WHERE trangthaihoso = 'ChoDuyet' ORDER BY ngaydangky DESC");
      res.json({ success: true, data: r.rows });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Duyệt hoặc từ chối hồ sơ gia sư
  router.post('/giasu/:id/duyet', requireOps, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!['DaDuyet', 'TuChoi'].includes(status)) {
        return res.json({ success: false, message: 'Trạng thái duyệt không hợp lệ' });
      }
      
      const nvR = await pool(req).query('SELECT manv FROM nhanvien WHERE matk = $1', [auth(req).matk]);
      if (!nvR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ nhân viên duyệt' });
      const manv = nvR.rows[0].manv;

      const gsR = await pool(req).query('SELECT hoten, email FROM giasu WHERE mags = $1', [id]);

      await pool(req).query(
        "UPDATE giasu SET trangthaihoso = $1, ngayduyet = NOW(), manv_duyet = $2 WHERE mags = $3",
        [status, manv, id]
      );

      // Gửi email thông báo duyệt/từ chối (dùng Gmail SMTP thật)
      if (gsR.rows.length > 0 && gsR.rows[0].email) {
        const gsEmail = gsR.rows[0].email;
        const gsName = gsR.rows[0].hoten;
        
        if (status === 'DaDuyet') {
          sendEmail({
            to: gsEmail,
            subject: '🎉 Chúc mừng bạn đã trở thành Gia Sư chính thức!',
            html: `<h3>Chào ${gsName},</h3>
                   <p>Hồ sơ đăng ký làm gia sư của bạn đã được <b>duyệt thành công</b>!</p>
                   <p>Bây giờ bạn có thể đăng nhập vào hệ thống để bắt đầu nhận lớp và giảng dạy.</p>
                   <br/>
                   <p>Trân trọng,<br/>Ban Quản Lý Trung Tâm Gia Sư</p>`
          }).then(() => {
            console.log('✅ Đã gửi email thông báo duyệt gia sư tới:', gsEmail);
          }).catch(err => console.error('❌ Gửi email duyệt thất bại:', err));
        } else if (status === 'TuChoi') {
          sendEmail({
            to: gsEmail,
            subject: 'Thông báo về kết quả đăng ký gia sư',
            html: `<h3>Chào ${gsName},</h3>
                   <p>Rất tiếc phải thông báo rằng hồ sơ đăng ký làm gia sư của bạn đã <b>không được duyệt</b>.</p>
                   <p>Nguyên nhân có thể do hồ sơ chưa đạt yêu cầu, thiếu minh chứng hoặc thông tin không chính xác. Bạn vui lòng kiểm tra lại hoặc liên hệ trung tâm để biết thêm chi tiết.</p>
                   <br/>
                   <p>Trân trọng,<br/>Ban Quản Lý Trung Tâm Gia Sư</p>`
          }).then(() => {
            console.log('✅ Đã gửi email thông báo từ chối gia sư tới:', gsEmail);
          }).catch(err => console.error('❌ Gửi email từ chối thất bại:', err));
        }
      }

      res.json({ success: true, message: `Đã cập nhật trạng thái hồ sơ gia sư thành: ${status}` });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Lấy toàn bộ gia sư kèm lịch rảnh
  router.get('/giasu', async (req, res) => {
    try {
      const q = `
        SELECT gs.*, 
               COALESCE(
                 (SELECT json_agg(json_build_object('thu', lr.thutrongtuan, 'buoi', lr.cahoc)) 
                  FROM lichranh_giasu lr 
                  WHERE lr.mags = gs.mags), 
                 '[]'::json
               ) as lichranh,
               (SELECT json_agg(mhgs.mamh) FROM giasu_monhoc mhgs WHERE mhgs.mags = gs.mags) as registered_subjects
        FROM giasu gs
        ORDER BY gs.hoten
      `;
      const r = await pool(req).query(q);
      res.json({ success: true, data: r.rows });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Lấy toàn bộ học viên
  router.get('/hocvien', async (req, res) => {
    try {
      const q = `
        SELECT hv.*, 
          COALESCE(
            (SELECT json_agg(json_build_object('malop', l.malop, 'tenmh', mh.tenmh, 'trangthai', l.trangthai)) 
             FROM lop l 
             JOIN yeucauhockem yc ON l.mayc = yc.mayc 
             JOIN monhoc mh ON yc.mamh = mh.mamh 
             WHERE yc.mahv = hv.mahv), 
            '[]'::json
          ) as lophoc 
        FROM hocvien hv 
        ORDER BY hv.hoten
      `;
      const r = await pool(req).query(q);
      res.json({ success: true, data: r.rows });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Lấy toàn bộ yêu cầu học kèm
  router.get('/yeucau', async (req, res) => {
    try {
      const r = await pool(req).query(
        `SELECT yc.*, mh.tenmh, hv.hoten AS tenhocvien, hv.sdt AS sdthocvien 
         FROM yeucauhockem yc
         JOIN hocvien hv ON hv.mahv = yc.mahv
         JOIN monhoc mh ON mh.mamh = yc.mamh
         ORDER BY yc.ngaydangky DESC`
      );
      res.json({ success: true, data: r.rows });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Hủy yêu cầu học kèm
  router.post('/yeucau/:id/huy', requireOps, async (req, res) => {
    try {
      const { id } = req.params;
      const checkR = await pool(req).query('SELECT trangthai FROM yeucauhockem WHERE mayc = $1', [id]);
      if (!checkR.rows.length) return res.json({ success: false, message: 'Không tìm thấy yêu cầu' });
      if (checkR.rows[0].trangthai !== 'ChoGhep') {
        return res.json({ success: false, message: 'Chỉ có thể hủy yêu cầu đang ở trạng thái Chờ ghép' });
      }
      
      const nvR = await pool(req).query('SELECT manv FROM nhanvien WHERE matk = $1', [auth(req).matk]);
      const manv = nvR.rows.length ? nvR.rows[0].manv : null;

      await pool(req).query(
        "UPDATE yeucauhockem SET trangthai = 'Huy', manv_tiepnhan = $1 WHERE mayc = $2",
        [manv, id]
      );
      res.json({ success: true, message: 'Đã hủy yêu cầu thành công' });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Chi tiết học viên (có lớp đang học)
  router.get('/hocvien/:id/detail', async (req, res) => {
    try {
      const { id } = req.params;
      const [hvRes, lopRes] = await Promise.all([
        pool(req).query(`SELECT * FROM hocvien WHERE mahv = $1`, [id]),
        pool(req).query(`
          SELECT l.malop, mh.tenmh, gs.hoten AS tengiasu, gs.sdt AS sdtgiasu, l.ngaybatdau, l.trangthai, yc.caplop
          FROM lop l
          JOIN yeucauhockem yc ON yc.mayc = l.mayc
          JOIN monhoc mh ON mh.mamh = yc.mamh
          JOIN giasu gs ON gs.mags = l.mags
          WHERE yc.mahv = $1
          ORDER BY l.ngaybatdau DESC
        `, [id])
      ]);
      if (!hvRes.rows[0]) return res.json({ success: false, message: 'Không tìm thấy học viên' });
      res.json({ success: true, data: { ...hvRes.rows[0], lophoc: lopRes.rows } });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  // Chi tiết gia sư (có lớp đang dạy)
  router.get('/giasu/:id/detail', async (req, res) => {
    try {
      const { id } = req.params;
      const [gsRes, lopRes] = await Promise.all([
        pool(req).query(`SELECT * FROM giasu WHERE mags = $1`, [id]),
        pool(req).query(`
          SELECT l.malop, mh.tenmh, hv.hoten AS tenhocvien, hv.sdt AS sdthocvien, l.ngaybatdau, l.trangthai, yc.caplop
          FROM lop l
          JOIN yeucauhockem yc ON yc.mayc = l.mayc
          JOIN monhoc mh ON mh.mamh = yc.mamh
          JOIN hocvien hv ON hv.mahv = yc.mahv
          WHERE l.mags = $1
          ORDER BY l.ngaybatdau DESC
        `, [id])
      ]);
      if (!gsRes.rows[0]) return res.json({ success: false, message: 'Không tìm thấy gia sư' });
      res.json({ success: true, data: { ...gsRes.rows[0], lophoc: lopRes.rows } });
    } catch (e) { res.json({ success: false, message: e.message }); }
  });

  return router;
};
