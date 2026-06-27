import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, UserCheck, ClipboardList, DollarSign, LogOut, Check, X, PlusCircle, CreditCard, Download, Users, GraduationCap, MessageSquare, Shield, Settings, Activity } from 'lucide-react';
import Swal from 'sweetalert2';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import TuitionInvoiceModal from "../components/billing/TuitionInvoiceModal";
import SalaryInvoiceModal from "../components/billing/SalaryInvoiceModal";

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tutors');
  const [globalError, setGlobalError] = useState('');
  const [globalSuccess, setGlobalSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  // Filter & Pagination
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const handleTabChange = (tab) => { setActiveTab(tab); setFilterText(''); setCurrentPage(1); };

  // Profile detail modal
  const [profileModal, setProfileModal] = useState(null); // { type: 'student'|'tutor', data: {...} }
  const [loadingProfile, setLoadingProfile] = useState(false);

  const openProfileModal = async (type, id) => {
    setLoadingProfile(true);
    setProfileModal({ type, data: null });
    try {
      const url = type === 'student' ? `/api/nhanvien/hocvien/${id}/detail` : `/api/nhanvien/giasu/${id}/detail`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) setProfileModal({ type, data: json.data });
    } catch (e) { console.error(e); }
    setLoadingProfile(false);
  };

  // Data states
  const [stats, setStats] = useState({});
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

  // Logs state
  const [logs, setLogs] = useState([]);
  const [logPagination, setLogPagination] = useState({ page: 1, totalPages: 1 });
  const [logFilterKeyword, setLogFilterKeyword] = useState('');
  const [logFilterFromDate, setLogFilterFromDate] = useState('');
  const [logFilterToDate, setLogFilterToDate] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  const fetchLogs = async (page = 1) => {
    setLoadingLogs(true);
    try {
      const q = new URLSearchParams({ page, limit: 15 });
      if (logFilterKeyword) q.append('keyword', logFilterKeyword);
      if (logFilterFromDate) q.append('fromDate', logFilterFromDate);
      if (logFilterToDate) q.append('toDate', logFilterToDate);
      const res = await fetch(`/api/nhanvien/logs?${q.toString()}`).then(r => r.json());
      if (res.success) {
        setLogs(res.data);
        setLogPagination(res.pagination);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingLogs(false);
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs(1);
    }
  }, [activeTab]);

  const [defaultTyleHH, setDefaultTyleHH] = useState(70);
  const [defaultHocPhis, setDefaultHocPhis] = useState({
    HocPhi_Cap1: 100000,
    HocPhi_Cap2: 200000,
    HocPhi_Cap3: 300000,
    HocPhi_LuyenThiDH: 400000,
    HocPhi_TiengAnhGT: 350000,
    HocPhi_ChungChiQT: 500000,
    HocPhi_Khac: 250000
  });
  const [allTutors, setAllTutors] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const getDefaultHocPhi = (cap) => {
    if (cap === 'Cấp 1') return defaultHocPhis.HocPhi_Cap1;
    if (cap === 'Cấp 2') return defaultHocPhis.HocPhi_Cap2;
    if (cap === 'Cấp 3') return defaultHocPhis.HocPhi_Cap3;
    if (cap === 'Luyện thi Đại học') return defaultHocPhis.HocPhi_LuyenThiDH;
    if (cap === 'Tiếng Anh Giao tiếp') return defaultHocPhis.HocPhi_TiengAnhGT;
    if (cap === 'Chứng chỉ Quốc tế') return defaultHocPhis.HocPhi_ChungChiQT;
    return defaultHocPhis.HocPhi_Khac;
  };

  // Class detail state
  const [showClassDetailModal, setShowClassDetailModal] = useState(false);
  const [classDetail, setClassDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modals state
  const [showClassModal, setShowClassModal] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showCreateCommissionModal, setShowCreateCommissionModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statRes, tutRes, reqRes, classRes, tuitRes, commRes, suppRes, absRes, chartRes, accRes, profRes, meRes, tyleRes, hpRes, allTutorsRes, allStudentsRes, subjRes] = await Promise.all([
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
        fetch('/api/auth/me').then(r => r.json()),
        fetch('/api/nhanvien/config/tylehh').then(r => r.json()),
        fetch('/api/nhanvien/config/hocphi').then(r => r.json()),
        fetch('/api/nhanvien/giasu').then(r => r.json()),
        fetch('/api/nhanvien/hocvien').then(r => r.json()),
        fetch('/api/monhoc/all').then(r => r.json())
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
      if (tyleRes && tyleRes.success) {
        setDefaultTyleHH(tyleRes.tylehh);
      }
      if (hpRes && hpRes.success) {
        setDefaultHocPhis(hpRes.data);
      }
      setAllTutors(allTutorsRes.data || []);
      setAllStudents(allStudentsRes.data || []);
      setSubjects(subjRes.data || []);
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
    setShowCreateClassModal(true);
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

  const getMatchCount = (requestSchedule, tutorSchedule) => {
    if (!requestSchedule || !tutorSchedule) return 0;
    let reqSched = [];
    try {
      reqSched = typeof requestSchedule === 'string' ? JSON.parse(requestSchedule) : requestSchedule;
    } catch (e) {
      reqSched = [];
    }
    if (!Array.isArray(reqSched)) reqSched = [];
    
    let matchCount = 0;
    reqSched.forEach(reqSlot => {
      const hasMatch = tutorSchedule.some(tutSlot => 
        parseInt(tutSlot.thu) === parseInt(reqSlot.thu) && 
        String(tutSlot.buoi).toLowerCase() === String(reqSlot.buoi).toLowerCase()
      );
      if (hasMatch) matchCount++;
    });
    return matchCount;
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    if (!data.mags) {
      showMsg('error', 'Vui lòng chọn gia sư!');
      return;
    }
    
    try {
      const res = await fetch('/api/nhanvien/lop/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mayc: selectedRequest.mayc,
          mags: data.mags,
          hocphimoibuoi: data.hocphi,
          tylehh: data.tylehh
        })
      });
      const json = await res.json();
      if (json.success) {
        showMsg('success', json.message || 'Ghép lớp thành công!');
        setShowClassModal(false);
        setShowCreateClassModal(false);
        fetchData();
      } else {
        showMsg('error', json.message);
      }
    } catch (e) {
      showMsg('error', 'Lỗi kết nối.');
    }
  };

  const handleConfirmTuition = async (id, hinhthuctt) => {
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

  const handleDuyetNghi = async (mabuoi, action) => {
    const actionText = action === 'approve' ? 'phê duyệt' : 'từ chối';
    const result = await Swal.fire({
      title: 'Xác nhận',
      text: `Bạn có chắc muốn ${actionText} yêu cầu nghỉ này?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: action === 'approve' ? '#10b981' : '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy',
      background: '#1e293b',
      color: '#fff'
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/nhanvien/baonghi/${mabuoi}/xuly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire({ title: 'Thành công', text: json.message, icon: 'success', background: '#1e293b', color: '#fff' });
        fetchData();
      } else {
        Swal.fire({ title: 'Lỗi', text: json.message, icon: 'error', background: '#1e293b', color: '#fff' });
      }
    } catch (e) {
      Swal.fire({ title: 'Lỗi kết nối', text: 'Không thể kết nối máy chủ', icon: 'error', background: '#1e293b', color: '#fff' });
    }
  };

  // KẾT THÚC LỚP SỚM + TỰ ĐỘNG TẠO HÓA ĐƠN
  const handleEndClass = async (id) => {
    const result = await Swal.fire({
      title: 'Kết thúc lớp sớm',
      input: 'textarea',
      inputLabel: 'Lý do kết thúc lớp',
      inputPlaceholder: 'Nhập lý do...',
      showCancelButton: true,
      confirmButtonText: 'Xác nhận kết thúc',
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
          const d = json.data;
          let detailHtml = `<div style="text-align:left; font-size:14px;">`;
          detailHtml += `<p>✅ Đã kết thúc lớp <strong>#${id}</strong> thành công.</p>`;
          detailHtml += `<hr style="border-color:rgba(255,255,255,0.1);"/>`;
          detailHtml += `<p><strong>📊 Thống kê buổi học:</strong></p>`;
          detailHtml += `<ul style="list-style:none; padding:0;">`;
          detailHtml += `<li>🟢 Đã dạy: <strong>${d.soBuoiDaDay}</strong> buổi</li>`;
          detailHtml += `<li>🔴 Vắng có phép: <strong>${d.soBuoiVangCoPhep}</strong> buổi</li>`;
          detailHtml += `<li>🟡 GS nghỉ: <strong>${d.soBuoiGSNghi}</strong> buổi</li>`;
          detailHtml += `</ul>`;
          
          if (d.hocphi) {
            detailHtml += `<hr style="border-color:rgba(255,255,255,0.1);"/>`;
            detailHtml += `<p><strong>💰 Hóa đơn học phí:</strong></p>`;
            detailHtml += `<p>Tổng: <strong style="color:#10b981;">${parseInt(d.hocphi.tonghocphi).toLocaleString()}đ</strong> (${d.hocphi.sobuoi} buổi × ${parseInt(d.hocphi.hocphimoibuoi).toLocaleString()}đ)</p>`;
          }
          
          if (d.hoahong) {
            detailHtml += `<p><strong>🎓 Hoa hồng gia sư:</strong></p>`;
            detailHtml += `<p>Tổng: <strong style="color:#f59e0b;">${parseInt(d.hoahong.tonghoahong).toLocaleString()}đ</strong> (${d.hoahong.sobuoidaday} buổi × ${parseInt(d.hoahong.hocphihvmoibuoi).toLocaleString()}đ × ${d.hoahong.tylehh}%)</p>`;
          }
          
          if (!d.hocphi && !d.hoahong) {
            detailHtml += `<p style="color:#94a3b8;">Không có buổi dạy nào → không tạo hóa đơn.</p>`;
          }
          
          detailHtml += `</div>`;
          
          Swal.fire({
            title: 'Kết thúc lớp & Thanh toán',
            html: detailHtml,
            icon: 'success',
            confirmButtonColor: '#6366f1',
            background: '#1e293b',
            color: '#fff',
            width: '500px'
          });
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

  const handleToggle2FA = async () => {
    const newStatus = !profile.is2faenabled;
    const confirmMsg = newStatus 
      ? 'Bạn có chắc chắn muốn BẬT xác thực 2 lớp? Mã OTP sẽ được gửi về email của bạn mỗi khi đăng nhập.'
      : 'Bạn có chắc chắn muốn TẮT xác thực 2 lớp? Tài khoản của bạn sẽ giảm đi một lớp bảo vệ.';
    
    const result = await Swal.fire({
      title: 'Xác nhận',
      text: confirmMsg,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Đồng ý',
      cancelButtonText: 'Hủy',
      background: '#1e293b',
      color: '#fff'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch('/api/auth/toggle-2fa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newStatus })
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

  // THAY ĐỔI TỶ LỆ HOA HỒNG - CHỈ BGD
  const handleChangeCommission = async (malop) => {
    const { value: newRate } = await Swal.fire({
      title: 'Thay đổi tỷ lệ hoa hồng',
      input: 'number',
      inputLabel: 'Tỷ lệ hoa hồng GS mới (%)',
      inputPlaceholder: 'Ví dụ: 70',
      inputAttributes: { min: 0, max: 100, step: 5 },
      showCancelButton: true,
      confirmButtonText: 'Cập nhật',
      cancelButtonText: 'Hủy',
      background: '#1e293b',
      color: '#fff',
      inputValidator: (value) => {
        if (!value || isNaN(value)) return 'Vui lòng nhập số!';
        if (value < 0 || value > 100) return 'Tỷ lệ phải từ 0 đến 100!';
      }
    });

    if (newRate) {
      try {
        const res = await fetch(`/api/nhanvien/lop/${malop}/tylehh`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tylehh: parseFloat(newRate) })
        });
        const json = await res.json();
        if (json.success) {
          showMsg('success', json.message);
          fetchData();
          if (classDetail) handleOpenClassDetail(malop);
        } else {
          showMsg('error', json.message);
        }
      } catch (e) {
        showMsg('error', 'Lỗi kết nối.');
      }
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

  const pendingTutorsCount = pendingTutors.filter(t => t.trangthai === 'ChoDuyet').length;
  const pendingReqsCount = requests.filter(r => r.trangthai === 'ChoGhep').length;
  const pendingSupportCount = supportRequests.filter(r => r.trangthai === 'ChoXuLy').length + absences.filter(a => ['HVXinNghi', 'GSXinNghi'].includes(a.trangthai)).length;

  const renderPagination = (totalItems) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    if (totalPages <= 1) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
        <button className="btn btn-sm btn-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>&larr; Trước</button>
        <span style={{ fontSize: '14px' }}>Trang {currentPage} / {totalPages}</span>
        <button className="btn btn-sm btn-secondary" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Sau &rarr;</button>
      </div>
    );
  };

  const renderSearchBox = (placeholder) => (
    <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'flex-end' }}>
      <input type="text" className="form-control" placeholder={placeholder} value={filterText}
        onChange={(e) => { setFilterText(e.target.value); setCurrentPage(1); }}
        style={{ maxWidth: '300px' }} />
    </div>
  );

  const handleChangePassword = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Đổi mật khẩu',
      html: `
        <div style="position: relative; max-width: 85%; margin: 10px auto;">
          <input id="swal-input-old" type="password" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; padding-right: 40px;" placeholder="Mật khẩu hiện tại">
          <span id="toggle-old" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #94a3b8; font-size: 18px;">👁️</span>
        </div>
        <div style="position: relative; max-width: 85%; margin: 10px auto;">
          <input id="swal-input-new" type="password" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; padding-right: 40px;" placeholder="Mật khẩu mới (từ 6 ký tự)">
          <span id="toggle-new" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #94a3b8; font-size: 18px;">👁️</span>
        </div>
        <div style="position: relative; max-width: 85%; margin: 10px auto;">
          <input id="swal-input-confirm" type="password" class="swal2-input" style="width: 100%; margin: 0; box-sizing: border-box; padding-right: 40px;" placeholder="Xác nhận mật khẩu mới">
          <span id="toggle-confirm" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #94a3b8; font-size: 18px;">👁️</span>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Đổi mật khẩu',
      cancelButtonText: 'Hủy',
      background: '#1e293b',
      color: '#fff',
      didOpen: () => {
        const toggleVisibility = (inputId, iconId) => {
          const input = document.getElementById(inputId);
          const icon = document.getElementById(iconId);
          icon.addEventListener('click', () => {
            if (input.type === 'password') {
              input.type = 'text';
              icon.innerText = '🙈';
            } else {
              input.type = 'password';
              icon.innerText = '👁️';
            }
          });
        };
        toggleVisibility('swal-input-old', 'toggle-old');
        toggleVisibility('swal-input-new', 'toggle-new');
        toggleVisibility('swal-input-confirm', 'toggle-confirm');
      },
      preConfirm: () => {
        const oldPass = document.getElementById('swal-input-old').value;
        const newPass = document.getElementById('swal-input-new').value;
        const confirmPass = document.getElementById('swal-input-confirm').value;
        if (!oldPass || !newPass || !confirmPass) {
          Swal.showValidationMessage('Vui lòng nhập đầy đủ thông tin');
          return false;
        }
        if (newPass.length < 6) {
          Swal.showValidationMessage('Mật khẩu mới phải từ 6 ký tự');
          return false;
        }
        if (newPass !== confirmPass) {
          Swal.showValidationMessage('Xác nhận mật khẩu không khớp');
          return false;
        }
        return { currentPassword: oldPass, newPassword: newPass };
      }
    });

    if (formValues) {
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formValues)
        });
        const json = await res.json();
        if (json.success) {
          Swal.fire({ title: 'Thành công', text: json.message, icon: 'success', background: '#1e293b', color: '#fff' });
        } else {
          Swal.fire({ title: 'Lỗi', text: json.message, icon: 'error', background: '#1e293b', color: '#fff' });
        }
      } catch (e) {
        Swal.fire({ title: 'Lỗi', text: 'Lỗi kết nối', icon: 'error', background: '#1e293b', color: '#fff' });
      }
    }
  };

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Thông Tin Cá Nhân Nhân Viên</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-sm btn-secondary" 
                onClick={handleChangePassword}
              >
                Đổi mật khẩu
              </button>
              <button 
                className={`btn btn-sm ${profile.is2faenabled ? 'btn-rose' : 'btn-teal'}`} 
                onClick={handleToggle2FA}
              >
                {profile.is2faenabled ? 'Tắt 2FA' : 'Bật 2FA'}
              </button>
            </div>
          </div>
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

      {/* Stats Cards Navigation Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>

        <div className={`stats-card${activeTab === 'classes' ? ' active-card' : ''}`} onClick={() => handleTabChange('classes')} style={{ cursor: 'pointer', border: activeTab === 'classes' ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.05)' }}>
          <div className="stats-icon text-indigo"><BookOpen size={24} /></div>
          <div className="stats-info"><span className="stats-label">Lớp Đang Hoạt Động</span><span className="stats-value">{stats.activeClasses}</span></div>
        </div>

        <div className={`stats-card${activeTab === 'tutors' ? ' active-card' : ''}`} onClick={() => handleTabChange('tutors')} style={{ cursor: 'pointer', border: activeTab === 'tutors' ? '2px solid var(--color-teal)' : '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
          {pendingTutorsCount > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold' }}>{pendingTutorsCount}</span>}
          <div className="stats-icon text-teal"><UserCheck size={24} /></div>
          <div className="stats-info"><span className="stats-label">Hồ Sơ GS Chờ Duyệt</span><span className="stats-value">{stats.pendingTutors}</span></div>
        </div>

        <div className={`stats-card${activeTab === 'requests' ? ' active-card' : ''}`} onClick={() => handleTabChange('requests')} style={{ cursor: 'pointer', border: activeTab === 'requests' ? '2px solid var(--color-amber)' : '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
          {pendingReqsCount > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold' }}>{pendingReqsCount}</span>}
          <div className="stats-icon text-amber"><ClipboardList size={24} /></div>
          <div className="stats-info"><span className="stats-label">Yêu Cầu Học Chờ Ghép</span><span className="stats-value">{stats.pendingRequests}</span></div>
        </div>

        <div className={`stats-card${activeTab === 'finances' ? ' active-card' : ''}`} onClick={() => handleTabChange('finances')} style={{ cursor: 'pointer', border: activeTab === 'finances' ? '2px solid var(--color-rose)' : '1px solid rgba(255,255,255,0.05)' }}>
          <div className="stats-icon text-rose"><DollarSign size={24} /></div>
          <div className="stats-info"><span className="stats-label">Tổng Doanh Thu</span><span className="stats-value">{parseInt(stats.revenue || 0).toLocaleString()}đ</span></div>
        </div>

        <div className={`stats-card${activeTab === 'all_students' ? ' active-card' : ''}`} onClick={() => handleTabChange('all_students')} style={{ cursor: 'pointer', border: activeTab === 'all_students' ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.05)' }}>
          <div className="stats-icon text-indigo"><Users size={24} /></div>
          <div className="stats-info"><span className="stats-label">Hồ Sơ Học Viên</span><span className="stats-value">{allStudents.length}</span></div>
        </div>

        <div className={`stats-card${activeTab === 'all_tutors' ? ' active-card' : ''}`} onClick={() => handleTabChange('all_tutors')} style={{ cursor: 'pointer', border: activeTab === 'all_tutors' ? '2px solid var(--color-teal)' : '1px solid rgba(255,255,255,0.05)' }}>
          <div className="stats-icon text-teal"><GraduationCap size={24} /></div>
          <div className="stats-info"><span className="stats-label">Hồ Sơ Gia Sư</span><span className="stats-value">{allTutors.length}</span></div>
        </div>

        <div className={`stats-card${activeTab === 'support' ? ' active-card' : ''}`} onClick={() => handleTabChange('support')} style={{ cursor: 'pointer', border: activeTab === 'support' ? '2px solid var(--color-amber)' : '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
          {pendingSupportCount > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold' }}>{pendingSupportCount}</span>}
          <div className="stats-icon text-amber"><MessageSquare size={24} /></div>
          <div className="stats-info"><span className="stats-label">Yêu Cầu Đổi/Nghỉ</span><span className="stats-value">{supportRequests.length}</span></div>
        </div>

        {currentUser && (currentUser.vaitro === 'SA' || currentUser.vaitro === 'BGD') && (
          <div className={`stats-card${activeTab === 'accounts' ? ' active-card' : ''}`} onClick={() => handleTabChange('accounts')} style={{ cursor: 'pointer', border: activeTab === 'accounts' ? '2px solid var(--color-rose)' : '1px solid rgba(255,255,255,0.05)' }}>
            <div className="stats-icon text-rose"><Shield size={24} /></div>
            <div className="stats-info"><span className="stats-label">Quản Lý Tài Khoản</span><span className="stats-value">{accounts.length}</span></div>
          </div>
        )}

        {currentUser && (currentUser.vaitro === 'SA' || currentUser.vaitro === 'BGD') && (
          <div className={`stats-card${activeTab === 'subjects' ? ' active-card' : ''}`} onClick={() => handleTabChange('subjects')} style={{ cursor: 'pointer', border: activeTab === 'subjects' ? '2px solid var(--color-info)' : '1px solid rgba(255,255,255,0.05)' }}>
            <div className="stats-icon text-info"><BookOpen size={24} /></div>
            <div className="stats-info"><span className="stats-label">Quản Lý Môn Học</span><span className="stats-value">{subjects.length}</span></div>
          </div>
        )}

        {currentUser && currentUser.vaitro === 'BGD' && (
          <div className={`stats-card${activeTab === 'settings' ? ' active-card' : ''}`} onClick={() => handleTabChange('settings')} style={{ cursor: 'pointer', border: activeTab === 'settings' ? '2px solid #94a3b8' : '1px solid rgba(255,255,255,0.05)' }}>
            <div className="stats-icon" style={{ color: '#94a3b8' }}><Settings size={24} /></div>
            <div className="stats-info"><span className="stats-label">Cấu Hình Hệ Thống</span><span className="stats-value">Cài đặt</span></div>
          </div>
        )}
        
        {currentUser && (currentUser.vaitro === 'BGD' || currentUser.vaitro === 'SA') && (
          <div className={`stats-card${activeTab === 'logs' ? ' active-card' : ''}`} onClick={() => handleTabChange('logs')} style={{ cursor: 'pointer', border: activeTab === 'logs' ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.05)' }}>
            <div className="stats-icon" style={{ color: '#8b5cf6' }}><Activity size={24} /></div>
            <div className="stats-info"><span className="stats-label">Lịch Sử Hệ Thống</span><span className="stats-value">Logs</span></div>
          </div>
        )}
      </div>

      {/* Tab Content */}
      <div className="glass-card">
        <div className="card-body">
          {/* TUTORS TAB */}
          {activeTab === 'tutors' && (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr><th>Gia sư</th><th>Chuyên ngành</th><th>CCCD/SĐT</th><th>Minh chứng</th><th>Học phí mong muốn</th><th>Khu vực dạy</th><th>Hành động</th></tr>
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
                          <div><strong>{t.hoten}</strong><br/><span style={{ fontSize: '12px', color: '#94a3b8' }}>{t.gioitinh} - {new Date(t.ngaysinh).toLocaleDateString('vi-VN')}</span></div>
                        </div>
                      </td>
                      <td>{t.trinhdo || t.trinhdohocvan}<br/><span style={{fontSize:'12px',color:'#94a3b8'}}>{t.chuyennganh}</span></td>
                      <td>{t.cccd}<br/>{t.sdt}</td>
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

          {/* REQUESTS TAB */}
          {activeTab === 'requests' && (
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
                        <strong>Số buổi/tuần: {r.songayhoc}</strong><br/>
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
          )}

          {/* CLASSES TAB */}
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
                  <tr><th>Mã Lớp</th><th>Môn/Lớp</th><th>Học viên</th><th>Gia sư</th><th>Học phí/buổi</th><th>Trạng thái</th><th>Hành động</th></tr>
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
                        <button className="btn btn-xs btn-primary" onClick={() => handleOpenClassDetail(c.malop)} style={{marginRight:'5px'}}>Chi tiết</button>
                        {c.trangthai !== 'KetThuc' && c.trangthai !== 'Huy' && currentUser && currentUser.vaitro !== 'BGD' && (
                          <button className="btn btn-xs btn-rose" onClick={() => handleEndClass(c.malop)}>Kết thúc</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          )}

          {/* FINANCES TAB */}
          {activeTab === 'finances' && (
            <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3>Khoản Thu Học Phí (Học Viên)</h3>
                  <div>
                    {currentUser && currentUser.vaitro !== 'BGD' && (
                      <button className="btn btn-primary" onClick={() => setShowCreateInvoiceModal(true)} style={{ marginRight: '10px' }}>+ Tạo Y/C Học Phí</button>
                    )}
                    <button className="btn btn-secondary" onClick={exportFinances} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <Download size={16} /> Xuất Excel
                    </button>
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table">
                    <thead><tr><th>Học viên</th><th>Lớp / Môn</th><th>Số tiền</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                    <tbody>
                      {tuitions.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center' }}>Không có dữ liệu học phí</td></tr>
                      ) : tuitions.map(t => (
                        <tr key={t.mahp}>
                          <td><strong>{t.tenhocvien}</strong></td>
                          <td>Lớp {t.malop}<br/><span style={{fontSize:'12px',color:'#94a3b8'}}>{t.tenmh}</span></td>
                          <td>{parseInt(t.tonghocphi).toLocaleString()}đ</td>
                          <td>
                            <span className={`status-badge ${t.trangthai === 'DaNop' ? 'status-active' : (t.trangthai === 'ChoXacNhan' ? 'status-pending' : 'status-disabled')}`}>
                              {t.trangthai === 'DaNop' ? 'Đã nộp' : (t.trangthai === 'ChoXacNhan' ? 'Chờ xác nhận' : 'Chưa nộp')}
                            </span>
                          </td>
                          <td>{t.trangthai !== 'DaNop' && currentUser && currentUser.vaitro !== 'BGD' && (<button className="btn btn-xs btn-teal" onClick={() => handleConfirmTuition(t.mahp)}>Duyệt Nộp</button>)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3>Thanh Toán Hoa Hồng (Gia Sư)</h3>
                  <div>
                    {currentUser && currentUser.vaitro !== 'BGD' && (
                      <button className="btn btn-primary" onClick={() => setShowCreateCommissionModal(true)}>+ Tạo Y/C Hoa Hồng</button>
                    )}
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table">
                    <thead><tr><th>Gia sư</th><th>Lớp / Môn</th><th>Hoa hồng</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                    <tbody>
                      {commissions.length === 0 ? (
                        <tr><td colSpan="5" style={{ textAlign: 'center' }}>Không có dữ liệu hoa hồng</td></tr>
                      ) : commissions.map(c => (
                        <tr key={c.mahh}>
                          <td><strong>{c.tengiasu}</strong></td>
                          <td>Lớp {c.malop}<br/><span style={{fontSize:'12px',color:'#94a3b8'}}>{c.tenmh}</span></td>
                          <td>{parseInt(c.tonghoahong).toLocaleString()}đ</td>
                          <td><span className={`status-badge ${c.trangthai === 'DaTT' ? 'status-active' : 'status-pending'}`}>{c.trangthai === 'DaTT' ? 'Đã TT' : 'Chưa TT'}</span></td>
                          <td>{c.trangthai !== 'DaTT' && currentUser && currentUser.vaitro !== 'BGD' && (<button className="btn btn-xs btn-primary" onClick={() => handleConfirmCommission(c.mahh)}>Duyệt TT</button>)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUPPORT TAB */}
          {activeTab === 'support' && (
            <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
              <div>
                <h3 style={{ marginBottom: '15px' }}>Yêu Cầu Đổi/Nghỉ Lớp</h3>
                <div className="table-responsive">
                  <table className="table">
                    <thead><tr><th>Ngày yêu cầu</th><th>Lớp / Môn</th><th>Người gửi</th><th>Lý do</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                    <tbody>
                      {supportRequests.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center' }}>Không có yêu cầu nào</td></tr>
                      ) : supportRequests.map(s => (
                        <tr key={s.maycdg}>
                          <td>{new Date(s.ngayyeucau).toLocaleString('vi-VN')}</td>
                          <td>Lớp {s.malop}<br/><span style={{fontSize:'12px',color:'#94a3b8'}}>{s.tenmh}</span></td>
                          <td><strong>HV:</strong> {s.tenhocvien}<br/><strong>GS:</strong> {s.tengiasu || 'Chưa có'}</td>
                          <td style={{ maxWidth: '250px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{s.lydo && s.lydo.includes('[BẤT KHẢ KHÁNG]') ? (<span style={{ color: '#ef4444', fontWeight: 'bold' }}>{s.lydo}</span>) : (s.lydo)}</td>
                          <td><span className={`status-badge ${s.trangthai === 'DaXuLy' ? 'status-active' : 'status-pending'}`}>{s.trangthai === 'DaXuLy' ? 'Đã xử lý' : 'Chờ xử lý'}</span></td>
                          <td>{s.trangthai === 'ChoXuLy' && currentUser && currentUser.vaitro !== 'BGD' && (<button className="btn btn-xs btn-teal" onClick={() => handleResolveSupport(s.maycdg)}>Đánh dấu xử lý</button>)}</td>
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
                    <thead><tr><th>Người báo vắng</th><th>Lớp / Môn</th><th>Ngày nghỉ / Ca</th><th>Lý do chi tiết</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                    <tbody>
                      {absences.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center' }}>Không có lịch sử báo vắng</td></tr>
                      ) : absences.map(a => {
                        const isPending = a.trangthai === 'HVXinNghi' || a.trangthai === 'GSXinNghi';
                        const isHV = a.trangthai === 'HVVangCoPhep' || a.trangthai === 'HVXinNghi';
                        
                        let statusClass = 'status-disabled';
                        let statusText = 'Đã hủy';
                        if (a.trangthai === 'HVVangCoPhep') {
                          statusClass = 'status-active';
                          statusText = 'HV vắng';
                        } else if (a.trangthai === 'GSNghi') {
                          statusClass = 'status-active';
                          statusText = 'GS nghỉ';
                        } else if (isPending) {
                          statusClass = 'status-pending';
                          statusText = 'Chờ duyệt';
                        }

                        return (
                          <tr key={a.mabuoi}>
                            <td>
                              {isHV ? (
                                <><span className="status-badge" style={{backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444'}}>Học viên</span><br/><strong>{a.tenhocvien}</strong></>
                              ) : (
                                <><span className="status-badge" style={{backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b'}}>Gia sư</span><br/><strong>{a.tengiasu}</strong></>
                              )}
                            </td>
                            <td>Lớp {a.malop}<br/><span style={{fontSize:'12px',color:'#94a3b8'}}>{a.tenmh}</span></td>
                            <td>
                              <strong>{new Date(a.ngayday).toLocaleDateString('vi-VN')}</strong><br/>
                              <span style={{fontSize:'12px',color:'#94a3b8'}}>Ca: {a.cahoc === 'Sang' ? 'Sáng' : a.cahoc === 'Chieu' ? 'Chiều' : 'Tối'}</span>
                            </td>
                            <td style={{ maxWidth: '350px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{a.noidung && a.noidung.includes('[BẤT KHẢ KHÁNG]') ? (<span style={{ color: '#ef4444', fontWeight: 'bold' }}>{a.noidung}</span>) : (a.noidung)}</td>
                            <td>
                              <span className={`status-badge ${statusClass}`}>{statusText}</span>
                            </td>
                            <td>
                              {isPending && currentUser && currentUser.vaitro !== 'BGD' && (
                                <div style={{ display: 'flex', gap: '5px' }}>
                                  <button className="btn btn-xs btn-teal" onClick={() => handleDuyetNghi(a.mabuoi, 'approve')}>Duyệt</button>
                                  <button className="btn btn-xs btn-rose" onClick={() => handleDuyetNghi(a.mabuoi, 'reject')}>Từ chối</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ACCOUNTS TAB */}
          {activeTab === 'accounts' && (
            <div className="table-responsive">
              <table className="table">
                <thead><tr><th>Họ Tên</th><th>Tên Đăng Nhập</th><th>Email</th><th>Vai Trò</th><th>Trạng Thái</th><th>Hành Động</th></tr></thead>
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
                          {acc.vaitro === 'HV' ? 'Học viên' : acc.vaitro === 'GS' ? 'Gia sư' : acc.vaitro === 'NVQL' ? 'Nhân viên QL' : acc.vaitro === 'BGD' ? 'Giám đốc' : acc.vaitro === 'SA' ? 'System Admin' : acc.vaitro}
                        </span>
                      </td>
                      <td><span className={`status-badge ${acc.trangthai === 'HoatDong' ? 'status-active' : 'status-disabled'}`}>{acc.trangthai === 'HoatDong' ? 'Hoạt động' : 'Đã khóa'}</span></td>
                      <td>
                        {acc.matk === currentUser?.matk ? (
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Bản thân</span>
                        ) : acc.vaitro === 'BGD' && currentUser?.vaitro !== 'BGD' ? (
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Không được phép</span>
                        ) : (
                          <button className={`btn btn-xs ${acc.trangthai === 'Khoa' ? 'btn-teal' : 'btn-rose'}`} onClick={() => handleToggleLock(acc.matk, acc.trangthai)}>{acc.trangthai === 'Khoa' ? 'Mở khóa' : 'Khóa'}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* ALL STUDENTS TAB */}
          {activeTab === 'all_students' && (() => {
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
          })()}

          {/* ALL TUTORS TAB */}
          {activeTab === 'all_tutors' && (() => {
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
          })()}

          {/* SUBJECTS TAB */}
          {activeTab === 'subjects' && currentUser && (currentUser.vaitro === 'SA' || currentUser.vaitro === 'BGD') && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3>Quản Lý Danh Sách Môn Học</h3>
                <button className="btn btn-primary" onClick={() => { setEditingSubject(null); setShowSubjectModal(true); }}>
                  <PlusCircle size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }} /> Thêm Môn Mới
                </button>
              </div>
              
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
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
                          <td>#{s.mamh}</td>
                          <td><strong>{s.tenmh}</strong></td>
                          <td>{s.caphoc || '-'}</td>
                          <td>{s.mota || '-'}</td>
                          <td>
                            <span className={`status-badge ${s.trangthai === 'HoatDong' ? 'status-active' : 'status-disabled'}`}>
                              {s.trangthai === 'HoatDong' ? 'Hoạt Động' : 'Đã Ẩn'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              <button 
                                className="btn btn-xs btn-info"
                                onClick={() => { setEditingSubject(s); setShowSubjectModal(true); }}
                              >
                                Sửa
                              </button>
                              <button 
                                className={`btn btn-xs ${s.trangthai === 'HoatDong' ? 'btn-secondary' : 'btn-teal'}`}
                                onClick={async () => {
                                  const action = s.trangthai === 'HoatDong' ? 'Ẩn' : 'Hiện';
                                  const res = await Swal.fire({
                                    title: 'Xác nhận',
                                    text: `Bạn muốn ${action} môn học này?`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonText: 'Đồng ý',
                                    cancelButtonText: 'Hủy',
                                    background: '#1e293b',
                                    color: '#fff'
                                  });
                                  if (res.isConfirmed) {
                                    try {
                                      const response = await fetch(`/api/monhoc/${s.mamh}`, { method: 'DELETE' });
                                      const json = await response.json();
                                      if (json.success) {
                                        showMsg('success', 'Thao tác thành công');
                                        fetchData();
                                      } else {
                                        showMsg('error', json.message);
                                      }
                                    } catch(e) { showMsg('error', 'Lỗi kết nối'); }
                                  }
                                }}
                              >
                                {s.trangthai === 'HoatDong' ? 'Xóa Mềm (Ẩn)' : 'Khôi phục'}
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
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && currentUser?.vaitro === 'BGD' && (
            <div className="glass-card" style={{ padding: '20px', maxWidth: '500px' }}>
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
            </div>
          )}

          {/* LOGS TAB */}
          {activeTab === 'logs' && currentUser && (currentUser.vaitro === 'BGD' || currentUser.vaitro === 'SA') && (
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Từ khóa (Mã TK, Tên, Hành động...)" 
                  value={logFilterKeyword} 
                  onChange={e => setLogFilterKeyword(e.target.value)}
                  style={{ flex: '1 1 200px' }}
                />
                <input 
                  type="date" 
                  className="form-control" 
                  value={logFilterFromDate} 
                  onChange={e => setLogFilterFromDate(e.target.value)}
                  style={{ flex: '0 1 150px' }}
                />
                <input 
                  type="date" 
                  className="form-control" 
                  value={logFilterToDate} 
                  onChange={e => setLogFilterToDate(e.target.value)}
                  style={{ flex: '0 1 150px' }}
                />
                <button className="btn btn-primary" onClick={() => fetchLogs(1)} style={{ whiteSpace: 'nowrap' }}>Lọc Log</button>
              </div>

              {loadingLogs ? <div style={{textAlign:'center', padding:'20px'}}>Đang tải log...</div> : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>THỜI GIAN</th>
                        <th>NGƯỜI THỰC HIỆN</th>
                        <th>HÀNH ĐỘNG / ENDPOINT</th>
                        <th>CHI TIẾT</th>
                        <th>IP ADDRESS</th>
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
                      {logs.length === 0 && (
                        <tr><td colSpan="5" className="text-center">Không tìm thấy log nào</td></tr>
                      )}
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

      {/* Revenue Chart */}
      <div className="glass-card mt-4" style={{ padding: '20px' }}>
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
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} formatter={(value, name) => [new Intl.NumberFormat('vi-VN').format(value) + ' VNĐ', name]} />
                <Legend />
                <Bar dataKey="revenue" name="Doanh Thu (VNĐ)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Lợi Nhuận Thực Tế (VNĐ)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px' }}>
              Chưa có dữ liệu doanh thu để thống kê
            </div>
          )}
        </div>
      </div>

      {/* Profile Detail Modal */}
      {profileModal && (
        <div className="modal" style={{ display: 'flex' }} onClick={() => setProfileModal(null)}>
          <div className="modal-content glass-card" style={{ maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{profileModal.type === 'student' ? '📚 Hồ Sơ Học Viên' : '🎓 Hồ Sơ Gia Sư'}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setProfileModal(null)}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              {loadingProfile || !profileModal.data ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Đang tải...</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                    {profileModal.type === 'student' ? (
                      <>
                        <div><span style={{ color: '#94a3b8', fontSize: '12px' }}>Họ tên</span><div style={{ fontWeight: 'bold' }}>{profileModal.data.hoten}</div></div>
                        <div><span style={{ color: '#94a3b8', fontSize: '12px' }}>SĐT</span><div>{profileModal.data.sdt}</div></div>
                        <div><span style={{ color: '#94a3b8', fontSize: '12px' }}>Email</span><div>{profileModal.data.email || 'Chưa có'}</div></div>
                        <div><span style={{ color: '#94a3b8', fontSize: '12px' }}>Địa chỉ</span><div>{profileModal.data.diachi || 'Chưa có'}</div></div>
                        <div><span style={{ color: '#94a3b8', fontSize: '12px' }}>Cấp học</span><div>{profileModal.data.caphoc || 'Chưa có'}</div></div>
                        <div><span style={{ color: '#94a3b8', fontSize: '12px' }}>Trường</span><div>{profileModal.data.truong || 'Chưa có'}</div></div>
                      </>
                    ) : (
                      <>
                        <div><span style={{ color: '#94a3b8', fontSize: '12px' }}>Họ tên</span><div style={{ fontWeight: 'bold' }}>{profileModal.data.hoten}</div></div>
                        <div><span style={{ color: '#94a3b8', fontSize: '12px' }}>SĐT</span><div>{profileModal.data.sdt}</div></div>
                        <div><span style={{ color: '#94a3b8', fontSize: '12px' }}>Email</span><div>{profileModal.data.email || 'Chưa có'}</div></div>
                        <div><span style={{ color: '#94a3b8', fontSize: '12px' }}>Chuyên ngành</span><div>{profileModal.data.chuyennganh}</div></div>
                        <div><span style={{ color: '#94a3b8', fontSize: '12px' }}>Trường ĐT</span><div>{profileModal.data.truonghoc || 'Chưa có'}</div></div>
                        <div><span style={{ color: '#94a3b8', fontSize: '12px' }}>Học phí mong muốn</span><div>{parseInt(profileModal.data.hocphimongmuon || 0).toLocaleString()}đ/buổi</div></div>
                        <div><span style={{ color: '#94a3b8', fontSize: '12px' }}>Khu vực dạy</span><div>{profileModal.data.khuvucday || profileModal.data.khuvuc || 'Chưa có'}</div></div>
                        <div><span style={{ color: '#94a3b8', fontSize: '12px' }}>Trạng thái</span><div><span className={`status-badge ${profileModal.data.trangthai === 'DaDuyet' ? 'status-active' : 'status-pending'}`}>{profileModal.data.trangthai}</span></div></div>
                      </>
                    )}
                  </div>

                  <h4 style={{ color: profileModal.type === 'student' ? 'var(--color-primary)' : 'var(--color-teal)', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                    {profileModal.type === 'student' ? '📖 Các lớp đang học' : '📖 Các lớp đang dạy'}
                  </h4>
                  {!profileModal.data.lophoc || profileModal.data.lophoc.length === 0 ? (
                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px', fontStyle: 'italic' }}>Chưa có lớp nào</div>
                  ) : (
                    <table className="table" style={{ fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th>Mã lớp</th>
                          <th>Môn học</th>
                          <th>{profileModal.type === 'student' ? 'Gia sư' : 'Học viên'}</th>
                          <th>Cấp lớp</th>
                          <th>Ngày bắt đầu</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profileModal.data.lophoc.map(l => (
                          <tr key={l.malop}>
                            <td>#{l.malop}</td>
                            <td>{l.tenmh}</td>
                            <td>{profileModal.type === 'student' ? l.tengiasu : l.tenhocvien}</td>
                            <td>{l.caplop}</td>
                            <td>{l.ngaybatdau ? new Date(l.ngaybatdau).toLocaleDateString('vi-VN') : 'Chưa xác định'}</td>
                            <td><span className={`status-badge ${l.trangthai === 'DangDay' ? 'status-active' : l.trangthai === 'KetThuc' ? 'status-disabled' : 'status-pending'}`}>{l.trangthai}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Finance Modals */}
      {showCreateInvoiceModal && (
        <TuitionInvoiceModal 
          classes={classes}
          onClose={() => setShowCreateInvoiceModal(false)}
          onSuccess={() => {
            setShowCreateInvoiceModal(false);
            fetchData();
          }}
        />
      )}
      
      {showCreateCommissionModal && (
        <SalaryInvoiceModal 
          classes={classes}
          onClose={() => setShowCreateCommissionModal(false)}
          onSuccess={() => {
            setShowCreateCommissionModal(false);
            fetchData();
          }}
        />
      )}

      {/* Create Class Modal */}
      {showCreateClassModal && selectedRequest && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>Tạo Lớp & Phân Công Gia Sư</h3>
              <span className="close-btn" onClick={() => setShowCreateClassModal(false)}>&times;</span>
            </div>
            {/* Hiển thị lịch học từ yêu cầu */}
            <div style={{ backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '15px' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#a5b4fc' }}><strong>📋 Thông tin yêu cầu:</strong></p>
              <p style={{ margin: 0, fontSize: '13px' }}>
                Lịch học: <strong>{formatLichHoc(selectedRequest.lichhoctrongtuan)}</strong>
              </p>
            </div>
            
            {(() => {
              const reqMaMH = selectedRequest?.mamh;
              const reqTenMH = selectedRequest?.tenmh;
              const sortedTutors = [...allTutors].filter(gs => {
                if (!reqMaMH) return true; // fallback
                const hasRegistered = gs.registered_subjects && gs.registered_subjects.includes(reqMaMH);
                const isMajorMatch = gs.chuyennganh === reqTenMH;
                return hasRegistered || isMajorMatch;
              }).map(gs => {
                const matchCount = getMatchCount(selectedRequest?.lichhoctrongtuan, gs.lichranh);
                return { ...gs, matchCount };
              }).sort((a, b) => b.matchCount - a.matchCount);

              return (
                <form onSubmit={handleCreateClass}>
                  <div className="form-group">
                    <label>Mã Yêu Cầu</label>
                    <input type="text" value={selectedRequest.mayc} disabled style={{background: 'rgba(255,255,255,0.05)'}} />
                  </div>
                  <div className="form-group">
                    <label>Chọn Gia Sư *</label>
                    <select name="mags" required className="form-control" style={{ background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '8px', borderRadius: '6px', width: '100%' }}>
                      <option value="">-- Chọn gia sư --</option>
                      {sortedTutors.map(gs => (
                        <option 
                          key={gs.mags} 
                          value={gs.mags}
                          disabled={gs.trangthaihoso !== 'DaDuyet'}
                          style={gs.trangthaihoso !== 'DaDuyet' ? { color: '#64748b' } : {}}
                        >
                          {gs.hoten} - MS: {gs.mags} {gs.trangthaihoso !== 'DaDuyet' ? '(Chưa duyệt hồ sơ)' : (gs.matchCount > 0 ? `🟢 Trùng ${gs.matchCount} buổi` : '⚪ Không trùng')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Học phí mỗi buổi * {currentUser && currentUser.vaitro !== 'BGD' && <span style={{fontSize:'11px',color:'#f59e0b'}}>(Chỉ Giám đốc được thay đổi)</span>}</label>
                    <input 
                      type="number" 
                      name="hocphi" 
                      required 
                      min="50000" 
                      step="50000" 
                      placeholder="VND" 
                      key={selectedRequest ? `${selectedRequest.mayc}-${selectedRequest.caplop}-${JSON.stringify(defaultHocPhis)}` : 'default'}
                      defaultValue={selectedRequest ? getDefaultHocPhi(selectedRequest.caplop) : 250000}
                      readOnly={currentUser && currentUser.vaitro !== 'BGD'}
                      style={currentUser && currentUser.vaitro !== 'BGD' ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                    />
                  </div>
                  <div className="form-group">
                    <label>Tỷ lệ Hoa hồng GS (%) {currentUser && currentUser.vaitro !== 'BGD' && <span style={{fontSize:'11px',color:'#f59e0b'}}>(Chỉ Giám đốc được thay đổi)</span>}</label>
                    <input 
                      type="number" 
                      name="tylehh" 
                      defaultValue={defaultTyleHH} 
                      key={defaultTyleHH}
                      readOnly={currentUser && currentUser.vaitro !== 'BGD'}
                      style={currentUser && currentUser.vaitro !== 'BGD' ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '15px' }}>Tạo Lớp</button>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* Subject Modal */}
      {showSubjectModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>{editingSubject ? 'Sửa Môn Học' : 'Thêm Môn Học Mới'}</h3>
              <span className="close-btn" onClick={() => setShowSubjectModal(false)}>&times;</span>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const tenmh = e.target.tenmh.value;
              const caphoc = e.target.caphoc.value;
              const mota = e.target.mota.value;
              try {
                const url = editingSubject ? `/api/monhoc/${editingSubject.mamh}` : '/api/monhoc';
                const method = editingSubject ? 'PUT' : 'POST';
                const response = await fetch(url, {
                  method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tenmh, caphoc, mota })
                });
                const json = await response.json();
                if (json.success) {
                  showMsg('success', 'Đã lưu môn học');
                  setShowSubjectModal(false);
                  fetchData();
                } else {
                  showMsg('error', json.message);
                }
              } catch(err) { showMsg('error', 'Lỗi kết nối'); }
            }}>
              <div className="form-group">
                <label>Tên Môn Học *</label>
                <input type="text" name="tenmh" required defaultValue={editingSubject?.tenmh || ''} />
              </div>
              <div className="form-group">
                <label>Cấp Học</label>
                <input type="text" name="caphoc" placeholder="VD: THCS, THPT" defaultValue={editingSubject?.caphoc || ''} />
              </div>
              <div className="form-group">
                <label>Mô Tả</label>
                <input type="text" name="mota" defaultValue={editingSubject?.mota || ''} />
              </div>
              <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '15px' }}>Lưu</button>
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
                
                {/* Class Info */}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                  <h4 style={{ color: '#fff', marginBottom: '10px' }}>Thông Tin Lớp Học</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
                    <div><strong>Môn học:</strong> {classDetail.info.tenmh} ({classDetail.info.caplop})</div>
                    <div><strong>Trạng thái:</strong> <span className={`status-badge ${classDetail.info.classtrangthai === 'DangDay' ? 'status-active' : (classDetail.info.classtrangthai === 'KetThuc' ? 'status-disabled' : 'status-pending')}`}>{classDetail.info.classtrangthai}</span></div>
                    <div><strong>Học phí:</strong> {parseInt(classDetail.info.hocphimoibuoi).toLocaleString()}đ/buổi</div>
                    <div>
                      <strong>Tỷ lệ HH GS:</strong> {classDetail.info.tylehhgiasu}%
                      {currentUser && currentUser.vaitro === 'BGD' && (
                        <button className="btn btn-xs btn-primary" style={{marginLeft:'8px'}} onClick={() => handleChangeCommission(classDetail.info.malop)}>Sửa</button>
                      )}
                    </div>
                    <div><strong>Ngày bắt đầu:</strong> {classDetail.info.ngaybatdau ? new Date(classDetail.info.ngaybatdau).toLocaleDateString('vi-VN') : 'N/A'}</div>
                    <div><strong>Số buổi/tuần:</strong> {classDetail.info.songayhoc !== undefined ? classDetail.info.songayhoc : 'N/A'}</div>
                    <div style={{ gridColumn: 'span 2' }}><strong>Lịch học:</strong> {formatLichHoc(classDetail.info.lichhoctrongtuan)}</div>
                  </div>
                </div>

                {/* Student & Tutor */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
                  <div>
                    <h4 style={{ color: '#2dd4bf', marginBottom: '10px' }}>Thông Tin Học Viên</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                      <div><strong>Mã HV:</strong> HV{classDetail.info.mahv?.toString().padStart(6, '0')}</div>
                      <div><strong>Họ tên:</strong> {classDetail.info.studentname}</div>
                      <div><strong>SĐT:</strong> {classDetail.info.studentsdt}</div>
                      <div><strong>Email:</strong> {classDetail.info.studentemail || 'Không có'}</div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ color: '#6366f1', marginBottom: '10px' }}>Thông Tin Gia Sư</h4>
                    {classDetail.info.mags ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                        <div><strong>Mã GS:</strong> GS{classDetail.info.mags?.toString().padStart(6, '0')}</div>
                        <div><strong>Họ tên:</strong> {classDetail.info.tutorname}</div>
                        <div><strong>SĐT:</strong> {classDetail.info.tutorsdt}</div>
                        <div><strong>Trình độ:</strong> {classDetail.info.tutortrinhdo} ({classDetail.info.tutorchuyennganh})</div>
                      </div>
                    ) : (
                      <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa phân công gia sư</div>
                    )}
                  </div>
                </div>

                {/* Session Stats */}
                <div>
                  <h4 style={{ color: '#f59e0b', marginBottom: '10px' }}>Tiến Độ Buổi Học</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', padding: '10px', borderRadius: '8px' }}>
                      <span style={{ display: 'block', fontSize: '20px', fontWeight: 'bold', color: '#f59e0b' }}>{classDetail.stats.count_choxacnhan}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Chờ xác nhận</span>
                    </div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '10px', borderRadius: '8px' }}>
                      <span style={{ display: 'block', fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{classDetail.stats.count_daday}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Đã dạy</span>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '10px', borderRadius: '8px' }}>
                      <span style={{ display: 'block', fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>{parseInt(classDetail.stats.count_hvvangcophep)}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>HV vắng có phép</span>
                    </div>
                    <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid #8b5cf6', padding: '10px', borderRadius: '8px' }}>
                      <span style={{ display: 'block', fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>{classDetail.stats.count_gsnghi}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>GS nghỉ</span>
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
