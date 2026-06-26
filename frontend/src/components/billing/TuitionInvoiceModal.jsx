import React from "react";
import Swal from "sweetalert2";

const TuitionInvoiceModal = ({ onClose, onSuccess, classes = [] }) => {
  const activeClasses = classes.filter(c => c.trangthai === 'DangDay');
  const [selectedClass, setSelectedClass] = React.useState('');
  const [mahv, setMahv] = React.useState('');
  const [hocphi, setHocphi] = React.useState('');

  const handleClassChange = (e) => {
    const malop = e.target.value;
    setSelectedClass(malop);
    const cls = activeClasses.find(c => c.malop.toString() === malop);
    if (cls) {
      setMahv(cls.mahv ? 'HV' + cls.mahv.toString().padStart(6, '0') : 'Lỗi: Thiếu mã học viên');
      setHocphi(cls.hocphimoibuoi || '');
    } else {
      setMahv('');
      setHocphi('');
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

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/nhanvien/hocphi/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          malop: e.target.malop.value,
          mahv: e.target.mahv.value,
          kytt_tu: e.target.kytt_tu.value,
          kytt_den: e.target.kytt_den.value,
          sobuoi: parseInt(e.target.sobuoi.value),
          hocphimoibuoi: parseInt(e.target.hocphimoibuoi.value),
        }),
      });
      const json = await res.json();
      if (json.success) {
        showMsg("success", "Tạo hóa đơn học phí thành công!");
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
          <h3>Tạo Yêu Cầu Thu Học Phí</h3>
          <span className="close-btn" onClick={onClose}>&times;</span>
        </div>
        <form onSubmit={handleCreateInvoice}>
          <div className="form-group">
            <label>Chọn lớp đang học *</label>
            <select name="malop" required value={selectedClass} onChange={handleClassChange}>
              <option value="" disabled>-- Chọn lớp học --</option>
              {activeClasses.map(c => (
                <option key={c.malop} value={c.malop}>
                  Lớp #{c.malop} - {c.tenmh} (Học viên: {c.tenhocvien})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Mã Học Viên *</label>
            <input type="text" name="mahv" required value={mahv} readOnly placeholder="Tự động điền" style={{backgroundColor: 'rgba(255,255,255,0.05)'}} />
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div className="form-group">
              <label>Số buổi học *</label>
              <input type="number" name="sobuoi" required min="1" />
            </div>
            <div className="form-group">
              <label>Học phí mỗi buổi (VND) *</label>
              <input type="number" name="hocphimoibuoi" required min="0" step="1000" value={hocphi} onChange={(e) => setHocphi(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: "15px" }}>
            Tạo Hóa Đơn
          </button>
        </form>
      </div>
    </div>
  );
};

export default TuitionInvoiceModal;
