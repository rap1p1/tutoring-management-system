import React from 'react';
import { BookOpen, UserCheck, ClipboardList, DollarSign, LogOut, Check, X, PlusCircle, CreditCard, Download, Users, GraduationCap, MessageSquare, Shield, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from "xlsx";

export default function SupportTab(props) {
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

  const [reqPage, setReqPage] = React.useState(1);
  const [absPage, setAbsPage] = React.useState(1);
  const limit = propsObj.itemsPerPage || 10;
  const filterTextStr = propsObj.filterText || '';

  const renderPaginationLocal = (currentPage, setCurrentPage, totalItems) => {
    const totalPages = Math.ceil(totalItems / limit) || 1;
    if (totalPages <= 1) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
        <button className="btn btn-sm btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>&larr; Trước</button>
        <span style={{ fontSize: '14px', color: '#94a3b8' }}>Trang {currentPage} / {totalPages}</span>
        <button className="btn btn-sm btn-secondary" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Sau &rarr;</button>
      </div>
    );
  };

  const filteredReqs = (supportRequests || []).filter(s =>
    (s.tenhocvien || '').toLowerCase().includes(filterTextStr.toLowerCase()) ||
    (s.tengiasu || '').toLowerCase().includes(filterTextStr.toLowerCase()) ||
    (s.tenmh || '').toLowerCase().includes(filterTextStr.toLowerCase())
  );
  const paginatedReqs = filteredReqs.slice((reqPage - 1) * limit, reqPage * limit);

  const filteredAbs = (absences || []).filter(a =>
    (a.tenhocvien || '').toLowerCase().includes(filterTextStr.toLowerCase()) ||
    (a.tengiasu || '').toLowerCase().includes(filterTextStr.toLowerCase()) ||
    (a.tenmh || '').toLowerCase().includes(filterTextStr.toLowerCase())
  );
  const paginatedAbs = filteredAbs.slice((absPage - 1) * limit, absPage * limit);

  return (
    <>
      {
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
              <div>
                <h3 style={{ marginBottom: '15px' }}>Yêu Cầu Đổi/Nghỉ Lớp</h3>
                <div className="table-responsive">
                  <table className="table">
                    <thead><tr><th>Ngày yêu cầu</th><th>Lớp / Môn</th><th>Người gửi</th><th>Lý do</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                    <tbody>
                      {paginatedReqs.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center' }}>Không có yêu cầu nào</td></tr>
                      ) : paginatedReqs.map(s => (
                        <tr key={s.maycdg}>
                          <td>{new Date(s.ngayyeucau).toLocaleString('vi-VN')}</td>
                          <td>Lớp {s.malop}<br/><span style={{fontSize:'12px',color:'#94a3b8'}}>{s.tenmh}</span></td>
                          <td><strong>HV:</strong> {s.tenhocvien}<br/><strong>GS:</strong> {s.tengiasu || 'Chưa có'}</td>
                          <td style={{ maxWidth: '250px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{s.lydo && s.lydo.includes('[BẤT KHẢ KHÁNG]') ? (<span style={{ color: '#ef4444', fontWeight: 'bold' }}>{s.lydo}</span>) : (s.lydo)}</td>
                          <td><span className={`status-badge ${s.trangthai === 'DaXuLy' ? 'status-active' : 'status-pending'}`}>{s.trangthai === 'DaXuLy' ? 'Đã xử lý' : 'Chờ xử lý'}</span></td>
                          <td>{s.trangthai === 'ChoXuLy' && currentUser && currentUser.vaitro === 'NVQL' && (
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button className="btn btn-xs btn-teal" onClick={() => handleResolveSupport(s.maycdg, 'approve')}>Duyệt đổi</button>
                              <button className="btn btn-xs btn-rose" onClick={() => handleResolveSupport(s.maycdg, 'reject')}>Từ chối</button>
                            </div>
                          )}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderPaginationLocal(reqPage, setReqPage, filteredReqs.length)}
              </div>

              <div>
                <h3 style={{ marginBottom: '15px' }}>Lịch Sử Báo Vắng 1 Buổi (Học Viên & Gia Sư)</h3>
                <div className="table-responsive">
                  <table className="table">
                    <thead><tr><th>Người báo vắng</th><th>Lớp / Môn</th><th>Ngày nghỉ / Ca</th><th>Lý do chi tiết</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                    <tbody>
                      {paginatedAbs.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center' }}>Không có lịch sử báo vắng</td></tr>
                      ) : paginatedAbs.map(a => {
                        const isPending = a.trangthai === 'HVXinNghi' || a.trangthai === 'GSXinNghi';
                        const isHV = a.trangthai === 'HVVangCoPhep' || a.trangthai === 'HVXinNghi';
                        
                        let statusClass = 'status-disabled';
                        let statusText = 'Đã hủy';
                        if (a.trangthai === 'HVVangCoPhep') {
                          statusClass = 'status-active';
                          statusText = 'HV vắng';
                        } else if (a.trangthai === 'GSNghi') {
                          statusClass = 'status-active';
                          statusText = 'GS nghỉ';
                        } else if (isPending) {
                          statusClass = 'status-pending';
                          statusText = 'Chờ duyệt';
                        }

                        return (
                          <tr key={a.mabuoi}>
                            <td>
                              {isHV ? (
                                <><span className="status-badge" style={{backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444'}}>Học viên</span><br/><strong>{a.tenhocvien}</strong></>
                              ) : (
                                <><span className="status-badge" style={{backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b'}}>Gia sư</span><br/><strong>{a.tengiasu}</strong></>
                              )}
                            </td>
                            <td>Lớp {a.malop}<br/><span style={{fontSize:'12px',color:'#94a3b8'}}>{a.tenmh}</span></td>
                            <td>
                              <strong>{new Date(a.ngayday).toLocaleDateString('vi-VN')}</strong><br/>
                              <span style={{fontSize:'12px',color:'#94a3b8'}}>Ca: {a.cahoc === 'Sang' ? 'Sáng' : a.cahoc === 'Chieu' ? 'Chiều' : 'Tối'}</span>
                            </td>
                            <td style={{ maxWidth: '350px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{a.noidung && a.noidung.includes('[BẤT KHẢ KHÁNG]') ? (<span style={{ color: '#ef4444', fontWeight: 'bold' }}>{a.noidung}</span>) : (a.noidung)}</td>
                            <td>
                              <span className={`status-badge ${statusClass}`}>{statusText}</span>
                            </td>
                            <td>
                              {isPending && currentUser && currentUser.vaitro === 'NVQL' && (
                                <div style={{ display: 'flex', gap: '5px' }}>
                                  <button className="btn btn-xs btn-teal" onClick={() => handleDuyetNghi(a.mabuoi, 'approve')}>Duyệt</button>
                                  <button className="btn btn-xs btn-rose" onClick={() => handleDuyetNghi(a.mabuoi, 'reject')}>Từ chối</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {renderPaginationLocal(absPage, setAbsPage, filteredAbs.length)}
              </div>
            </div>
      }
    </>
  );
}
