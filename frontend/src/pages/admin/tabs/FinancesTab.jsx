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
    exportFinances,
    itemsPerPage,
    renderSearchBox,
    renderPagination
  } = propsObj;

  const filteredTuitions = tuitions.filter(t => {
    return !filterText ||
      (t.tenhocvien && t.tenhocvien.toLowerCase().includes(filterText.toLowerCase())) ||
      (t.tenmh && t.tenmh.toLowerCase().includes(filterText.toLowerCase()));
  });
  const paginatedTuitions = filteredTuitions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filteredCommissions = commissions.filter(c => {
    return !filterText ||
      (c.tengiasu && c.tengiasu.toLowerCase().includes(filterText.toLowerCase())) ||
      (c.tenmh && c.tenmh.toLowerCase().includes(filterText.toLowerCase()));
  });
  const paginatedCommissions = filteredCommissions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      {
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3>Khoản Thu Học Phí (Học Viên)</h3>
              <div>
                {currentUser && (
                  <button className="btn btn-primary" onClick={() => setShowCreateInvoiceModal(true)} style={{ marginRight: '10px' }}>+ Tạo Y/C Học Phí</button>
                )}
                <button className="btn btn-secondary" onClick={exportFinances} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={16} /> Xuất Excel
                </button>
              </div>
            </div>
            {renderSearchBox && renderSearchBox('Tìm theo học viên, môn học...')}
            <div className="table-responsive">
              <table className="table">
                <thead><tr><th>Học viên</th><th>Lớp / Môn</th><th>Số tiền</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                <tbody>
                  {paginatedTuitions.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center' }}>Không có dữ liệu học phí</td></tr>
                  ) : paginatedTuitions.map(t => (
                    <tr key={t.mahp}>
                      <td><strong>{t.tenhocvien}</strong></td>
                      <td>Lớp {t.malop}<br /><span style={{ fontSize: '12px', color: '#94a3b8' }}>{t.tenmh}</span></td>
                      <td>{parseInt(t.tonghocphi).toLocaleString()}đ</td>
                      <td>
                        <span className={`status-badge ${t.trangthai === 'DaNop' ? 'status-active' : (t.trangthai === 'ChoXacNhan' ? 'status-pending' : 'status-disabled')}`}>
                          {t.trangthai === 'DaNop' ? 'Đã nộp' : (t.trangthai === 'ChoXacNhan' ? 'Chờ xác nhận' : 'Chưa nộp')}
                        </span>
                      </td>
                      <td>{t.trangthai !== 'DaNop' && currentUser && (<button className="btn btn-xs btn-teal" onClick={() => handleConfirmTuition(t.mahp)}>Duyệt Nộp</button>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderPagination && renderPagination(filteredTuitions.length)}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3>Thanh Toán Hoa Hồng (Gia Sư)</h3>
              <div>
                {currentUser && (
                  <button className="btn btn-primary" onClick={() => setShowCreateCommissionModal(true)}>+ Tạo Y/C Hoa Hồng</button>
                )}
              </div>
            </div>
            {renderSearchBox && renderSearchBox('Tìm theo gia sư, môn học...')}
            <div className="table-responsive">
              <table className="table">
                <thead><tr><th>Gia sư</th><th>Lớp / Môn</th><th>Hoa hồng</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                <tbody>
                  {paginatedCommissions.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center' }}>Không có dữ liệu hoa hồng</td></tr>
                  ) : paginatedCommissions.map(c => (
                    <tr key={c.mahh}>
                      <td><strong>{c.tengiasu}</strong></td>
                      <td>Lớp {c.malop}<br /><span style={{ fontSize: '12px', color: '#94a3b8' }}>{c.tenmh}</span></td>
                      <td>{parseInt(c.tonghoahong).toLocaleString()}đ</td>
                      <td><span className={`status-badge ${c.trangthai === 'DaTT' ? 'status-active' : 'status-pending'}`}>{c.trangthai === 'DaTT' ? 'Đã TT' : 'Chưa TT'}</span></td>
                      <td>{c.trangthai !== 'DaTT' && currentUser && (<button className="btn btn-xs btn-primary" onClick={() => handleConfirmCommission(c.mahh)}>Duyệt TT</button>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderPagination && renderPagination(filteredCommissions.length)}
            </div>
          </div>
        </div>
      }
    </>
  );
}
