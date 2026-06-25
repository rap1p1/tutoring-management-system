import React from 'react';
import { Download, PlusCircle, Settings, Key, HelpCircle, FileText, CheckCircle, XCircle, Check, X, Search, Filter } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

export default function AllStudentsTab(props) {
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
                    <th>SĐT / Email</th>
                    <th>Địa chỉ</th>
                    <th>Các lớp đang học</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {allStudents.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center" }}>Không có học viên nào</td>
                    </tr>
                  ) : (
                    allStudents.map((hv) => {
                      let classesList = [];
                      try {
                        classesList = typeof hv.lophoc === 'string' ? JSON.parse(hv.lophoc) : hv.lophoc;
                      } catch(e) {}
                      if (!Array.isArray(classesList)) classesList = [];

                      return (
                      <tr key={hv.mahv}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {hv.anhdaidien ? (
                              <img src={hv.anhdaidien} alt="avatar" style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--color-primary)" }} />
                            ) : (
                              <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#94a3b8" }}>N/A</div>
                            )}
                            <div>
                              <strong>{hv.hoten}</strong>
                              <br />
                              <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                                {hv.gioitinh} - {new Date(hv.ngaysinh).toLocaleDateString("vi-VN")}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          {hv.sdt}
                          <br />
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>{hv.email}</span>
                        </td>
                        <td>{hv.diachi}</td>
                        <td>
                          {classesList.length === 0 ? (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa có lớp</span>
                          ) : (
                            <ul style={{ margin: 0, paddingLeft: '15px', fontSize: '13px' }}>
                              {classesList.map(c => (
                                <li key={c.malop}>
                                  Lớp {c.malop} ({c.tenmh}): 
                                  <span style={{ color: c.trangthai === 'DangDay' ? 'var(--color-success)' : 'var(--color-warning)', marginLeft: '5px' }}>
                                    {c.trangthai}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td>
                          <button className="btn btn-xs btn-secondary" onClick={() => alert("Chức năng xem chi tiết đang được phát triển.")}>
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
            </div>
    </>
  );
}
