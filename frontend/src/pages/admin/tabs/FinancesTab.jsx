import React from 'react';
import { Download, PlusCircle, Settings, Key, HelpCircle, FileText, CheckCircle, XCircle, Check, X, Search, Filter } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

export default function FinancesTab(props) {
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
              className="dashboard-grid"
              style={{ gridTemplateColumns: "1fr", gap: "20px" }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "15px",
                  }}
                >
                  <h3 style={{ margin: 0 }}>Khoản Thu Học Phí (Học Viên)</h3>
                  <div style={{ display: "flex", gap: "10px" }}>
                    {currentUser && currentUser.vaitro !== "BGD" && (
                      <button
                        className="btn btn-primary"
                        onClick={() => setShowCreateInvoiceModal(true)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <PlusCircle size={16} /> Tạo Y/C Học Phí
                      </button>
                    )}
                    <button
                      className="btn btn-secondary"
                      onClick={exportFinances}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Download size={16} /> Xuất Excel Doanh Thu
                    </button>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Học viên</th>
                        <th>Lớp / Môn</th>
                        <th>Số tiền</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tuitions.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: "center" }}>
                            Không có dữ liệu học phí
                          </td>
                        </tr>
                      ) : (
                        tuitions.map((t) => (
                          <tr key={t.mahp}>
                            <td>
                              <strong>{t.tenhocvien}</strong>
                            </td>
                            <td>
                              Lớp {t.malop}
                              <br />
                              <span
                                style={{ fontSize: "12px", color: "#94a3b8" }}
                              >
                                {t.tenmh}
                              </span>
                            </td>
                            <td>{parseInt(t.tonghocphi).toLocaleString()}đ</td>
                            <td>
                              <span
                                className={`status-badge ${t.trangthai === "DaNop" ? "status-active" : t.trangthai === "ChoXacNhan" ? "status-pending" : "status-disabled"}`}
                              >
                                {t.trangthai === "DaNop"
                                  ? "Đã nộp"
                                  : t.trangthai === "ChoXacNhan"
                                    ? "Chờ xác nhận"
                                    : "Chưa nộp"}
                              </span>
                            </td>
                            <td>
                              {t.trangthai !== "DaNop" &&
                                currentUser &&
                                currentUser.vaitro !== "BGD" && (
                                  <button
                                    className="btn btn-xs btn-teal"
                                    onClick={() => handleConfirmTuition(t.mahp)}
                                  >
                                    Duyệt Nộp
                                  </button>
                                )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "15px",
                  }}
                >
                  <h3 style={{ margin: 0 }}>Thanh Toán Hoa Hồng (Gia Sư)</h3>
                  {currentUser && currentUser.vaitro !== "BGD" && (
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowCreateCommissionModal(true)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <PlusCircle size={16} /> Tạo Y/C Hoa Hồng
                    </button>
                  )}
                </div>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Gia sư</th>
                        <th>Lớp / Môn</th>
                        <th>Hoa hồng</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: "center" }}>
                            Không có dữ liệu hoa hồng
                          </td>
                        </tr>
                      ) : (
                        commissions.map((c) => (
                          <tr key={c.mahh}>
                            <td>
                              <strong>{c.tengiasu}</strong>
                            </td>
                            <td>
                              Lớp {c.malop}
                              <br />
                              <span
                                style={{ fontSize: "12px", color: "#94a3b8" }}
                              >
                                {c.tenmh}
                              </span>
                            </td>
                            <td>{parseInt(c.tonghoahong).toLocaleString()}đ</td>
                            <td>
                              <span
                                className={`status-badge ${c.trangthai === "DaTT" ? "status-active" : "status-pending"}`}
                              >
                                {c.trangthai === "DaTT" ? "Đã TT" : "Chưa TT"}
                              </span>
                            </td>
                            <td>
                              {c.trangthai !== "DaTT" &&
                                currentUser &&
                                currentUser.vaitro !== "BGD" && (
                                  <button
                                    className="btn btn-xs btn-primary"
                                    onClick={() =>
                                      handleConfirmCommission(c.mahh)
                                    }
                                  >
                                    Duyệt TT
                                  </button>
                                )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
    </>
  );
}
