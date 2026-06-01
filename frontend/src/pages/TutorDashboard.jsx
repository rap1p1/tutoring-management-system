import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, DollarSign, Trash2, CheckCircle, XCircle, LogOut, X } from 'lucide-react';
import Swal from 'sweetalert2';

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

function TutorDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistricts, setSelectedDistricts] = useState([]);

  const handleDistrictChange = (e) => {
    const value = e.target.value;
    if (e.target.checked) {
      setSelectedDistricts([...selectedDistricts, value]);
    } else {
      setSelectedDistricts(selectedDistricts.filter(d => d !== value));
    }
  };

  const removeDistrict = (value) => {
    setSelectedDistricts(selectedDistricts.filter(d => d !== value));
  };

  // Modals state
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showResignModal, setShowResignModal] = useState(false);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedSessions, setSelectedSessions] = useState([]);
  
  const [modalMsg, setModalMsg] = useState({ text: '', type: '' });
  const [globalError, setGlobalError] = useState('');

  // Selected class for report
  const [selectedClassId, setSelectedClassId] = useState(null);
  
  // Data for Selects
  const [allSubjects, setAllSubjects] = useState([]);

  // Calendar states
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [classSessions, setClassSessions] = useState([]);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(false);

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
      if (profRes.data && profRes.data.khuvuc) {
        const districts = profRes.data.khuvuc.split(',').map(s => s.trim()).filter(Boolean);
        setSelectedDistricts(districts);
      }
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
    if (selectedDays.length === 0 || selectedSessions.length === 0) {
      setModalMsg({ text: 'Vui lòng chọn ít nhất một Thứ và một Ca học!', type: 'error' });
      return;
    }
    const data = {
      thutrongtuan: selectedDays,
      cahoc: selectedSessions,
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
        setModalMsg({ text: 'Đăng ký lịch rảnh thành công!', type: 'success' });
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
    const formData = new FormData(e.target);
    const data = {
      ngayday: formData.get('ngayday'),
      giobatdau: formData.get('giobatdau'),
      gioketthuc: formData.get('gioketthuc'),
      noidung: formData.get('noidung') || '',
      trangthai: formData.get('trangthai')
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

  const fetchClassSessions = async (classId) => {
    try {
      setLoadingSessions(true);
      const res = await fetch(`/api/lop/${classId}/buoiday`);
      const json = await res.json();
      if (json.success) {
        setClassSessions(json.data || []);
      } else {
        Swal.fire({
          title: 'Lỗi',
          text: json.message || 'Không thể lấy danh sách buổi dạy',
          icon: 'error',
          background: '#1e293b',
          color: '#fff'
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleOpenCalendar = (classId) => {
    setSelectedClassId(classId);
    fetchClassSessions(classId);
    setShowCalendarModal(true);
  };

  const handleCancelSession = async (mabuoi) => {
    const result = await Swal.fire({
      title: 'Hủy buổi học',
      text: 'Bạn có chắc chắn muốn hủy mềm buổi học này không? Trạng thái sẽ được đổi thành "Huy" để lưu vết.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Đồng ý hủy',
      cancelButtonText: 'Không',
      background: '#1e293b',
      color: '#fff'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/lop/${selectedClassId}/buoiday/${mabuoi}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire({
          title: 'Thành công',
          text: 'Đã hủy buổi học thành công.',
          icon: 'success',
          background: '#1e293b',
          color: '#fff'
        });
        fetchClassSessions(selectedClassId);
      } else {
        Swal.fire({
          title: 'Lỗi',
          text: json.message || 'Không thể hủy buổi học',
          icon: 'error',
          background: '#1e293b',
          color: '#fff'
        });
      }
    } catch (e) {
      console.error(e);
      Swal.fire({
        title: 'Lỗi kết nối',
        text: 'Không thể kết nối đến máy chủ',
        icon: 'error',
        background: '#1e293b',
        color: '#fff'
      });
    }
  };

  const handleCreateSessionCalendar = async (e) => {
    e.preventDefault();
    const data = {
      ngayday: selectedDate,
      giobatdau: e.target.giobatdau.value,
      gioketthuc: e.target.gioketthuc.value,
      sogio: parseFloat(e.target.sogio.value) || 2.0,
      noidung: e.target.noidung.value,
      trangthai: 'DaDay',
      repeat: e.target.repeat.checked
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
        setModalMsg({ text: 'Đăng ký buổi dạy mới thành công!', type: 'success' });
        fetchClassSessions(selectedClassId);
        setTimeout(() => {
          setShowAddSessionModal(false);
          setModalMsg({ text: '', type: '' });
        }, 1500);
      } else {
        setModalMsg({ text: json.message, type: 'error' });
      }
    } catch (e) {
      setModalMsg({ text: 'Lỗi kết nối', type: 'error' });
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    data.khuvuc = selectedDistricts.join(', ');
    
    const fileAvatar = e.target.anhdaidien.files[0];
    const fileBangCap = e.target.anhbangcap.files[0];
    
    try {
      if (fileAvatar) data.anhdaidien = await fileToBase64(fileAvatar);
      if (fileBangCap) data.anhbangcap = await fileToBase64(fileBangCap);
      
      const res = await fetch('/api/giasu/me/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire({
          title: 'Thành công',
          text: 'Cập nhật thông tin hồ sơ thành công!',
          icon: 'success',
          background: '#1e293b',
          color: '#fff'
        });
        fetchData();
      } else {
        Swal.fire({
          title: 'Thất bại',
          text: json.message || 'Lỗi khi cập nhật hồ sơ',
          icon: 'error',
          background: '#1e293b',
          color: '#fff'
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: 'Lỗi',
        text: 'Lỗi kết nối máy chủ',
        icon: 'error',
        background: '#1e293b',
        color: '#fff'
      });
    }
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Mon-Sun index
  };

  const getSessionDateString = (dateInput) => {
    if (!dateInput) return '';
    if (typeof dateInput === 'string') {
      return dateInput.split('T')[0];
    }
    const d = new Date(dateInput);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);
  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ isPadding: true, key: `pad-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const daySessions = classSessions.filter(s => getSessionDateString(s.ngayday) === dateStr);
    cells.push({ isPadding: false, day, dateStr, daySessions, key: `day-${day}` });
  }

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Đang tải...</div>;
  if (!profile) return null;

  return (
    <div className="view-section" style={{ display: 'block' }}>
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {profile.anhdaidien && (
            <img src={profile.anhdaidien} alt="avatar" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-primary)' }} />
          )}
          <div>
            <h2>Chào gia sư, <span className="profile-name text-primary">{profile.hoten}</span>!</h2>
            <p className="mt-1">Trạng thái hồ sơ: <span className={`status-badge ${profile.trangthaihoso === 'DaDuyet' ? 'status-active' : 'status-pending'}`}>{profile.trangthaihoso}</span></p>
          </div>
        </div>
      </div>

      {profile.trangthaihoso !== 'DaDuyet' && (
        <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid #f59e0b', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4 style={{ margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ Hồ sơ đang chờ phê duyệt
          </h4>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
            Tài khoản của bạn hiện đang chờ trung tâm xét duyệt các minh chứng (CCCD, bằng cấp). Các tính năng đăng ký lịch rảnh, xem lịch dạy lớp học, nhận lớp và ghi nhận buổi dạy tạm thời bị khóa cho đến khi hồ sơ của bạn được phê duyệt chính thức.
          </p>
        </div>
      )}

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
              <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Mã Gia Sư (ID)</strong> {profile.mags ? 'GS' + profile.mags.toString().padStart(6, '0') : ''}</div>
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
              <div>
                <strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Minh chứng CCCD</strong> 
                {profile.anhcccd ? (
                  <a href={profile.anhcccd} target="_blank" rel="noreferrer" style={{ color: 'var(--color-teal)', textDecoration: 'underline' }}>Xem ảnh CCCD</a>
                ) : (
                  <span style={{ color: '#64748b' }}>Chưa tải lên</span>
                )}
              </div>
              <div>
                <strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Minh chứng Bằng tốt nghiệp</strong> 
                {profile.anhbangcap ? (
                  <a href={profile.anhbangcap} target="_blank" rel="noreferrer" style={{ color: 'var(--color-teal)', textDecoration: 'underline' }}>Xem bằng tốt nghiệp</a>
                ) : (
                  <span style={{ color: '#64748b' }}>Chưa tải lên</span>
                )}
              </div>
              <div>
                <strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Minh chứng Thẻ sinh viên</strong> 
                {profile.anhthesinhvien ? (
                  <a href={profile.anhthesinhvien} target="_blank" rel="noreferrer" style={{ color: 'var(--color-teal)', textDecoration: 'underline' }}>Xem thẻ SV</a>
                ) : (
                  <span style={{ color: '#64748b' }}>Chưa tải lên</span>
                )}
              </div>
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
                              <button 
                                className="btn btn-xs btn-teal" 
                                disabled={profile.trangthaihoso !== 'DaDuyet'} 
                                onClick={() => handleOpenCalendar(c.malop)}
                                style={profile.trangthaihoso !== 'DaDuyet' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                              >
                                Lịch dạy
                              </button>
                              <button 
                                className="btn btn-xs btn-primary" 
                                disabled={profile.trangthaihoso !== 'DaDuyet'} 
                                onClick={() => { setSelectedClassId(c.malop); setShowReportModal(true); }}
                                style={profile.trangthaihoso !== 'DaDuyet' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                              >
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
                <button 
                  className="btn btn-xs btn-teal" 
                  disabled={profile.trangthaihoso !== 'DaDuyet'} 
                  onClick={() => { setSelectedDays([]); setSelectedSessions([]); setShowScheduleModal(true); }}
                  style={profile.trangthaihoso !== 'DaDuyet' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                >
                  Thêm lịch
                </button>
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

      {/* Form Cập nhật Hồ sơ cá nhân */}
      <div className="glass-card mt-4" style={{ marginBottom: '24px' }}>
        <h3>Cập Nhật Hồ Sơ & Minh Chứng</h3>
        <form onSubmit={handleUpdateProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label>Họ Tên *</label>
              <input type="text" name="hoten" defaultValue={profile.hoten} required />
            </div>
            <div className="form-group">
              <label>Ngày sinh *</label>
              <input type="date" name="ngaysinh" defaultValue={profile.ngaysinh ? profile.ngaysinh.split('T')[0] : ''} required />
            </div>
            <div className="form-group">
              <label>Giới tính *</label>
              <select name="gioitinh" defaultValue={profile.gioitinh} required>
                <option value="Nam">Nam</option>
                <option value="Nu">Nữ</option>
                <option value="Khac">Khác</option>
              </select>
            </div>
            <div className="form-group">
              <label>Số điện thoại *</label>
              <input type="tel" name="sdt" defaultValue={profile.sdt} required />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Email *</label>
              <input type="email" name="email" defaultValue={profile.email || ''} required />
            </div>
            <div className="form-group">
              <label>Trình độ *</label>
              <select name="trinhdohocvan" defaultValue={profile.trinhdohocvan} required>
                <option value="Cao đẳng">Cao đẳng</option>
                <option value="Đại học">Đại học</option>
                <option value="Thạc sĩ">Thạc sĩ</option>
              </select>
            </div>
            <div className="form-group">
              <label>Chuyên ngành *</label>
              <select name="chuyennganh" defaultValue={profile.chuyennganh} required>
                <option value="Sư phạm Toán">Sư phạm Toán</option>
                <option value="Sư phạm Ngữ Văn">Sư phạm Ngữ Văn</option>
                <option value="Sư phạm Tiếng Anh">Sư phạm Tiếng Anh</option>
                <option value="Sư phạm Vật lý">Sư phạm Vật lý</option>
                <option value="Sư phạm Hóa học">Sư phạm Hóa học</option>
                <option value="Sư phạm Sinh học">Sư phạm Sinh học</option>
                <option value="Sư phạm Tin học">Sư phạm Tin học</option>
                <option value="Khoa học Tự nhiên (KHTN)">Tổ hợp Khoa học Tự nhiên</option>
                <option value="Khoa học Xã hội (KHXH)">Tổ hợp Khoa học Xã hội</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            <div className="form-group">
              <label>Kinh nghiệm (năm) *</label>
              <input type="number" name="kinhnghiem" defaultValue={profile.kinhnghiem} min="0" required />
            </div>
            <div className="form-group">
              <label>Học phí mong muốn *</label>
              <input type="number" name="hocphimongmuon" defaultValue={profile.hocphimongmuon} min="50000" step="50000" required />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Khu vực dạy * <span style={{fontSize:'12px', color:'#94a3b8'}}>(Có thể tick chọn nhiều)</span></label>
              
              {selectedDistricts.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  {selectedDistricts.map(d => (
                    <span key={`chip-${d}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: '#14b8a6', color: '#fff', borderRadius: '16px', fontSize: '12px', fontWeight: '500' }}>
                      {d}
                      <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeDistrict(d)} />
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', maxHeight: '150px', overflowY: 'auto', padding: '12px', border: '1px solid #334155', borderRadius: '8px', backgroundColor: '#0f172a' }}>
                {['Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8', 'Quận 10', 'Quận 11', 'Quận 12', 'Quận Bình Tân', 'Quận Bình Thạnh', 'Quận Gò Vấp', 'Quận Phú Nhuận', 'Quận Tân Bình', 'Quận Tân Phú', 'TP Thủ Đức', 'Huyện Bình Chánh', 'Huyện Cần Giờ', 'Huyện Củ Chi', 'Huyện Hóc Môn', 'Huyện Nhà Bè', 'Khác'].map(kv => (
                  <label key={kv} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', color: '#f8fafc' }}>
                    <input 
                      type="checkbox" 
                      name="khuvuc" 
                      value={kv} 
                      checked={selectedDistricts.includes(kv)}
                      onChange={handleDistrictChange}
                      style={{ width: '16px', height: '16px', accentColor: '#14b8a6', cursor: 'pointer' }} 
                    /> {kv}
                  </label>
                ))}
              </div>
            </div>
            
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <h4 style={{ margin: '15px 0 10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', color: '#f8fafc' }}>Cập Nhật Ảnh Đại Diện & Minh Chứng Mới</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>Ảnh đại diện mới (Avatar)</label>
                  <input type="file" name="anhdaidien" accept="image/*" style={{ border: 'none', background: 'none', padding: 0 }} />
                </div>
                <div className="form-group">
                  <label>Ảnh Bằng cấp mới (Nếu có)</label>
                  <input type="file" name="anhbangcap" accept="image/*" style={{ border: 'none', background: 'none', padding: 0 }} />
                </div>
              </div>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '20px' }}>Lưu thay đổi</button>
        </form>
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
                <label style={{ display: 'block', marginBottom: '8px' }}>Thứ trong tuần *</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {[
                    { label: 'Thứ 2', value: '2' },
                    { label: 'Thứ 3', value: '3' },
                    { label: 'Thứ 4', value: '4' },
                    { label: 'Thứ 5', value: '5' },
                    { label: 'Thứ 6', value: '6' },
                    { label: 'Thứ 7', value: '7' },
                    { label: 'Chủ Nhật', value: '8' }
                  ].map(day => (
                    <label key={day.value} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '13px' }}>
                      <input 
                        type="checkbox" 
                        value={day.value} 
                        checked={selectedDays.includes(day.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDays([...selectedDays, day.value]);
                          } else {
                            setSelectedDays(selectedDays.filter(d => d !== day.value));
                          }
                        }}
                      />
                      <span>{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>Ca học *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: 'Sáng (8h - 11h)', value: 'Sang' },
                    { label: 'Chiều (14h - 17h)', value: 'Chieu' },
                    { label: 'Tối (18h - 21h)', value: 'Toi' }
                  ].map(session => (
                    <label key={session.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input 
                        type="checkbox" 
                        value={session.value} 
                        checked={selectedSessions.includes(session.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSessions([...selectedSessions, session.value]);
                          } else {
                            setSelectedSessions(selectedSessions.filter(s => s !== session.value));
                          }
                        }}
                      />
                      <span>{session.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '15px' }}>
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

      {/* Calendar Modal */}
      {showCalendarModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card" style={{ maxWidth: '800px', width: '95%' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar className="text-primary" />
                Lịch Dạy - Lớp {selectedClassId}
              </h3>
              <span className="close-btn" onClick={() => { setShowCalendarModal(false); }}>&times;</span>
            </div>
            
            {/* Calendar Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <button className="btn btn-sm btn-secondary" onClick={handlePrevMonth}>&larr; Tháng trước</button>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                Tháng {calendarMonth + 1} / {calendarYear}
              </h4>
              <button className="btn btn-sm btn-secondary" onClick={handleNextMonth}>Tháng sau &rarr;</button>
            </div>

            {loadingSessions ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải lịch dạy...</div>
            ) : (
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '15px' }}>
                  💡 Click vào ô ngày trống để <strong>Đăng ký buổi dạy mới</strong>. Click vào thẻ buổi dạy (chưa hủy) để thực hiện <strong>Hủy lịch</strong>.
                </p>
                {/* Lưới các thứ trong tuần */}
                <div className="calendar-grid">
                  <div className="calendar-header-day">Thứ 2</div>
                  <div className="calendar-header-day">Thứ 3</div>
                  <div className="calendar-header-day">Thứ 4</div>
                  <div className="calendar-header-day">Thứ 5</div>
                  <div className="calendar-header-day">Thứ 6</div>
                  <div className="calendar-header-day">Thứ 7</div>
                  <div className="calendar-header-day">Chủ Nhật</div>
                </div>

                {/* Ô lịch */}
                <div className="calendar-grid">
                  {cells.map((cell, idx) => {
                    if (cell.isPadding) {
                      return <div key={cell.key} className="calendar-cell padding" />;
                    }
                    
                    const isToday = new Date().getDate() === cell.day &&
                                    new Date().getMonth() === calendarMonth &&
                                    new Date().getFullYear() === calendarYear;

                    return (
                      <div 
                        key={cell.key} 
                        className={`calendar-cell ${isToday ? 'today' : ''}`}
                        onClick={(e) => {
                          if (e.target.closest('.calendar-session-badge')) {
                            return;
                          }
                          // Do not allow registration on past dates
                          const todayStr = new Date().toISOString().split('T')[0];
                          if (cell.dateStr < todayStr) {
                            return;
                          }
                          setSelectedDate(cell.dateStr);
                          setShowAddSessionModal(true);
                        }}
                      >
                        <div className={`calendar-day-number ${isToday ? 'today' : ''}`}>{cell.day}</div>
                        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                          {cell.daySessions.map(session => {
                            const startTime = session.giobatdau.substring(0, 5);
                            const endTime = session.gioketthuc.substring(0, 5);
                            const curTodayStr = new Date().toISOString().split('T')[0];
                            
                            let badgeClass = 'status-daday';
                            let statusLabel = 'Đã dạy';

                            if (session.trangthai === 'DaDay') {
                              if (cell.dateStr >= curTodayStr) {
                                badgeClass = 'status-dadangky';
                                statusLabel = 'Đã đăng ký';
                              } else {
                                badgeClass = 'status-daday';
                                statusLabel = 'Đã dạy';
                              }
                            } else if (session.trangthai === 'HVVangCoPhep') {
                              badgeClass = 'status-vangcp';
                              statusLabel = 'Vắng CP';
                            } else if (session.trangthai === 'HVVangKhongPhep') {
                              badgeClass = 'status-vangkp';
                              statusLabel = 'Vắng KP';
                            } else if (session.trangthai === 'GSNghi') {
                              badgeClass = 'status-gsnghi';
                              statusLabel = 'GS Nghi';
                            } else if (session.trangthai === 'Huy') {
                              badgeClass = 'status-huy';
                              statusLabel = 'Đã hủy';
                            }

                            return (
                              <div
                                key={session.mabuoi}
                                className={`calendar-session-badge ${badgeClass}`}
                                title={`${startTime} - ${endTime}: ${statusLabel}${session.noidung ? ` (${session.noidung})` : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (session.trangthai !== 'Huy') {
                                    handleCancelSession(session.mabuoi);
                                  } else {
                                    Swal.fire({
                                      title: 'Thông báo',
                                      text: 'Buổi học này đã được hủy trước đó.',
                                      icon: 'info',
                                      background: '#1e293b',
                                      color: '#fff'
                                    });
                                  }
                                }}
                                style={{ cursor: session.trangthai !== 'Huy' ? 'pointer' : 'default' }}
                              >
                                {startTime} {statusLabel}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Session Modal from Calendar */}
      {showAddSessionModal && (
        <div className="modal" style={{ display: 'flex', zIndex: 300 }}>
          <div className="modal-content glass-card" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Đăng Ký Buổi Dạy Mới</h3>
              <span className="close-btn" onClick={() => { setShowAddSessionModal(false); setModalMsg({text:'', type:''}); }}>&times;</span>
            </div>
            {modalMsg.text && (
              <div style={{ backgroundColor: modalMsg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: modalMsg.type === 'error' ? '#ef4444' : '#10b981', border: `1px solid ${modalMsg.type === 'error' ? '#ef4444' : '#10b981'}`, padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>
                {modalMsg.text}
              </div>
            )}
            <form onSubmit={handleCreateSessionCalendar}>
              <div className="form-group">
                <label>Ngày dạy</label>
                <input type="text" name="ngayday" value={selectedDate} readOnly style={{ opacity: 0.8, cursor: 'not-allowed' }} />
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Số giờ dạy (Ví dụ: 2)</label>
                  <input type="number" name="sogio" step="0.5" defaultValue="2" />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '13px' }}>
                    <input type="checkbox" name="repeat" defaultChecked style={{ width: 'auto' }} />
                    <span>Lặp lại hàng tuần đến hết khóa</span>
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Nội dung bài học / Ghi chú</label>
                <textarea name="noidung" rows="3" placeholder="Ví dụ: Dạy bài hàm số mũ..."></textarea>
              </div>
              <button type="submit" className="btn btn-primary btn-block">Đăng ký buổi dạy</button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
          margin-top: 10px;
          margin-bottom: 10px;
        }
        .calendar-header-day {
          text-align: center;
          font-weight: 700;
          color: var(--text-muted);
          padding: 8px 0;
          font-size: 13px;
          text-transform: uppercase;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .calendar-cell {
          min-height: 100px;
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.01);
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          transition: var(--transition-smooth);
          cursor: pointer;
          position: relative;
        }
        .calendar-cell:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: var(--color-primary);
        }
        .calendar-cell.padding {
          background: transparent;
          border-color: transparent;
          cursor: default;
          pointer-events: none;
        }
        .calendar-cell.today {
          border-color: var(--color-teal);
          background: rgba(13, 148, 136, 0.05);
        }
        .calendar-day-number {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 6px;
        }
        .calendar-day-number.today {
          color: var(--color-teal);
          font-weight: 800;
        }
        .calendar-session-badge {
          font-size: 10px;
          padding: 3px 6px;
          border-radius: 4px;
          margin-top: 4px;
          display: block;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          transition: var(--transition-smooth);
          font-weight: 500;
        }
        .calendar-session-badge.status-daday {
          background: rgba(16, 185, 129, 0.15);
          color: var(--color-success);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .calendar-session-badge.status-dadangky {
          background: rgba(99, 102, 241, 0.15);
          color: hsla(235, 90%, 75%, 1);
          border: 1px solid rgba(99, 102, 241, 0.3);
        }
        .calendar-session-badge.status-vangcp {
          background: rgba(59, 130, 246, 0.15);
          color: var(--color-info);
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .calendar-session-badge.status-vangkp {
          background: rgba(245, 158, 11, 0.15);
          color: var(--color-warning);
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        .calendar-session-badge.status-gsnghi {
          background: rgba(139, 92, 246, 0.15);
          color: hsla(250, 95%, 75%, 1);
          border: 1px solid rgba(139, 92, 246, 0.3);
        }
        .calendar-session-badge.status-huy {
          background: rgba(239, 68, 68, 0.08);
          color: var(--color-danger);
          border: 1px solid rgba(239, 68, 68, 0.15);
          text-decoration: line-through;
          opacity: 0.6;
        }
        .calendar-session-badge:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}

export default TutorDashboard;
