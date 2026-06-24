import React from "react";
import Swal from "sweetalert2";

const SalaryInvoiceModal = ({ onClose, onSuccess }) => {
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
    try {
      const res = await fetch("/api/nhanvien/hoahong/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mags: e.target.mags.value,
          malop: e.target.malop.value,
          kytt_tu: e.target.kytt_tu.value,
          kytt_den: e.target.kytt_den.value,
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div className="form-group">
              <label>Mã Gia Sư *</label>
              <input type="text" name="mags" required placeholder="VD: GS000001" />
            </div>
            <div className="form-group">
              <label>Mã Lớp *</label>
              <input type="text" name="malop" required placeholder="VD: L000001" />
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
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: "15px" }}>
            Tạo Yêu Cầu Hoa Hồng
          </button>
        </form>
      </div>
    </div>
  );
};

export default SalaryInvoiceModal;
