import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, DollarSign, Trash2, CheckCircle, XCircle, LogOut } from 'lucide-react';
import Swal from 'sweetalert2';

function TutorDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showResignModal, setShowResignModal] = useState(false);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  
  const [modalMsg, setModalMsg] = useState({ text: '', type: '' });
  const [globalError, setGlobalError] = useState('');

  // Selected class for report
  const [selectedClassId, setSelectedClassId] = useState(null);
  
  // Data for Selects
  const [allSubjects, setAllSubjects] = useState([]);

  useEffect(() => {
    fetchData();
    fetchAllSubjects();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profRes, classRes, subRes, schRes, comRes] = await Promise.all([
        fetch('/api/giasu/me').then(r => r.json()),
        fetch('/api/giasu/lop').then(r => r.json()),
        fetch('/api/giasu/monhoc').then(r => r.json()),
        fetch('/api/giasu/lichranh').then(r => r.json()),
        fetch('/api/giasu/hoahong').then(r => r.json()),
      ]);

      if (!profRes.success) {
        navigate('/login');
        return;
      }

      setProfile(profRes.data);
      setClasses(classRes.data || []);
      setSubjects(subRes.data || []);
      setSchedules(schRes.data || []);
      setCommissions(comRes.data || []);
    } catch (e) {
      console.error(e);
      setGlobalError('Lỗi khi tải dữ liệu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSubjects = async () => {
    try {
      const res = await fetch('/api/monhoc');
      const json = await res.json();
      if (json.success) setAllSubjects(json.data);
    } catch (e) {
      console.error(e);
    }
  };


  const handleDeleteSchedule = async (id) => {
    const result = await Swal.fire({
      title: 'Xóa lịch rảnh',
      text: 'Bạn có chắc muốn xóa lịch rảnh này?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Xóa',
      cancelButtonText: 'Hủy',
      background: '#1e293b',
      color: '#fff'
    });
    
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/giasu/lichranh/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchData();
      } else {
        setGlobalError(json.message);
      }
    } catch (e) {
      setGlobalError('Lỗi kết nối khi xóa lịch rảnh');
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    const data = {
      mamh: e.target.mamh.value,
      caplop: e.target.caplop.value,
      hocphidexuat: e.target.hocphi.value,
      ghichu: e.target.ghichu.value
    };
    try {
      setModalMsg({ text: '', type: '' });
      const res = await fetch('/api/giasu/monhoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.success) {
        setModalMsg({ text: 'Đăng ký thành công!', type: 'success' });
        fetchData();
        setTimeout(() => {
          setShowSubjectModal(false);
          setModalMsg({ text: '', type: '' });
        }, 1500);
      } else {
        setModalMsg({ text: json.message, type: 'error' });
      }
    } catch (e) {
      setModalMsg({ text: 'Lỗi kết nối', type: 'error' });
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    const data = {
      thutrongtuan: e.target.thu.value,
      cahoc: e.target.ca.value,
      ghichu: e.target.ghichu.value
    };
    try {
      setModalMsg({ text: '', type: '' });
      const res = await fetch('/api/giasu/lichranh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.success) {
        setModalMsg({ text: 'Thêm lịch thành công!', type: 'success' });
        fetchData();
        setTimeout(() => {
          setShowScheduleModal(false);
          setModalMsg({ text: '', type: '' });
        }, 1500);
      } else {
        setModalMsg({ text: json.message, type: 'error' });
      }
    } catch (e) {
      setModalMsg({ text: 'Lỗi kết nối', type: 'error' });
    }
  };

  const handleReportClass = async (e) => {
    e.preventDefault();
    const data = {
      ngayday: e.target.ngayday.value,
      giobatdau: e.target.giobatdau.value,
      gioketthuc: e.target.gioketthuc.value,
      noidung: e.target.noidung.value,
      trangthai: e.target.trangthai.value
    };
    try {
      setModalMsg({ text: '', type: '' });
      const res = await fetch(`/api/lop/${selectedClassId}/buoiday`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.success) {
        setModalMsg({ text: 'Ghi nhận thành công!', type: 'success' });
        setTimeout(() => {
          setShowReportModal(false);
          setModalMsg({ text: '', type: '' });
        }, 1500);
      } else {
        setModalMsg({ text: json.message, type: 'error' });
      }
    } catch (e) {
      setModalMsg({ text: 'Lỗi kết nối', type: 'error' });
    }
  };

  const handleResignClass = async (e) => {
    e.preventDefault();
    try {
      setModalMsg({ text: '', type: '' });
      const res = await fetch('/api/giasu/xinnghi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          malop: selectedClassId,
          lydo: e.target.lydo.value
        })
      });
      const json = await res.json();
      if (json.success) {
        setModalMsg({ text: 'Đã gửi yêu cầu xin nghỉ thành công!', type: 'success' });
        setTimeout(() => {
          setShowResignModal(false);
          setModalMsg({ text: '', type: '' });
        }, 1500);
      } else {
        setModalMsg({ text: json.message, type: 'error' });
      }
    } catch (e) {
      setModalMsg({ text: 'Lỗi kết nối', type: 'error' });
    }
  };

  const checkEmergency = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return;
    const targetDate = new Date(`${dateStr}T${timeStr}`);
    const now = new Date();
    const diffHours = (targetDate - now) / (1000 * 60 * 60);
    setIsEmergency(diffHours >= 0 && diffHours < 24);
  };

  const handleAbsence = async (e) => {
    e.preventDefault();
    if (isEmergency && !e.target.emergencyCheck?.checked) {
      setModalMsg({ text: 'Vui lòng xác nhận đây là trường hợp bất khả kháng!', type: 'error' });
      return;
    }
    try {
      setModalMsg({ text: '', type: '' });
      let finalLyDo = e.target.lydo.value;
      if (isEmergency) finalLyDo = '[BẤT KHẢ KHÁNG] ' + finalLyDo;
      
      const res = await fetch('/api/giasu/xinnghibuoi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          malop: selectedClassId,
          ngayday: e.target.ngayday.value,
          giobatdau: e.target.giobatdau.value,
          gioketthuc: e.target.gioketthuc.value,
          lydo: finalLyDo
        })
      });
      const json = await res.json();
      if (json.success) {
        setModalMsg({ text: 'Đã báo nghỉ thành công!', type: 'success' });
        setTimeout(() => {
          setShowAbsenceModal(false);
          setModalMsg({ text: '', type: '' });
          setIsEmergency(false);
        }, 1500);
      } else {
        setModalMsg({ text: json.message, type: 'error' });
      }
    } catch (e) {
      setModalMsg({ text: 'Lỗi kết nối', type: 'error' });
    }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Đang tải...</div>;
  if (!profile) return null;

  return (
    <div className="view-section" style={{ display: 'block' }}>
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Chào gia sư, <span className="profile-name text-primary">{profile.hoten}</span>!</h2>
          <p className="mt-1">Trạng thái hồ sơ: <span className={`status-badge ${profile.trangthaihoso === 'DaDuyet' ? 'status-active' : 'status-pending'}`}>{profile.trangthaihoso}</span></p>
        </div>
      </div>

      {globalError && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
          {globalError}
        </div>
      )}

      <div className="dashboard-grid">
        <div className="grid-col-8">
          <div className="glass-card mb-4">
            <h3>Thông Tin Hồ Sơ</h3>
            <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Họ và tên</strong> {profile.hoten}</div>
              <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Ngày sinh</strong> {new Date(profile.ngaysinh).toLocaleDateString('vi-VN')}</div>
              <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Giới tính</strong> {profile.gioitinh}</div>
              <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Số ĐT</strong> {profile.sdt}</div>
              <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Email</strong> {profile.email || 'Không có'}</div>
              <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>CCCD</strong> {profile.cccd}</div>
              <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Trình độ</strong> {profile.trinhdohocvan}</div>
              <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Chuyên ngành</strong> {profile.chuyennganh}</div>
              <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Kinh nghiệm</strong> {profile.kinhnghiem} năm</div>
              <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Khu vực dạy</strong> {profile.khuvuc}</div>
              <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Học phí MM</strong> {parseInt(profile.hocphimongmuon).toLocaleString()}đ/buổi</div>
            </div>
          </div>

          <div className="glass-card mb-4">
            <h3>Lớp Học Đang Đảm Nhận</h3>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mã Lớp</th>
                      <th>Môn học</th>
                      <th>Cấp lớp</th>
                      <th>Học viên</th>
                      <th>Địa chỉ</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center' }}>Chưa nhận lớp nào</td></tr>
                    ) : (
                      classes.map(c => (
                        <tr key={c.malop}>
                          <td>{c.malop}</td>
                          <td>{c.tenmh}</td>
                          <td>{c.caplop}</td>
                          <td>{c.tenhocvien}</td>
                          <td>{c.diachi}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button className="btn btn-xs btn-primary" onClick={() => { setSelectedClassId(c.malop); setShowReportModal(true); }}>
                                Ghi nhận dạy
                              </button>
                              <button className="btn btn-xs btn-rose" onClick={() => { setSelectedClassId(c.malop); setShowResignModal(true); }}>
                                Xin nghỉ (Bỏ lớp)
                              </button>
                              <button className="btn btn-xs btn-secondary" onClick={() => { setSelectedClassId(c.malop); setShowAbsenceModal(true); setIsEmergency(false); }}>
                                Báo vắng 1 buổi
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="dashboard-grid-2">
            <div className="glass-card">
              <div className="card-header justify-between">
                <h3>Môn Học Đăng Ký Dạy</h3>
                <button className="btn btn-xs btn-primary" onClick={() => setShowSubjectModal(true)}>Đăng ký thêm</button>
              </div>
              <div className="card-body">
                <ul className="simple-list">
                  {subjects.length === 0 ? <li>Chưa có môn nào</li> : subjects.map((s, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <BookOpen size={16} className="text-primary" />
                      <span>{s.tenmh} - {s.caplop}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="glass-card">
              <div className="card-header justify-between">
                <h3>Lịch Rảnh Đăng Ký</h3>
                <button className="btn btn-xs btn-teal" onClick={() => setShowScheduleModal(true)}>Thêm lịch</button>
              </div>
              <div className="card-body">
                <ul className="simple-list">
                  {schedules.length === 0 ? <li>Chưa có lịch rảnh</li> : schedules.map(s => (
                    <li key={s.malich} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calendar size={16} className="text-teal" />
                        <span>Thứ {s.thutrongtuan} - Ca {s.cahoc}</span>
                      </div>
                      <button className="btn btn-xs btn-secondary" onClick={() => handleDeleteSchedule(s.malich)}><Trash2 size={14} /></button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="grid-col-4">
          <div className="glass-card h-full">
            <h3>Thu Nhập & Hoa Hồng</h3>
            <div className="card-body">
              {commissions.length === 0 ? (
                <p>Chưa có khoản hoa hồng nào.</p>
              ) : (
                commissions.map(c => (
                  <div key={c.mahh} style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{c.tenmh}</strong>
                      <span className={c.trangthaitt === 'DaThanhToan' ? 'text-teal' : 'text-amber'}>
                        {parseInt(c.sotien).toLocaleString()}đ
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {new Date(c.kytt_tu).toLocaleDateString()} - {new Date(c.kytt_den).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSubjectModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>Đăng Ký Môn Giảng Dạy</h3>
              <span className="close-btn" onClick={() => { setShowSubjectModal(false); setModalMsg({text:'', type:''}); }}>&times;</span>
            </div>
            {modalMsg.text && (
              <div style={{ backgroundColor: modalMsg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: modalMsg.type === 'error' ? '#ef4444' : '#10b981', border: `1px solid ${modalMsg.type === 'error' ? '#ef4444' : '#10b981'}`, padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>
                {modalMsg.text}
              </div>
            )}
            <form onSubmit={handleAddSubject}>
              <div className="form-group">
                <label>Môn học *</label>
                <select name="mamh" required>
                  {allSubjects.map(s => <option key={s.mamh} value={s.mamh}>{s.tenmh}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Cấp lớp dạy *</label>
                <select name="caplop" required>
                  <option value="Cấp 1">Cấp 1 (Lớp 1 - Lớp 5)</option>
                  <option value="Cấp 2">Cấp 2 (Lớp 6 - Lớp 9)</option>
                  <option value="Cấp 3">Cấp 3 (Lớp 10 - Lớp 12)</option>
                  <option value="Luyện thi Đại học">Luyện thi Đại học</option>
                  <option value="Tiếng Anh Giao tiếp">Tiếng Anh Giao tiếp</option>
                  <option value="Chứng chỉ Quốc tế">Chứng chỉ Quốc tế</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div className="form-group">
                <label>Học phí đề xuất (/buổi) *</label>
                <input type="number" name="hocphi" required min="50000" step="50000" />
              </div>
              <div className="form-group">
                <label>Ghi chú</label>
                <input type="text" name="ghichu" />
              </div>
              <button type="submit" className="btn btn-primary btn-block">Đăng Ký</button>
            </form>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>Đăng Ký Lịch Rảnh</h3>
              <span className="close-btn" onClick={() => { setShowScheduleModal(false); setModalMsg({text:'', type:''}); }}>&times;</span>
            </div>
            {modalMsg.text && (
              <div style={{ backgroundColor: modalMsg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: modalMsg.type === 'error' ? '#ef4444' : '#10b981', border: `1px solid ${modalMsg.type === 'error' ? '#ef4444' : '#10b981'}`, padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>
                {modalMsg.text}
              </div>
            )}
            <form onSubmit={handleAddSchedule}>
              <div className="form-group">
                <label>Thứ trong tuần *</label>
                <select name="thu" required>
                  <option value="2">Thứ 2</option><option value="3">Thứ 3</option>
                  <option value="4">Thứ 4</option><option value="5">Thứ 5</option>
                  <option value="6">Thứ 6</option><option value="7">Thứ 7</option>
                  <option value="8">Chủ Nhật</option>
                </select>
              </div>
              <div className="form-group">
                <label>Ca học *</label>
                <select name="ca" required>
                  <option value="Sang">Sáng (8h - 11h)</option>
                  <option value="Chieu">Chiều (14h - 17h)</option>
                  <option value="Toi">Tối (18h - 21h)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Ghi chú</label>
                <input type="text" name="ghichu" />
              </div>
              <button type="submit" className="btn btn-teal btn-block">Thêm Lịch</button>
            </form>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>Ghi Nhận Buổi Dạy - Lớp {selectedClassId}</h3>
              <span className="close-btn" onClick={() => { setShowReportModal(false); setModalMsg({text:'', type:''}); }}>&times;</span>
            </div>
            {modalMsg.text && (
              <div style={{ backgroundColor: modalMsg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: modalMsg.type === 'error' ? '#ef4444' : '#10b981', border: `1px solid ${modalMsg.type === 'error' ? '#ef4444' : '#10b981'}`, padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>
                {modalMsg.text}
              </div>
            )}
            <form onSubmit={handleReportClass}>
              <div className="form-group">
                <label>Ngày dạy *</label>
                <input type="date" name="ngayday" required defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Giờ bắt đầu *</label>
                  <input type="time" name="giobatdau" required defaultValue="18:00" />
                </div>
                <div className="form-group">
                  <label>Giờ kết thúc *</label>
                  <input type="time" name="gioketthuc" required defaultValue="20:00" />
                </div>
              </div>
              <div className="form-group">
                <label>Trạng thái buổi học *</label>
                <select name="trangthai" required>
                  <option value="DaDay">Đã dạy bình thường</option>
                  <option value="HVVangCoPhep">Học viên vắng (Có phép)</option>
                  <option value="HVVangKhongPhep">Học viên vắng (Không phép)</option>
                  <option value="GSNghi">Gia sư nghỉ (Có báo trước)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Nội dung bài học / Ghi chú</label>
                <textarea name="noidung" rows="3" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}></textarea>
              </div>
              <button type="submit" className="btn btn-primary btn-block">Lưu Ghi Nhận</button>
            </form>
          </div>
        </div>
      )}

      {showResignModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Xin Nghỉ Dạy - Lớp {selectedClassId}</h3>
              <span className="close-btn" onClick={() => { setShowResignModal(false); setModalMsg({text:'', type:''}); }}>&times;</span>
            </div>
            
            {modalMsg.text && (
              <div style={{ 
                backgroundColor: modalMsg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                color: modalMsg.type === 'error' ? '#ef4444' : '#10b981', 
                border: `1px solid ${modalMsg.type === 'error' ? '#ef4444' : '#10b981'}`, 
                padding: '10px', borderRadius: '6px', marginBottom: '15px' 
              }}>
                {modalMsg.text}
              </div>
            )}
            
            <form onSubmit={handleResignClass}>
              <div className="form-group">
                <label>Lý do xin nghỉ (Chi tiết) *</label>
                <textarea name="lydo" rows="4" required style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} placeholder="Ghi rõ lý do bạn muốn xin nghỉ lớp này..."></textarea>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '15px' }}>
                * Sau khi gửi yêu cầu, trung tâm sẽ liên hệ để xác nhận và chốt hoa hồng/lương.
              </p>
              <button type="submit" className="btn btn-rose btn-block">Gửi Yêu Cầu Xin Nghỉ</button>
            </form>
          </div>
        </div>
      )}

      {/* Absence Modal */}
      {showAbsenceModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Báo Vắng 1 Buổi - Lớp {selectedClassId}</h3>
              <span className="close-btn" onClick={() => { setShowAbsenceModal(false); setModalMsg({text:'', type:''}); setIsEmergency(false); }}>&times;</span>
            </div>
            
            {modalMsg.text && (
              <div style={{ 
                backgroundColor: modalMsg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                color: modalMsg.type === 'error' ? '#ef4444' : '#10b981', 
                border: `1px solid ${modalMsg.type === 'error' ? '#ef4444' : '#10b981'}`, 
                padding: '10px', borderRadius: '6px', marginBottom: '15px' 
              }}>
                {modalMsg.text}
              </div>
            )}
            
            <form onSubmit={handleAbsence}>
              <div className="form-group">
                <label>Ngày xin nghỉ *</label>
                <input type="date" name="ngayday" required min={new Date().toISOString().split('T')[0]} id="tutor_abs_date" onChange={(e) => checkEmergency(e.target.value, document.getElementById('tutor_abs_time').value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Giờ bắt đầu *</label>
                  <input type="time" name="giobatdau" id="tutor_abs_time" required onChange={(e) => checkEmergency(document.getElementById('tutor_abs_date').value, e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Giờ kết thúc *</label>
                  <input type="time" name="gioketthuc" required />
                </div>
              </div>
              
              {isEmergency && (
                <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>
                  <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 10px 0', fontWeight: 'bold' }}>
                    Cảnh báo: Bạn đang báo nghỉ sát giờ (dưới 24h).
                  </p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" name="emergencyCheck" />
                    <span>Tôi xác nhận đây là sự cố bất khả kháng.</span>
                  </label>
                </div>
              )}

              <div className="form-group">
                <label>Lý do xin nghỉ *</label>
                <textarea name="lydo" rows="3" required style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} placeholder={isEmergency ? "Vui lòng ghi rõ sự cố bất khả kháng..." : "Lý do xin nghỉ..."}></textarea>
              </div>
              <button type="submit" className="btn btn-rose btn-block">Gửi Báo Vắng</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TutorDashboard;
