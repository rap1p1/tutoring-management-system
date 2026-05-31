const express = require('express');
const router = express.Router();

function getPool(req) { return req.app.locals.pool; }

// Danh sách môn học (public)
router.get('/', async (req, res) => {
  try {
    const result = await getPool(req).query("SELECT * FROM MONHOC WHERE TrangThai='HoatDong' ORDER BY TenMH");
    res.json({ success: true, data: result.rows });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Thêm môn học (SA)
router.post('/', async (req, res) => {
  if (!req.session.user || !['SA','NVQL'].includes(req.session.user.vaitro))
    return res.json({ success: false, message: 'Không có quyền' });
  try {
    const { tenmh, caphoc, mota } = req.body;
    if (!tenmh) return res.json({ success: false, message: 'Thiếu tên môn học' });
    const r = await getPool(req).query(
      "INSERT INTO MONHOC(TenMH,CapHoc,MoTa) VALUES($1,$2,$3) RETURNING *",
      [tenmh, caphoc||null, mota||null]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

module.exports = router;
