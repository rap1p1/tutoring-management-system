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

function requireOps(req, res, next) {
  if (!['SA', 'NVQL'].includes(auth(req).vaitro)) {
    return res.json({ success: false, message: 'Vai trò của bạn không có quyền thực hiện thao tác nghiệp vụ này' });
  }
  next();
}

router.use(isStaff);

// Lấy thông tin cá nhân của nhân viên
router.get('/me', async (req, res) => {
  try {
    const r = await pool(req).query('SELECT * FROM nhanvien WHERE matk = $1', [auth(req).matk]);
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
      SELECT TO_CHAR(ngaynop, 'MM/YYYY') as month, SUM(tonghocphi) as revenue 
      FROM hochphi 
      WHERE trangthai = 'DaNop' 
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
    const r = await pool(req).query("SELECT * FROM giasu WHERE trangthaihoso = 'ChoDuyet' ORDER BY ngaydangky DESC");
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Duyệt hoặc từ chối hồ sơ gia sư
router.post('/giasu/:id/duyet', requireOps, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'DaDuyet' hoặc 'TuChoi'
    if (!['DaDuyet', 'TuChoi'].includes(status)) {
      return res.json({ success: false, message: 'Trạng thái duyệt không hợp lệ' });
    }
    
    // Lấy mã nhân viên dựa vào MaTK
    const nvR = await pool(req).query('SELECT manv FROM nhanvien WHERE matk = $1', [auth(req).matk]);
    if (!nvR.rows.length) return res.json({ success: false, message: 'Không tìm thấy hồ sơ nhân viên duyệt' });
    const manv = nvR.rows[0].manv;

    // Lấy thông tin gia sư để gửi email
    const gsR = await pool(req).query('SELECT hoten, email FROM giasu WHERE mags = $1', [id]);

    await pool(req).query(
      "UPDATE giasu SET trangthaihoso = $1, ngayduyet = NOW(), manv_duyet = $2 WHERE mags = $3",
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
    const r = await pool(req).query("SELECT * FROM giasu ORDER BY hoten");
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
// Tạo lớp mới từ yêu cầu học kèm và phân công gia sư
router.post('/lop/create', requireOps, async (req, res) => {
  const client = await pool(req).connect();
  try {
    const { mayc, mags, ngaybatdau, ngaykethucdukien, hocphimoibuoi, tylehh, noidung, diadiem, hinhthuchoc } = req.body;
    const parsedMaGS = parseInt(mags);
    if (!mayc || isNaN(parsedMaGS) || !ngaybatdau || !hocphimoibuoi) {
      return res.json({ success: false, message: 'Thiếu thông tin bắt buộc hoặc mã gia sư không hợp lệ để tạo lớp' });
    }
    
    // Lấy mã nhân viên tạo lớp
    const nvR = await client.query('SELECT manv FROM nhanvien WHERE matk = $1', [auth(req).matk]);
    const manv = nvR.rows.length ? nvR.rows[0].manv : null;
    
    // Kiểm tra gia sư có tồn tại và hồ sơ đã duyệt không
    const gsCheck = await client.query("SELECT mags FROM giasu WHERE mags = $1 AND trangthaihoso = 'DaDuyet'", [parsedMaGS]);
    if (!gsCheck.rows.length) {
      return res.json({ success: false, message: 'Mã gia sư không tồn tại hoặc hồ sơ gia sư chưa được duyệt' });
    }

    await client.query('BEGIN');
    
    // Tạo lớp học (luôn ở trạng thái DangDay vì đã bắt buộc có gia sư)
    const lopR = await client.query(
      `INSERT INTO lop (mayc, mags, manv_phancong, ngaybatdau, ngayketthucdukien, trangthai, noidung, diadiem, hinhthuchoc, hocphimoibuoi, tylehhgiasu)
       VALUES ($1, $2, $3, $4, $5, 'DangDay', $6, $7, $8, $9, $10) RETURNING *`,
      [
        mayc, 
        parsedMaGS, 
        manv, 
        ngaybatdau, 
        ngaykethucdukien || null, 
        noidung || null, 
        diadiem || null, 
        hinhthuchoc || null, 
        parseInt(hocphimoibuoi), 
        parseFloat(tylehh) || 70.00
      ]
    );
    
    // Cập nhật trạng thái yêu cầu học kèm thành DaGhep
    await client.query(
      "UPDATE yeucauhockem SET trangthai = 'DaGhep', manv_tiepnhan = $1 WHERE mayc = $2",
      [manv, mayc]
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
      `SELECT l.*, mh.tenmh, gs.hoten AS tengiasu, hv.hoten AS tenhocvien, yc.caplop
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
    const { hinhthuctt, ghichu } = req.body; // 'TienMat' hoặc 'ChuyenKhoan'
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
    
    // Tính toán số tiền gia sư được nhận (hoặc hoa hồng trả lại cho trung tâm)
    // Theo DB, TongHoaHong = SoBuoiDaDay * HocPhiHVMoiBuoi * (TyLeHH / 100)
    const tonghoahong = Math.round(parseInt(sobuoida_day) * parseInt(hocphihvmoibuoi) * (parseFloat(tylehh) / 100.0));
    
    const r = await pool(req).query(
      `INSERT INTO hoahong (mags, malop, kytt_tu, kytt_den, sobuoida_day, hocphihvmoibuoi, tylehh, tonghoahong, trangthai)
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
    const { hinhthuctt } = req.body; // 'TienMat' hoặc 'ChuyenKhoan'
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
  try {
    const { id } = req.params;
    const nvR = await pool(req).query('SELECT manv FROM nhanvien WHERE matk = $1', [auth(req).matk]);
    const manv = nvR.rows.length ? nvR.rows[0].manv : null;
    
    await pool(req).query(
      `UPDATE yeucaudoigiasu 
       SET trangthai = 'DaXuLy', ngayxuly = NOW(), manv_xuly = $1
       WHERE maycdg = $2`,
      [manv, id]
    );
    res.json({ success: true, message: 'Đã đánh dấu xử lý thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Kết thúc lớp sớm
router.post('/lop/:id/ketthuc', requireOps, async (req, res) => {
  try {
    const { id } = req.params;
    const { lydo } = req.body;
    const r = await pool(req).query(
      `UPDATE lop 
       SET trangthai = 'KetThuc', ngayketthucthucte = NOW(), lydoketthucsom = $1
       WHERE malop = $2`,
      [lydo || 'Kết thúc sớm theo yêu cầu', id]
    );
    if (r.rowCount === 0) {
      return res.json({ success: false, message: 'Không tìm thấy lớp học' });
    }
    res.json({ success: true, message: 'Đã chốt kết thúc lớp thành công' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy danh sách báo nghỉ từng buổi của học viên và gia sư
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
       WHERE bd.trangthai IN ('HVVangCoPhep', 'GSNghi')
       ORDER BY bd.ngayday DESC`
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

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
    const check = await pool(req).query('SELECT trangthai FROM taikhoan WHERE matk = $1', [id]);
    if (!check.rows.length) {
      return res.json({ success: false, message: 'Tài khoản không tồn tại' });
    }
    const currentStatus = check.rows[0].trangthai;
    const newStatus = currentStatus === 'Khoa' ? 'HoatDong' : 'Khoa';
    await pool(req).query('UPDATE taikhoan SET trangthai = $1 WHERE matk = $2', [newStatus, id]);
    res.json({ success: true, message: `Đã ${newStatus === 'Khoa' ? 'khóa' : 'mở khóa'} tài khoản thành công` });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Lấy chi tiết lớp học đầy đủ (kèm học viên, gia sư và tiến độ buổi học)
router.get('/lop/:id/detail', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Lấy thông tin lớp, học viên, gia sư
    const qInfo = `
      SELECT 
        l.malop, l.ngaybatdau, l.ngayketthucdukien, l.ngayketthucthucte, l.trangthai AS ClassTrangThai, l.noidung AS ClassNoiDung, l.diadiem AS ClassDiaDiem, l.hinhthuchoc AS ClassHinhThuc, l.hocphimoibuoi, l.tylehhgiasu, l.lydoketthucsom,
        mh.tenmh, yc.caplop,
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
    
    // 2. Thống kê số buổi dạy/nghỉ
    const qStats = `
      SELECT 
        COUNT(*) FILTER (WHERE trangthai = 'DaDay') as count_daday,
        COUNT(*) FILTER (WHERE trangthai = 'HVVangCoPhep') as count_hvvangcophep,
        COUNT(*) FILTER (WHERE trangthai = 'HVVangKhongPhep') as count_hvvangkhongphep,
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

module.exports = router;
