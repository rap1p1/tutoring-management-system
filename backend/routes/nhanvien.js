const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

function pool(req) { return req.app.locals.pool; }
function auth(req) { return req.session.user; }

// Middleware kiểm tra quyền nhân viên quản lý/admin
function isStaff(req, res, next) {
  if (!auth(req) || !['NVQL', 'SA', 'BGD'].includes(auth(req).vaitro)) {
    return res.json({ success: false, message: 'Không có quyền thực hiện chức năng này' });
  }
  next();
}

router.use(isStaff);

// Lấy thông tin thống kê tổng quan
router.get('/stats', async (req, res) => {
  try {
    const classCount = await pool(req).query("SELECT COUNT(*) FROM LOP WHERE TrangThai = 'DangDay'");
    const pendingGS = await pool(req).query("SELECT COUNT(*) FROM GIASU WHERE TrangThaiHoSo = 'ChoDuyet'");
    const pendingYC = await pool(req).query("SELECT COUNT(*) FROM YEUCAUHOCKEM WHERE TrangThai = 'ChoGhep'");
    const totalRevenue = await pool(req).query("SELECT SUM(TongHocPhi) FROM HOCHPHI WHERE TrangThai = 'DaNop'");
    
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
      SELECT TO_CHAR(NgayNop, 'MM/YYYY') as month, SUM(TongHocPhi) as revenue 
      FROM HOCHPHI 
      WHERE TrangThai = 'DaNop' 
      GROUP BY TO_CHAR(NgayNop, 'MM/YYYY'), TO_CHAR(NgayNop, 'YYYY-MM')
      ORDER BY TO_CHAR(NgayNop, 'YYYY-MM') ASC
      LIMIT 12
    `;
    const r = await pool(req).query(q);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy danh sách gia sư chờ duyệt
router.get('/giasu/pending', async (req, res) => {
  try {
    const r = await pool(req).query("SELECT * FROM GIASU WHERE TrangThaiHoSo = 'ChoDuyet' ORDER BY NgayDangKy DESC");
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Duyệt hoặc từ chối hồ sơ gia sư
router.post('/giasu/:id/duyet', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'DaDuyet' hoặc 'TuChoi'
    if (!['DaDuyet', 'TuChoi'].includes(status)) {
      return res.json({ success: false, message: 'Trạng thái duyệt không hợp lệ' });
    }
    
    // Lấy mã nhân viên dựa vào MaTK
    const nvR = await pool(req).query('SELECT MaNV FROM NHANVIEN WHERE MaTK = $1', [auth(req).matk]);
    if (!nvR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ nhân viên duyệt' });
    const manv = nvR.rows[0].manv;

    // Lấy thông tin gia sư để gửi email
    const gsR = await pool(req).query('SELECT HoTen, Email FROM GIASU WHERE MaGS = $1', [id]);

    await pool(req).query(
      "UPDATE GIASU SET TrangThaiHoSo = $1, NgayDuyet = NOW(), MaNV_Duyet = $2 WHERE MaGS = $3",
      [status, manv, id]
    );

    // Bắt đầu gửi Email tự động nếu duyệt thành công và GS có email
    if (status === 'DaDuyet' && gsR.rows.length > 0 && gsR.rows[0].email) {
      const gsEmail = gsR.rows[0].email;
      const gsName = gsR.rows[0].hoten;
      
      // Tạo tài khoản test Ethereal
      nodemailer.createTestAccount((err, account) => {
        if (!err) {
          let transporter = nodemailer.createTransport({
            host: account.smtp.host,
            port: account.smtp.port,
            secure: account.smtp.secure,
            auth: { user: account.user, pass: account.pass }
          });

          let mailOptions = {
            from: '"Trung Tâm Gia Sư" <admin@giasu.edu.vn>',
            to: gsEmail,
            subject: '🎉 Chúc mừng bạn đã trở thành Gia Sư chính thức!',
            html: `<h3>Chào ${gsName},</h3>
                   <p>Hồ sơ đăng ký làm gia sư của bạn đã được <b>duyệt thành công</b>!</p>
                   <p>Bây giờ bạn có thể đăng nhập vào hệ thống để bắt đầu nhận lớp và giảng dạy.</p>
                   <br/>
                   <p>Trân trọng,<br/>Ban Quản Lý Trung Tâm Gia Sư</p>`
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (!error) {
              console.log('✅ Đã gửi email tự động thành công!');
              console.log('👀 Xem giao diện Email tại link này: %s', nodemailer.getTestMessageUrl(info));
            }
          });
        }
      });
    }

    res.json({ success: true, message: `Đã cập nhật trạng thái hồ sơ gia sư thành: ${status}` });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy toàn bộ gia sư
router.get('/giasu', async (req, res) => {
  try {
    const r = await pool(req).query("SELECT * FROM GIASU ORDER BY HoTen");
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy toàn bộ yêu cầu học kèm
router.get('/yeucau', async (req, res) => {
  try {
    const r = await pool(req).query(
      `SELECT yc.*, mh.TenMH, hv.HoTen AS TenHocVien, hv.SDT AS SDTHocVien 
       FROM YEUCAUHOCKEM yc
       JOIN HOCVIEN hv ON hv.MaHV = yc.MaHV
       JOIN MONHOC mh ON mh.MaMH = yc.MaMH
       ORDER BY yc.NgayDangKy DESC`
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Tạo lớp mới từ yêu cầu học kèm và phân công gia sư
router.post('/lop/create', async (req, res) => {
  const client = await pool(req).connect();
  try {
    const { mayc, mags, ngaybatdau, ngaykethucdukien, hocphimoibuoi, tylehh, noidung, diadiem, hinhthuchoc } = req.body;
    if (!mayc || !ngaybatdau || !hocphimoibuoi) {
      return res.json({ success: false, message: 'Thiếu thông tin bắt buộc để tạo lớp' });
    }
    
    // Lấy mã nhân viên tạo lớp
    const nvR = await client.query('SELECT MaNV FROM NHANVIEN WHERE MaTK = $1', [auth(req).matk]);
    const manv = nvR.rows.length ? nvR.rows[0].manv : null;
    
    await client.query('BEGIN');
    
    // Tạo lớp học
    const lopR = await client.query(
      `INSERT INTO LOP (MaYC, MaGS, MaNV_PhanCong, NgayBatDau, NgayKetThucDuKien, TrangThai, NoiDung, DiaDiem, hinhthuchoc, HocPhiMoiBuoi, TyLeHHGiaSu)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        mayc, 
        mags || null, 
        manv, 
        ngaybatdau, 
        ngaykethucdukien || null, 
        mags ? 'DangDay' : 'ChoGhep', 
        noidung || null, 
        diadiem || null, 
        hinhthuchoc || null, 
        parseInt(hocphimoibuoi), 
        parseFloat(tylehh) || 70.00
      ]
    );
    
    // Cập nhật trạng thái yêu cầu học kèm
    await client.query(
      "UPDATE YEUCAUHOCKEM SET TrangThai = $1, MaNV_TiepNhan = $2 WHERE MaYC = $3",
      [mags ? 'DaGhep' : 'ChoGhep', manv, mayc]
    );
    
    await client.query('COMMIT');
    res.json({ success: true, data: lopR.rows[0], message: 'Tạo lớp và phân công thành công' });
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
      `SELECT l.*, mh.TenMH, gs.HoTen AS TenGiaSu, hv.HoTen AS TenHocVien, yc.CapLop
       FROM LOP l
       JOIN YEUCAUHOCKEM yc ON yc.MaYC = l.MaYC
       JOIN HOCVIEN hv ON hv.MaHV = yc.MaHV
       JOIN MONHOC mh ON mh.MaMH = yc.MaMH
       LEFT JOIN GIASU gs ON gs.MaGS = l.MaGS
       ORDER BY l.NgayTao DESC`
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Tạo hóa đơn học phí
router.post('/hocphi/generate', async (req, res) => {
  try {
    const { malop, mahv, kytt_tu, kytt_den, sobuoi, hocphimoibuoi, ghichu } = req.body;
    if (!malop || !mahv || !kytt_tu || !kytt_den || !sobuoi || !hocphimoibuoi) {
      return res.json({ success: false, message: 'Thiếu thông tin tạo học phí' });
    }
    const tonghocphi = parseInt(sobuoi) * parseInt(hocphimoibuoi);
    
    const r = await pool(req).query(
      `INSERT INTO HOCHPHI (MaLop, MaHV, KyTT_Tu, KyTT_Den, SoBuoi, HocPhiMoiBuoi, TongHocPhi, TrangThai, GhiChu)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ChuaNop', $8) RETURNING *`,
      [malop, mahv, kytt_tu, kytt_den, parseInt(sobuoi), parseInt(hocphimoibuoi), tonghocphi, ghichu || null]
    );
    res.json({ success: true, data: r.rows[0], message: 'Tạo hóa đơn học phí thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Xác nhận học viên đóng tiền
router.post('/hocphi/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const { hinhthuctt, ghichu } = req.body; // 'TienMat' hoặc 'ChuyenKhoan'
    if (!['TienMat', 'ChuyenKhoan'].includes(hinhthuctt)) {
      return res.json({ success: false, message: 'Hình thức thanh toán không hợp lệ' });
    }
    
    const nvR = await pool(req).query('SELECT MaNV FROM NHANVIEN WHERE MaTK = $1', [auth(req).matk]);
    const manv = nvR.rows.length ? nvR.rows[0].manv : null;
    
    await pool(req).query(
      `UPDATE HOCHPHI 
       SET TrangThai = 'DaNop', NgayNop = CURRENT_DATE, HinhThucTT = $1, NguoiThu = $2, GhiChu = COALESCE($3, GhiChu)
       WHERE MaHP = $4`,
      [hinhthuctt, manv, ghichu || null, id]
    );
    res.json({ success: true, message: 'Xác nhận đóng học phí thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy toàn bộ hóa đơn học phí
router.get('/hocphi', async (req, res) => {
  try {
    const r = await pool(req).query(
      `SELECT hp.*, hv.HoTen AS TenHocVien, mh.TenMH, l.MaLop 
       FROM HOCHPHI hp
       JOIN HOCVIEN hv ON hv.MaHV = hp.MaHV
       JOIN LOP l ON l.MaLop = hp.MaLop
       JOIN YEUCAUHOCKEM yc ON yc.MaYC = l.MaYC
       JOIN MONHOC mh ON mh.MaMH = yc.MaMH
       ORDER BY hp.KyTT_Tu DESC`
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Tạo phiếu thanh toán hoa hồng cho gia sư
router.post('/hoahong/generate', async (req, res) => {
  try {
    const { mags, malop, kytt_tu, kytt_den, sobuoida_day, hocphihvmoibuoi, tylehh } = req.body;
    if (!mags || !malop || !kytt_tu || !kytt_den || !sobuoida_day || !hocphihvmoibuoi || !tylehh) {
      return res.json({ success: false, message: 'Thiếu thông tin tạo hoa hồng' });
    }
    
    // Tính toán số tiền gia sư được nhận (hoặc hoa hồng trả lại cho trung tâm)
    // Theo DB, TongHoaHong = SoBuoiDaDay * HocPhiHVMoiBuoi * (TyLeHH / 100)
    const tonghoahong = Math.round(parseInt(sobuoida_day) * parseInt(hocphihvmoibuoi) * (parseFloat(tylehh) / 100.0));
    
    const r = await pool(req).query(
      `INSERT INTO HOAHONG (MaGS, MaLop, KyTT_Tu, KyTT_Den, SoBuoiDaDay, HocPhiHVMoiBuoi, TyLeHH, TongHoaHong, TrangThai)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ChuaTT') RETURNING *`,
      [mags, malop, kytt_tu, kytt_den, parseInt(sobuoida_day), parseInt(hocphihvmoibuoi), parseFloat(tylehh), tonghoahong]
    );
    res.json({ success: true, data: r.rows[0], message: 'Tạo phiếu hoa hồng/thanh toán thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Xác nhận thanh toán hoa hồng cho gia sư
router.post('/hoahong/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const { hinhthuctt } = req.body; // 'TienMat' hoặc 'ChuyenKhoan'
    if (!['TienMat', 'ChuyenKhoan'].includes(hinhthuctt)) {
      return res.json({ success: false, message: 'Hình thức thanh toán không hợp lệ' });
    }
    
    const nvR = await pool(req).query('SELECT MaNV FROM NHANVIEN WHERE MaTK = $1', [auth(req).matk]);
    const manv = nvR.rows.length ? nvR.rows[0].manv : null;
    
    await pool(req).query(
      `UPDATE HOAHONG 
       SET TrangThai = 'DaTT', NgayThanhToan = CURRENT_DATE, HinhThucTT = $1, NguoiDuyet = $2
       WHERE MaHH = $3`,
      [hinhthuctt, manv, id]
    );
    res.json({ success: true, message: 'Xác nhận thanh toán hoa hồng thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy toàn bộ phiếu thanh toán hoa hồng
router.get('/hoahong', async (req, res) => {
  try {
    const r = await pool(req).query(
      `SELECT hh.*, gs.HoTen AS TenGiaSu, mh.TenMH 
       FROM HOAHONG hh
       JOIN GIASU gs ON gs.MaGS = hh.MaGS
       JOIN LOP l ON l.MaLop = hh.MaLop
       JOIN YEUCAUHOCKEM yc ON yc.MaYC = l.MaYC
       JOIN MONHOC mh ON mh.MaMH = yc.MaMH
       ORDER BY hh.KyTT_Tu DESC`
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy danh sách yêu cầu đổi / báo nghỉ
router.get('/yeucaudoi', async (req, res) => {
  try {
    const r = await pool(req).query(
      `SELECT ycd.*, l.MaLop, hv.HoTen AS TenHocVien, gs.HoTen AS TenGiaSu, mh.TenMH 
       FROM YEUCAUDOIGIASU ycd
       JOIN LOP l ON l.MaLop = ycd.MaLop
       JOIN HOCVIEN hv ON hv.MaHV = ycd.MaHV
       LEFT JOIN GIASU gs ON gs.MaGS = ycd.MaGS
       JOIN YEUCAUHOCKEM yc ON yc.MaYC = l.MaYC
       JOIN MONHOC mh ON mh.MaMH = yc.MaMH
       ORDER BY ycd.NgayYeuCau DESC`
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Xử lý yêu cầu đổi gia sư / báo nghỉ
router.post('/yeucaudoi/:id/xuly', async (req, res) => {
  try {
    const { id } = req.params;
    const nvR = await pool(req).query('SELECT MaNV FROM NHANVIEN WHERE MaTK = $1', [auth(req).matk]);
    const manv = nvR.rows.length ? nvR.rows[0].manv : null;
    
    await pool(req).query(
      `UPDATE YEUCAUDOIGIASU 
       SET TrangThai = 'DaXuLy', NgayXuLy = NOW(), MaNV_XuLy = $1
       WHERE MaYCDG = $2`,
      [manv, id]
    );
    res.json({ success: true, message: 'Đã đánh dấu xử lý thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Kết thúc lớp sớm
router.post('/lop/:id/ketthuc', async (req, res) => {
  try {
    const { id } = req.params;
    const { lydo } = req.body;
    await pool(req).query(
      `UPDATE LOP 
       SET TrangThai = 'KetThuc', NgayKetThucThucTe = NOW(), LyDoKetThucSom = $1
       WHERE MaLop = $2`,
      [lydo || 'Kết thúc sớm theo yêu cầu', id]
    );
    res.json({ success: true, message: 'Đã chốt kết thúc lớp thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy danh sách báo nghỉ từng buổi của học viên và gia sư
router.get('/baonghi', async (req, res) => {
  try {
    const r = await pool(req).query(
      `SELECT bd.*, l.MaLop, hv.HoTen AS TenHocVien, gs.HoTen AS TenGiaSu, mh.TenMH 
       FROM BUOIDAY bd
       JOIN LOP l ON l.MaLop = bd.MaLop
       JOIN YEUCAUHOCKEM yc ON yc.MaYC = l.MaYC
       JOIN HOCVIEN hv ON hv.MaHV = yc.MaHV
       LEFT JOIN GIASU gs ON gs.MaGS = l.MaGS
       JOIN MONHOC mh ON mh.MaMH = yc.MaMH
       WHERE bd.TrangThai IN ('HVVangCoPhep', 'GSNghi')
       ORDER BY bd.NgayDay DESC`
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

module.exports = router;
