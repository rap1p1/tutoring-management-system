import React from 'react';
import { Download, PlusCircle, Settings, Key, HelpCircle, FileText, CheckCircle, XCircle, Check, X, Search, Filter } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

export default function ClassesTab(props) {
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
      <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "15px",
                }}
              >
                <h3 style={{ margin: 0 }}>Quản Lý Danh Sách Lớp Học</h3>
                <button
                  className="btn btn-secondary"
                  onClick={exportClasses}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Download size={16} /> Xuất Excel Lớp Học
                </button>
              </div>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mã Lớp</th>
                      <th>Môn/Lớp</th>
                      <th>Học viên</th>
                      <th>Gia sư</th>
                      <th>Học phí/buổi</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center" }}>
                          Chưa có lớp nào
                        </td>
                      </tr>
                    ) : (
                      classes.map((c) => (
                        <tr key={c.malop}>
                          <td>{c.malop}</td>
                          <td>
                            {c.tenmh}
                            <br />
                            <span
                              style={{ fontSize: "12px", color: "#94a3b8" }}
                            >
                              {c.caplop}
                            </span>
                          </td>
                          <td>{c.tenhocvien}</td>
                          <td>{c.tengiasu || "Chưa phân công"}</td>
                          <td>
                            {c.hocphimoibuoi
                              ? parseInt(c.hocphimoibuoi).toLocaleString() + "đ"
                              : ""}
                          </td>
                          <td>
                            <span
                              className={`status-badge ${c.trangthai === "DangDay" ? "status-active" : c.trangthai === "KetThuc" ? "status-disabled" : "status-pending"}`}
                            >
                              {c.trangthai}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-xs btn-primary"
                              onClick={() => handleOpenClassDetail(c.malop)}
                              style={{ marginRight: "5px" }}
                            >
                              Chi tiết
                            </button>
                            {c.trangthai !== "KetThuc" &&
                              c.trangthai !== "Huy" &&
                              currentUser &&
                              currentUser.vaitro !== "BGD" && (
                                <button
                                  className="btn btn-xs btn-rose"
                                  onClick={() => handleEndClass(c.malop)}
                                >
                                  Kết thúc
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
    </>
  );
}
