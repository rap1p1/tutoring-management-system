import React from 'react';
import { BookOpen, UserCheck, ClipboardList, DollarSign, LogOut, Check, X, PlusCircle, CreditCard, Download, Users, GraduationCap, MessageSquare, Shield, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from "xlsx";

export default function RequestsTab(props) {
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

  const filteredData = requests.filter(r => {
    const matchText = !filterText || 
      (r.tenmh && r.tenmh.toLowerCase().includes(filterText.toLowerCase())) ||
      (r.caplop && r.caplop.toLowerCase().includes(filterText.toLowerCase())) ||
      (r.tenhocvien && r.tenhocvien.toLowerCase().includes(filterText.toLowerCase())) ||
      (r.sdthocvien && r.sdthocvien.toLowerCase().includes(filterText.toLowerCase()));
    
    let matchStatus = true;
    if (statusFilter !== 'all') {
      matchStatus = r.trangthai === statusFilter;
    }
    return matchText && matchStatus;
  });

  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const statusDropdown = (
    <select className="form-control" style={{ width: '150px' }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
      <option value="all">Tất cả trạng thái</option>
      <option value="ChoGhep">Chờ ghép</option>
      <option value="DaGhep">Đã ghép</option>
      <option value="Huy">Đã hủy</option>
    </select>
  );

  return (
    <>
      {
        <div className="table-responsive">
              {renderSearchBox && renderSearchBox('Tìm theo môn, lớp, tên HV, SĐT...', statusDropdown)}
              <table className="table">
                <thead>
                  <tr><th>Học viên</th><th>Môn học</th><th>Cấp lớp</th><th>Số buổi/tuần / Lịch học</th><th>Trạng thái</th><th>Hành động</th></tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>Không tìm thấy yêu cầu nào</td></tr>
                  ) : paginatedData.map(r => (
                    <tr key={r.mayc}>
                      <td><strong>{r.tenhocvien}</strong><br/>{r.sdthocvien}</td>
                      <td>{r.tenmh}</td>
                      <td>{r.caplop}</td>
                      <td>
                        <strong>Số buổi/tuần: {r.songayhoc}</strong><br/>
                        <span style={{fontSize:'12px',color:'#94a3b8'}}>{formatLichHoc(r.lichhoctrongtuan)}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${r.trangthai === 'DaGhep' ? 'status-active' : (r.trangthai === 'Huy' ? 'status-cancelled' : 'status-pending')}`}>
                          {r.trangthai === 'ChoGhep' ? 'Chờ ghép' : (r.trangthai === 'Huy' ? 'Đã hủy' : 'Đã ghép')}
                        </span>
                      </td>
                      <td>
                        {r.trangthai === 'ChoGhep' && currentUser && currentUser.vaitro !== 'BGD' && (
                          <button className="btn btn-xs btn-primary" onClick={() => handleOpenClassModal(r)}>
                            Tạo Lớp & Ghép GS
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {renderPagination && renderPagination(filteredData.length)}
            </div>
      }
    </>
  );
}
