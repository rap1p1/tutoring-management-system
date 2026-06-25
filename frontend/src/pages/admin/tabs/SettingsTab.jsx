import React from 'react';
import { Download, PlusCircle, Settings, Key, HelpCircle, FileText, CheckCircle, XCircle, Check, X, Search, Filter } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

export default function SettingsTab(props) {
  const {
    activeTab, setActiveTab, pendingTutors, allTutors, allStudents, requests, classes, 
    tuitions, commissions, supportReqs, accounts, settings,
    currentUser, handleApproveTutor, handleOpenClassModal,
    handleOpenClassDetail, handleEndClass, exportClasses,
    setShowCreateInvoiceModal, setShowCreateCommissionModal,
    exportFinances, handleConfirmTuition, handleConfirmCommission,
    handleApproveSupport, handleApproveLeave, handleToggleLockAcc,
    handleSaveConfig, formatLichHoc, newConfig, setNewConfig,
    defaultTyleHH, setDefaultTyleHH, defaultHocPhis, setDefaultHocPhis, showMsg
  } = props;

  return (
    <>
      <div
              className="glass-card"
              style={{ padding: "20px", maxWidth: "500px" }}
            >
              <h3 style={{ marginBottom: "15px" }}>Cài Đặt Hệ Thống</h3>
              <div className="form-group">
                <label>Tỷ lệ hoa hồng mặc định (%)</label>
                <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
                  <input
                    type="number"
                    id="sys_default_tylehh"
                    defaultValue={defaultTyleHH}
                    key={defaultTyleHH}
                    min="0"
                    max="100"
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-teal"
                    onClick={async () => {
                      const val =
                        document.getElementById("sys_default_tylehh").value;
                      if (
                        !val ||
                        isNaN(parseFloat(val)) ||
                        parseFloat(val) < 0 ||
                        parseFloat(val) > 100
                      ) {
                        showMsg(
                          "error",
                          "Tỷ lệ hoa hồng không hợp lệ (phải từ 0 đến 100).",
                        );
                        return;
                      }
                      try {
                        const res = await fetch("/api/nhanvien/config/tylehh", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ tylehh: val }),
                        });
                        const json = await res.json();
                        if (json.success) {
                          showMsg("success", json.message);
                          setDefaultTyleHH(parseFloat(val));
                        } else {
                          showMsg("error", json.message);
                        }
                      } catch (e) {
                        showMsg("error", "Lỗi kết nối.");
                      }
                    }}
                  >
                    Lưu
                  </button>
                </div>
                <small
                  style={{
                    color: "#94a3b8",
                    display: "block",
                    marginTop: "10px",
                  }}
                >
                  Tỷ lệ này sẽ tự động áp dụng khi tạo các lớp học mới (nhân
                  viên quản lý không thể tự ý sửa đổi).
                </small>
              </div>

              <hr
                style={{
                  borderColor: "rgba(255,255,255,0.1)",
                  margin: "20px 0",
                }}
              />

              <h3 style={{ marginBottom: "15px" }}>
                Học Phí Mặc Định Theo Cấp Lớp (VND/buổi)
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                }}
                key={JSON.stringify(defaultHocPhis)}
              >
                <div className="form-group">
                  <label>Cấp 1</label>
                  <input
                    type="number"
                    id="fee_cap1"
                    defaultValue={defaultHocPhis.HocPhi_Cap1}
                    step="10000"
                  />
                </div>
                <div className="form-group">
                  <label>Cấp 2</label>
                  <input
                    type="number"
                    id="fee_cap2"
                    defaultValue={defaultHocPhis.HocPhi_Cap2}
                    step="10000"
                  />
                </div>
                <div className="form-group">
                  <label>Cấp 3</label>
                  <input
                    type="number"
                    id="fee_cap3"
                    defaultValue={defaultHocPhis.HocPhi_Cap3}
                    step="10000"
                  />
                </div>
                <div className="form-group">
                  <label>Luyện thi Đại học</label>
                  <input
                    type="number"
                    id="fee_luyenthidh"
                    defaultValue={defaultHocPhis.HocPhi_LuyenThiDH}
                    step="10000"
                  />
                </div>
                <div className="form-group">
                  <label>Tiếng Anh Giao tiếp</label>
                  <input
                    type="number"
                    id="fee_tienganhgt"
                    defaultValue={defaultHocPhis.HocPhi_TiengAnhGT}
                    step="10000"
                  />
                </div>
                <div className="form-group">
                  <label>Chứng chỉ Quốc tế</label>
                  <input
                    type="number"
                    id="fee_chungchiqt"
                    defaultValue={defaultHocPhis.HocPhi_ChungChiQT}
                    step="10000"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: "span 2" }}>
                  <label>Khác</label>
                  <input
                    type="number"
                    id="fee_khac"
                    defaultValue={defaultHocPhis.HocPhi_Khac}
                    step="10000"
                  />
                </div>
              </div>

              <button
                className="btn btn-teal btn-block"
                style={{ marginTop: "15px" }}
                onClick={async () => {
                  const cap1 = document.getElementById("fee_cap1").value;
                  const cap2 = document.getElementById("fee_cap2").value;
                  const cap3 = document.getElementById("fee_cap3").value;
                  const luyenthidh =
                    document.getElementById("fee_luyenthidh").value;
                  const tienganhgt =
                    document.getElementById("fee_tienganhgt").value;
                  const chungchiqt =
                    document.getElementById("fee_chungchiqt").value;
                  const khac = document.getElementById("fee_khac").value;

                  try {
                    const res = await fetch("/api/nhanvien/config/hocphi", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        cap1,
                        cap2,
                        cap3,
                        luyenthidh,
                        tienganhgt,
                        chungchiqt,
                        khac,
                      }),
                    });
                    const json = await res.json();
                    if (json.success) {
                      showMsg("success", json.message);
                      setDefaultHocPhis({
                        HocPhi_Cap1: parseInt(cap1),
                        HocPhi_Cap2: parseInt(cap2),
                        HocPhi_Cap3: parseInt(cap3),
                        HocPhi_LuyenThiDH: parseInt(luyenthidh),
                        HocPhi_TiengAnhGT: parseInt(tienganhgt),
                        HocPhi_ChungChiQT: parseInt(chungchiqt),
                        HocPhi_Khac: parseInt(khac),
                      });
                    } else {
                      showMsg("error", json.message);
                    }
                  } catch (e) {
                    showMsg("error", "Lỗi kết nối.");
                  }
                }}
              >
                Lưu học phí mặc định
              </button>
            </div>
    </>
  );
}
