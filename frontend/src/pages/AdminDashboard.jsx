import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, UserCheck, ClipboardList, DollarSign, LogOut, Check, X, PlusCircle, CreditCard, Download } from 'lucide-react';
import Swal from 'sweetalert2';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tutors');
  const [globalError, setGlobalError] = useState('');
  const [globalSuccess, setGlobalSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  // Data states
  const [stats, setStats] = useState({ activeClasses: 0, pendingTutors: 0, pendingRequests: 0, revenue: 0 });
  const [pendingTutors, setPendingTutors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [classes, setClasses] = useState([]);
  const [tuitions, setTuitions] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Class detail state
  const [showClassDetailModal, setShowClassDetailModal] = useState(false);
  const [classDetail, setClassDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modals state
  const [showClassModal, setShowClassModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statRes, tutRes, reqRes, classRes, tuitRes, commRes, suppRes, absRes, chartRes, accRes, profRes, meRes] = await Promise.all([
        fetch('/api/nhanvien/stats').then(r => r.json()),
        fetch('/api/nhanvien/giasu/pending').then(r => r.json()),
        fetch('/api/nhanvien/yeucau').then(r => r.json()),
        fetch('/api/nhanvien/lop').then(r => r.json()),
        fetch('/api/nhanvien/hocphi').then(r => r.json()),
        fetch('/api/nhanvien/hoahong').then(r => r.json()),
        fetch('/api/nhanvien/yeucaudoi').then(r => r.json()),
        fetch('/api/nhanvien/baonghi').then(r => r.json()),
        fetch('/api/nhanvien/revenue-chart').then(r => r.json()),
        fetch('/api/nhanvien/taikhoan').then(r => r.json()),
        fetch('/api/nhanvien/me').then(r => r.json()),
        fetch('/api/auth/me').then(r => r.json())
      ]);

      if (!statRes.success) {
        if (statRes.message === 'Không có quyền thực hiện chức năng này') navigate('/login');
        return;
      }

      setStats(statRes.data || {});
      setPendingTutors(tutRes.data || []);
      setRequests(reqRes.data || []);
      setClasses(classRes.data || []);
      setTuitions(tuitRes.data || []);
      setCommissions(commRes.data || []);
      setSupportRequests(suppRes.data || []);
      setAbsences(absRes.data || []);
      setRevenueData(chartRes.data || []);
      setAccounts(accRes.data || []);
      setProfile(profRes.data || null);
      setCurrentUser(meRes.data || null);
    } catch (e) {
      console.error(e);
      setGlobalError('Lỗi tải dữ liệu bảng điều khiển.');
    } finally {
      setLoading(false);
    }
  };

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


  const handleApproveTutor = async (id, status) => {
    const actionName = status === 'DaDuyet' ? 'duyệt' : 'từ chối';
    const result = await Swal.fire({
      title: 'Xác nhận',
      text: `Bạn muốn ${actionName} gia sư này?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: status === 'DaDuyet' ? '#10b981' : '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy',
      background: '#1e293b',
      color: '#fff'
    });
    
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/nhanvien/giasu/${id}/duyet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (json.success) {
        showMsg('success', 'Đã cập nhật trạng thái hồ sơ.');
        fetchData();
      } else {
        showMsg('error', json.message);
      }
    } catch (e) {
      showMsg('error', 'Lỗi kết nối.');
    }
  };

  const handleOpenClassModal = (req) => {
    setSelectedRequest(req);
    setShowClassModal(true);
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    if (!data.mags || data.mags.trim() === '') {
      showMsg('error', 'Vui lòng điền mã gia sư!');
      return;
    }
    
    try {
      const res = await fetch('/api/nhanvien/lop/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mayc: selectedRequest.mayc,
          mags: data.mags,
          ngaybatdau: data.ngaybatdau,
          hocphimoibuoi: data.hocphi,
          tylehh: data.tylehh
        })
      });
      const json = await res.json();
      if (json.success) {
        showMsg('success', 'Ghép lớp thành công!');
        setShowClassModal(false);
        fetchData();
      } else {
        showMsg('error', json.message);
      }
    } catch (e) {
      showMsg('error', 'Lỗi kết nối.');
    }
  };

  const handleConfirmTuition = async (id) => {
    try {
      const res = await fetch(`/api/nhanvien/hocphi/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hinhthuctt: 'ChuyenKhoan' })
      });
      const json = await res.json();
      if (json.success) {
        showMsg('success', 'Xác nhận đóng học phí thành công!');
        fetchData();
      } else {
        showMsg('error', json.message);
      }
    } catch (e) {
      showMsg('error', 'Lỗi kết nối.');
    }
  };

  const handleConfirmCommission = async (id) => {
    try {
      const res = await fetch(`/api/nhanvien/hoahong/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hinhthuctt: 'ChuyenKhoan' })
      });
      const json = await res.json();
      if (json.success) {
        showMsg('success', 'Xác nhận thanh toán hoa hồng thành công!');
        fetchData();
      } else {
        showMsg('error', json.message);
      }
    } catch (e) {
      showMsg('error', 'Lỗi kết nối.');
    }
  };

  const handleResolveSupport = async (id) => {
    try {
      const res = await fetch(`/api/nhanvien/yeucaudoi/${id}/xuly`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showMsg('success', 'Đã đánh dấu xử lý.');
        fetchData();
      } else {
        showMsg('error', json.message);
      }
    } catch (e) {
      showMsg('error', 'Lỗi kết nối.');
    }
  };

  const handleEndClass = async (id) => {
    const result = await Swal.fire({
      title: 'Kết thúc lớp sớm',
      input: 'textarea',
      inputLabel: 'Lý do kết thúc lớp',
      inputPlaceholder: 'Nhập lý do...',
      showCancelButton: true,
      confirmButtonText: 'Xác nhận',
      cancelButtonText: 'Hủy',
      background: '#1e293b',
      color: '#fff',
      inputValidator: (value) => {
        if (!value) return 'Vui lòng nhập lý do!';
      }
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/nhanvien/lop/${id}/ketthuc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lydo: result.value })
        });
        const json = await res.json();
        if (json.success) {
          showMsg('success', 'Đã chốt kết thúc lớp thành công!');
          fetchData();
        } else {
          showMsg('error', json.message);
        }
      } catch (e) {
        showMsg('error', 'Lỗi kết nối.');
      }
    }
  };

  const handleToggleLock = async (id, currentStatus) => {
    const actionName = currentStatus === 'Khoa' ? 'mở khóa' : 'khóa';
    const result = await Swal.fire({
      title: 'Xác nhận',
      text: `Bạn có chắc chắn muốn ${actionName} tài khoản này?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: currentStatus === 'Khoa' ? '#10b981' : '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy',
      background: '#1e293b',
      color: '#fff'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/nhanvien/taikhoan/${id}/toggle-lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.success) {
        showMsg('success', json.message);
        fetchData();
      } else {
        showMsg('error', json.message);
      }
    } catch (e) {
      showMsg('error', 'Lỗi kết nối.');
    }
  };

  const handleOpenClassDetail = async (id) => {
    try {
      setLoadingDetail(true);
      setShowClassDetailModal(true);
      const res = await fetch(`/api/nhanvien/lop/${id}/detail`);
      const json = await res.json();
      if (json.success) {
        setClassDetail(json.data);
      } else {
        showMsg('error', json.message);
        setShowClassDetailModal(false);
      }
    } catch (e) {
      showMsg('error', 'Lỗi kết nối.');
      setShowClassDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const exportToExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportClasses = () => {
    const exportData = classes.map(c => ({
      'Mã Lớp': c.malop,
      'Ngày Bắt Đầu': new Date(c.ngaybatdau).toLocaleDateString('vi-VN'),
      'Môn Học': c.tenmh,
      'Gia Sư': c.tengiasu || 'Chưa phân công',
      'Học Viên': c.tenhocvien,
      'Học Phí (VNĐ)': c.hocphimoibuoi,
      'Trạng Thái': c.trangthai
    }));
    exportToExcel(exportData, 'DanhSachLop_GiaSu');
  };

  const exportFinances = () => {
    const exportData = tuitions.map(t => ({
      'Mã Lớp': t.malop,
      'Học Viên': t.tenhocvien,
      'Kỳ Thu Từ': new Date(t.kytt_tu).toLocaleDateString('vi-VN'),
      'Kỳ Thu Đến': new Date(t.kytt_den).toLocaleDateString('vi-VN'),
      'Số Buổi': t.sobuoi,
      'Tổng Tiền (VNĐ)': t.tonghocphi,
      'Trạng Thái': t.trangthai
    }));
    exportToExcel(exportData, 'BaoCaoTaiChinh_HocPhi');
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Đang tải...</div>;

  return (
    <div className="view-section" style={{ display: 'block' }}>
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Trang Quản Trị Hệ Thống</h2>
          <p>Quản lý yêu cầu, phân công gia sư và duyệt hồ sơ</p>
        </div>
      </div>

      {profile && (
        <div className="glass-card mb-4" style={{ padding: '20px' }}>
          <h3 style={{ marginBottom: '15px' }}>Thông Tin Cá Nhân Nhân Viên</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px' }}>
            <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Mã Nhân Viên (ID)</strong> {profile.manv ? 'NV' + profile.manv.toString().padStart(6, '0') : ''}</div>
            <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Họ và tên</strong> {profile.hoten}</div>
            <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Chức vụ</strong> {profile.chucvu}</div>
            <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Số điện thoại</strong> {profile.sdt}</div>
          </div>
        </div>
      )}

      {globalError && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
          {globalError}
        </div>
      )}
      {globalSuccess && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid #10b981', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
          {globalSuccess}
        </div>
      )}

      {/* Stats Cards Row */}
      <div className="stats-row mb-4">
        <div className="stats-card">
          <div className="stats-icon text-indigo"><BookOpen size={24} /></div>
          <div className="stats-info">
            <span className="stats-label">Lớp Đang Hoạt Động</span>
            <span className="stats-value">{stats.activeClasses}</span>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-icon text-teal"><UserCheck size={24} /></div>
          <div className="stats-info">
            <span className="stats-label">Hồ Sơ GS Chờ Duyệt</span>
            <span className="stats-value">{stats.pendingTutors}</span>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-icon text-amber"><ClipboardList size={24} /></div>
          <div className="stats-info">
            <span className="stats-label">Yêu Cầu Học Chờ Ghép</span>
            <span className="stats-value">{stats.pendingRequests}</span>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-icon text-rose"><DollarSign size={24} /></div>
          <div className="stats-info">
            <span className="stats-label">Tổng Doanh Thu</span>
            <span className="stats-value">{parseInt(stats.revenue || 0).toLocaleString()}đ</span>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="glass-card mb-4" style={{ padding: '20px' }}>
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <DollarSign size={20} className="text-rose" /> Biểu Đồ Doanh Thu Theo Tháng
        </h3>
        <div style={{ width: '100%', height: '300px' }}>
          {revenueData && revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" tickFormatter={(value) => new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(value)} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(value) => [new Intl.NumberFormat('vi-VN').format(value) + ' VNĐ', 'Doanh Thu']} />
                <Legend />
                <Bar dataKey="revenue" name="Doanh Thu (VNĐ)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px' }}>
              Chưa có dữ liệu doanh thu để thống kê
            </div>
          )}
        </div>
      </div>

      {/* Tabbed admin control panel */}
      <div className="glass-card">
        <div className="admin-tabs">
          <button className={`admin-tab ${activeTab === 'tutors' ? 'active' : ''}`} onClick={() => setActiveTab('tutors')}>Duyệt Hồ Sơ Gia Sư</button>
          <button className={`admin-tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>Yêu Cầu Học Kèm</button>
          <button className={`admin-tab ${activeTab === 'classes' ? 'active' : ''}`} onClick={() => setActiveTab('classes')}>Danh Sách Lớp & Học Phí</button>
          <button className={`admin-tab ${activeTab === 'finances' ? 'active' : ''}`} onClick={() => setActiveTab('finances')}>Tài Chính & Hoa Hồng</button>
          <button className={`admin-tab ${activeTab === 'support' ? 'active' : ''}`} onClick={() => setActiveTab('support')}>Yêu Cầu Đổi/Nghỉ</button>
          {currentUser && (currentUser.vaitro === 'SA' || currentUser.vaitro === 'BGD') && (
            <button className={`admin-tab ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => setActiveTab('accounts')}>Quản Lý Tài Khoản</button>
          )}
        </div>

        <div className="card-body">
          {activeTab === 'tutors' && (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Gia sư</th>
                    <th>Chuyên ngành</th>
                    <th>CCCD/SĐT</th>
                    <th>Minh chứng</th>
                    <th>Học phí mong muốn</th>
                    <th>Khu vực dạy</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTutors.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center' }}>Không có hồ sơ chờ duyệt</td></tr>
                  ) : pendingTutors.map(t => (
                    <tr key={t.mags}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {t.anhdaidien ? (
                            <img src={t.anhdaidien} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-primary)' }} />
                          ) : (
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#94a3b8' }}>N/A</div>
                          )}
                          <div>
                            <strong>{t.hoten}</strong><br/>
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{t.gioitinh} - {new Date(t.ngaysinh).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                      </td>
                      <td>{t.trinhdo || t.trinhdohocvan}<br/><span style={{fontSize:'12px',color:'#94a3b8'}}>{t.chuyennganh}</span></td>
                      <td>{t.cccd}<br/>{t.sdt}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
                          {t.anhcccd ? (
                            <a href={t.anhcccd} target="_blank" rel="noreferrer" style={{ color: 'var(--color-teal)', textDecoration: 'underline' }}>CCCD</a>
                          ) : (
                            <span style={{ color: '#ef4444' }}>Không có CCCD</span>
                          )}
                          {t.anhbangcap && (
                            <a href={t.anhbangcap} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Bằng cấp</a>
                          )}
                          {t.anhthesinhvien && (
                            <a href={t.anhthesinhvien} target="_blank" rel="noreferrer" style={{ color: 'var(--color-info)', textDecoration: 'underline' }}>Thẻ SV</a>
                          )}
                        </div>
                      </td>
                      <td>{parseInt(t.hocphimongmuon).toLocaleString()}đ</td>
                      <td>{t.khuvucday || t.khuvuc}</td>
                      <td>
                        {currentUser && currentUser.vaitro !== 'BGD' && (
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
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Học viên</th>
                    <th>Môn học</th>
                    <th>Cấp lớp</th>
                    <th>Thời gian & Yêu cầu</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>Không có yêu cầu nào</td></tr>
                  ) : requests.map(r => (
                    <tr key={r.mayc}>
                      <td><strong>{r.tenhocvien}</strong><br/>{r.sdthocvien}</td>
                      <td>{r.tenmh}</td>
                      <td>{r.caplop}</td>
                      <td>{r.thoigianmongmuon}<br/><span style={{fontSize:'12px',color:'#94a3b8'}}>{r.yc_trinhdogs || 'Không y/c trình độ'}</span></td>
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
          )}

          {activeTab === 'classes' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>Quản Lý Danh Sách Lớp Học</h3>
                <button className="btn btn-secondary" onClick={exportClasses} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={16} /> Xuất Excel Lớp Học
                </button>
              </div>
              <div className="table-responsive">
                <table className="table">
                <thead>
                  <tr>
                    <th>Mã Lớp</th>
                    <th>Môn/Lớp</th>
                    <th>Học viên</th>
                    <th>Gia sư</th>
                    <th>Học phí/buổi</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center' }}>Chưa có lớp nào</td></tr>
                  ) : classes.map(c => (
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
                        <button className="btn btn-xs btn-primary" onClick={() => handleOpenClassDetail(c.malop)} style={{marginRight:'5px'}}>
                          Chi tiết
                        </button>
                        {c.trangthai !== 'KetThuc' && c.trangthai !== 'Huy' && currentUser && currentUser.vaitro !== 'BGD' && (
                          <button className="btn btn-xs btn-rose" onClick={() => handleEndClass(c.malop)}>
                            Kết thúc
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          )}

          {activeTab === 'finances' && (
            <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3>Khoản Thu Học Phí (Học Viên)</h3>
                  <button className="btn btn-secondary" onClick={exportFinances} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Download size={16} /> Xuất Excel Doanh Thu
                  </button>
                </div>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Học viên</th>
                        <th>Lớp / Môn</th>
                        <th>Số tiền</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tuitions.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center' }}>Không có dữ liệu học phí</td></tr>
                      ) : tuitions.map(t => (
                        <tr key={t.mahp}>
                          <td><strong>{t.tenhocvien}</strong></td>
                          <td>Lớp {t.malop}<br/><span style={{fontSize:'12px',color:'#94a3b8'}}>{t.tenmh}</span></td>
                          <td>{parseInt(t.tonghocphi).toLocaleString()}đ</td>
                          <td>
                            <span className={`status-badge ${t.trangthai === 'DaNop' ? 'status-active' : 'status-pending'}`}>
                              {t.trangthai === 'DaNop' ? 'Đã nộp' : 'Chưa nộp'}
                            </span>
                          </td>
                          <td>
                            {t.trangthai !== 'DaNop' && currentUser && currentUser.vaitro !== 'BGD' && (
                              <button className="btn btn-xs btn-teal" onClick={() => handleConfirmTuition(t.mahp)}>
                                Duyệt Nộp
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 style={{ marginBottom: '15px' }}>Thanh Toán Hoa Hồng (Gia Sư)</h3>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Gia sư</th>
                        <th>Lớp / Môn</th>
                        <th>Hoa hồng</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center' }}>Không có dữ liệu hoa hồng</td></tr>
                      ) : commissions.map(c => (
                        <tr key={c.mahh}>
                          <td><strong>{c.tengiasu}</strong></td>
                          <td>Lớp {c.malop}<br/><span style={{fontSize:'12px',color:'#94a3b8'}}>{c.tenmh}</span></td>
                          <td>{parseInt(c.tonghoahong).toLocaleString()}đ</td>
                          <td>
                            <span className={`status-badge ${c.trangthai === 'DaTT' ? 'status-active' : 'status-pending'}`}>
                              {c.trangthai === 'DaTT' ? 'Đã TT' : 'Chưa TT'}
                            </span>
                          </td>
                          <td>
                            {c.trangthai !== 'DaTT' && currentUser && currentUser.vaitro !== 'BGD' && (
                              <button className="btn btn-xs btn-primary" onClick={() => handleConfirmCommission(c.mahh)}>
                                Duyệt TT
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
              <div>
                <h3 style={{ marginBottom: '15px' }}>Yêu Cầu Đổi/Nghỉ Lớp</h3>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Ngày yêu cầu</th>
                        <th>Lớp / Môn</th>
                        <th>Người gửi (Học viên/GS)</th>
                        <th>Lý do</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supportRequests.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center' }}>Không có yêu cầu nào</td></tr>
                      ) : supportRequests.map(s => (
                        <tr key={s.maycdg}>
                          <td>{new Date(s.ngayyeucau).toLocaleString('vi-VN')}</td>
                          <td>Lớp {s.malop}<br/><span style={{fontSize:'12px',color:'#94a3b8'}}>{s.tenmh}</span></td>
                          <td>
                            <strong>HV:</strong> {s.tenhocvien}<br/>
                            <strong>GS:</strong> {s.tengiasu || 'Chưa có'}
                          </td>
                          <td style={{ maxWidth: '250px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {s.lydo}
                          </td>
                          <td>
                            <span className={`status-badge ${s.trangthai === 'DaXuLy' ? 'status-active' : 'status-pending'}`}>
                              {s.trangthai === 'DaXuLy' ? 'Đã xử lý' : 'Chờ xử lý'}
                            </span>
                          </td>
                          <td>
                            {s.trangthai === 'ChoXuLy' && currentUser && currentUser.vaitro !== 'BGD' && (
                              <button className="btn btn-xs btn-teal" onClick={() => handleResolveSupport(s.maycdg)}>
                                Đánh dấu xử lý
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 style={{ marginBottom: '15px' }}>Lịch Sử Báo Vắng 1 Buổi (Học Viên & Gia Sư)</h3>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Người báo vắng</th>
                        <th>Lớp / Môn</th>
                        <th>Thời gian nghỉ</th>
                        <th>Lý do chi tiết</th>
                      </tr>
                    </thead>
                    <tbody>
                      {absences.length === 0 ? (
                        <tr><td colSpan="4" style={{ textAlign: 'center' }}>Không có lịch sử báo vắng</td></tr>
                      ) : absences.map(a => (
                        <tr key={a.mabuoi}>
                          <td>
                            {a.trangthai === 'HVVangCoPhep' ? (
                              <><span className="status-badge" style={{backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444'}}>Học viên</span><br/><strong>{a.tenhocvien}</strong></>
                            ) : (
                              <><span className="status-badge" style={{backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b'}}>Gia sư</span><br/><strong>{a.tengiasu}</strong></>
                            )}
                          </td>
                          <td>Lớp {a.malop}<br/><span style={{fontSize:'12px',color:'#94a3b8'}}>{a.tenmh}</span></td>
                          <td>
                            <strong>{new Date(a.ngayday).toLocaleDateString('vi-VN')}</strong><br/>
                            <span style={{fontSize:'12px',color:'#94a3b8'}}>{a.giobatdau.slice(0,5)} - {a.gioketthuc.slice(0,5)}</span>
                          </td>
                          <td style={{ maxWidth: '350px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: a.noidung.includes('[BẤT KHẢ KHÁNG]') ? '#ef4444' : 'inherit' }}>
                            {a.noidung}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Họ Tên</th>
                    <th>Tên Đăng Nhập</th>
                    <th>Email</th>
                    <th>Vai Trò</th>
                    <th>Trạng Thái</th>
                    <th>Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>Không có tài khoản nào</td></tr>
                  ) : accounts.map(acc => (
                    <tr key={acc.matk}>
                      <td><strong>{acc.hoten || 'Chưa cập nhật'}</strong></td>
                      <td>{acc.tendangnhap}</td>
                      <td>{acc.email || 'Không có'}</td>
                      <td>
                        <span className="status-badge" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                          {acc.vaitro === 'HV' ? 'Học viên' :
                           acc.vaitro === 'GS' ? 'Gia sư' :
                           acc.vaitro === 'NVQL' ? 'Nhân viên QL' :
                           acc.vaitro === 'BGD' ? 'Giám đốc' :
                           acc.vaitro === 'SA' ? 'System Admin' : acc.vaitro}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${acc.trangthai === 'HoatDong' ? 'status-active' : 'status-disabled'}`}>
                          {acc.trangthai === 'HoatDong' ? 'Hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className={`btn btn-xs ${acc.trangthai === 'Khoa' ? 'btn-teal' : 'btn-rose'}`} 
                          onClick={() => handleToggleLock(acc.matk, acc.trangthai)}
                        >
                          {acc.trangthai === 'Khoa' ? 'Mở khóa' : 'Khóa'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Class Creation Modal */}
      {showClassModal && selectedRequest && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>Tạo Lớp & Phân Công Gia Sư</h3>
              <span className="close-btn" onClick={() => setShowClassModal(false)}>&times;</span>
            </div>
            <form onSubmit={handleCreateClass}>
              <div className="form-group">
                <label>Mã Yêu Cầu</label>
                <input type="text" value={selectedRequest.mayc} disabled style={{background: 'rgba(255,255,255,0.05)'}} />
              </div>
              <div className="form-group">
                <label>Mã Gia Sư *</label>
                <input type="number" name="mags" required placeholder="Ví dụ: 1" />
              </div>
              <div className="form-group">
                <label>Ngày bắt đầu *</label>
                <input type="date" name="ngaybatdau" required min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="form-group">
                <label>Học phí mỗi buổi *</label>
                <input type="number" name="hocphi" required min="50000" step="50000" placeholder="VND" />
              </div>
              <div className="form-group">
                <label>Tỷ lệ Hoa hồng GS (%)</label>
                <input type="number" name="tylehh" defaultValue="70" />
              </div>
              <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '15px' }}>Tạo Lớp</button>
            </form>
          </div>
        </div>
      )}

      {/* Class Detail Modal */}
      {showClassDetailModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card" style={{ maxWidth: '700px', width: '90%' }}>
            <div className="modal-header">
              <h3>Chi Tiết Lớp Học #{classDetail?.info?.malop}</h3>
              <span className="close-btn" onClick={() => setShowClassDetailModal(false)}>&times;</span>
            </div>
            
            {loadingDetail ? (
              <div style={{ padding: '30px', textAlign: 'center' }}>Đang tải thông tin chi tiết...</div>
            ) : classDetail ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '70vh', overflowY: 'auto', paddingRight: '5px' }}>
                
                {/* Row 1: General Class Info */}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                  <h4 style={{ color: '#fff', marginBottom: '10px' }}>Thông Tin Lớp Học</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                    <div><strong>Môn học:</strong> {classDetail.info.tenmh} ({classDetail.info.caplop})</div>
                    <div><strong>Trạng thái lớp:</strong> <span className={`status-badge ${classDetail.info.classtrangthai === 'DangDay' ? 'status-active' : (classDetail.info.classtrangthai === 'KetThuc' ? 'status-disabled' : 'status-pending')}`}>{classDetail.info.classtrangthai}</span></div>
                    <div><strong>Học phí:</strong> {parseInt(classDetail.info.hocphimoibuoi).toLocaleString()}đ/buổi</div>
                    <div><strong>Tỷ lệ hoa hồng GS:</strong> {classDetail.info.tylehhgiasu}%</div>
                    <div><strong>Ngày bắt đầu:</strong> {classDetail.info.ngaybatdau ? new Date(classDetail.info.ngaybatdau).toLocaleDateString('vi-VN') : 'N/A'}</div>
                    <div><strong>Hình thức học:</strong> {classDetail.info.classhinhthuc === 'Online' ? 'Online' : 'Trực tiếp tại nhà'}</div>
                    <div style={{ gridColumn: 'span 2' }}><strong>Địa điểm:</strong> {classDetail.info.classdiadiem || 'N/A'}</div>
                  </div>
                </div>

                {/* Row 2: Student & Tutor Columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                  {/* Student Info */}
                  <div>
                    <h4 style={{ color: '#2dd4bf', marginBottom: '10px' }}>Thông Tin Học Viên</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                      <div><strong>Mã Học Viên:</strong> HV{classDetail.info.mahv?.toString().padStart(6, '0')}</div>
                      <div><strong>Họ tên:</strong> {classDetail.info.studentname}</div>
                      <div><strong>Số điện thoại:</strong> {classDetail.info.studentsdt}</div>
                      <div><strong>Email:</strong> {classDetail.info.studentemail || 'Không có'}</div>
                      <div><strong>Địa chỉ:</strong> {classDetail.info.studentdiachi || 'Không có'}</div>
                    </div>
                  </div>

                  {/* Tutor Info */}
                  <div>
                    <h4 style={{ color: '#6366f1', marginBottom: '10px' }}>Thông Tin Gia Sư</h4>
                    {classDetail.info.mags ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                        <div><strong>Mã Gia Sư:</strong> GS{classDetail.info.mags?.toString().padStart(6, '0')}</div>
                        <div><strong>Họ tên:</strong> {classDetail.info.tutorname}</div>
                        <div><strong>Số điện thoại:</strong> {classDetail.info.tutorsdt}</div>
                        <div><strong>Email:</strong> {classDetail.info.tutoremail || 'Không có'}</div>
                        <div><strong>Trình độ:</strong> {classDetail.info.tutortrinhdo} ({classDetail.info.tutorchuyennganh})</div>
                      </div>
                    ) : (
                      <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa phân công gia sư</div>
                    )}
                  </div>
                </div>

                {/* Row 3: Session Progress */}
                <div>
                  <h4 style={{ color: '#f59e0b', marginBottom: '10px' }}>Tiến Độ Buổi Học</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '10px', borderRadius: '8px' }}>
                      <span style={{ display: 'block', fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{classDetail.stats.count_daday}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Đã dạy</span>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '10px', borderRadius: '8px' }}>
                      <span style={{ display: 'block', fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>
                        {parseInt(classDetail.stats.count_hvvangcophep) + parseInt(classDetail.stats.count_hvvangkhongphep)}
                      </span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Học viên vắng ({classDetail.stats.count_hvvangcophep} có phép)</span>
                    </div>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', padding: '10px', borderRadius: '8px' }}>
                      <span style={{ display: 'block', fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>{classDetail.stats.count_gsnghi}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Gia sư nghỉ</span>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: '#ef4444' }}>Không tải được dữ liệu.</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminDashboard;
