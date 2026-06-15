import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, PlusCircle, Star, Calendar } from 'lucide-react';
import Swal from 'sweetalert2';

function StudentDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [classes, setClasses] = useState([]);
  const [tuitions, setTuitions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [classSessions, setClassSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [allSubjects, setAllSubjects] = useState([]);
  const [modalMsg, setModalMsg] = useState({ text: '', type: '' });
  const [globalError, setGlobalError] = useState('');

  const [scheduleGrid, setScheduleGrid] = useState({});
  const [defaultHocPhis, setDefaultHocPhis] = useState({
    HocPhi_Cap1: 100000,
    HocPhi_Cap2: 200000,
    HocPhi_Cap3: 300000,
    HocPhi_LuyenThiDH: 400000,
    HocPhi_TiengAnhGT: 350000,
    HocPhi_ChungChiQT: 500000,
    HocPhi_Khac: 250000
  });

  useEffect(() => {
    fetchData();
    fetchAllSubjects();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profRes, reqRes, classRes, tuitionRes, hpRes] = await Promise.all([
        fetch('/api/hocvien/me').then(r => r.json()),
        fetch('/api/hocvien/yeucau').then(r => r.json()),
        fetch('/api/hocvien/lop').then(r => r.json()),
        fetch('/api/hocvien/hochphi').then(r => r.json()),
        fetch('/api/hocvien/config/hocphi').then(r => r.json())
      ]);

      if (!profRes.success) {
        navigate('/login');
        return;
      }

      setProfile(profRes.data);
      setRequests(reqRes.data || []);
      setClasses(classRes.data || []);
      setTuitions(tuitionRes.data || []);
      if (hpRes && hpRes.success) {
        setDefaultHocPhis(hpRes.data);
      }
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

  const toggleSchedule = (thu, buoi) => {
    const key = `${thu}-${buoi}`;
    setScheduleGrid(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getSelectedSchedule = () => {
    const result = [];
    Object.entries(scheduleGrid).forEach(([key, val]) => {
      if (val) {
        const [thu, buoi] = key.split('-');
        result.push({ thu: parseInt(thu), buoi });
      }
    });
    return result;
  };

  const handleAddRequest = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const lichHoc = getSelectedSchedule();
    if (lichHoc.length === 0) {
      setModalMsg({ text: 'Vui lòng chọn ít nhất 1 buổi học trong tuần!', type: 'error' });
      return;
    }

    try {
      setModalMsg({ text: '', type: '' });
      const res = await fetch('/api/hocvien/yeucau', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mamh: data.mamh,
          caplop: data.caplop,
          hinhthuchoc: data.hinhthuc,
          yc_gioitinhgs: data.gioitinh,
          yc_trinhdogs: data.trinhdo,
          songayhoc: 0,
          lichhoctrongtuan: JSON.stringify(lichHoc),
          diachi: data.diachi,
          ghichu: data.ghichu
        })
      });
      const json = await res.json();
      if (json.success) {
        setModalMsg({ text: 'Gửi yêu cầu thành công!', type: 'success' });
        fetchData();
        setTimeout(() => {
          setShowRequestModal(false);
          setModalMsg({ text: '', type: '' });
          setScheduleGrid({});
        }, 1500);
      } else {
        setModalMsg({ text: json.message, type: 'error' });
      }
    } catch (e) {
      setModalMsg({ text: 'Lỗi kết nối', type: 'error' });
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      setModalMsg({ text: '', type: '' });
      const res = await fetch('/api/hocvien/danhgia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          malop: selectedClassId,
          diem: e.target.diem.value,
          nhanxet: e.target.nhanxet.value
        })
      });
      const json = await res.json();
      if (json.success) {
        setModalMsg({ text: 'Cảm ơn bạn đã đánh giá!', type: 'success' });
        setTimeout(() => {
          setShowReviewModal(false);
          setModalMsg({ text: '', type: '' });
        }, 1500);
      } else {
        setModalMsg({ text: json.message, type: 'error' });
      }
    } catch (e) {
      setModalMsg({ text: 'Lỗi kết nối', type: 'error' });
    }
  };

  const handleChangeTutor = async (e) => {
    e.preventDefault();
    try {
      setModalMsg({ text: '', type: '' });
      const res = await fetch('/api/hocvien/doigiasu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          malop: selectedClassId,
          lydo: e.target.lydo.value
        })
      });
      const json = await res.json();
      if (json.success) {
        setModalMsg({ text: 'Đã gửi yêu cầu thành công!', type: 'success' });
        setTimeout(() => {
          setShowChangeModal(false);
          setModalMsg({ text: '', type: '' });
        }, 1500);
      } else {
        setModalMsg({ text: json.message, type: 'error' });
      }
    } catch (e) {
      setModalMsg({ text: 'Lỗi kết nối', type: 'error' });
    }
  };

  const handleAbsence = async (e) => {
    e.preventDefault();
    try {
      setModalMsg({ text: '', type: '' });
      const res = await fetch('/api/hocvien/xinnghibuoi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          malop: selectedClassId,
          ngayday: e.target.ngayday.value,
          cahoc: e.target.cahoc.value,
          lydo: e.target.lydo.value
        })
      });
      const json = await res.json();
      if (json.success) {
        setModalMsg({ text: 'Đã báo nghỉ thành công!', type: 'success' });
        setTimeout(() => {
          setShowAbsenceModal(false);
          setModalMsg({ text: '', type: '' });
        }, 1500);
      } else {
        setModalMsg({ text: json.message, type: 'error' });
      }
    } catch (e) {
      setModalMsg({ text: 'Lỗi kết nối', type: 'error' });
    }
  };

  const handlePrevMonth = () => {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); }
    else { setCalendarMonth(calendarMonth - 1); }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); }
    else { setCalendarMonth(calendarMonth + 1); }
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const getSessionDateString = (dateInput) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const caHocLabel = (ca) => {
    const map = { 'Sang': 'Sáng', 'Chieu': 'Chiều', 'Toi': 'Tối' };
    return map[ca] || ca;
  };

  const fetchClassSessions = async (classId) => {
    try {
      setLoadingSessions(true);
      const res = await fetch(`/api/lop/${classId}/buoiday`);
      const json = await res.json();
      if (json.success) {
        setClassSessions(json.data || []);
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

  const handleStudentAbsenceClick = async (session) => {
    const reasonResult = await Swal.fire({
      title: 'Báo vắng học viên',
      text: `Nhập lý do xin nghỉ cho ngày ${new Date(session.ngayday).toLocaleDateString('vi-VN')} (Ca ${caHocLabel(session.cahoc)}):`,
      input: 'textarea',
      inputPlaceholder: 'Nhập lý do xin nghỉ...',
      showCancelButton: true,
      confirmButtonText: 'Báo vắng',
      cancelButtonText: 'Hủy',
      background: '#1e293b',
      color: '#fff',
      inputValidator: (value) => {
        if (!value) return 'Vui lòng nhập lý do!';
      }
    });

    if (reasonResult.isConfirmed && reasonResult.value) {
      try {
        const res = await fetch('/api/hocvien/xinnghibuoi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            malop: selectedClassId,
            ngayday: getSessionDateString(session.ngayday),
            cahoc: session.cahoc,
            lydo: reasonResult.value
          })
        });
        const json = await res.json();
        if (json.success) {
          Swal.fire({ title: 'Thành công', text: 'Báo nghỉ thành công!', icon: 'success', background: '#1e293b', color: '#fff' });
          fetchClassSessions(selectedClassId);
        } else {
          Swal.fire({ title: 'Lỗi', text: json.message, icon: 'error', background: '#1e293b', color: '#fff' });
        }
      } catch (e) {
        Swal.fire({ title: 'Lỗi kết nối', text: 'Không thể kết nối đến máy chủ', icon: 'error', background: '#1e293b', color: '#fff' });
      }
    }
  };

  const handlePayTuition = async (mahp) => {
    const result = await Swal.fire({
      title: 'Nộp học phí',
      text: 'Bạn xác nhận muốn nộp học phí cho hóa đơn này?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#14b8a6',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Xác nhận nộp',
      cancelButtonText: 'Hủy',
      background: '#1e293b',
      color: '#fff'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/hocvien/hocphi/${mahp}/nop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire({ title: 'Thành công', text: json.message, icon: 'success', background: '#1e293b', color: '#fff' });
        fetchData();
      } else {
        Swal.fire({ title: 'Lỗi', text: json.message, icon: 'error', background: '#1e293b', color: '#fff' });
      }
    } catch (e) {
      Swal.fire({ title: 'Lỗi kết nối', text: 'Không thể kết nối đến máy chủ', icon: 'error', background: '#1e293b', color: '#fff' });
    }
  };

  const formatLichHoc = (lichHocStr) => {
    try {
      const lichHoc = typeof lichHocStr === 'string' ? JSON.parse(lichHocStr) : lichHocStr;
      if (!Array.isArray(lichHoc) || lichHoc.length === 0) return 'Chưa có';
      const thuMap = { 2: 'T2', 3: 'T3', 4: 'T4', 5: 'T5', 6: 'T6', 7: 'T7', 8: 'CN' };
      const buoiMap = { 'Sang': 'Sáng', 'Chieu': 'Chiều', 'Toi': 'Tối' };
      return lichHoc.map(item => `${thuMap[item.thu]} ${buoiMap[item.buoi]}`).join(', ');
    } catch (e) {
      return lichHocStr || 'Chưa có';
    }
  };

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Đang tải...</div>;
  if (!profile) return null;

  const days = [
    { label: 'Thứ 2', value: 2 },
    { label: 'Thứ 3', value: 3 },
    { label: 'Thứ 4', value: 4 },
    { label: 'Thứ 5', value: 5 },
    { label: 'Thứ 6', value: 6 },
    { label: 'Thứ 7', value: 7 },
    { label: 'CN', value: 8 }
  ];
  const sessions = [
    { label: 'Sáng (7:00 - 10:00)', value: 'Sang' },
    { label: 'Chiều (14:00 - 17:00)', value: 'Chieu' },
    { label: 'Tối (18:00 - 21:00)', value: 'Toi' }
  ];

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

  return (
    <div className="view-section" style={{ display: 'block' }}>
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Chào học viên, <span className="profile-name text-teal">{profile.hoten}</span>!</h2>
          <p>Tìm gia sư chất lượng và theo dõi kết quả học tập của bạn.</p>
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
            <h3>Hồ Sơ Cá Nhân</h3>
            <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div><strong style={{ color: '#94a3b8', display: 'block', fontSize: '12px' }}>Mã Học Viên (ID)</strong> {profile.mahv ? 'HV' + profile.mahv.toString().padStart(6, '0') : ''}</div>
              <div><strong style={{ color: '#94a3b8', display: 'block', fontSize: '12px' }}>Họ và tên</strong> {profile.hoten}</div>
              <div><strong style={{ color: '#94a3b8', display: 'block', fontSize: '12px' }}>Ngày sinh</strong> {new Date(profile.ngaysinh).toLocaleDateString('vi-VN')}</div>
              <div><strong style={{ color: '#94a3b8', display: 'block', fontSize: '12px' }}>Số điện thoại</strong> {profile.sdt}</div>
              <div><strong style={{ color: '#94a3b8', display: 'block', fontSize: '12px' }}>Email</strong> {profile.email || 'Không có'}</div>
            </div>
          </div>

          <div className="glass-card mb-4">
            <div className="card-header justify-between">
              <h3>Yêu Cầu Học Kèm Của Bạn</h3>
              <button className="btn btn-sm btn-teal" onClick={() => { setShowRequestModal(true); setScheduleGrid({}); }} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <PlusCircle size={16} /> Gửi Yêu Cầu Mới
              </button>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ngày gửi</th>
                      <th>Môn học</th>
                      <th>Cấp lớp</th>
                      <th>Số buổi đã học / Lịch học</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center' }}>Chưa có yêu cầu nào</td></tr>
                    ) : (
                      requests.map(r => (
                        <tr key={r.mayc}>
                          <td>{new Date(r.ngaydangky).toLocaleDateString()}</td>
                          <td>{r.tenmh}</td>
                          <td>{r.caplop}</td>
                          <td>
                            <strong>Đã học: {r.songayhoc} buổi</strong><br />
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{formatLichHoc(r.lichhoctrongtuan)}</span>
                          </td>
                          <td>
                            <span className={`status-badge ${r.trangthai === 'DaGhep' ? 'status-active' : 'status-pending'}`}>
                              {r.trangthai === 'ChoGhep' ? 'Chờ ghép' : 'Đã ghép'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3>Lớp Học Đang Học</h3>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mã Lớp</th>
                      <th>Môn học</th>
                      <th>Cấp lớp</th>
                      <th>Gia sư</th>
                      <th>Học phí/Buổi</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center' }}>Chưa có lớp nào</td></tr>
                    ) : (
                      classes.map(c => (
                        <tr key={c.malop}>
                          <td>{c.malop}</td>
                          <td>{c.tenmh}</td>
                          <td>{c.caplop}</td>
                          <td>{c.tengiasu || 'Chưa phân công'}</td>
                          <td>{c.hocphimoibuoi ? parseInt(c.hocphimoibuoi).toLocaleString() + 'đ' : 'Chưa xếp'}</td>
                          <td>
                            {c.tengiasu && (
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button className="btn btn-xs btn-primary" onClick={() => { setSelectedClassId(c.malop); setShowReviewModal(true); }}>
                                  Đánh giá GS
                                </button>
                                <button className="btn btn-xs btn-secondary" onClick={() => { setSelectedClassId(c.malop); setShowChangeModal(true); }}>
                                  Đổi GS/Nghỉ
                                </button>
                                <button className="btn btn-xs btn-teal" onClick={() => handleOpenCalendar(c.malop)}>
                                  📅 Lịch học & Báo vắng
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="grid-col-4">
          <div className="glass-card h-full">
            <h3>Học Phí Cần Thanh Toán</h3>
            <div className="card-body">
              {tuitions.length === 0 ? (
                <p>Không có hóa đơn học phí nào.</p>
              ) : (
                tuitions.map(t => (
                  <div key={t.mahp} style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <strong>{t.tenmh}</strong>
                      <span className={t.trangthai === 'DaNop' ? 'text-teal' : (t.trangthai === 'ChoXacNhan' ? 'text-warning' : 'text-rose')}>
                        {parseInt(t.tonghocphi || 0).toLocaleString()}đ
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {t.sobuoi || 0} buổi × {parseInt(t.hocphimoibuoi || 0).toLocaleString()}đ
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span>
                        Trạng thái: {t.trangthai === 'DaNop' ? 'Đã Thanh Toán' : (t.trangthai === 'ChoXacNhan' ? 'Chờ xác nhận' : 'Chưa Thanh Toán')}
                      </span>
                      {t.trangthai === 'ChuaNop' && (
                        <button
                          className="btn btn-xs btn-teal"
                          onClick={() => handlePayTuition(t.mahp)}
                          style={{ padding: '2px 8px', fontSize: '11px' }}
                        >
                          Nộp học phí
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Request Modal - ĐƠN GIẢN HÓA */}
      {showRequestModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Gửi Yêu Cầu Học Kèm Mới</h3>
              <span className="close-btn" onClick={() => { setShowRequestModal(false); setModalMsg({ text: '', type: '' }); setScheduleGrid({}); }}>&times;</span>
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

            <form onSubmit={handleAddRequest}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Môn học *</label>
                  <select name="mamh" required>
                    {allSubjects.map(s => <option key={s.mamh} value={s.mamh}>{s.tenmh}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Cấp lớp *</label>
                  <select name="caplop" required>
                    <option value="Cấp 1">Cấp 1 (Lớp 1 - Lớp 5) - {defaultHocPhis.HocPhi_Cap1.toLocaleString()}đ/buổi</option>
                    <option value="Cấp 2">Cấp 2 (Lớp 6 - Lớp 9) - {defaultHocPhis.HocPhi_Cap2.toLocaleString()}đ/buổi</option>
                    <option value="Cấp 3">Cấp 3 (Lớp 10 - Lớp 12) - {defaultHocPhis.HocPhi_Cap3.toLocaleString()}đ/buổi</option>
                    <option value="Luyện thi Đại học">Luyện thi Đại học - {defaultHocPhis.HocPhi_LuyenThiDH.toLocaleString()}đ/buổi</option>
                    <option value="Tiếng Anh Giao tiếp">Tiếng Anh Giao tiếp - {defaultHocPhis.HocPhi_TiengAnhGT.toLocaleString()}đ/buổi</option>
                    <option value="Chứng chỉ Quốc tế">Chứng chỉ Quốc tế - {defaultHocPhis.HocPhi_ChungChiQT.toLocaleString()}đ/buổi</option>
                    <option value="Khác">Khác - {defaultHocPhis.HocPhi_Khac.toLocaleString()}đ/buổi</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Hình thức học</label>
                  <select name="hinhthuc">
                    <option value="TrucTiep">Trực tiếp tại nhà</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
              </div>

              {/* Bảng chọn lịch học */}
              <div className="form-group" style={{ marginTop: '10px' }}>
                <label style={{ marginBottom: '10px', display: 'block' }}>Lịch học trong tuần * <span style={{ fontSize: '12px', color: '#94a3b8' }}>(Tick chọn thứ + buổi)</span></label>
                <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}>
                        <th style={{ padding: '10px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>Ca học</th>
                        {days.map(d => (
                          <th key={d.value} style={{ padding: '10px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>{d.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(s => (
                        <tr key={s.value}>
                          <td style={{ padding: '10px', fontSize: '12px', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{s.label}</td>
                          {days.map(d => {
                            const key = `${d.value}-${s.value}`;
                            const isChecked = scheduleGrid[key] || false;
                            return (
                              <td key={key} style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSchedule(d.value, s.value)}
                                  style={{ width: '18px', height: '18px', accentColor: '#14b8a6', cursor: 'pointer' }}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {getSelectedSchedule().length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#10b981' }}>
                    ✅ Đã chọn: {formatLichHoc(getSelectedSchedule())}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Yêu cầu giới tính gia sư</label>
                  <select name="gioitinh">
                    <option value="KhongYeuCau">Không yêu cầu</option>
                    <option value="Nam">Nam</option>
                    <option value="Nu">Nữ</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Yêu cầu trình độ gia sư</label>
                  <input type="text" name="trinhdo" placeholder="VD: Sinh viên Sư phạm" />
                </div>
              </div>
              <div className="form-group">
                <label>Khu vực học / Nơi ở *</label>
                <select name="diachi" required>
                  {['Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8', 'Quận 10', 'Quận 11', 'Quận 12', 'Quận Bình Tân', 'Quận Bình Thạnh', 'Quận Gò Vấp', 'Quận Phú Nhuận', 'Quận Tân Bình', 'Quận Tân Phú', 'TP Thủ Đức', 'Huyện Bình Chánh', 'Khác'].map(kv => (
                    <option key={kv} value={kv}>{kv}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Ghi chú thêm</label>
                <textarea name="ghichu" placeholder="Các thông tin lưu ý khác..." rows="2" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}></textarea>
              </div>
              <button type="submit" className="btn btn-teal btn-block" style={{ marginTop: '15px' }}>Gửi Yêu Cầu</button>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Đánh Giá Gia Sư - Lớp {selectedClassId}</h3>
              <span className="close-btn" onClick={() => { setShowReviewModal(false); setModalMsg({ text: '', type: '' }); }}>&times;</span>
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

            <form onSubmit={handleReview}>
              <div className="form-group">
                <label>Đánh giá sao (1-5) *</label>
                <select name="diem" required>
                  <option value="5">⭐⭐⭐⭐⭐ - Rất tốt</option>
                  <option value="4">⭐⭐⭐⭐ - Tốt</option>
                  <option value="3">⭐⭐⭐ - Bình thường</option>
                  <option value="2">⭐⭐ - Kém</option>
                  <option value="1">⭐ - Rất kém</option>
                </select>
              </div>
              <div className="form-group">
                <label>Nhận xét / Góp ý</label>
                <textarea name="nhanxet" rows="4" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} placeholder="Viết nhận xét của bạn về gia sư..."></textarea>
              </div>
              <button type="submit" className="btn btn-primary btn-block">Gửi Đánh Giá</button>
            </form>
          </div>
        </div>
      )}

      {/* Change Tutor Modal */}
      {showChangeModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Yêu Cầu Đổi Gia Sư / Nghỉ Học</h3>
              <span className="close-btn" onClick={() => { setShowChangeModal(false); setModalMsg({ text: '', type: '' }); }}>&times;</span>
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

            <form onSubmit={handleChangeTutor}>
              <div className="form-group">
                <label>Lý do (Chi tiết) *</label>
                <textarea name="lydo" rows="4" required style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} placeholder="Ghi rõ lý do bạn muốn đổi gia sư hoặc nghỉ học..."></textarea>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '15px' }}>
                * Sau khi gửi yêu cầu, trung tâm sẽ liên hệ với bạn để xác nhận và xử lý phần học phí (nếu có).
              </p>
              <button type="submit" className="btn btn-rose btn-block">Gửi Yêu Cầu</button>
            </form>
          </div>
        </div>
      )}

      {/* Absence Modal - ĐƠN GIẢN HÓA: Chỉ cần chọn ngày + ca */}
      {showAbsenceModal && (
          <div className="modal" style={{ display: 'flex', zIndex: 300 }}>
          <div className="modal-content glass-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Báo Nghỉ 1 Buổi - Lớp {selectedClassId}</h3>
              <span className="close-btn" onClick={() => { setShowAbsenceModal(false); setModalMsg({ text: '', type: '' }); }}>&times;</span>
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
                <input type="date" name="ngayday" required min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="form-group">
                <label>Ca học *</label>
                <select name="cahoc" required>
                  <option value="Sang">Sáng (7:00 - 10:00)</option>
                  <option value="Chieu">Chiều (14:00 - 17:00)</option>
                  <option value="Toi">Tối (18:00 - 21:00)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Lý do xin nghỉ *</label>
                <textarea name="lydo" rows="3" required style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} placeholder="Lý do xin nghỉ..."></textarea>
              </div>
              <button type="submit" className="btn btn-rose btn-block">Gửi Báo Nghỉ</button>
            </form>
          </div>
        </div>
      )}

      {/* Calendar Modal - ĐƠN GIẢN HÓA: Click báo vắng */}
      {showCalendarModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card" style={{ maxWidth: '850px', width: '95%' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar className="text-teal" />
                Lịch Học & Báo Vắng - Lớp {selectedClassId}
              </h3>
              <span className="close-btn" onClick={() => { setShowCalendarModal(false); }}>&times;</span>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', flexWrap: 'wrap', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', display: 'inline-block' }}></span> Chờ xác nhận</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', display: 'inline-block' }}></span> Đã dạy</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', display: 'inline-block' }}></span> Vắng có phép / GS nghỉ</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '14px', height: '14px', borderRadius: '3px', background: 'rgba(100,100,100,0.15)', border: '1px solid #64748b', display: 'inline-block' }}></span> Đã hủy</span>
            </div>

            {/* Calendar Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <button className="btn btn-sm btn-secondary" onClick={handlePrevMonth}>&larr; Tháng trước</button>
              
    <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
      <h4 style={{ margin: 0, fontSize: "18px", fontWeight: "bold" }}>
        
                Tháng {calendarMonth + 1} / {calendarYear}
              
      </h4>
      <button className="btn btn-sm btn-rose" onClick={() => setShowAbsenceModal(true)}>
        + Xin nghỉ / Báo vắng
      </button>
    </div>
  
              <button className="btn btn-sm btn-secondary" onClick={handleNextMonth}>Tháng sau &rarr;</button>
            </div>

            {loadingSessions ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải lịch học...</div>
            ) : (
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '15px' }}>
                  💡 Click vào ô <strong style={{ color: '#f59e0b' }}>vàng (Chờ xác nhận)</strong> để xin nghỉ/báo vắng cho buổi học đó.
                </p>
                <div className="calendar-grid">
                  <div className="calendar-header-day">Thứ 2</div>
                  <div className="calendar-header-day">Thứ 3</div>
                  <div className="calendar-header-day">Thứ 4</div>
                  <div className="calendar-header-day">Thứ 5</div>
                  <div className="calendar-header-day">Thứ 6</div>
                  <div className="calendar-header-day">Thứ 7</div>
                  <div className="calendar-header-day">CN</div>
                </div>

                <div className="calendar-grid">
                  {cells.map((cell) => {
                    if (cell.isPadding) {
                      return <div key={cell.key} className="calendar-cell padding" />;
                    }

                    const isToday = new Date().getDate() === cell.day &&
                      new Date().getMonth() === calendarMonth &&
                      new Date().getFullYear() === calendarYear;

                    return (
                      <div key={cell.key} className={`calendar-cell ${isToday ? 'today' : ''}`}>
                        <div className={`calendar-day-number ${isToday ? 'today' : ''}`}>{cell.day}</div>
                        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                          {cell.daySessions.map(session => {
                            let badgeClass = '';
                            let statusLabel = '';
                            let clickable = false;

                            if (session.trangthai === 'ChoXacNhan') {
                              badgeClass = 'status-choxacnhan';
                              statusLabel = `${caHocLabel(session.cahoc)} - Chờ xác nhận`;
                              clickable = true;
                            } else if (session.trangthai === 'DaDay') {
                              badgeClass = 'status-daday';
                              statusLabel = `${caHocLabel(session.cahoc)} - ✓ Đã dạy`;
                            } else if (session.trangthai === 'HVXinNghi') {
                              badgeClass = 'status-choxacnhan';
                              statusLabel = `${caHocLabel(session.cahoc)} - HV xin nghỉ`;
                            } else if (session.trangthai === 'GSXinNghi') {
                              badgeClass = 'status-choxacnhan';
                              statusLabel = `${caHocLabel(session.cahoc)} - GS xin nghỉ`;
                            } else if (session.trangthai === 'HVVangCoPhep') {
                              badgeClass = 'status-vang';
                              statusLabel = `${caHocLabel(session.cahoc)} - HV vắng`;
                            } else if (session.trangthai === 'GSNghi') {
                              badgeClass = 'status-vang';
                              statusLabel = `${caHocLabel(session.cahoc)} - GS nghỉ`;
                            } else if (session.trangthai === 'Huy') {
                              badgeClass = 'status-huy';
                              statusLabel = `${caHocLabel(session.cahoc)} - Hủy`;
                            }

                            return (
                              <div
                                key={session.mabuoi}
                                className={`calendar-session-badge ${badgeClass}`}
                                title={session.noidung || statusLabel}
                                onClick={() => {
                                  if (clickable) handleStudentAbsenceClick(session);
                                }}
                                style={{ cursor: clickable ? 'pointer' : 'default' }}
                              >
                                {statusLabel}
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

      <style>{`
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          margin-top: 8px;
          margin-bottom: 8px;
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
          min-height: 90px;
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 6px;
          background: rgba(255, 255, 255, 0.01);
          display: flex;
          flex-direction: column;
          transition: var(--transition-smooth);
          position: relative;
        }
        .calendar-cell:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .calendar-cell.padding {
          background: transparent;
          border-color: transparent;
          pointer-events: none;
        }
        .calendar-cell.today {
          border-color: var(--color-teal);
          background: rgba(20, 184, 166, 0.05);
        }
        .calendar-day-number {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .calendar-day-number.today {
          color: var(--color-teal);
          font-weight: 800;
        }
        .calendar-session-badge {
          font-size: 9px;
          padding: 3px 5px;
          border-radius: 4px;
          margin-top: 3px;
          display: block;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          transition: var(--transition-smooth);
          font-weight: 600;
        }
        .calendar-session-badge.status-choxacnhan {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.4);
        }
        .calendar-session-badge.status-choxacnhan:hover {
          background: rgba(245, 158, 11, 0.35);
          transform: scale(1.03);
        }
        .calendar-session-badge.status-daday {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.4);
        }
        .calendar-session-badge.status-vang {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }
        .calendar-session-badge.status-huy {
          background: rgba(100, 100, 100, 0.15);
          color: #888;
          border: 1px solid rgba(100, 100, 100, 0.3);
          text-decoration: line-through;
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}

export default StudentDashboard;
