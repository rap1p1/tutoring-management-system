import React from 'react';
import { BookOpen, UserCheck, ClipboardList, DollarSign, LogOut, Check, X, PlusCircle, CreditCard, Download, Users, GraduationCap, MessageSquare, Shield, Settings } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from "xlsx";

export default function TutorsTab(props) {
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

  const filteredData = pendingTutors.filter(t => {
    const matchText = !filterText ||
      (t.hoten && t.hoten.toLowerCase().includes(filterText.toLowerCase())) ||
      (t.sdt && t.sdt.toLowerCase().includes(filterText.toLowerCase())) ||
      (t.chuyennganh && t.chuyennganh.toLowerCase().includes(filterText.toLowerCase())) ||
      (t.cccd && t.cccd.toLowerCase().includes(filterText.toLowerCase()));
    return matchText;
  });

  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      {
        <div className="table-responsive">
          {renderSearchBox && renderSearchBox('Tìm theo tên, SĐT, CCCD, chuyên ngành...')}
          <table className="table">
            <thead>
              <tr><th>Gia sư</th><th>Chuyên ngành</th><th>CCCD/SĐT</th><th>Minh chứng</th><th>Học phí mong muốn</th><th>Khu vực dạy</th><th>Hành động</th></tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>Không có hồ sơ chờ duyệt</td></tr>
              ) : paginatedData.map(t => (
                <tr key={t.mags}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {t.anhdaidien ? (
                        <img src={t.anhdaidien} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-primary)' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#94a3b8' }}>N/A</div>
                      )}
                      <div><strong>{t.hoten}</strong><br /><span style={{ fontSize: '12px', color: '#94a3b8' }}>{t.gioitinh} - {new Date(t.ngaysinh).toLocaleDateString('vi-VN')}</span></div>
                    </div>
                  </td>
                  <td>{t.trinhdo || t.trinhdohocvan}<br /><span style={{ fontSize: '12px', color: '#94a3b8' }}>{t.chuyennganh}</span></td>
                  <td>{t.cccd}<br />{t.sdt}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
                      {t.anhcccd ? (<a href={t.anhcccd} target="_blank" rel="noreferrer" style={{ color: 'var(--color-teal)', textDecoration: 'underline' }}>CCCD</a>) : (<span style={{ color: '#ef4444' }}>Không có CCCD</span>)}
                      {t.anhbangcap && (<a href={t.anhbangcap} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Bằng cấp</a>)}
                      {t.anhthesinhvien && (<a href={t.anhthesinhvien} target="_blank" rel="noreferrer" style={{ color: 'var(--color-info)', textDecoration: 'underline' }}>Thẻ SV</a>)}
                    </div>
                  </td>
                  <td>{parseInt(t.hocphimongmuon).toLocaleString()}đ</td>
                  <td>{t.khuvucday || t.khuvuc}</td>
                  <td>
                    {currentUser && (
                      <>
                        <button className="btn btn-xs btn-teal" onClick={() => handleApproveTutor(t.mags, 'DaDuyet')} style={{marginRight:'5px'}}><Check size={14}/></button>
                        <button className="btn btn-xs btn-secondary" onClick={() => handleApproveTutor(t.mags, 'TuChoi')}><X size={14}/></button>
                      </>
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
