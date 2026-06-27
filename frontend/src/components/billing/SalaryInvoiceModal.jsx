import React, { useState } from "react";
import Swal from "sweetalert2";

const SalaryInvoiceModal = ({ onClose, onSuccess, classes = [] }) => {
  const activeClasses = classes.filter(c => c.trangthai === 'DangDay' && c.mags);
  const [selectedClass, setSelectedClass] = useState('');
  const [mags, setMags] = useState('');
  const [hocphi, setHocphi] = useState('');
  const [tylehh, setTylehh] = useState('');
  const [sobuoi, setSobuoi] = useState('');
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchUnbilledStats = async (malop) => {
    setLoadingStats(true);
    setSobuoi('');
    try {
      const res = await fetch(`/api/nhanvien/lop/${malop}/unbilled-stats?type=commission`);
      const json = await res.json();
      if (json.success) {
        setSobuoi(json.data.unbilled_sessions);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingStats(false);
  };

  const handleClassChange = (e) => {
    const malop = e.target.value;
    setSelectedClass(malop);
    const cls = activeClasses.find(c => c.malop.toString() === malop);
    if (cls) {
      setMags(cls.mags ? 'GS' + cls.mags.toString().padStart(6, '0') : 'Lỗi: Thiếu mã gia sư');
      setHocphi(cls.hocphimoibuoi || '');
      setTylehh(cls.tylehhgiasu || '');
      fetchUnbilledStats(malop);
    } else {
      setMags('');
      setHocphi('');
      setTylehh('');
      setSobuoi('');
    }
  };

  const showMsg = (icon, title) => {
    Swal.fire({
      icon,
      title,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
    });
  };

  const handleCreateCommission = async (e) => {
    e.preventDefault();
    if (sobuoi === 0) {
      Swal.fire({ title: 'Lỗi', text: 'Không có buổi dạy nào chưa được thanh toán!', icon: 'error', background: '#1e293b', color: '#fff' });
      return;
    }
    try {
      const res = await fetch("/api/nhanvien/hoahong/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mags: mags.replace('GS', ''),
          malop: e.target.malop.value,
          kytt_tu: e.target.kytt_tu.value,
          kytt_den: e.target.kytt_den.value,
          sobuoida_day: parseInt(sobuoi),
          hocphihvmoibuoi: parseInt(hocphi),
          tylehh: parseFloat(tylehh)
        }),
      });
      const json = await res.json();
      if (json.success) {
        showMsg("success", "Tạo yêu cầu hoa hồng thành công!");
        onSuccess();
      } else {
        showMsg("error", json.message);
      }
    } catch (err) {
      showMsg("error", "Lỗi kết nối");
    }
  };

  return (
    <div className="modal" style={{ display: "flex" }}>
      <div className="modal-content glass-card" style={{ maxWidth: "500px" }}>
        <div className="modal-header">
          <h3>Tạo Yêu Cầu Chi Hoa Hồng</h3>
          <span className="close-btn" onClick={onClose}>&times;</span>
        </div>
        <form onSubmit={handleCreateCommission}>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "15px" }}>
            <div className="form-group">
              <label>Chọn lớp đang học *</label>
              <select name="malop" required value={selectedClass} onChange={handleClassChange}>
                <option value="" disabled>-- Chọn lớp học --</option>
                {activeClasses.map(c => (
                  <option key={c.malop} value={c.malop}>
                    Lớp #{c.malop} - {c.tenmh} (Gia sư: {c.tengiasu})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Mã Gia Sư *</label>
              <input type="text" name="mags" required value={mags} readOnly placeholder="Tự động điền" style={{backgroundColor: 'rgba(255,255,255,0.05)'}} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
            <div className="form-group">
              <label>Số buổi đã dạy (Tự động tính) *</label>
              <input 
                type="number" 
                name="sobuoi" 
                required 
                value={loadingStats ? '...' : sobuoi} 
                readOnly 
                style={{backgroundColor: 'rgba(255,255,255,0.05)', color: sobuoi === 0 ? '#ef4444' : '#10b981', fontWeight: 'bold'}} 
              />
            </div>
            <div className="form-group">
              <label>Tỷ lệ Hoa hồng GS (%) *</label>
              <input type="number" name="tylehh" required value={tylehh} readOnly style={{backgroundColor: 'rgba(255,255,255,0.05)'}} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div className="form-group">
              <label>Kỳ thanh toán từ ngày *</label>
              <input type="date" name="kytt_tu" required />
            </div>
            <div className="form-group">
              <label>Đến ngày *</label>
              <input type="date" name="kytt_den" required />
            </div>
          </div>
          {sobuoi === 0 && selectedClass && !loadingStats && (
            <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '15px' }}>
              ⚠️ Lớp này chưa có buổi học nào Đã Dạy hoặc tất cả đã được thanh toán hoa hồng.
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: "15px" }} disabled={loadingStats || sobuoi === 0}>
            Tạo Yêu Cầu Hoa Hồng
          </button>
        </form>
      </div>
    </div>
  );
};

export default SalaryInvoiceModal;
