import React from 'react';
import { BookOpen, UserCheck, ClipboardList, DollarSign, LogOut, Check, X, PlusCircle, CreditCard, Download, Users, GraduationCap, MessageSquare, Shield, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from "xlsx";

export default function AllStudentsTab(props) {
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
        () => {
            const filteredData = allStudents.filter(s =>
              (s.hoten || '').toLowerCase().includes(filterText.toLowerCase()) ||
              (s.sdt || '').toLowerCase().includes(filterText.toLowerCase()) ||
              (s.email || '').toLowerCase().includes(filterText.toLowerCase())
            );
            const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            return (
              <div className="table-responsive">
                {renderSearchBox("Tìm theo tên, SĐT, email...")}
                <table className="table">
                  <thead><tr><th>Họ Tên</th><th>SĐT</th><th>Email</th><th>Địa chỉ</th><th>Cấp học</th><th></th></tr></thead>
                  <tbody>
                    {paginatedData.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Không có dữ liệu</td></tr>
                    ) : (
                      paginatedData.map(s => (
                        <tr key={s.mahv}>
                          <td><strong>{s.hoten}</strong></td>
                          <td>{s.sdt}</td>
                          <td>{s.email || 'Chưa có'}</td>
                          <td>{s.diachi || 'Chưa có'}</td>
                          <td>{s.caphoc || 'Chưa có'}</td>
                          <td><button className="btn btn-xs btn-teal" onClick={() => openProfileModal('student', s.mahv)}>Chi tiết</button></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {renderPagination(filteredData.length)}
              </div>
            );
          }
      }
    </>
  );
}
