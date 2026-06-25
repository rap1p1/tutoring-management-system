import React from 'react';
import { BookOpen, UserCheck, ClipboardList, DollarSign, LogOut, Check, X, PlusCircle, CreditCard, Download, Users, GraduationCap, MessageSquare, Shield, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from "xlsx";

export default function AllTutorsTab(props) {
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
            const filteredData = allTutors.filter(t =>
              (t.hoten || '').toLowerCase().includes(filterText.toLowerCase()) ||
              (t.sdt || '').toLowerCase().includes(filterText.toLowerCase()) ||
              (t.chuyennganh || '').toLowerCase().includes(filterText.toLowerCase())
            );
            const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
            return (
              <div className="table-responsive">
                {renderSearchBox("Tìm theo tên, SĐT, chuyên ngành...")}
                <table className="table">
                  <thead><tr><th>Họ Tên</th><th>SĐT</th><th>Chuyên ngành</th><th>Học phí (đ/buổi)</th><th>Khu vực</th><th>Trạng thái</th><th></th></tr></thead>
                  <tbody>
                    {paginatedData.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Không có dữ liệu</td></tr>
                    ) : (
                      paginatedData.map(t => (
                        <tr key={t.mags}>
                          <td><strong>{t.hoten}</strong></td>
                          <td>{t.sdt}</td>
                          <td>{t.chuyennganh}</td>
                          <td>{parseInt(t.hocphimongmuon || 0).toLocaleString()}đ</td>
                          <td>{t.khuvucday || t.khuvuc}</td>
                          <td><span className={`status-badge ${t.trangthai === 'DaDuyet' ? 'status-active' : 'status-pending'}`}>{t.trangthai}</span></td>
                          <td><button className="btn btn-xs btn-indigo" onClick={() => openProfileModal('tutor', t.mags)}>Chi tiết</button></td>
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
