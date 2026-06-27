const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/mailer');

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
  if (!['SA', 'NVQL', 'BGD'].includes(auth(req).vaitro)) {
    return res.json({ success: false, message: 'Vai trò của bạn không có quyền thực hiện thao tác nghiệp vụ này' });
  }
  next();
}

router.use(isStaff);

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

// Lấy danh sách log truy cập
router.get('/logs', async (req, res) => {
  if (auth(req).vaitro !== 'BGD' && auth(req).vaitro !== 'SA') {
    return res.json({ success: false, message: 'Chỉ Giám Đốc mới có quyền xem log truy cập' });
  }
  try {
    let { page = 1, limit = 20, keyword, fromDate, toDate } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    let whereClauses = [];
    let values = [];
    let paramIdx = 1;

    if (keyword) {
      whereClauses.push(`(
        t.TenDangNhap ILIKE $${paramIdx} OR 
        n.HoTen ILIKE $${paramIdx} OR 
        gs.HoTen ILIKE $${paramIdx} OR 
        hv.HoTen ILIKE $${paramIdx} OR 
        l.HanhDong ILIKE $${paramIdx} OR
        l.MaTK::text = $${paramIdx}
      )`);
      values.push(`%${keyword}%`);
      paramIdx++;
    }
    if (fromDate) {
      whereClauses.push(`l.ThoiGian >= $${paramIdx++}`);
      values.push(fromDate);
    }
    if (toDate) {
      whereClauses.push(`l.ThoiGian <= $${paramIdx++}::timestamp + interval '1 day'`);
      values.push(toDate);
    }

    const whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const fromStr = `
      FROM LOG_TRUY_CAP l
      JOIN TAIKHOAN t ON l.MaTK = t.MaTK
      LEFT JOIN NHANVIEN n ON t.MaTK = n.MaTK
      LEFT JOIN GIASU gs ON t.MaTK = gs.MaTK
      LEFT JOIN HOCVIEN hv ON t.MaTK = hv.MaTK
    `;

    const countRes = await pool(req).query(`SELECT COUNT(*) ${fromStr} ${whereStr}`, values);
    const total = parseInt(countRes.rows[0].count);

    values.push(limit, offset);
    const queryStr = `
      SELECT l.*, 
             t.TenDangNhap, 
             COALESCE(n.HoTen, gs.HoTen, hv.HoTen) as NguoiThucHien
      ${fromStr}
      ${whereStr}
      ORDER BY l.ThoiGian DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx}
    `;
    const r = await pool(req).query(queryStr, values);
    
    res.json({
      success: true,
      data: r.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
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

    // Gửi email thông báo duyệt (dùng Gmail SMTP thật)
    if (status === 'DaDuyet' && gsR.rows.length > 0 && gsR.rows[0].email) {
      const gsEmail = gsR.rows[0].email;
      const gsName = gsR.rows[0].hoten;
      
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
      }).catch(err => {
        console.error('❌ Gửi email duyệt thất bại:', err);
      });
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
             COALESCE(
               (SELECT json_agg(gm.mamh) 
                FROM giasu_monhoc gm 
                WHERE gm.mags = gs.mags),
               '[]'::json
             ) as registered_subjects
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
    const r = await pool(req).query(`SELECT * FROM hocvien ORDER BY hoten`);
    res.json({ success: true, data: r.rows });
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

// Lấy toàn bộ yêu cầu học kèm

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

// ============================================================
// HÀM HELPER: Tự động sinh danh sách buổi dạy
// ============================================================
function generateSessions(ngaybatdau, soNgayHoc, lichHocTrongTuan) {
  // lichHocTrongTuan = [{"thu":2,"buoi":"Sang"}, {"thu":4,"buoi":"Chieu"}]
  // Mapping: thu 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat, 8=Sun
  // JS getDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const thuToJsDay = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 0 };
  
  const sessions = [];
  const startDate = new Date(ngaybatdau);
  let currentDate = new Date(startDate);
  let count = 0;
  
  // Tạo set các ngày trong tuần cần học
  const scheduleDays = lichHocTrongTuan.map(item => ({
    jsDay: thuToJsDay[item.thu],
    buoi: item.buoi
  }));
  
  // Lặp tối đa 365 ngày để tránh vòng lặp vô hạn
  const maxIterations = 365;
  let iteration = 0;
  
  while (count < soNgayHoc && iteration < maxIterations) {
    const dayOfWeek = currentDate.getDay();
    
    // Kiểm tra xem ngày hiện tại có trong lịch học không
    for (const sched of scheduleDays) {
      if (dayOfWeek === sched.jsDay && count < soNgayHoc) {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
        sessions.push({
          ngayday: dateStr,
          cahoc: sched.buoi
        });
        count++;
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
    iteration++;
  }
  
  return sessions;
}

// Tạo lớp mới từ yêu cầu học kèm và phân công gia sư (TỰ ĐỘNG SINH BUỔI DẠY)
router.post('/lop/create', requireOps, async (req, res) => {
  const client = await pool(req).connect();
  try {
    const { mayc, mags, ngaybatdau, ngaykethucdukien, hocphimoibuoi, tylehh, noidung, diadiem, hinhthuchoc } = req.body;
    const parsedMaGS = parseInt(mags);
    if (!mayc || isNaN(parsedMaGS)) {
      return res.json({ success: false, message: 'Thiếu thông tin bắt buộc hoặc mã gia sư không hợp lệ để tạo lớp' });
    }

    // Lấy thông tin yêu cầu học kèm (để lấy số ngày + lịch học + cấp lớp)
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

    // Lấy học phí mặc định từ DB
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
    
    // Lấy tỷ lệ hoa hồng mặc định từ THAMSO
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

    // Lấy mã nhân viên tạo lớp
    const nvR = await client.query('SELECT manv FROM nhanvien WHERE matk = $1', [auth(req).matk]);
    const manv = nvR.rows.length ? nvR.rows[0].manv : null;
    
    // Kiểm tra gia sư có tồn tại và hồ sơ đã duyệt không
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

    // TỰ ĐỘNG SINH BUỔI DẠY (Để kiểm tra trùng lịch trước khi tạo lớp)
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
        // format date to YYYY-MM-DD regardless of timezone issues
        const d = new Date(s.ngayday);
        const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        return `${dateStr}_${s.cahoc}`;
      })
    );
    
    for (const session of sessions) {
      if (existingMap.has(`${session.ngayday}_${session.cahoc}`)) {
        return res.json({ 
          success: false, 
          message: `Gia sư đã bị trùng lịch vào ngày ${session.ngayday.split('-').reverse().join('/')} (Ca ${session.cahoc === 'Sang' ? 'Sáng' : session.cahoc === 'Chieu' ? 'Chiều' : 'Tối'}). Vui lòng chọn gia sư khác!` 
        });
      }
    }

    await client.query('BEGIN');
    
    // Tạo lớp học (luôn ở trạng thái DaPhanCong chờ gia sư xác nhận trong 24h)
    const lopR = await client.query(
      `INSERT INTO lop (mayc, mags, manv_phancong, ngaybatdau, ngayketthucdukien, trangthai, hanxacnhan, noidung, diadiem, hinhthuchoc, hocphimoibuoi, tylehhgiasu)
       VALUES ($1, $2, $3, $4, $5, 'DaPhanCong', NOW() + INTERVAL '24 hours', $6, $7, $8, $9, $10) RETURNING *`,
      [
        mayc, 
        parsedMaGS, 
        manv, 
        start, 
        ngaykethucdukien || null, 
        noidung || null, 
        diadiem || null, 
        hinhthuchoc || null, 
        finalHocPhi, 
        finalTyLe
      ]
    );
    
    const malop = lopR.rows[0].malop;
    
    // TỰ ĐỘNG SINH BUỔI DẠY (Đã sinh ở trên)
    
    for (const session of sessions) {
      await client.query(
        `INSERT INTO buoiday (malop, ngayday, cahoc, trangthai)
         VALUES ($1, $2, $3, 'ChoXacNhan')
         ON CONFLICT (malop, ngayday, cahoc) DO NOTHING`,
        [malop, session.ngayday, session.cahoc]
      );
    }
    
    // Cập nhật trạng thái yêu cầu học kèm thành DaGhep
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

    // Lấy thông tin lớp
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

    // Đếm số buổi theo trạng thái
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

    // Cập nhật trạng thái yêu cầu
    await client.query(
      `UPDATE yeucaudoigiasu 
       SET trangthai = 'DaXuLy', ngayxuly = NOW(), manv_xuly = $1
       WHERE maycdg = $2`,
      [manv, id]
    );

    // Cập nhật trạng thái lớp thành KetThuc
    await client.query(
      `UPDATE lop 
       SET trangthai = 'KetThuc', ngayketthucthucte = NOW(), lydoketthucsom = $1
       WHERE malop = $2`,
      [lydoKetThuc, classId]
    );

    // Hủy tất cả buổi chưa hoàn thành
    await client.query(
      "UPDATE buoiday SET trangthai = 'Huy' WHERE malop = $1 AND trangthai IN ('ChoXacNhan', 'HVXinNghi', 'GSXinNghi')",
      [classId]
    );

    // Tự động tạo hóa đơn học phí nếu có buổi đã dạy
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
      
      // Tự động tạo hoa hồng cho gia sư
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

// ============================================================
// KẾT THÚC LỚP SỚM + TỰ ĐỘNG TẠO HÓA ĐƠN & HOA HỒNG
// ============================================================
router.post('/lop/:id/ketthuc', requireOps, async (req, res) => {
  const client = await pool(req).connect();
  try {
    const { id } = req.params;
    const { lydo } = req.body;
    
    // Lấy thông tin lớp
    const lopR = await client.query(
      `SELECT l.*, yc.mahv, yc.songayhoc
       FROM lop l
       JOIN yeucauhockem yc ON yc.mayc = l.mayc
       WHERE l.malop = $1`,
      [id]
    );
    if (!lopR.rows.length) return res.json({ success: false, message: 'Không tìm thấy lớp học' });
    
    const lop = lopR.rows[0];
    
    // Đếm số buổi theo trạng thái
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
    const soBuoiTinhPhi = soBuoiDaDay; // Chỉ tính buổi đã dạy
    
    await client.query('BEGIN');
    
    // Cập nhật trạng thái lớp
    await client.query(
      `UPDATE lop 
       SET trangthai = 'KetThuc', ngayketthucthucte = NOW(), lydoketthucsom = $1
       WHERE malop = $2`,
      [lydo || 'Kết thúc sớm theo yêu cầu', id]
    );
    
    // Hủy tất cả buổi chưa hoàn thành còn lại
    await client.query(
      "UPDATE buoiday SET trangthai = 'Huy' WHERE malop = $1 AND trangthai IN ('ChoXacNhan', 'HVXinNghi', 'GSXinNghi')",
      [id]
    );
    
    // Tự động tạo hóa đơn học phí nếu có buổi đã dạy
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
      
      // Tự động tạo hoa hồng cho gia sư
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

// ============================================================
// THAY ĐỔI TỶ LỆ HOA HỒNG - CHỈ GIÁM ĐỐC (BGD)
// ============================================================
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
       WHERE bd.trangthai IN ('HVVangCoPhep', 'GSNghi', 'HVXinNghi', 'GSXinNghi')
       ORDER BY bd.ngayday DESC`
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Phê duyệt hoặc từ chối yêu cầu nghỉ học/dạy của một buổi học
router.post('/baonghi/:mabuoi/xuly', requireOps, async (req, res) => {
  try {
    const { mabuoi } = req.params;
    const { action } = req.body; // 'approve' hoặc 'reject'
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

// Lấy tỷ lệ hoa hồng mặc định của hệ thống
router.get('/config/tylehh', async (req, res) => {
  try {
    const r = await pool(req).query("SELECT giatri FROM thamso WHERE mats = 'TyLeHHMacDinh'");
    const val = r.rows.length ? parseFloat(r.rows[0].giatri) : 70.00;
    res.json({ success: true, tylehh: val });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Cập nhật tỷ lệ hoa hồng mặc định - Chỉ Giám đốc (BGD)
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

// Lấy học phí mặc định của các cấp
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

// Cập nhật học phí mặc định - Chỉ Giám đốc (BGD)
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

// Đếm số buổi Đã Dạy chưa thanh toán
router.get('/lop/:id/unbilled-stats', async (req, res) => {
  try {
    const { id } = req.params;
    const type = req.query.type || 'tuition'; // 'tuition' or 'commission'
    const table = type === 'commission' ? 'hoahong' : 'hochphi';

    // Lấy ngày chốt cuối cùng của hóa đơn trước đó
    const lastBilledQuery = await pool(req).query(`SELECT MAX(kytt_den) as last_date FROM ${table} WHERE malop = $1 AND trangthai != 'Huy'`, [id]);
    const lastDate = lastBilledQuery.rows[0].last_date;

    // Đếm số buổi DaDay sau ngày chốt cuối cùng
    let countQuery;
    let countParams = [id];
    if (lastDate) {
      countQuery = `SELECT COUNT(*) as count FROM buoiday WHERE malop = $1 AND trangthai = 'DaDay' AND ngayday > $2`;
      countParams.push(lastDate);
    } else {
      countQuery = `SELECT COUNT(*) as count FROM buoiday WHERE malop = $1 AND trangthai = 'DaDay'`;
    }
    const countResult = await pool(req).query(countQuery, countParams);
    
    res.json({
      success: true,
      data: {
        last_billed_date: lastDate,
        unbilled_sessions: parseInt(countResult.rows[0].count) || 0
      }
    });
  } catch (e) {
    res.json({ success: false, message: e.message });
  }
});

// Lấy chi tiết lớp học đầy đủ (kèm học viên, gia sư và tiến độ buổi học)
router.get('/lop/:id/detail', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Lấy thông tin lớp, học viên, gia sư
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
    
    // 2. Thống kê số buổi dạy/nghỉ
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

module.exports = router;
