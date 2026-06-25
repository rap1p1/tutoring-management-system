import React, { useState, useEffect } from "react";
const TutorsTab = React.lazy(() => import('./admin/tabs/TutorsTab'));
const AllTutorsTab = React.lazy(() => import('./admin/tabs/AllTutorsTab'));
const AllStudentsTab = React.lazy(() => import('./admin/tabs/AllStudentsTab'));
const RequestsTab = React.lazy(() => import('./admin/tabs/RequestsTab'));
const ClassesTab = React.lazy(() => import('./admin/tabs/ClassesTab'));
const FinancesTab = React.lazy(() => import('./admin/tabs/FinancesTab'));
const SupportTab = React.lazy(() => import('./admin/tabs/SupportTab'));
const AccountsTab = React.lazy(() => import('./admin/tabs/AccountsTab'));
const SettingsTab = React.lazy(() => import('./admin/tabs/SettingsTab'));
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  UserCheck,
  ClipboardList,
  DollarSign,
  LogOut,
  Check,
  X,
  PlusCircle,
  CreditCard,
  Download,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import * as XLSX from "xlsx";

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("tutors");
  const [globalError, setGlobalError] = useState("");
  const [globalSuccess, setGlobalSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  // Data states
  const [stats, setStats] = useState({
    activeClasses: 0,
    pendingTutors: 0,
    pendingRequests: 0,
    revenue: 0,
  });
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
  const [defaultTyleHH, setDefaultTyleHH] = useState(70);
  const [defaultHocPhis, setDefaultHocPhis] = useState({
    HocPhi_Cap1: 100000,
    HocPhi_Cap2: 200000,
    HocPhi_Cap3: 300000,
    HocPhi_LuyenThiDH: 400000,
    HocPhi_TiengAnhGT: 350000,
    HocPhi_ChungChiQT: 500000,
    HocPhi_Khac: 250000,
  });
  const [allTutors, setAllTutors] = useState([]);
  const [allStudents, setAllStudents] = useState([]);

  const getDefaultHocPhi = (cap) => {
    if (cap === "Cấp 1") return defaultHocPhis.HocPhi_Cap1;
    if (cap === "Cấp 2") return defaultHocPhis.HocPhi_Cap2;
    if (cap === "Cấp 3") return defaultHocPhis.HocPhi_Cap3;
    if (cap === "Luyện thi Đại học") return defaultHocPhis.HocPhi_LuyenThiDH;
    if (cap === "Tiếng Anh Giao tiếp") return defaultHocPhis.HocPhi_TiengAnhGT;
    if (cap === "Chứng chỉ Quốc tế") return defaultHocPhis.HocPhi_ChungChiQT;
    return defaultHocPhis.HocPhi_Khac;
  };

  // Class detail state
  const [showClassDetailModal, setShowClassDetailModal] = useState(false);
  const [classDetail, setClassDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modals state
  const [showClassModal, setShowClassModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showCreateCommissionModal, setShowCreateCommissionModal] =
    useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [
        statRes,
        tutRes,
        reqRes,
        classRes,
        tuitRes,
        commRes,
        suppRes,
        absRes,
        chartRes,
        accRes,
        profRes,
        meRes,
        tyleRes,
        hpRes,
        allTutorsRes,
        allStudentsRes,
      ] = await Promise.all([
        fetch("/api/nhanvien/stats").then((r) => r.json()),
        fetch("/api/nhanvien/giasu/pending").then((r) => r.json()),
        fetch("/api/nhanvien/yeucau").then((r) => r.json()),
        fetch("/api/nhanvien/lop").then((r) => r.json()),
        fetch("/api/nhanvien/hocphi").then((r) => r.json()),
        fetch("/api/nhanvien/hoahong").then((r) => r.json()),
        fetch("/api/nhanvien/yeucaudoi").then((r) => r.json()),
        fetch("/api/nhanvien/baonghi").then((r) => r.json()),
        fetch("/api/nhanvien/revenue-chart").then((r) => r.json()),
        fetch("/api/nhanvien/taikhoan").then((r) => r.json()),
        fetch("/api/nhanvien/me").then((r) => r.json()),
        fetch("/api/auth/me").then((r) => r.json()),
        fetch("/api/nhanvien/config/tylehh").then((r) => r.json()),
        fetch("/api/nhanvien/config/hocphi").then((r) => r.json()),
        fetch("/api/nhanvien/giasu").then((r) => r.json()),
        fetch("/api/nhanvien/hocvien").then((r) => r.json()),
      ]);

      if (!statRes.success) {
        if (statRes.message === "Không có quyền thực hiện chức năng này")
          navigate("/login");
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
    } catch (e) {
      console.error(e);
      setGlobalError("Lỗi tải dữ liệu bảng điều khiển. Chi tiết: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type, text) => {
    Swal.fire({
      title: type === "error" ? "Thất bại" : "Thành công",
      text: text,
      icon: type,
      confirmButtonColor: "#6366f1",
      background: "#1e293b",
      color: "#fff",
    });
  };

  const handleApproveTutor = async (id, status) => {
    const actionName = status === "DaDuyet" ? "duyệt" : "từ chối";
    const result = await Swal.fire({
      title: "Xác nhận",
      text: `Bạn muốn ${actionName} gia sư này?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: status === "DaDuyet" ? "#10b981" : "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Đồng ý",
      cancelButtonText: "Hủy",
      background: "#1e293b",
      color: "#fff",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/nhanvien/giasu/${id}/duyet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        showMsg("success", "Đã cập nhật trạng thái hồ sơ.");
        fetchData();
      } else {
        showMsg("error", json.message);
      }
    } catch (e) {
      showMsg("error", "Lỗi kết nối.");
    }
  };

  const handleOpenClassModal = (req) => {
    setSelectedRequest(req);
    setShowClassModal(true);
  };

  const formatLichHoc = (lichHocStr) => {
    try {
      const lichHoc =
        typeof lichHocStr === "string" ? JSON.parse(lichHocStr) : lichHocStr;
      if (!Array.isArray(lichHoc) || lichHoc.length === 0) return "Chưa có";
      const thuMap = {
        2: "T2",
        3: "T3",
        4: "T4",
        5: "T5",
        6: "T6",
        7: "T7",
        8: "CN",
      };
      const buoiMap = { Sang: "Sáng", Chieu: "Chiều", Toi: "Tối" };
      return lichHoc
        .map((item) => `${thuMap[item.thu]} ${buoiMap[item.buoi]}`)
        .join(", ");
    } catch (e) {
      return lichHocStr || "Chưa có";
    }
  };

  const getMatchCount = (requestSchedule, tutorSchedule) => {
    if (!requestSchedule || !tutorSchedule) return 0;
    let reqSched = [];
    try {
      reqSched =
        typeof requestSchedule === "string"
          ? JSON.parse(requestSchedule)
          : requestSchedule;
    } catch (e) {
      reqSched = [];
    }
    if (!Array.isArray(reqSched)) reqSched = [];

    let matchCount = 0;
    reqSched.forEach((reqSlot) => {
      const hasMatch = tutorSchedule.some(
        (tutSlot) =>
          parseInt(tutSlot.thu) === parseInt(reqSlot.thu) &&
          String(tutSlot.buoi).toLowerCase() ===
            String(reqSlot.buoi).toLowerCase(),
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
      showMsg("error", "Vui lòng chọn gia sư!");
      return;
    }

    try {
      const res = await fetch("/api/nhanvien/lop/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mayc: selectedRequest.mayc,
          mags: data.mags,
          hocphimoibuoi: data.hocphi,
          tylehh: data.tylehh,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showMsg("success", json.message || "Ghép lớp thành công!");
        setShowClassModal(false);
        fetchData();
      } else {
        showMsg("error", json.message);
      }
    } catch (e) {
      showMsg("error", "Lỗi kết nối.");
    }
  };

  const handleConfirmTuition = async (id) => {
    try {
      const res = await fetch(`/api/nhanvien/hocphi/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hinhthuctt: "ChuyenKhoan" }),
      });
      const json = await res.json();
      if (json.success) {
        showMsg("success", "Xác nhận đóng học phí thành công!");
        fetchData();
      } else {
        showMsg("error", json.message);
      }
    } catch (e) {
      showMsg("error", "Lỗi kết nối.");
    }
  };

  const handleConfirmCommission = async (id) => {
    try {
      const res = await fetch(`/api/nhanvien/hoahong/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hinhthuctt: "ChuyenKhoan" }),
      });
      const json = await res.json();
      if (json.success) {
        showMsg("success", "Xác nhận thanh toán hoa hồng thành công!");
        fetchData();
      } else {
        showMsg("error", json.message);
      }
    } catch (e) {
      showMsg("error", "Lỗi kết nối.");
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/nhanvien/hocphi/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          malop: e.target.malop.value,
          mahv: e.target.mahv.value,
          kytt_tu: e.target.kytt_tu.value,
          kytt_den: e.target.kytt_den.value,
          sobuoi: parseInt(e.target.sobuoi.value),
          hocphimoibuoi: parseInt(e.target.hocphimoibuoi.value),
        }),
      });
      const json = await res.json();
      if (json.success) {
        showMsg("success", "Tạo hóa đơn học phí thành công!");
        setShowCreateInvoiceModal(false);
        fetchData();
      } else {
        showMsg("error", json.message);
      }
    } catch (err) {
      showMsg("error", "Lỗi kết nối");
    }
  };

  const handleCreateCommission = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/nhanvien/hoahong/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mags: e.target.mags.value,
          malop: e.target.malop.value,
          kytt_tu: e.target.kytt_tu.value,
          kytt_den: e.target.kytt_den.value,
          sobuoida_day: parseInt(e.target.sobuoida_day.value),
          hocphihvmoibuoi: parseInt(e.target.hocphihvmoibuoi.value),
          tylehh: parseFloat(e.target.tylehh.value),
        }),
      });
      const json = await res.json();
      if (json.success) {
        showMsg("success", "Tạo phiếu hoa hồng thành công!");
        setShowCreateCommissionModal(false);
        fetchData();
      } else {
        showMsg("error", json.message);
      }
    } catch (err) {
      showMsg("error", "Lỗi kết nối");
    }
  };

  const handleResolveSupport = async (id) => {
    try {
      const res = await fetch(`/api/nhanvien/yeucaudoi/${id}/xuly`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        showMsg("success", "Đã đánh dấu xử lý.");
        fetchData();
      } else {
        showMsg("error", json.message);
      }
    } catch (e) {
      showMsg("error", "Lỗi kết nối.");
    }
  };

  const handleDuyetNghi = async (mabuoi, action) => {
    const actionText = action === "approve" ? "phê duyệt" : "từ chối";
    const result = await Swal.fire({
      title: "Xác nhận",
      text: `Bạn có chắc muốn ${actionText} yêu cầu nghỉ này?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: action === "approve" ? "#10b981" : "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Đồng ý",
      cancelButtonText: "Hủy",
      background: "#1e293b",
      color: "#fff",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/nhanvien/baonghi/${mabuoi}/xuly`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.success) {
        Swal.fire({
          title: "Thành công",
          text: json.message,
          icon: "success",
          background: "#1e293b",
          color: "#fff",
        });
        fetchData();
      } else {
        Swal.fire({
          title: "Lỗi",
          text: json.message,
          icon: "error",
          background: "#1e293b",
          color: "#fff",
        });
      }
    } catch (e) {
      Swal.fire({
        title: "Lỗi kết nối",
        text: "Không thể kết nối máy chủ",
        icon: "error",
        background: "#1e293b",
        color: "#fff",
      });
    }
  };

  // KẾT THÚC LỚP SỚM + TỰ ĐỘNG TẠO HÓA ĐƠN
  const handleEndClass = async (id) => {
    const result = await Swal.fire({
      title: "Kết thúc lớp sớm",
      input: "textarea",
      inputLabel: "Lý do kết thúc lớp",
      inputPlaceholder: "Nhập lý do...",
      showCancelButton: true,
      confirmButtonText: "Xác nhận kết thúc",
      cancelButtonText: "Hủy",
      background: "#1e293b",
      color: "#fff",
      inputValidator: (value) => {
        if (!value) return "Vui lòng nhập lý do!";
      },
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/nhanvien/lop/${id}/ketthuc`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lydo: result.value }),
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
            title: "Kết thúc lớp & Thanh toán",
            html: detailHtml,
            icon: "success",
            confirmButtonColor: "#6366f1",
            background: "#1e293b",
            color: "#fff",
            width: "500px",
          });
          fetchData();
        } else {
          showMsg("error", json.message);
        }
      } catch (e) {
        showMsg("error", "Lỗi kết nối.");
      }
    }
  };

  const handleToggleLock = async (id, currentStatus) => {
    const actionName = currentStatus === "Khoa" ? "mở khóa" : "khóa";
    const result = await Swal.fire({
      title: "Xác nhận",
      text: `Bạn có chắc chắn muốn ${actionName} tài khoản này?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: currentStatus === "Khoa" ? "#10b981" : "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Đồng ý",
      cancelButtonText: "Hủy",
      background: "#1e293b",
      color: "#fff",
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/nhanvien/taikhoan/${id}/toggle-lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (json.success) {
        showMsg("success", json.message);
        fetchData();
      } else {
        showMsg("error", json.message);
      }
    } catch (e) {
      showMsg("error", "Lỗi kết nối.");
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
        showMsg("error", json.message);
        setShowClassDetailModal(false);
      }
    } catch (e) {
      showMsg("error", "Lỗi kết nối.");
      setShowClassDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  // THAY ĐỔI TỶ LỆ HOA HỒNG - CHỈ BGD
  const handleChangeCommission = async (malop) => {
    const { value: newRate } = await Swal.fire({
      title: "Thay đổi tỷ lệ hoa hồng",
      input: "number",
      inputLabel: "Tỷ lệ hoa hồng GS mới (%)",
      inputPlaceholder: "Ví dụ: 70",
      inputAttributes: { min: 0, max: 100, step: 5 },
      showCancelButton: true,
      confirmButtonText: "Cập nhật",
      cancelButtonText: "Hủy",
      background: "#1e293b",
      color: "#fff",
      inputValidator: (value) => {
        if (!value || isNaN(value)) return "Vui lòng nhập số!";
        if (value < 0 || value > 100) return "Tỷ lệ phải từ 0 đến 100!";
      },
    });

    if (newRate) {
      try {
        const res = await fetch(`/api/nhanvien/lop/${malop}/tylehh`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tylehh: parseFloat(newRate) }),
        });
        const json = await res.json();
        if (json.success) {
          showMsg("success", json.message);
          fetchData();
          if (classDetail) handleOpenClassDetail(malop);
        } else {
          showMsg("error", json.message);
        }
      } catch (e) {
        showMsg("error", "Lỗi kết nối.");
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
    const exportData = classes.map((c) => ({
      "Mã Lớp": c.malop,
      "Ngày Bắt Đầu": new Date(c.ngaybatdau).toLocaleDateString("vi-VN"),
      "Môn Học": c.tenmh,
      "Gia Sư": c.tengiasu || "Chưa phân công",
      "Học Viên": c.tenhocvien,
      "Học Phí (VNĐ)": c.hocphimoibuoi,
      "Trạng Thái": c.trangthai,
    }));
    exportToExcel(exportData, "DanhSachLop_GiaSu");
  };

  const exportFinances = () => {
    const exportData = tuitions.map((t) => ({
      "Mã Lớp": t.malop,
      "Học Viên": t.tenhocvien,
      "Kỳ Thu Từ": new Date(t.kytt_tu).toLocaleDateString("vi-VN"),
      "Kỳ Thu Đến": new Date(t.kytt_den).toLocaleDateString("vi-VN"),
      "Số Buổi": t.sobuoi,
      "Tổng Tiền (VNĐ)": t.tonghocphi,
      "Trạng Thái": t.trangthai,
    }));
    exportToExcel(exportData, "BaoCaoTaiChinh_HocPhi");
  };

  if (loading)
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>Đang tải...</div>
    );

  
  const pendingTutorsCount = pendingTutors.length;
  const pendingReqsCount = requests.filter(r => r.trangthai === 'ChoGhep').length;
  const pendingSupportCount = supportRequests.filter(r => r.trangthai === 'ChoXuLy').length + absences.filter(a => ['HVXinNghi', 'GSXinNghi'].includes(a.trangthai)).length;

  return (
    <div className="view-section"
 style={{ display: "block" }}>
      <div
        className="dashboard-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2>Trang Quản Trị Hệ Thống</h2>
          <p>Quản lý yêu cầu, phân công gia sư và duyệt hồ sơ</p>
        </div>
      </div>

      {profile && (
        <div className="glass-card mb-4" style={{ padding: "20px" }}>
          <h3 style={{ marginBottom: "15px" }}>Thông Tin Cá Nhân Nhân Viên</h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: "15px",
            }}
          >
            <div>
              <strong
                style={{ color: "#94a3b8", display: "block", fontSize: "12px" }}
              >
                Mã Nhân Viên (ID)
              </strong>{" "}
              {profile.manv
                ? "NV" + profile.manv.toString().padStart(6, "0")
                : ""}
            </div>
            <div>
              <strong
                style={{ color: "#94a3b8", display: "block", fontSize: "12px" }}
              >
                Họ và tên
              </strong>{" "}
              {profile.hoten}
            </div>
            <div>
              <strong
                style={{ color: "#94a3b8", display: "block", fontSize: "12px" }}
              >
                Chức vụ
              </strong>{" "}
              {profile.chucvu}
            </div>
            <div>
              <strong
                style={{ color: "#94a3b8", display: "block", fontSize: "12px" }}
              >
                Số điện thoại
              </strong>{" "}
              {profile.sdt}
            </div>
          </div>
        </div>
      )}

      {globalError && (
        <div
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            color: "#ef4444",
            border: "1px solid #ef4444",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          {globalError}
        </div>
      )}

      {/* Stats Cards */}
      <div className="stats-row mb-4">
        <div className="stats-card">
          <div className="stats-icon text-indigo">
            <BookOpen size={24} />
          </div>
          <div className="stats-info">
            <span className="stats-label">Lớp Đang Hoạt Động</span>
            <span className="stats-value">{stats.activeClasses}</span>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-icon text-teal">
            <UserCheck size={24} />
          </div>
          <div className="stats-info">
            <span className="stats-label">Hồ Sơ GS Chờ Duyệt</span>
            <span className="stats-value">{stats.pendingTutors}</span>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-icon text-amber">
            <ClipboardList size={24} />
          </div>
          <div className="stats-info">
            <span className="stats-label">Yêu Cầu Học Chờ Ghép</span>
            <span className="stats-value">{stats.pendingRequests}</span>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-icon text-rose">
            <DollarSign size={24} />
          </div>
          <div className="stats-info">
            <span className="stats-label">Tổng Doanh Thu</span>
            <span className="stats-value">
              {parseInt(stats.revenue || 0).toLocaleString()}đ
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card">
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === "tutors" ? "active" : ""}`}
            style={{ position: 'relative' }}
            onClick={() => setActiveTab("tutors")}
          >
            Duyệt Hồ Sơ Gia Sư
            {pendingTutorsCount > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold' }}>{pendingTutorsCount}</span>}
          </button>
          <button
            className={`admin-tab ${activeTab === "all_tutors" ? "active" : ""}`}
            onClick={() => setActiveTab("all_tutors")}
          >
            Hồ Sơ Gia Sư
          </button>
          <button
            className={`admin-tab ${activeTab === "all_students" ? "active" : ""}`}
            onClick={() => setActiveTab("all_students")}
          >
            Hồ Sơ Học Viên
          </button>
          <button
            className={`admin-tab ${activeTab === "requests" ? "active" : ""}`}
            style={{ position: 'relative' }}
            onClick={() => setActiveTab("requests")}
          >
            Yêu Cầu Học Kèm
            {pendingReqsCount > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold' }}>{pendingReqsCount}</span>}
          </button>
          <button
            className={`admin-tab ${activeTab === "classes" ? "active" : ""}`}
            onClick={() => setActiveTab("classes")}
          >
            Danh Sách Lớp & Học Phí
          </button>
          <button
            className={`admin-tab ${activeTab === "finances" ? "active" : ""}`}
            onClick={() => setActiveTab("finances")}
          >
            Tài Chính & Hoa Hồng
          </button>
          <button
            className={`admin-tab ${activeTab === "support" ? "active" : ""}`}
            style={{ position: 'relative' }}
            onClick={() => setActiveTab("support")}
          >
            Yêu Cầu Đổi/Nghỉ
            {pendingSupportCount > 0 && <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold' }}>{pendingSupportCount}</span>}
          </button>
          {currentUser && (currentUser.vaitro === "SA" || currentUser.vaitro === "BGD") && (
            <button
              className={`admin-tab ${activeTab === "accounts" ? "active" : ""}`}
              onClick={() => setActiveTab("accounts")}
            >
              Quản Lý Tài Khoản
            </button>
          )}
          {currentUser && currentUser.vaitro === "BGD" && (
            <button
              className={`admin-tab ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              Cấu Hình Hệ Thống
            </button>
          )}
        </div>

        <div className="card-body">
          <React.Suspense fallback={<div style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>Đang tải giao diện...</div>}>
          {/* TUTORS TAB */}
          {activeTab === "tutors" && <TutorsTab {...propsObj} />}

          
          {/* ALL TUTORS TAB */}
          {activeTab === "all_tutors" && <AllTutorsTab {...propsObj} />}

          {/* ALL STUDENTS TAB */}
          {activeTab === "all_students" && <AllStudentsTab {...propsObj} />}

          {/* REQUESTS TAB */}

          {activeTab === "requests" && <RequestsTab {...propsObj} />}

          {/* CLASSES TAB */}
          {activeTab === "classes" && <ClassesTab {...propsObj} />}

          {/* FINANCES TAB */}
          {activeTab === "finances" && <FinancesTab {...propsObj} />}

          {/* SUPPORT TAB */}
          {activeTab === "support" && <SupportTab {...propsObj} />}

          {/* ACCOUNTS TAB */}
          {activeTab === "accounts" && <AccountsTab {...propsObj} />}
          {/* SETTINGS TAB */}
          {activeTab === "settings" && <SettingsTab {...propsObj} />}
          </React.Suspense>
        </div>
      </div>

      
      {/* Revenue Chart */}
      <div className="glass-card mb-4" style={{ padding: "20px" }}>
        <h3
          style={{
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <DollarSign size={20} className="text-rose" /> Biểu Đồ Doanh Thu Theo
          Tháng
        </h3>
        <div style={{ width: "100%", height: "300px" }}>
          {revenueData && revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis
                  stroke="#94a3b8"
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("vi-VN", {
                      notation: "compact",
                      compactDisplay: "short",
                    }).format(value)
                  }
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value, name) => [
                    new Intl.NumberFormat("vi-VN").format(value) + " VNĐ",
                    name,
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="revenue"
                  name="Doanh Thu (VNĐ)"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="profit"
                  name="Lợi Nhuận Thực Tế (VNĐ)"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
                border: "1px dashed rgba(255,255,255,0.1)",
                borderRadius: "8px",
              }}
            >
              Chưa có dữ liệu doanh thu để thống kê
            </div>
          )}
        </div>
      </div>

      {/* Class Creation Modal */}
      {showClassModal && selectedRequest && (
        <div className="modal" style={{ display: "flex" }}>
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h3>Tạo Lớp & Phân Công Gia Sư</h3>
              <span
                className="close-btn"
                onClick={() => setShowClassModal(false)}
              >
                &times;
              </span>
            </div>

            {/* Hiển thị lịch học từ yêu cầu */}
            <div
              style={{
                backgroundColor: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.3)",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "15px",
              }}
            >
              <p
                style={{
                  margin: "0 0 5px 0",
                  fontSize: "13px",
                  color: "#a5b4fc",
                }}
              >
                <strong>📋 Thông tin yêu cầu:</strong>
              </p>
              <p style={{ margin: 0, fontSize: "13px" }}>
                Lịch học:{" "}
                <strong>
                  {formatLichHoc(selectedRequest.lichhoctrongtuan)}
                </strong>
              </p>
            </div>

            {(() => {
              const sortedTutors = [...allTutors]
                .map((gs) => {
                  const matchCount = getMatchCount(
                    selectedRequest?.lichhoctrongtuan,
                    gs.lichranh,
                  );
                  return { ...gs, matchCount };
                })
                .sort((a, b) => b.matchCount - a.matchCount);

              
  const propsObj = {
    activeTab, setActiveTab, pendingTutors, allTutors, allStudents, requests, classes, 
    tuitions, commissions, supportReqs, accounts, settings,
    currentUser, handleApproveTutor, handleOpenClassModal,
    handleOpenClassDetail, handleEndClass, exportClasses,
    setShowCreateInvoiceModal, setShowCreateCommissionModal,
    exportFinances, handleConfirmTuition, handleConfirmCommission,
    handleApproveSupport, handleApproveLeave, handleToggleLockAcc,
    handleSaveConfig, formatLichHoc, newConfig, setNewConfig,
    defaultTyleHH, setDefaultTyleHH, defaultHocPhis, setDefaultHocPhis, showMsg
  };
return (
                <form onSubmit={handleCreateClass}>
                  <div className="form-group">
                    <label>Mã Yêu Cầu</label>
                    <input
                      type="text"
                      value={selectedRequest.mayc}
                      disabled
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Chọn Gia Sư *</label>
                    <select
                      name="mags"
                      required
                      className="form-control"
                      style={{
                        background: "#1e293b",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.1)",
                        padding: "8px",
                        borderRadius: "6px",
                        width: "100%",
                      }}
                    >
                      <option value="">-- Chọn gia sư --</option>
                      {sortedTutors.map((gs) => (
                        <option
                          key={gs.mags}
                          value={gs.mags}
                          disabled={gs.trangthaihoso !== "DaDuyet"}
                          style={
                            gs.trangthaihoso !== "DaDuyet"
                              ? { color: "#64748b" }
                              : {}
                          }
                        >
                          {gs.hoten} - MS: {gs.mags}{" "}
                          {gs.trangthaihoso !== "DaDuyet"
                            ? "(Chưa duyệt hồ sơ)"
                            : gs.matchCount > 0
                              ? `🟢 Trùng ${gs.matchCount} buổi`
                              : "⚪ Không trùng"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      Học phí mỗi buổi *{" "}
                      {currentUser && currentUser.vaitro !== "BGD" && (
                        <span style={{ fontSize: "11px", color: "#f59e0b" }}>
                          (Chỉ Giám đốc được thay đổi)
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      name="hocphi"
                      required
                      min="50000"
                      step="50000"
                      placeholder="VND"
                      key={
                        selectedRequest
                          ? `${selectedRequest.mayc}-${selectedRequest.caplop}-${JSON.stringify(defaultHocPhis)}`
                          : "default"
                      }
                      defaultValue={
                        selectedRequest
                          ? getDefaultHocPhi(selectedRequest.caplop)
                          : 250000
                      }
                      readOnly={currentUser && currentUser.vaitro !== "BGD"}
                      style={
                        currentUser && currentUser.vaitro !== "BGD"
                          ? { opacity: 0.6, cursor: "not-allowed" }
                          : {}
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      Tỷ lệ Hoa hồng GS (%){" "}
                      {currentUser && currentUser.vaitro !== "BGD" && (
                        <span style={{ fontSize: "11px", color: "#f59e0b" }}>
                          (Chỉ Giám đốc được thay đổi)
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      name="tylehh"
                      defaultValue={defaultTyleHH}
                      key={defaultTyleHH}
                      readOnly={currentUser && currentUser.vaitro !== "BGD"}
                      style={
                        currentUser && currentUser.vaitro !== "BGD"
                          ? { opacity: 0.6, cursor: "not-allowed" }
                          : {}
                      }
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-block"
                    style={{ marginTop: "15px" }}
                  >
                    Tạo Lớp
                  </button>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateInvoiceModal && (
        <div className="modal" style={{ display: "flex" }}>
          <div
            className="modal-content glass-card"
            style={{ maxWidth: "500px" }}
          >
            <div className="modal-header">
              <h3>Tạo Yêu Cầu Thu Học Phí</h3>
              <span
                className="close-btn"
                onClick={() => setShowCreateInvoiceModal(false)}
              >
                &times;
              </span>
            </div>
            <form onSubmit={handleCreateInvoice}>
              <div className="form-group">
                <label>Mã Lớp *</label>
                <input
                  type="text"
                  name="malop"
                  required
                  placeholder="VD: L000001"
                />
              </div>
              <div className="form-group">
                <label>Mã Học Viên *</label>
                <input
                  type="text"
                  name="mahv"
                  required
                  placeholder="VD: HV000001"
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                }}
              >
                <div className="form-group">
                  <label>Kỳ thanh toán từ ngày *</label>
                  <input type="date" name="kytt_tu" required />
                </div>
                <div className="form-group">
                  <label>Đến ngày *</label>
                  <input type="date" name="kytt_den" required />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                }}
              >
                <div className="form-group">
                  <label>Số buổi học *</label>
                  <input type="number" name="sobuoi" required min="1" />
                </div>
                <div className="form-group">
                  <label>Học phí mỗi buổi (VND) *</label>
                  <input
                    type="number"
                    name="hocphimoibuoi"
                    required
                    min="0"
                    step="10000"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                style={{ marginTop: "15px" }}
              >
                Tạo Hóa Đơn
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Commission Modal */}
      {showCreateCommissionModal && (
        <div className="modal" style={{ display: "flex" }}>
          <div
            className="modal-content glass-card"
            style={{ maxWidth: "500px" }}
          >
            <div className="modal-header">
              <h3>Tạo Yêu Cầu Chi Hoa Hồng</h3>
              <span
                className="close-btn"
                onClick={() => setShowCreateCommissionModal(false)}
              >
                &times;
              </span>
            </div>
            <form onSubmit={handleCreateCommission}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                }}
              >
                <div className="form-group">
                  <label>Mã Gia Sư *</label>
                  <input
                    type="text"
                    name="mags"
                    required
                    placeholder="VD: GS000001"
                  />
                </div>
                <div className="form-group">
                  <label>Mã Lớp *</label>
                  <input
                    type="text"
                    name="malop"
                    required
                    placeholder="VD: L000001"
                  />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                }}
              >
                <div className="form-group">
                  <label>Kỳ thanh toán từ ngày *</label>
                  <input type="date" name="kytt_tu" required />
                </div>
                <div className="form-group">
                  <label>Đến ngày *</label>
                  <input type="date" name="kytt_den" required />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "15px",
                }}
              >
                <div className="form-group">
                  <label>Số buổi đã dạy *</label>
                  <input type="number" name="sobuoida_day" required min="1" />
                </div>
                <div className="form-group">
                  <label>Học phí mỗi buổi (VND) *</label>
                  <input
                    type="number"
                    name="hocphihvmoibuoi"
                    required
                    min="0"
                    step="10000"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Tỷ lệ hoa hồng (%) *</label>
                <input
                  type="number"
                  name="tylehh"
                  required
                  min="0"
                  max="100"
                  defaultValue="70"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                style={{ marginTop: "15px" }}
              >
                Tạo Phiếu Hoa Hồng
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Class Detail Modal */}
      {showClassDetailModal && (
        <div className="modal" style={{ display: "flex" }}>
          <div
            className="modal-content glass-card"
            style={{ maxWidth: "700px", width: "90%" }}
          >
            <div className="modal-header">
              <h3>Chi Tiết Lớp Học #{classDetail?.info?.malop}</h3>
              <span
                className="close-btn"
                onClick={() => setShowClassDetailModal(false)}
              >
                &times;
              </span>
            </div>

            {loadingDetail ? (
              <div style={{ padding: "30px", textAlign: "center" }}>
                Đang tải thông tin chi tiết...
              </div>
            ) : classDetail ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                  maxHeight: "70vh",
                  overflowY: "auto",
                  paddingRight: "5px",
                }}
              >
                {/* Class Info */}
                <div
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                    paddingBottom: "15px",
                  }}
                >
                  <h4 style={{ color: "#fff", marginBottom: "10px" }}>
                    Thông Tin Lớp Học
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                      fontSize: "14px",
                    }}
                  >
                    <div>
                      <strong>Môn học:</strong> {classDetail.info.tenmh} (
                      {classDetail.info.caplop})
                    </div>
                    <div>
                      <strong>Trạng thái:</strong>{" "}
                      <span
                        className={`status-badge ${classDetail.info.classtrangthai === "DangDay" ? "status-active" : classDetail.info.classtrangthai === "KetThuc" ? "status-disabled" : "status-pending"}`}
                      >
                        {classDetail.info.classtrangthai}
                      </span>
                    </div>
                    <div>
                      <strong>Học phí:</strong>{" "}
                      {parseInt(
                        classDetail.info.hocphimoibuoi,
                      ).toLocaleString()}
                      đ/buổi
                    </div>
                    <div>
                      <strong>Tỷ lệ HH GS:</strong>{" "}
                      {classDetail.info.tylehhgiasu}%
                      {currentUser && currentUser.vaitro === "BGD" && (
                        <button
                          className="btn btn-xs btn-primary"
                          style={{ marginLeft: "8px" }}
                          onClick={() =>
                            handleChangeCommission(classDetail.info.malop)
                          }
                        >
                          Sửa
                        </button>
                      )}
                    </div>
                    <div>
                      <strong>Ngày bắt đầu:</strong>{" "}
                      {classDetail.info.ngaybatdau
                        ? new Date(
                            classDetail.info.ngaybatdau,
                          ).toLocaleDateString("vi-VN")
                        : "N/A"}
                    </div>
                    <div>
                      <strong>Số buổi đã học:</strong>{" "}
                      {classDetail.info.songayhoc !== undefined
                        ? classDetail.info.songayhoc
                        : "N/A"}
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <strong>Lịch học:</strong>{" "}
                      {formatLichHoc(classDetail.info.lichhoctrongtuan)}
                    </div>
                  </div>
                </div>

                {/* Student & Tutor */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                    paddingBottom: "15px",
                  }}
                >
                  <div>
                    <h4 style={{ color: "#2dd4bf", marginBottom: "10px" }}>
                      Thông Tin Học Viên
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        fontSize: "13px",
                      }}
                    >
                      <div>
                        <strong>Mã HV:</strong> HV
                        {classDetail.info.mahv?.toString().padStart(6, "0")}
                      </div>
                      <div>
                        <strong>Họ tên:</strong> {classDetail.info.studentname}
                      </div>
                      <div>
                        <strong>SĐT:</strong> {classDetail.info.studentsdt}
                      </div>
                      <div>
                        <strong>Email:</strong>{" "}
                        {classDetail.info.studentemail || "Không có"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ color: "#6366f1", marginBottom: "10px" }}>
                      Thông Tin Gia Sư
                    </h4>
                    {classDetail.info.mags ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          fontSize: "13px",
                        }}
                      >
                        <div>
                          <strong>Mã GS:</strong> GS
                          {classDetail.info.mags?.toString().padStart(6, "0")}
                        </div>
                        <div>
                          <strong>Họ tên:</strong> {classDetail.info.tutorname}
                        </div>
                        <div>
                          <strong>SĐT:</strong> {classDetail.info.tutorsdt}
                        </div>
                        <div>
                          <strong>Trình độ:</strong>{" "}
                          {classDetail.info.tutortrinhdo} (
                          {classDetail.info.tutorchuyennganh})
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: "#94a3b8", fontStyle: "italic" }}>
                        Chưa phân công gia sư
                      </div>
                    )}
                  </div>
                </div>

                {/* Session Stats */}
                <div>
                  <h4 style={{ color: "#f59e0b", marginBottom: "10px" }}>
                    Tiến Độ Buổi Học
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr 1fr",
                      gap: "10px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        background: "rgba(245, 158, 11, 0.1)",
                        border: "1px solid #f59e0b",
                        padding: "10px",
                        borderRadius: "8px",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: "20px",
                          fontWeight: "bold",
                          color: "#f59e0b",
                        }}
                      >
                        {classDetail.stats.count_choxacnhan}
                      </span>
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                        Chờ xác nhận
                      </span>
                    </div>
                    <div
                      style={{
                        background: "rgba(16, 185, 129, 0.1)",
                        border: "1px solid #10b981",
                        padding: "10px",
                        borderRadius: "8px",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: "20px",
                          fontWeight: "bold",
                          color: "#10b981",
                        }}
                      >
                        {classDetail.stats.count_daday}
                      </span>
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                        Đã dạy
                      </span>
                    </div>
                    <div
                      style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid #ef4444",
                        padding: "10px",
                        borderRadius: "8px",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: "20px",
                          fontWeight: "bold",
                          color: "#ef4444",
                        }}
                      >
                        {parseInt(classDetail.stats.count_hvvangcophep)}
                      </span>
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                        HV vắng có phép
                      </span>
                    </div>
                    <div
                      style={{
                        background: "rgba(139, 92, 246, 0.1)",
                        border: "1px solid #8b5cf6",
                        padding: "10px",
                        borderRadius: "8px",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: "20px",
                          fontWeight: "bold",
                          color: "#8b5cf6",
                        }}
                      >
                        {classDetail.stats.count_gsnghi}
                      </span>
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                        GS nghỉ
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "30px",
                  textAlign: "center",
                  color: "#ef4444",
                }}
              >
                Không tải được dữ liệu.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
