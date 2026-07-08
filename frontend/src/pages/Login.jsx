import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, X, Mail, KeyRound, ShieldCheck, ArrowLeft } from 'lucide-react';

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// Google Client ID từ biến môi trường Vite (hoặc hardcode tạm)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function Login() {
  const [activeTab, setActiveTab] = useState('login');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [regHvPassVisible, setRegHvPassVisible] = useState(false);
  const [regGsPassVisible, setRegGsPassVisible] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formSuccess, setFormSuccess] = useState('');
  
  // 2FA state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFAToken, setTwoFAToken] = useState('');
  const [twoFAEmail, setTwoFAEmail] = useState('');
  const [twoFAError, setTwoFAError] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAOtp, setTwoFAOtp] = useState('');
  
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const navigate = useNavigate();

  // === OTP Đăng ký state ===
  const [showRegisterOTP, setShowRegisterOTP] = useState(false);
  const [regOtpEmail, setRegOtpEmail] = useState('');
  const [regOtpValue, setRegOtpValue] = useState('');
  const [regOtpError, setRegOtpError] = useState('');
  const [regOtpLoading, setRegOtpLoading] = useState(false);
  const [regOtpType, setRegOtpType] = useState('HV'); // 'HV' hoặc 'GS'

  // === Quên mật khẩu state ===
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [fpStep, setFpStep] = useState(1); // 1: email, 2: OTP, 3: new password
  const [fpEmail, setFpEmail] = useState('');
  const [fpOtp, setFpOtp] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpResetToken, setFpResetToken] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState('');
  const [fpSuccess, setFpSuccess] = useState('');
  const [fpNewPassVisible, setFpNewPassVisible] = useState(false);
  
  const [allSubjects, setAllSubjects] = useState([]);

  // Fetch subjects for tutor registration
  useEffect(() => {
    fetch('/api/monhoc')
      .then(r => r.json())
      .then(json => {
        if (json.success) setAllSubjects(json.data);
      })
      .catch(e => console.error('Error fetching subjects:', e));
  }, []);

  // === Google Sign-In ===
  const googleBtnRef = useRef(null);

  useEffect(() => {
    // Khởi tạo Google Identity Services khi component mount
    if (GOOGLE_CLIENT_ID && window.google && window.google.accounts) {
      initGoogleSignIn();
    } else if (GOOGLE_CLIENT_ID) {
      // Chờ script load xong
      const checkGoogle = setInterval(() => {
        if (window.google && window.google.accounts) {
          clearInterval(checkGoogle);
          initGoogleSignIn();
        }
      }, 200);
      return () => clearInterval(checkGoogle);
    }
  }, [activeTab]);

  function initGoogleSignIn() {
    if (!googleBtnRef.current || !GOOGLE_CLIENT_ID) return;
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
      });
      // Xóa nội dung cũ trước khi render lại
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_black',
        size: 'large',
        width: '100%',
        text: 'signin_with',
        shape: 'rectangular',
        locale: 'vi',
      });
    } catch (err) {
      console.error('Google Sign-In init error:', err);
    }
  }

  async function handleGoogleCredential(response) {
    try {
      setFormError('');
      setFormSuccess('');
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const json = await res.json();
      if (json.success) {
        if (json.isNew) {
          setFormSuccess('Tạo tài khoản thành công qua Google! Đang chuyển hướng...');
        }
        const role = json.data.vaitro;
        setTimeout(() => {
          if (role === 'HV') navigate('/student');
          else if (role === 'GS') navigate('/tutor');
          else navigate('/admin');
        }, json.isNew ? 1000 : 0);
      } else {
        setFormError(json.message);
      }
    } catch (err) {
      setFormError('Lỗi kết nối máy chủ');
    }
  }

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

  const togglePassword = () => setPasswordVisible(!passwordVisible);
  const toggleRegHvPassword = () => setRegHvPassVisible(!regHvPassVisible);
  const toggleRegGsPassword = () => setRegGsPassVisible(!regGsPassVisible);

  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});
    setFormSuccess('');
    const username = e.target.username.value;
    const password = e.target.password.value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const json = await res.json();
      if (json.require2FA) {
        setTwoFAToken(json.tempToken);
        setTwoFAEmail(json.email);
        setShow2FAModal(true);
        setFormSuccess(json.message);
      } else if (json.success) {
        const role = json.data.vaitro;
        if (role === 'HV') navigate('/student');
        else if (role === 'GS') navigate('/tutor');
        else navigate('/admin');
      } else {
        setFormError(json.message);
      }
    } catch (err) {
      setFormError('Lỗi kết nối máy chủ');
    }
  };

  // ============================================================
  // XÁC MINH 2FA (LOGIN)
  // ============================================================
  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setTwoFAError('');
    setTwoFALoading(true);
    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: twoFAToken, otp: twoFAOtp })
      });
      const json = await res.json();
      if (json.success) {
        setShow2FAModal(false);
        const role = json.data.vaitro;
        if (role === 'HV') navigate('/student');
        else if (role === 'GS') navigate('/tutor');
        else navigate('/admin');
      } else {
        setTwoFAError(json.message);
      }
    } catch (err) {
      setTwoFAError('Lỗi kết nối máy chủ');
    } finally {
      setTwoFALoading(false);
    }
  };

  // ============================================================
  // QUÊN MẬT KHẨU — 3 Bước
  // ============================================================

  const openForgotPassword = () => {
    setShowForgotPassword(true);
    setFpStep(1);
    setFpEmail('');
    setFpOtp('');
    setFpNewPassword('');
    setFpResetToken('');
    setFpError('');
    setFpSuccess('');
    setFormError('');
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setFpStep(1);
    setFpError('');
    setFpSuccess('');
  };

  // Bước 1: Gửi OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setFpError('');
    setFpLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail })
      });
      const json = await res.json();
      if (json.success) {
        setFpStep(2);
        setFpSuccess('Đã gửi mã OTP đến email ' + fpEmail);
      } else {
        setFpError(json.message);
      }
    } catch (err) {
      setFpError('Lỗi kết nối');
    } finally {
      setFpLoading(false);
    }
  };

  // Bước 2: Xác minh OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setFpError('');
    setFpLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail, otp: fpOtp })
      });
      const json = await res.json();
      if (json.success) {
        setFpResetToken(json.resetToken);
        setFpStep(3);
        setFpSuccess('Xác minh thành công! Nhập mật khẩu mới.');
      } else {
        setFpError(json.message);
      }
    } catch (err) {
      setFpError('Lỗi kết nối');
    } finally {
      setFpLoading(false);
    }
  };

  // Bước 3: Đặt mật khẩu mới
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFpError('');
    if (fpNewPassword.length < 6) {
      return setFpError('Mật khẩu mới phải từ 6 ký tự trở lên');
    }
    setFpLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken: fpResetToken, newPassword: fpNewPassword })
      });
      const json = await res.json();
      if (json.success) {
        setFpSuccess('Đặt lại mật khẩu thành công!');
        setFormSuccess('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.');
        setTimeout(() => {
          closeForgotPassword();
        }, 1500);
      } else {
        setFpError(json.message);
      }
    } catch (err) {
      setFpError('Lỗi kết nối');
    } finally {
      setFpLoading(false);
    }
  };

  const handleRegisterHV = async (e) => {
    e.preventDefault();
    const data = {
      username: e.target.username.value,
      password: e.target.password.value.trim(),
      hoten: e.target.hoten.value.trim(),
      ngaysinh: e.target.ngaysinh.value,
      sdt: e.target.sdt.value.trim(),
      email: e.target.email.value.trim(),
    };

    setFieldErrors({});
    let errors = {};
    if (data.password.length < 6) errors.password = 'Mật khẩu phải từ 6 ký tự trở lên';
    const today = new Date().toISOString().split('T')[0];
    if (!data.ngaysinh || data.ngaysinh >= today) errors.ngaysinh = 'Ngày sinh phải nhỏ hơn ngày hiện tại';
    if (!/^\d{10,11}$/.test(data.sdt)) errors.sdt = 'Số điện thoại phải gồm 10-11 chữ số';
    if (!data.email.endsWith('@gmail.com')) errors.email = 'Email phải đúng định dạng @gmail.com';

    try {
      const checkRes = await fetch(`/api/auth/check-username?username=${data.username}`);
      const checkJson = await checkRes.json();
      if (checkJson.success && checkJson.exists) {
        errors.username = 'Tên đăng nhập đã tồn tại';
      }
    } catch (e) {
      console.error(e);
    }

    if (Object.keys(errors).length > 0) {
      return setFieldErrors(errors);
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.requireOTP) {
        // Hiện modal OTP
        setRegOtpEmail(json.email);
        setRegOtpType('HV');
        setRegOtpValue('');
        setRegOtpError('');
        setShowRegisterOTP(true);
        setFormSuccess(json.message);
        setFormError('');
      } else if (json.success) {
        setFormSuccess('Đăng ký học viên thành công! Vui lòng đăng nhập.');
        setFormError('');
        setActiveTab('login');
      } else {
        setFormError(json.message);
      }
    } catch (err) {
      setFormError('Lỗi kết nối');
    }
  };

  const handleRegisterGS = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    const khuvucArr = formData.getAll('khuvuc');
    if (khuvucArr.length > 0) {
      data.khuvuc = khuvucArr.join(', ');
    }

    setFieldErrors({});
    let errors = {};
    
    const fileCccd = e.target.anhcccd.files[0];
    const fileBangCap = e.target.anhbangcap.files[0];
    const fileTheSv = e.target.anhthesinhvien.files[0];
    const fileAvatar = e.target.anhdaidien.files[0];

    if (!fileCccd) {
      errors.anhcccd = 'Ảnh CCCD là bắt buộc';
    }
    if (!fileBangCap && !fileTheSv) {
      errors.anhbangcap = 'Vui lòng tải lên ít nhất Ảnh bằng cấp hoặc Ảnh thẻ sinh viên';
      errors.anhthesinhvien = 'Vui lòng tải lên ít nhất Ảnh bằng cấp hoặc Ảnh thẻ sinh viên';
    }

    if (data.password.length < 6) errors.password = 'Mật khẩu phải từ 6 ký tự trở lên';
    const todayObj = new Date();
    const eighteenYearsAgo = new Date(todayObj.getFullYear() - 18, todayObj.getMonth(), todayObj.getDate()).toISOString().split('T')[0];
    if (!data.ngaysinh || data.ngaysinh > eighteenYearsAgo) errors.ngaysinh = 'Gia sư phải đủ 18 tuổi';
    if (!/^\d{10,11}$/.test(data.sdt)) errors.sdt = 'Số điện thoại phải gồm 10-11 chữ số';
    if (data.cccd.length !== 12 || !/^\d{12}$/.test(data.cccd)) errors.cccd = 'Số CCCD phải gồm 12 chữ số';
    if (!data.email.endsWith('@gmail.com')) errors.email = 'Email phải đúng định dạng @gmail.com';

    try {
      const checkRes = await fetch(`/api/auth/check-username?username=${data.username}`);
      const checkJson = await checkRes.json();
      if (checkJson.success && checkJson.exists) {
        errors.username = 'Tên đăng nhập đã tồn tại';
      }
    } catch (e) {
      console.error(e);
    }

    if (Object.keys(errors).length > 0) {
      return setFieldErrors(errors);
    }

    try {
      if (fileCccd) data.anhcccd = await fileToBase64(fileCccd);
      if (fileBangCap) data.anhbangcap = await fileToBase64(fileBangCap);
      if (fileTheSv) data.anhthesinhvien = await fileToBase64(fileTheSv);
      if (fileAvatar) data.anhdaidien = await fileToBase64(fileAvatar);
    } catch (err) {
      console.error(err);
      return setFormError('Lỗi đọc tập tin hình ảnh. Vui lòng kiểm tra lại định dạng ảnh.');
    }

    try {
      const res = await fetch('/api/giasu/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (json.requireOTP) {
        // Hiện modal OTP
        setRegOtpEmail(json.email);
        setRegOtpType('GS');
        setRegOtpValue('');
        setRegOtpError('');
        setShowRegisterOTP(true);
        setFormSuccess(json.message);
        setFormError('');
      } else if (json.success) {
        setFormSuccess('Đăng ký hồ sơ gia sư thành công!');
        setFormError('');
        setActiveTab('login');
      } else {
        setFormError(json.message);
      }
    } catch (err) {
      setFormError('Lỗi kết nối');
    }
  };

  // ============================================================
  // XÁC MINH OTP ĐĂNG KÝ
  // ============================================================
  const handleVerifyRegisterOTP = async (e) => {
    e.preventDefault();
    setRegOtpError('');
    setRegOtpLoading(true);
    try {
      const url = regOtpType === 'HV' ? '/api/auth/verify-register-otp' : '/api/giasu/verify-register-otp';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regOtpEmail, otp: regOtpValue })
      });
      const json = await res.json();
      if (json.success) {
        setShowRegisterOTP(false);
        setFormSuccess(json.message);
        setFormError('');
        setActiveTab('login');
      } else {
        setRegOtpError(json.message);
      }
    } catch (err) {
      setRegOtpError('Lỗi kết nối máy chủ');
    } finally {
      setRegOtpLoading(false);
    }
  };

  const renderRegisterOTPModal = () => {
    if (!showRegisterOTP) return null;
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
      }}>
        <div style={{
          background: 'linear-gradient(145deg, #1e293b, #0f172a)',
          borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '440px',
          border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          position: 'relative'
        }}>
          {/* Nút đóng */}
          <button
            onClick={() => setShowRegisterOTP(false)}
            style={{
              position: 'absolute', top: '12px', right: '12px', background: 'none',
              border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px'
            }}
          >
            <X size={20} />
          </button>

          <h3 style={{ textAlign: 'center', color: '#f8fafc', marginBottom: '8px', fontSize: '20px' }}>
            📧 Xác minh Email
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>
            Nhập mã OTP 6 số đã gửi đến <strong style={{ color: '#14b8a6' }}>{regOtpEmail}</strong>
          </p>

          {regOtpError && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
              border: '1px solid #ef4444', padding: '10px', borderRadius: '8px',
              marginBottom: '16px', fontSize: '14px', textAlign: 'center'
            }}>
              {regOtpError}
            </div>
          )}

          <form onSubmit={handleVerifyRegisterOTP}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} /> Mã OTP
              </label>
              <input
                type="text"
                value={regOtpValue}
                onChange={e => setRegOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="______"
                maxLength={6}
                required
                style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '24px', fontWeight: 'bold' }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-teal btn-block"
              disabled={regOtpLoading || regOtpValue.length !== 6}
              style={{ opacity: (regOtpLoading || regOtpValue.length !== 6) ? 0.7 : 1 }}
            >
              {regOtpLoading ? 'Đang xác minh...' : 'Xác minh & Hoàn tất đăng ký'}
            </button>
          </form>

          <p style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', marginTop: '16px' }}>
            Mã OTP có hiệu lực trong 10 phút. Kiểm tra cả mục Spam nếu chưa nhận được.
          </p>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDER — Quên Mật Khẩu Modal
  // ============================================================
  const renderForgotPassword = () => {
    if (!showForgotPassword) return null;

    const stepLabels = ['Nhập Email', 'Xác minh OTP', 'Mật khẩu mới'];

    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
      }}>
        <div style={{
          background: 'linear-gradient(145deg, #1e293b, #0f172a)',
          borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '440px',
          border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          position: 'relative'
        }}>
          {/* Nút đóng */}
          <button
            onClick={closeForgotPassword}
            style={{
              position: 'absolute', top: '12px', right: '12px', background: 'none',
              border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px'
            }}
          >
            <X size={20} />
          </button>

          {/* Header */}
          <h3 style={{ textAlign: 'center', color: '#f8fafc', marginBottom: '8px', fontSize: '20px' }}>
            🔑 Quên mật khẩu
          </h3>

          {/* Step Indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
            {stepLabels.map((label, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: '600',
                  background: fpStep > i + 1 ? '#10b981' : fpStep === i + 1 ? '#14b8a6' : '#334155',
                  color: fpStep >= i + 1 ? '#fff' : '#94a3b8',
                  transition: 'all 0.3s ease'
                }}>
                  {fpStep > i + 1 ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: '12px', color: fpStep === i + 1 ? '#14b8a6' : '#64748b',
                  fontWeight: fpStep === i + 1 ? '600' : '400', display: i < 2 ? 'inline' : 'inline'
                }}>
                  {label}
                </span>
                {i < 2 && <span style={{ color: '#334155', margin: '0 2px' }}>→</span>}
              </div>
            ))}
          </div>

          {/* Error/Success */}
          {fpError && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
              border: '1px solid #ef4444', padding: '10px', borderRadius: '8px',
              marginBottom: '16px', fontSize: '14px', textAlign: 'center'
            }}>
              {fpError}
            </div>
          )}
          {fpSuccess && !fpError && (
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
              border: '1px solid #10b981', padding: '10px', borderRadius: '8px',
              marginBottom: '16px', fontSize: '14px', textAlign: 'center'
            }}>
              {fpSuccess}
            </div>
          )}

          {/* Bước 1: Nhập Email */}
          {fpStep === 1 && (
            <form onSubmit={handleSendOtp}>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
                Nhập email đã đăng ký để nhận mã OTP
              </p>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={16} /> Email
                </label>
                <input
                  type="email"
                  value={fpEmail}
                  onChange={e => setFpEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={fpLoading}
                style={{ opacity: fpLoading ? 0.7 : 1 }}
              >
                {fpLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
              </button>
            </form>
          )}

          {/* Bước 2: Nhập OTP */}
          {fpStep === 2 && (
            <form onSubmit={handleVerifyOtp}>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
                Nhập mã OTP 6 số đã gửi đến <strong style={{ color: '#14b8a6' }}>{fpEmail}</strong>
              </p>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} /> Mã OTP
                </label>
                <input
                  type="text"
                  value={fpOtp}
                  onChange={e => setFpOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="______"
                  maxLength={6}
                  required
                  style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '24px', fontWeight: 'bold' }}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={fpLoading || fpOtp.length !== 6}
                style={{ opacity: (fpLoading || fpOtp.length !== 6) ? 0.7 : 1 }}
              >
                {fpLoading ? 'Đang xác minh...' : 'Xác minh OTP'}
              </button>
              <button
                type="button"
                onClick={() => { setFpStep(1); setFpError(''); setFpSuccess(''); }}
                style={{
                  background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                  marginTop: '12px', fontSize: '13px', display: 'flex', alignItems: 'center',
                  gap: '4px', margin: '12px auto 0'
                }}
              >
                <ArrowLeft size={14} /> Quay lại nhập email
              </button>
            </form>
          )}

          {/* Bước 3: Mật khẩu mới */}
          {fpStep === 3 && (
            <form onSubmit={handleResetPassword}>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
                Nhập mật khẩu mới (tối thiểu 6 ký tự)
              </p>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <KeyRound size={16} /> Mật khẩu mới
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type={fpNewPassVisible ? "text" : "password"}
                    value={fpNewPassword}
                    onChange={e => setFpNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    style={{ flex: 1 }}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '8px 12px', display: 'flex', alignItems: 'center' }}
                    onClick={() => setFpNewPassVisible(!fpNewPassVisible)}
                  >
                    {fpNewPassVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-teal btn-block"
                disabled={fpLoading}
                style={{ opacity: fpLoading ? 0.7 : 1 }}
              >
                {fpLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="auth-wrapper" style={{ marginTop: '40px', maxWidth: '600px', margin: '40px auto' }}>
      <div className="auth-tabs">
        <button className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`} onClick={() => { setActiveTab('login'); setFormError(''); setFieldErrors({}); setFormSuccess(''); }}>Đăng Nhập</button>
        <button className={`auth-tab ${activeTab === 'register-hv' ? 'active' : ''}`} onClick={() => { setActiveTab('register-hv'); setFormError(''); setFieldErrors({}); setFormSuccess(''); }}>Đăng Ký Học Viên</button>
        <button className={`auth-tab ${activeTab === 'register-gs' ? 'active' : ''}`} onClick={() => { setActiveTab('register-gs'); setFormError(''); setFieldErrors({}); setFormSuccess(''); }}>Đăng Ký Gia Sư</button>
      </div>

      {formError && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', padding: '12px', borderRadius: '8px', marginBottom: '20px', whiteSpace: 'pre-line' }}>
          {formError}
        </div>
      )}
      
      {formSuccess && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid #10b981', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
          {formSuccess}
        </div>
      )}

      {activeTab === 'login' && (
        <div className="auth-form-panel active" style={{ padding: '30px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Đăng Nhập Vào Hệ Thống</h3>
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label>Tên đăng nhập</label>
              <input type="text" name="username" required />
            </div>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label>Mật khẩu</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type={passwordVisible ? "text" : "password"} name="password" style={{ flex: 1 }} required />
                <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center' }} onClick={togglePassword}>
                  {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            
            {/* Link Quên mật khẩu */}
            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={openForgotPassword}
                style={{
                  background: 'none', border: 'none', color: '#14b8a6',
                  cursor: 'pointer', fontSize: '13px', textDecoration: 'underline',
                  padding: 0
                }}
              >
                Quên mật khẩu?
              </button>
            </div>
            
            <button type="submit" className="btn btn-primary btn-block">Đăng Nhập</button>
          </form>

          {/* Divider */}
          {GOOGLE_CLIENT_ID && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                margin: '20px 0', color: '#64748b', fontSize: '13px'
              }}>
                <div style={{ flex: 1, height: '1px', background: '#334155' }} />
                <span>hoặc</span>
                <div style={{ flex: 1, height: '1px', background: '#334155' }} />
              </div>

              {/* Google Sign-In Button */}
              <div
                ref={googleBtnRef}
                style={{
                  display: 'flex', justifyContent: 'center',
                  minHeight: '44px'
                }}
              />
            </>
          )}
        </div>
      )}

      {activeTab === 'register-hv' && (
        <div className="auth-form-panel active" style={{ padding: '30px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Đăng Ký Học Viên</h3>
          <form onSubmit={handleRegisterHV}>
            <div className="form-group">
              <label>Tên đăng nhập *</label>
              <input type="text" name="username" required />
              {fieldErrors.username && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.username}</span>}
            </div>
            <div className="form-group">
              <label>Mật khẩu *</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type={regHvPassVisible ? "text" : "password"} name="password" style={{ flex: 1 }} required />
                <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center' }} onClick={toggleRegHvPassword}>
                  {regHvPassVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {fieldErrors.password && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.password}</span>}
            </div>
            <div className="form-group"><label>Họ và Tên *</label><input type="text" name="hoten" required /></div>
            <div className="form-group">
              <label>Ngày sinh *</label>
              <input type="date" name="ngaysinh" required />
              {fieldErrors.ngaysinh && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.ngaysinh}</span>}
            </div>
            <div className="form-group">
              <label>Số điện thoại *</label>
              <input type="tel" name="sdt" required />
              {fieldErrors.sdt && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.sdt}</span>}
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" name="email" required />
              {fieldErrors.email && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.email}</span>}
            </div>
            <button type="submit" className="btn btn-teal btn-block" style={{ marginTop: '20px' }}>Đăng Ký</button>
          </form>
        </div>
      )}

      {activeTab === 'register-gs' && (
        <div className="auth-form-panel active" style={{ padding: '30px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Đăng Ký Hồ Sơ Gia Sư</h3>
          <form onSubmit={handleRegisterGS}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label>Tên đăng nhập *</label>
                <input type="text" name="username" required />
                {fieldErrors.username && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.username}</span>}
              </div>
              <div className="form-group">
                <label>Mật khẩu *</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type={regGsPassVisible ? "text" : "password"} name="password" style={{ flex: 1 }} required />
                  <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center' }} onClick={toggleRegGsPassword}>
                    {regGsPassVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {fieldErrors.password && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.password}</span>}
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}><label>Họ Tên *</label><input type="text" name="hoten" required /></div>
              <div className="form-group">
                <label>Ngày sinh *</label>
                <input type="date" name="ngaysinh" required />
                {fieldErrors.ngaysinh && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.ngaysinh}</span>}
              </div>
              <div className="form-group">
                <label>Giới tính *</label>
                <select name="gioitinh" required>
                  <option value="Nam">Nam</option><option value="Nu">Nữ</option><option value="Khac">Khác</option>
                </select>
              </div>
              <div className="form-group">
                <label>Số CCCD *</label>
                <input type="text" name="cccd" required />
                {fieldErrors.cccd && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.cccd}</span>}
              </div>
              <div className="form-group">
                <label>Số điện thoại *</label>
                <input type="tel" name="sdt" required />
                {fieldErrors.sdt && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.sdt}</span>}
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Email *</label>
                <input type="email" name="email" required />
                {fieldErrors.email && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.email}</span>}
              </div>
              <div className="form-group">
                <label>Trình độ *</label>
                <select name="trinhdohocvan" required>
                  <option value="Cao đẳng">Cao đẳng</option><option value="Đại học">Đại học</option><option value="Thạc sĩ">Thạc sĩ</option>
                </select>
              </div>
              <div className="form-group">
                <label>Chuyên ngành *</label>
                <select name="chuyennganh" required>
                  {allSubjects.map(s => (
                    <option key={s.mamh} value={s.tenmh}>{s.tenmh}</option>
                  ))}
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div className="form-group"><label>Kinh nghiệm (năm) *</label><input type="number" name="kinhnghiem" min="0" required /></div>
              <div className="form-group"><label>Học phí mong muốn *</label><input type="number" name="hocphimongmuon" min="50000" step="50000" required /></div>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', maxHeight: '200px', overflowY: 'auto', padding: '12px', border: '1px solid #334155', borderRadius: '8px', backgroundColor: '#0f172a' }}>
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
                <h4 style={{ margin: '15px 0 10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', color: '#f8fafc' }}>Tệp Đính Kèm & Minh Chứng</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '15px' }}>
                  * Bắt buộc có <strong>Ảnh CCCD</strong> và ít nhất một trong hai: <strong>Ảnh Bằng tốt nghiệp</strong> hoặc <strong>Ảnh Thẻ sinh viên</strong>.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label>Ảnh đại diện (Avatar)</label>
                    <input type="file" name="anhdaidien" accept="image/*" style={{ border: 'none', background: 'none', padding: 0 }} />
                  </div>
                  <div className="form-group">
                    <label>Ảnh CCCD *</label>
                    <input type="file" name="anhcccd" accept="image/*" required style={{ border: 'none', background: 'none', padding: 0 }} />
                    {fieldErrors.anhcccd && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.anhcccd}</span>}
                  </div>
                  <div className="form-group">
                    <label>Ảnh Bằng tốt nghiệp</label>
                    <input type="file" name="anhbangcap" accept="image/*" style={{ border: 'none', background: 'none', padding: 0 }} />
                    {fieldErrors.anhbangcap && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.anhbangcap}</span>}
                  </div>
                  <div className="form-group">
                    <label>Ảnh Thẻ sinh viên / Giấy tờ chuyên ngành</label>
                    <input type="file" name="anhthesinhvien" accept="image/*" style={{ border: 'none', background: 'none', padding: 0 }} />
                    {fieldErrors.anhthesinhvien && <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.anhthesinhvien}</span>}
                  </div>
                </div>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '20px' }}>Gửi Hồ Sơ</button>
          </form>
        </div>
      )}

      {/* Forgot Password Modal */}
      {renderForgotPassword()}
      {/* Register OTP Modal */}
      {renderRegisterOTPModal()}
      {/* 2FA Modal */}
      {show2FAModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content glass-card" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Xác thực 2 lớp</h3>
              <span className="close-btn" onClick={() => setShow2FAModal(false)}>&times;</span>
            </div>
            <div className="card-body">
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '15px' }}>
                Vui lòng nhập mã OTP gồm 6 chữ số vừa được gửi đến email <strong>{twoFAEmail}</strong> để hoàn tất đăng nhập.
              </p>
              {twoFAError && (
                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>
                  {twoFAError}
                </div>
              )}
              <form onSubmit={handleVerify2FA}>
                <div className="form-group">
                  <input
                    type="text"
                    maxLength="6"
                    value={twoFAOtp}
                    onChange={(e) => setTwoFAOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Mã OTP 6 số"
                    style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '4px', fontWeight: 'bold' }}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-teal btn-block" disabled={twoFALoading}>
                  {twoFALoading ? 'Đang xác minh...' : 'Xác minh'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Login;
