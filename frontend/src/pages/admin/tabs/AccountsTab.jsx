import React from 'react';
import { Download, PlusCircle, Settings, Key, HelpCircle, FileText, CheckCircle, XCircle, Check, X, Search, Filter } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

export default function AccountsTab(props) {
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
                    <th>Họ Tên</th>
                    <th>Tên Đăng Nhập</th>
                    <th>Email</th>
                    <th>Vai Trò</th>
                    <th>Trạng Thái</th>
                    <th>Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center" }}>
                        Không có tài khoản nào
                      </td>
                    </tr>
                  ) : (
                    accounts.map((acc) => (
                      <tr key={acc.matk}>
                        <td>
                          <strong>{acc.hoten || "Chưa cập nhật"}</strong>
                        </td>
                        <td>{acc.tendangnhap}</td>
                        <td>{acc.email || "Không có"}</td>
                        <td>
                          <span
                            className="status-badge"
                            style={{
                              backgroundColor: "rgba(255,255,255,0.05)",
                              color: "#fff",
                            }}
                          >
                            {acc.vaitro === "HV"
                              ? "Học viên"
                              : acc.vaitro === "GS"
                                ? "Gia sư"
                                : acc.vaitro === "NVQL"
                                  ? "Nhân viên QL"
                                  : acc.vaitro === "BGD"
                                    ? "Giám đốc"
                                    : acc.vaitro === "SA"
                                      ? "System Admin"
                                      : acc.vaitro}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${acc.trangthai === "HoatDong" ? "status-active" : "status-disabled"}`}
                          >
                            {acc.trangthai === "HoatDong"
                              ? "Hoạt động"
                              : "Đã khóa"}
                          </span>
                        </td>
                        <td>
                          {acc.matk === currentUser?.matk ? (
                            <span
                              style={{
                                fontSize: "12px",
                                color: "#94a3b8",
                                fontStyle: "italic",
                              }}
                            >
                              Bản thân
                            </span>
                          ) : acc.vaitro === "BGD" &&
                            currentUser?.vaitro !== "BGD" ? (
                            <span
                              style={{
                                fontSize: "12px",
                                color: "#94a3b8",
                                fontStyle: "italic",
                              }}
                            >
                              Không được phép
                            </span>
                          ) : (
                            <button
                              className={`btn btn-xs ${acc.trangthai === "Khoa" ? "btn-teal" : "btn-rose"}`}
                              onClick={() =>
                                handleToggleLock(acc.matk, acc.trangthai)
                              }
                            >
                              {acc.trangthai === "Khoa" ? "Mở khóa" : "Khóa"}
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
