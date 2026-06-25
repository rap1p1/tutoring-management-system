import React from 'react';
import { Download, PlusCircle, Settings, Key, HelpCircle, FileText, CheckCircle, XCircle, Check, X, Search, Filter } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

export default function RequestsTab(props) {
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
      <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Học viên</th>
                    <th>Môn học</th>
                    <th>Cấp lớp</th>
                    <th>Số buổi đã học / Lịch học</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center" }}>
                        Không có yêu cầu nào
                      </td>
                    </tr>
                  ) : (
                    requests.map((r) => (
                      <tr key={r.mayc}>
                        <td>
                          <strong>{r.tenhocvien}</strong>
                          <br />
                          {r.sdthocvien}
                        </td>
                        <td>{r.tenmh}</td>
                        <td>{r.caplop}</td>
                        <td>
                          <strong>Đã học: {r.songayhoc} buổi</strong>
                          <br />
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                            {formatLichHoc(r.lichhoctrongtuan)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${r.trangthai === "DaGhep" ? "status-active" : "status-pending"}`}
                          >
                            {r.trangthai === "ChoGhep" ? "Chờ ghép" : "Đã ghép"}
                          </span>
                        </td>
                        <td>
                          {r.trangthai === "ChoGhep" &&
                            currentUser &&
                            currentUser.vaitro !== "BGD" && (
                              <button
                                className="btn btn-xs btn-primary"
                                onClick={() => handleOpenClassModal(r)}
                              >
                                Tạo Lớp & Ghép GS
                              </button>
                            )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
    </>
  );
}
