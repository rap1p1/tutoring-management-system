import React from 'react';
import { BookOpen, UserCheck, ClipboardList, DollarSign, LogOut, Check, X, PlusCircle, CreditCard, Download, Users, GraduationCap, MessageSquare, Shield, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from "xlsx";

export default function FinancesTab(props) {
  const { propsObj } = props;
  const {
    activeTab,
    setActiveTab,
    globalError,
    setGlobalError,
    globalSuccess,
    setGlobalSuccess,
    loading,
    setLoading,
    filterText,
    setFilterText,
    currentPage,
    setCurrentPage,
    profileModal,
    setProfileModal,
    loadingProfile,
    setLoadingProfile,
    stats,
    setStats,
    pendingTutors,
    setPendingTutors,
    requests,
    setRequests,
    classes,
    setClasses,
    tuitions,
    setTuitions,
    commissions,
    setCommissions,
    supportRequests,
    setSupportRequests,
    absences,
    setAbsences,
    revenueData,
    setRevenueData,
    accounts,
    setAccounts,
    profile,
    setProfile,
    currentUser,
    setCurrentUser,
    defaultTyleHH,
    setDefaultTyleHH,
    defaultHocPhis,
    setDefaultHocPhis,
    allTutors,
    setAllTutors,
    allStudents,
    setAllStudents,
    showClassDetailModal,
    setShowClassDetailModal,
    classDetail,
    setClassDetail,
    loadingDetail,
    setLoadingDetail,
    showClassModal,
    setShowClassModal,
    showCreateClassModal,
    setShowCreateClassModal,
    showCreateInvoiceModal,
    setShowCreateInvoiceModal,
    showCreateCommissionModal,
    setShowCreateCommissionModal,
    selectedRequest,
    setSelectedRequest,
    handleTabChange,
    fetchData,
    handleApproveTutor,
    handleOpenClassModal,
    formatLichHoc,
    handleCreateClass,
    handleConfirmTuition,
    handleConfirmCommission,
    handleResolveSupport,
    handleDuyetNghi,
    handleEndClass,
    handleToggleLock,
    handleToggle2FA,
    handleOpenClassDetail,
    handleChangeCommission,
    exportToExcel,
    exportClasses,
    exportData,
    exportFinances
  } = propsObj;

  return (
    <>
      {
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3>Khoản Thu Học Phí (Học Viên)</h3>
                  <div>
                    {currentUser && currentUser.vaitro !== 'BGD' && (
                      <button className="btn btn-primary" onClick={() => setShowCreateInvoiceModal(true)} style={{ marginRight: '10px' }}>+ Tạo Y/C Học Phí</button>
                    )}
                    <button className="btn btn-secondary" onClick={exportFinances} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <Download size={16} /> Xuất Excel
                    </button>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table">
                    <thead><tr><th>Học viên</th><th>Lớp / Môn</th><th>Số tiền</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                    <tbody>
                      {tuitions.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center' }}>Không có dữ liệu học phí</td></tr>
                      ) : tuitions.map(t => (
                        <tr key={t.mahp}>
                          <td><strong>{t.tenhocvien}</strong></td>
                          <td>Lớp {t.malop}<br/><span style={{fontSize:'12px',color:'#94a3b8'}}>{t.tenmh}</span></td>
                          <td>{parseInt(t.tonghocphi).toLocaleString()}đ</td>
                          <td>
                            <span className={`status-badge ${t.trangthai === 'DaNop' ? 'status-active' : (t.trangthai === 'ChoXacNhan' ? 'status-pending' : 'status-disabled')}`}>
                              {t.trangthai === 'DaNop' ? 'Đã nộp' : (t.trangthai === 'ChoXacNhan' ? 'Chờ xác nhận' : 'Chưa nộp')}
                            </span>
                          </td>
                          <td>{t.trangthai !== 'DaNop' && currentUser && currentUser.vaitro !== 'BGD' && (<button className="btn btn-xs btn-teal" onClick={() => handleConfirmTuition(t.mahp)}>Duyệt Nộp</button>)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3>Thanh Toán Hoa Hồng (Gia Sư)</h3>
                  <div>
                    {currentUser && currentUser.vaitro !== 'BGD' && (
                      <button className="btn btn-primary" onClick={() => setShowCreateCommissionModal(true)}>+ Tạo Y/C Hoa Hồng</button>
                    )}
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table">
                    <thead><tr><th>Gia sư</th><th>Lớp / Môn</th><th>Hoa hồng</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                    <tbody>
                      {commissions.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center' }}>Không có dữ liệu hoa hồng</td></tr>
                      ) : commissions.map(c => (
                        <tr key={c.mahh}>
                          <td><strong>{c.tengiasu}</strong></td>
                          <td>Lớp {c.malop}<br/><span style={{fontSize:'12px',color:'#94a3b8'}}>{c.tenmh}</span></td>
                          <td>{parseInt(c.tonghoahong).toLocaleString()}đ</td>
                          <td><span className={`status-badge ${c.trangthai === 'DaTT' ? 'status-active' : 'status-pending'}`}>{c.trangthai === 'DaTT' ? 'Đã TT' : 'Chưa TT'}</span></td>
                          <td>{c.trangthai !== 'DaTT' && currentUser && currentUser.vaitro !== 'BGD' && (<button className="btn btn-xs btn-primary" onClick={() => handleConfirmCommission(c.mahh)}>Duyệt TT</button>)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
      }
    </>
  );
}
