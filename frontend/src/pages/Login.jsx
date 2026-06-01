import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, X } from 'lucide-react';

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

function Login() {
  const [activeTab, setActiveTab] = useState('login');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [regHvPassVisible, setRegHvPassVisible] = useState(false);
  const [regGsPassVisible, setRegGsPassVisible] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formSuccess, setFormSuccess] = useState('');
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const navigate = useNavigate();

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
      if (json.success) {
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
      if (json.success) {
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
      if (json.success) {
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
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Mật khẩu</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type={passwordVisible ? "text" : "password"} name="password" style={{ flex: 1 }} required />
                <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center' }} onClick={togglePassword}>
                  {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block">Đăng Nhập</button>
          </form>
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
    </div>
  );
}

export default Login;
