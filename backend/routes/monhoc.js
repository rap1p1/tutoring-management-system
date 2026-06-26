const express = require('express');
const router = express.Router();

function getPool(req) { return req.app.locals.pool; }

// Danh sách môn học (public)
router.get('/', async (req, res) => {
  try {
    const result = await getPool(req).query("SELECT * FROM monhoc WHERE trangthai='HoatDong' ORDER BY tenmh");
    res.json({ success: true, data: result.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Thêm môn học (SA)
router.post('/', async (req, res) => {
  if (!req.session.user || !['SA','BGD'].includes(req.session.user.vaitro))
    return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { tenmh, caphoc, mota } = req.body;
    if (!tenmh) return res.json({ success: false, message: 'Thiếu tên môn học' });
    const r = await getPool(req).query(
      "INSERT INTO monhoc(tenmh,caphoc,mota) VALUES($1,$2,$3) RETURNING *",
      [tenmh, caphoc||null, mota||null]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Admin: Lấy tất cả môn học (cả ẩn)
router.get('/all', async (req, res) => {
  if (!req.session.user || !['SA','BGD'].includes(req.session.user.vaitro))
    return res.json({ success: false, message: 'Không có quyền' });
  try {
    const result = await getPool(req).query("SELECT * FROM monhoc ORDER BY mamh DESC");
    res.json({ success: true, data: result.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Admin: Sửa môn học
router.put('/:mamh', async (req, res) => {
  if (!req.session.user || !['SA','BGD'].includes(req.session.user.vaitro))
    return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { tenmh, caphoc, mota } = req.body;
    if (!tenmh) return res.json({ success: false, message: 'Thiếu tên môn học' });
    const r = await getPool(req).query(
      "UPDATE monhoc SET tenmh=$1, caphoc=$2, mota=$3 WHERE mamh=$4 RETURNING *",
      [tenmh, caphoc||null, mota||null, req.params.mamh]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Admin: Xoá mềm / Khôi phục môn học (Toggle)
router.delete('/:mamh', async (req, res) => {
  if (!req.session.user || !['SA','BGD'].includes(req.session.user.vaitro))
    return res.json({ success: false, message: 'Không có quyền' });
  try {
    const curr = await getPool(req).query("SELECT trangthai FROM monhoc WHERE mamh=$1", [req.params.mamh]);
    if (curr.rows.length === 0) return res.json({ success: false, message: 'Không tìm thấy' });
    
    const newStatus = curr.rows[0].trangthai === 'HoatDong' ? 'NgungHoatDong' : 'HoatDong';
    const r = await getPool(req).query(
      "UPDATE monhoc SET trangthai=$1 WHERE mamh=$2 RETURNING *",
      [newStatus, req.params.mamh]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

module.exports = router;
