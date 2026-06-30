import React, { useState, useEffect } from 'react';
import { BookOpen, UserCheck, ClipboardList, DollarSign, LogOut, Check, X, PlusCircle, CreditCard, Download, Users, GraduationCap, MessageSquare, Shield, Settings, Edit, Power } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Swal from 'sweetalert2';
import * as XLSX from "xlsx";

export default function SettingsTab(props) {
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

  const [logs, setLogs] = useState([]);
  const [logPagination, setLogPagination] = useState({ page: 1, totalPages: 1 });
  const [logFilter, setLogFilter] = useState({ role: '', fromDate: '', toDate: '' });
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchLogs = async (page = 1) => {
    setLoadingLogs(true);
    try {
      const queryParams = new URLSearchParams({
        page,
        limit: 20,
        ...logFilter
      });
      const res = await fetch(`/api/nhanvien/access-logs?${queryParams.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
        setLogPagination(json.pagination);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingLogs(false);
  };

  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const showMsg = (type, text) => {
    Swal.fire({
      title: type === 'error' ? 'Thất bại' : 'Thành công',
      text: text,
      icon: type,
      confirmButtonColor: '#6366f1',
      background: '#1e293b',
      color: '#fff'
    });
  };

  const fetchSubjects = async () => {
    setLoadingSubjects(true);
    try {
      const res = await fetch('/api/monhoc/all');
      const json = await res.json();
      if (json.success) {
        setSubjects(json.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingSubjects(false);
  };

  const handleAddSubject = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Thêm Môn Học',
      html: `
        <div style="text-align: left; margin-bottom: 15px;">
          <label style="display:block; margin-bottom:5px; color:#cbd5e1;">Tên môn học *</label>
          <input id="swal-tenmh" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box;" placeholder="VD: Toán học">
        </div>
        <div style="text-align: left; margin-bottom: 15px;">
          <label style="display:block; margin-bottom:5px; color:#cbd5e1;">Cấp học</label>
          <input id="swal-caphoc" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box;" placeholder="VD: Cấp 1, Cấp 2, Cấp 3">
        </div>
        <div style="text-align: left; margin-bottom: 15px;">
          <label style="display:block; margin-bottom:5px; color:#cbd5e1;">Mô tả</label>
          <textarea id="swal-mota" class="swal2-textarea" style="width: 100%; margin: 0; box-sizing: border-box;" placeholder="Mô tả thêm..."></textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Lưu',
      cancelButtonText: 'Hủy',
      background: '#1e293b',
      color: '#fff',
      preConfirm: () => {
        const tenmh = document.getElementById('swal-tenmh').value.trim();
        const caphoc = document.getElementById('swal-caphoc').value.trim();
        const mota = document.getElementById('swal-mota').value.trim();
        if (!tenmh) {
          Swal.showValidationMessage('Tên môn học không được để trống');
          return false;
        }
        return { tenmh, caphoc, mota };
      }
    });

    if (formValues) {
      try {
        const res = await fetch('/api/monhoc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formValues)
        });
        const json = await res.json();
        if (json.success) {
          showMsg('success', 'Thêm môn học thành công');
          fetchSubjects();
        } else {
          showMsg('error', json.message);
        }
      } catch (e) {
        showMsg('error', 'Lỗi kết nối');
      }
    }
  };

  const handleEditSubject = async (subject) => {
    const { value: formValues } = await Swal.fire({
      title: 'Sửa Môn Học',
      html: `
        <div style="text-align: left; margin-bottom: 15px;">
          <label style="display:block; margin-bottom:5px; color:#cbd5e1;">Tên môn học *</label>
          <input id="swal-tenmh" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box;" value="${subject.tenmh || ''}">
        </div>
        <div style="text-align: left; margin-bottom: 15px;">
          <label style="display:block; margin-bottom:5px; color:#cbd5e1;">Cấp học</label>
          <input id="swal-caphoc" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box;" value="${subject.caphoc || ''}">
        </div>
        <div style="text-align: left; margin-bottom: 15px;">
          <label style="display:block; margin-bottom:5px; color:#cbd5e1;">Mô tả</label>
          <textarea id="swal-mota" class="swal2-textarea" style="width: 100%; margin: 0; box-sizing: border-box;">${subject.mota || ''}</textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Lưu thay đổi',
      cancelButtonText: 'Hủy',
      background: '#1e293b',
      color: '#fff',
      preConfirm: () => {
        const tenmh = document.getElementById('swal-tenmh').value.trim();
        const caphoc = document.getElementById('swal-caphoc').value.trim();
        const mota = document.getElementById('swal-mota').value.trim();
        if (!tenmh) {
          Swal.showValidationMessage('Tên môn học không được để trống');
          return false;
        }
        return { tenmh, caphoc, mota };
      }
    });

    if (formValues) {
      try {
        const res = await fetch(`/api/monhoc/${subject.mamh}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formValues)
        });
        const json = await res.json();
        if (json.success) {
          showMsg('success', 'Cập nhật môn học thành công');
          fetchSubjects();
        } else {
          showMsg('error', json.message);
        }
      } catch (e) {
        showMsg('error', 'Lỗi kết nối');
      }
    }
  };

  const handleToggleSubject = async (subject) => {
    const actionText = subject.trangthai === 'HoatDong' ? 'Ngừng hoạt động' : 'Kích hoạt lại';
    const result = await Swal.fire({
      title: 'Xác nhận',
      text: `Bạn muốn ${actionText} môn "${subject.tenmh}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: subject.trangthai === 'HoatDong' ? '#ef4444' : '#10b981',
      cancelButtonText: 'Hủy',
      confirmButtonText: 'Đồng ý',
      background: '#1e293b',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/monhoc/${subject.mamh}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          showMsg('success', `Đã ${actionText.toLowerCase()} môn học`);
          fetchSubjects();
        } else {
          showMsg('error', json.message);
        }
      } catch (e) {
        showMsg('error', 'Lỗi kết nối');
      }
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [logFilter]);

  useEffect(() => {
    fetchSubjects();
  }, []);



  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '20px', maxWidth: '100%' }}>
              <h3 style={{ marginBottom: '15px' }}>Cài Đặt Hệ Thống</h3>
              <div className="form-group">
                <label>Tỷ lệ hoa hồng mặc định (%)</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                  <input 
                    type="number" 
                    id="sys_default_tylehh"
                    defaultValue={defaultTyleHH}
                    key={defaultTyleHH}
                    min="0"
                    max="100"
                    style={{ flex: 1 }}
                  />
                  <button 
                    className="btn btn-teal"
                    onClick={async () => {
                      const val = document.getElementById('sys_default_tylehh').value;
                      if (!val || isNaN(parseFloat(val)) || parseFloat(val) < 0 || parseFloat(val) > 100) {
                        showMsg('error', 'Tỷ lệ hoa hồng không hợp lệ (phải từ 0 đến 100).');
                        return;
                      }
                      try {
                        const res = await fetch('/api/nhanvien/config/tylehh', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ tylehh: val })
                        });
                        const json = await res.json();
                        if (json.success) {
                          showMsg('success', json.message);
                          setDefaultTyleHH(parseFloat(val));
                        } else {
                          showMsg('error', json.message);
                        }
                      } catch(e) {
                        showMsg('error', 'Lỗi kết nối.');
                      }
                    }}
                  >
                    Lưu
                  </button>
                </div>
                <small style={{ color: '#94a3b8', display: 'block', marginTop: '10px' }}>
                  Tỷ lệ này sẽ tự động áp dụng khi tạo các lớp học mới (nhân viên quản lý không thể tự ý sửa đổi).
                </small>
              </div>

              <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '20px 0' }} />
              
              <h3 style={{ marginBottom: '15px' }}>Học Phí Mặc Định Theo Cấp Lớp (VND/buổi)</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }} key={JSON.stringify(defaultHocPhis)}>
                <div className="form-group">
                  <label>Cấp 1</label>
                  <input type="number" id="fee_cap1" defaultValue={defaultHocPhis.HocPhi_Cap1} step="10000" />
                </div>
                <div className="form-group">
                  <label>Cấp 2</label>
                  <input type="number" id="fee_cap2" defaultValue={defaultHocPhis.HocPhi_Cap2} step="10000" />
                </div>
                <div className="form-group">
                  <label>Cấp 3</label>
                  <input type="number" id="fee_cap3" defaultValue={defaultHocPhis.HocPhi_Cap3} step="10000" />
                </div>
                <div className="form-group">
                  <label>Luyện thi Đại học</label>
                  <input type="number" id="fee_luyenthidh" defaultValue={defaultHocPhis.HocPhi_LuyenThiDH} step="10000" />
                </div>
                <div className="form-group">
                  <label>Tiếng Anh Giao tiếp</label>
                  <input type="number" id="fee_tienganhgt" defaultValue={defaultHocPhis.HocPhi_TiengAnhGT} step="10000" />
                </div>
                <div className="form-group">
                  <label>Chứng chỉ Quốc tế</label>
                  <input type="number" id="fee_chungchiqt" defaultValue={defaultHocPhis.HocPhi_ChungChiQT} step="10000" />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Khác</label>
                  <input type="number" id="fee_khac" defaultValue={defaultHocPhis.HocPhi_Khac} step="10000" />
                </div>
              </div>
              
              <button 
                className="btn btn-teal btn-block" 
                style={{ marginTop: '15px' }}
                onClick={async () => {
                  const cap1 = document.getElementById('fee_cap1').value;
                  const cap2 = document.getElementById('fee_cap2').value;
                  const cap3 = document.getElementById('fee_cap3').value;
                  const luyenthidh = document.getElementById('fee_luyenthidh').value;
                  const tienganhgt = document.getElementById('fee_tienganhgt').value;
                  const chungchiqt = document.getElementById('fee_chungchiqt').value;
                  const khac = document.getElementById('fee_khac').value;

                  try {
                    const res = await fetch('/api/nhanvien/config/hocphi', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ cap1, cap2, cap3, luyenthidh, tienganhgt, chungchiqt, khac })
                    });
                    const json = await res.json();
                    if (json.success) {
                      showMsg('success', json.message);
                      setDefaultHocPhis({
                        HocPhi_Cap1: parseInt(cap1),
                        HocPhi_Cap2: parseInt(cap2),
                        HocPhi_Cap3: parseInt(cap3),
                        HocPhi_LuyenThiDH: parseInt(luyenthidh),
                        HocPhi_TiengAnhGT: parseInt(tienganhgt),
                        HocPhi_ChungChiQT: parseInt(chungchiqt),
                        HocPhi_Khac: parseInt(khac)
                      });
                    } else {
                      showMsg('error', json.message);
                    }
                  } catch (e) {
                    showMsg('error', 'Lỗi kết nối.');
                  }
                }}
              >
                Lưu học phí mặc định
              </button>

              <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '30px 0' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>Quản Lý Danh Mục Môn Học</h3>
                <button className="btn btn-primary btn-sm" onClick={handleAddSubject}>
                  <PlusCircle size={16} style={{ marginRight: '5px' }} /> Thêm Mới
                </button>
              </div>

              {loadingSubjects ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Đang tải môn học...</div>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Mã</th>
                        <th>Tên Môn Học</th>
                        <th>Cấp Học</th>
                        <th>Mô Tả</th>
                        <th>Trạng Thái</th>
                        <th>Hành Động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center' }}>Chưa có môn học nào</td></tr>
                      ) : (
                        subjects.map(s => (
                          <tr key={s.mamh}>
                            <td>{s.mamh}</td>
                            <td><strong>{s.tenmh}</strong></td>
                            <td>{s.caphoc || '-'}</td>
                            <td>{s.mota || '-'}</td>
                            <td>
                              <span style={{
                                padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
                                backgroundColor: s.trangthai === 'HoatDong' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                                color: s.trangthai === 'HoatDong' ? '#10b981' : '#ef4444'
                              }}>
                                {s.trangthai === 'HoatDong' ? 'Hoạt động' : 'Ngừng hoạt động'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button className="btn btn-xs btn-outline" title="Sửa" onClick={() => handleEditSubject(s)}>
                                  <Edit size={14} />
                                </button>
                                <button 
                                  className={`btn btn-xs ${s.trangthai === 'HoatDong' ? 'btn-rose' : 'btn-teal'}`} 
                                  title={s.trangthai === 'HoatDong' ? 'Ngừng hoạt động' : 'Kích hoạt'}
                                  onClick={() => handleToggleSubject(s)}
                                >
                                  <Power size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

        <div className="glass-card" style={{ padding: '20px', maxWidth: '100%', overflowX: 'auto' }}>
          <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={20} className="text-rose" /> Lịch Sử Truy Cập Hệ Thống (Access Logs)
          </h3>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
            <select className="form-control" style={{ width: 'auto' }} value={logFilter.role} onChange={e => setLogFilter({...logFilter, role: e.target.value})}>
              <option value="">-- Tất cả vai trò --</option>
              <option value="SA">Super Admin</option>
              <option value="BGD">Ban Giám Đốc</option>
              <option value="NVQL">Nhân viên QL</option>
              <option value="GS">Gia sư</option>
              <option value="HV">Học viên</option>
            </select>
            <input type="date" className="form-control" style={{ width: 'auto' }} value={logFilter.fromDate} onChange={e => setLogFilter({...logFilter, fromDate: e.target.value})} />
            <input type="date" className="form-control" style={{ width: 'auto' }} value={logFilter.toDate} onChange={e => setLogFilter({...logFilter, toDate: e.target.value})} />
            <button className="btn btn-outline" onClick={() => setLogFilter({role:'', fromDate:'', toDate:''})}>Xóa bộ lọc</button>
          </div>

          {loadingLogs ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Đang tải logs...</div>
          ) : (
            <div>
              {logs.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Không có dữ liệu log truy cập</div>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Thời Gian</th>
                        <th>Tài Khoản</th>
                        <th>Hành Động</th>
                        <th>Chi Tiết</th>
                        <th>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.malog}>
                          <td>{new Date(log.thoigian).toLocaleString('vi-VN')}</td>
                          <td>
                            <strong>{log.tendangnhap}</strong><br/>
                            <span style={{fontSize:'12px', color:'#94a3b8'}}>{log.nguoithuchien}</span>
                          </td>
                          <td>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              backgroundColor: log.method === 'GET' ? 'rgba(59,130,246,0.2)' : (log.method === 'POST' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'),
                              color: log.method === 'GET' ? '#60a5fa' : (log.method === 'POST' ? '#34d399' : '#fbbf24')
                            }}>{log.method}</span>
                            <div style={{marginTop: '4px', fontSize: '13px'}}>{log.hanhdong}</div>
                          </td>
                          <td>
                            <details style={{cursor:'pointer', fontSize:'13px', background:'rgba(255,255,255,0.02)', padding:'5px', borderRadius:'4px'}}>
                              <summary>Xem dữ liệu</summary>
                              <pre style={{ margin:0, padding:'10px', fontSize:'11px', color:'#a5b4fc', maxHeight:'150px', overflowY:'auto' }}>
                                {JSON.stringify(log.chitiet, null, 2)}
                              </pre>
                            </details>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>
                              {log.ipaddress === '::1' || log.ipaddress === '127.0.0.1' ? 'Localhost (::1)' : log.ipaddress}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {logPagination.totalPages > 1 && (
                <div className="pagination" style={{ marginTop: '15px', display: 'flex', gap: '5px', justifyContent: 'center' }}>
                  <button 
                    disabled={logPagination.page === 1} 
                    onClick={() => fetchLogs(logPagination.page - 1)}
                    className="btn btn-outline" style={{padding:'5px 10px'}}
                  >Trang trước</button>
                  <span style={{padding:'5px 10px'}}>Trang {logPagination.page} / {logPagination.totalPages}</span>
                  <button 
                    disabled={logPagination.page === logPagination.totalPages} 
                    onClick={() => fetchLogs(logPagination.page + 1)}
                    className="btn btn-outline" style={{padding:'5px 10px'}}
                  >Trang sau</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
