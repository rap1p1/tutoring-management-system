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
    exportFinances
  } = propsObj;

  return (
    <>
      {
        <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr><th>Học viên</th><th>Môn học</th><th>Cấp lớp</th><th>Số buổi đã học / Lịch học</th><th>Trạng thái</th><th>Hành động</th></tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>Không có yêu cầu nào</td></tr>
                  ) : requests.map(r => (
                    <tr key={r.mayc}>
                      <td><strong>{r.tenhocvien}</strong><br/>{r.sdthocvien}</td>
                      <td>{r.tenmh}</td>
                      <td>{r.caplop}</td>
                      <td>
                        <strong>Đã học: {r.songayhoc} buổi</strong><br/>
                        <span style={{fontSize:'12px',color:'#94a3b8'}}>{formatLichHoc(r.lichhoctrongtuan)}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${r.trangthai === 'DaGhep' ? 'status-active' : 'status-pending'}`}>
                          {r.trangthai === 'ChoGhep' ? 'Chờ ghép' : 'Đã ghép'}
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
            </div>
      }
    </>
  );
}
