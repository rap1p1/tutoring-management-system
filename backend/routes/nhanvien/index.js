const express = require('express');
const router = express.Router();

// Shared helpers
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

// Helper: Tự động sinh danh sách buổi dạy
function generateSessions(ngaybatdau, soNgayHoc, lichHocTrongTuan) {
  const thuToJsDay = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 0 };
  
  const sessions = [];
  const startDate = new Date(ngaybatdau);
  let currentDate = new Date(startDate);
  let count = 0;
  
  const scheduleDays = lichHocTrongTuan.map(item => ({
    jsDay: thuToJsDay[item.thu],
    buoi: item.buoi
  }));
  
  const maxIterations = 365;
  let iteration = 0;
  
  while (count < soNgayHoc && iteration < maxIterations) {
    const dayOfWeek = currentDate.getDay();
    
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

// Apply isStaff middleware cho toàn bộ routes
router.use(isStaff);

// Mount sub-routers
router.use('/', require('./stats')(pool, auth));
router.use('/', require('./giasu.routes')(pool, auth, requireOps));
router.use('/', require('./lop.routes')(pool, auth, requireOps, generateSessions));
router.use('/', require('./taichinh.routes')(pool, auth, requireOps));
router.use('/', require('./hotro.routes')(pool, auth, requireOps));
router.use('/', require('./taikhoan.routes')(pool, auth));
router.use('/', require('./config.routes')(pool, auth));

module.exports = router;
