import React from 'react';
import { BookOpen, UserCheck, ClipboardList, DollarSign, LogOut, Check, X, PlusCircle, CreditCard, Download, Users, GraduationCap, MessageSquare, Shield, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from "xlsx";

export default function AccountsTab(props) {
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

  const filteredData = accounts.filter(acc => {
    const matchText = !filterText || 
      (acc.tendangnhap && acc.tendangnhap.toLowerCase().includes(filterText.toLowerCase())) ||
      (acc.hoten && acc.hoten.toLowerCase().includes(filterText.toLowerCase())) ||
      (acc.email && acc.email.toLowerCase().includes(filterText.toLowerCase()));
    
    let matchStatus = true;
    if (statusFilter !== 'all') {
      matchStatus = acc.trangthai === statusFilter;
    }
    return matchText && matchStatus;
  });

  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const statusDropdown = (
    <select className="form-control" style={{ width: '150px' }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
      <option value="all">Tất cả trạng thái</option>
      <option value="HoatDong">Hoạt động</option>
      <option value="Khoa">Đã khóa</option>
    </select>
  );

  return (
    <>
      {
        <div className="table-responsive">
              {renderSearchBox && renderSearchBox('Tìm theo tên, username, email...', statusDropdown)}
              <table className="table">
                <thead><tr><th>Họ Tên</th><th>Tên Đăng Nhập</th><th>Email</th><th>Vai Trò</th><th>Trạng Thái</th><th>Hành Động</th></tr></thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>Không tìm thấy tài khoản nào</td></tr>
                  ) : paginatedData.map(acc => (
                    <tr key={acc.matk}>
                      <td><strong>{acc.hoten || 'Chưa cập nhật'}</strong></td>
                      <td>{acc.tendangnhap}</td>
                      <td>{acc.email || 'Không có'}</td>
                      <td>
                        <span className="status-badge" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                          {acc.vaitro === 'HV' ? 'Học viên' : acc.vaitro === 'GS' ? 'Gia sư' : acc.vaitro === 'NVQL' ? 'Nhân viên QL' : acc.vaitro === 'BGD' ? 'Giám đốc' : acc.vaitro === 'SA' ? 'System Admin' : acc.vaitro}
                        </span>
                      </td>
                      <td><span className={`status-badge ${acc.trangthai === 'HoatDong' ? 'status-active' : 'status-disabled'}`}>{acc.trangthai === 'HoatDong' ? 'Hoạt động' : 'Đã khóa'}</span></td>
                      <td>
                        {acc.matk === currentUser?.matk ? (
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Bản thân</span>
                        ) : acc.vaitro === 'BGD' && currentUser?.vaitro !== 'BGD' ? (
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Không được phép</span>
                        ) : (
                          <button className={`btn btn-xs ${acc.trangthai === 'Khoa' ? 'btn-teal' : 'btn-rose'}`} onClick={() => handleToggleLock(acc.matk, acc.trangthai)}>{acc.trangthai === 'Khoa' ? 'Mở khóa' : 'Khóa'}</button>
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
