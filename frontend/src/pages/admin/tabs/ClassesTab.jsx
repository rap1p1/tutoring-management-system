import React from 'react';
import { BookOpen, UserCheck, ClipboardList, DollarSign, LogOut, Check, X, PlusCircle, CreditCard, Download, Users, GraduationCap, MessageSquare, Shield, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from "xlsx";

export default function ClassesTab(props) {
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

  const [statusFilter, setStatusFilter] = React.useState('all');

  const filteredData = classes.filter(c => {
    const matchText = !filterText || 
      (c.tenmh && c.tenmh.toLowerCase().includes(filterText.toLowerCase())) ||
      (c.caplop && c.caplop.toLowerCase().includes(filterText.toLowerCase())) ||
      (c.tenhocvien && c.tenhocvien.toLowerCase().includes(filterText.toLowerCase())) ||
      (c.tengiasu && c.tengiasu.toLowerCase().includes(filterText.toLowerCase()));
    
    let matchStatus = true;
    if (statusFilter !== 'all') {
      matchStatus = c.trangthai === statusFilter;
    }
    return matchText && matchStatus;
  });

  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const statusDropdown = (
    <select className="form-control" style={{ width: '150px' }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
      <option value="all">Tất cả trạng thái</option>
      <option value="DangDay">Đang dạy</option>
      <option value="KetThuc">Kết thúc</option>
      <option value="Huy">Hủy</option>
    </select>
  );

  return (
    <>
      {
        <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>Quản Lý Danh Sách Lớp Học</h3>
                <button className="btn btn-secondary" onClick={exportClasses} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={16} /> Xuất Excel Lớp Học
                </button>
              </div>
              {renderSearchBox && renderSearchBox('Tìm theo môn, lớp, học viên, gia sư...', statusDropdown)}
              <div className="table-responsive">
                <table className="table">
                <thead>
                  <tr><th>Mã Lớp</th><th>Môn/Lớp</th><th>Học viên</th><th>Gia sư</th><th>Học phí/buổi</th><th>Trạng thái</th><th>Hành động</th></tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center' }}>Chưa có lớp nào</td></tr>
                  ) : paginatedData.map(c => (
                    <tr key={c.malop}>
                      <td>{c.malop}</td>
                      <td>{c.tenmh}<br/><span style={{fontSize:'12px',color:'#94a3b8'}}>{c.caplop}</span></td>
                      <td>{c.tenhocvien}</td>
                      <td>{c.tengiasu || 'Chưa phân công'}</td>
                      <td>{c.hocphimoibuoi ? parseInt(c.hocphimoibuoi).toLocaleString() + 'đ' : ''}</td>
                      <td>
                        <span className={`status-badge ${c.trangthai === 'DangDay' ? 'status-active' : (c.trangthai === 'KetThuc' ? 'status-disabled' : 'status-pending')}`}>
                          {c.trangthai}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-xs btn-primary" onClick={() => handleOpenClassDetail(c.malop)} style={{marginRight:'5px'}}>Chi tiết</button>
                        {c.trangthai !== 'KetThuc' && c.trangthai !== 'Huy' && currentUser && currentUser.vaitro !== 'BGD' && (
                          <button className="btn btn-xs btn-rose" onClick={() => handleEndClass(c.malop)}>Kết thúc</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderPagination && renderPagination(filteredData.length)}
            </div>
            </div>
      }
    </>
  );
}
