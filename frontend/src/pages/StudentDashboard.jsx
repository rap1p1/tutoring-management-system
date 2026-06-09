import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, PlusCircle, Star } from 'lucide-react';

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
  const [isEmergency, setIsEmergency] = useState(false);
  
  const [allSubjects, setAllSubjects] = useState([]);
  const [modalMsg, setModalMsg] = useState({ text: '', type: '' });
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    fetchData();
    fetchAllSubjects();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profRes, reqRes, classRes, tuitionRes] = await Promise.all([
        fetch('/api/hocvien/me').then(r => r.json()),
        fetch('/api/hocvien/yeucau').then(r => r.json()),
        fetch('/api/hocvien/lop').then(r => r.json()),
        fetch('/api/hocvien/hochphi').then(r => r.json()),
      ]);

      if (!profRes.success) {
        navigate('/login');
        return;
      }

      setProfile(profRes.data);
      setRequests(reqRes.data || []);
      setClasses(classRes.data || []);
      setTuitions(tuitionRes.data || []);
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


  const handleAddRequest = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
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
          thoigianmongmuon: data.thoigian,
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
      
      const res = await fetch('/api/hocvien/xinnghibuoi', {
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
              <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Mã Học Viên (ID)</strong> {profile.mahv ? 'HV' + profile.mahv.toString().padStart(6, '0') : ''}</div>
              <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Họ và tên</strong> {profile.hoten}</div>
              <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Ngày sinh</strong> {new Date(profile.ngaysinh).toLocaleDateString('vi-VN')}</div>
              <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Số điện thoại</strong> {profile.sdt}</div>
              <div><strong style={{color:'#94a3b8', display:'block', fontSize:'12px'}}>Email</strong> {profile.email || 'Không có'}</div>
            </div>
          </div>

          <div className="glass-card mb-4">
            <div className="card-header justify-between">
              <h3>Yêu Cầu Học Kèm Của Bạn</h3>
              <button className="btn btn-sm btn-teal" onClick={() => setShowRequestModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                      <th>Yêu cầu GS</th>
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
                          <td>{r.yc_trinhdogs || 'Không yêu cầu'} ({r.yc_gioitinhgs || 'Bất kỳ'})</td>
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
                                <button className="btn btn-xs btn-rose" onClick={() => { setSelectedClassId(c.malop); setShowAbsenceModal(true); setIsEmergency(false); }}>
                                  Báo vắng 1 buổi
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
                      <span className={t.trangthai === 'DaNop' ? 'text-teal' : 'text-rose'}>
                        {parseInt(t.tonghocphi).toLocaleString()}đ
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Hạn: {new Date(t.kytt_den).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Trạng thái: {t.trangthai === 'DaNop' ? 'Đã Thanh Toán' : 'Chưa Thanh Toán'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>Gửi Yêu Cầu Học Kèm Mới</h3>
              <span className="close-btn" onClick={() => { setShowRequestModal(false); setModalMsg({text:'', type:''}); }}>&times;</span>
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
              <div className="form-group">
                <label>Môn học *</label>
                <select name="mamh" required>
                  {allSubjects.map(s => <option key={s.mamh} value={s.mamh}>{s.tenmh}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Cấp lớp *</label>
                <select name="caplop" required>
                  <option value="Cấp 1">Cấp 1 (Lớp 1 - Lớp 5)</option>
                  <option value="Cấp 2">Cấp 2 (Lớp 6 - Lớp 9)</option>
                  <option value="Cấp 3">Cấp 3 (Lớp 10 - Lớp 12)</option>
                  <option value="Luyện thi Đại học">Luyện thi Đại học</option>
                  <option value="Tiếng Anh Giao tiếp">Tiếng Anh Giao tiếp</option>
                  <option value="Chứng chỉ Quốc tế">Chứng chỉ Quốc tế (IELTS, TOEIC...)</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div className="form-group">
                <label>Hình thức học</label>
                <select name="hinhthuc">
                  <option value="TrucTiep">Trực tiếp tại nhà</option>
                  <option value="Online">Online</option>
                </select>
              </div>
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
                <input type="text" name="trinhdo" placeholder="Ví dụ: Sinh viên Sư phạm, Giáo viên" />
              </div>
              <div className="form-group">
                <label>Thời gian học mong muốn *</label>
                <select name="thoigian" required>
                  <option value="Sáng (Thứ 2 - 4 - 6)">Sáng (Thứ 2 - 4 - 6)</option>
                  <option value="Chiều (Thứ 2 - 4 - 6)">Chiều (Thứ 2 - 4 - 6)</option>
                  <option value="Tối (Thứ 2 - 4 - 6)">Tối (Thứ 2 - 4 - 6)</option>
                  <option value="Sáng (Thứ 3 - 5 - 7)">Sáng (Thứ 3 - 5 - 7)</option>
                  <option value="Chiều (Thứ 3 - 5 - 7)">Chiều (Thứ 3 - 5 - 7)</option>
                  <option value="Tối (Thứ 3 - 5 - 7)">Tối (Thứ 3 - 5 - 7)</option>
                  <option value="Cuối tuần (Thứ 7 - CN)">Cuối tuần (Thứ 7 - CN)</option>
                  <option value="Linh hoạt (Thỏa thuận)">Linh hoạt (Thỏa thuận)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Khu vực học / Nơi ở *</label>
                <select name="diachi" required>
                  <option value="Quận 1">Quận 1</option>
                  <option value="Quận 3">Quận 3</option>
                  <option value="Quận 4">Quận 4</option>
                  <option value="Quận 5">Quận 5</option>
                  <option value="Quận 6">Quận 6</option>
                  <option value="Quận 7">Quận 7</option>
                  <option value="Quận 8">Quận 8</option>
                  <option value="Quận 10">Quận 10</option>
                  <option value="Quận 11">Quận 11</option>
                  <option value="Quận 12">Quận 12</option>
                  <option value="Quận Bình Tân">Quận Bình Tân</option>
                  <option value="Quận Bình Thạnh">Quận Bình Thạnh</option>
                  <option value="Quận Gò Vấp">Quận Gò Vấp</option>
                  <option value="Quận Phú Nhuận">Quận Phú Nhuận</option>
                  <option value="Quận Tân Bình">Quận Tân Bình</option>
                  <option value="Quận Tân Phú">Quận Tân Phú</option>
                  <option value="TP Thủ Đức">TP Thủ Đức</option>
                  <option value="Huyện Bình Chánh">Huyện Bình Chánh</option>
                  <option value="Huyện Cần Giờ">Huyện Cần Giờ</option>
                  <option value="Huyện Củ Chi">Huyện Củ Chi</option>
                  <option value="Huyện Hóc Môn">Huyện Hóc Môn</option>
                  <option value="Huyện Nhà Bè">Huyện Nhà Bè</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div className="form-group">
                <label>Ghi chú thêm</label>
                <textarea name="ghichu" placeholder="Các thông tin lưu ý khác..." rows="3" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}></textarea>
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
              <span className="close-btn" onClick={() => { setShowReviewModal(false); setModalMsg({text:'', type:''}); }}>&times;</span>
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
              <span className="close-btn" onClick={() => { setShowChangeModal(false); setModalMsg({text:'', type:''}); }}>&times;</span>
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

      {/* Absence Modal */}
      {showAbsenceModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Báo Nghỉ 1 Buổi - Lớp {selectedClassId}</h3>
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
                <input type="date" name="ngayday" required min={new Date().toISOString().split('T')[0]} id="abs_date" onChange={(e) => checkEmergency(e.target.value, document.getElementById('abs_time').value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label>Giờ bắt đầu *</label>
                  <input type="time" name="giobatdau" id="abs_time" required onChange={(e) => checkEmergency(document.getElementById('abs_date').value, e.target.value)} />
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
              <button type="submit" className="btn btn-rose btn-block">Gửi Báo Nghỉ</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
