import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import TutorDashboard from './pages/TutorDashboard.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import PublicTutors from './pages/PublicTutors.jsx';

function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const location = useLocation();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(json => {
        if (json.success) setUser(json.data);
        else setUser(null);
      })
      .catch(() => {});
  }, [location.pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    navigate('/');
  };

  return (
    <div className="app-container">
      {/* Navbar will go here */}
      <header>
        <div className="container nav-container">
          <a href="/" className="logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 6 8-4 8 4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"/><path d="M18 5v17"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/></svg>
            <span>GiaSư<span>Connect</span></span>
          </a>
          <nav id="main-nav" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <a href="/#home" style={{ color: '#f8fafc', textDecoration: 'none' }}>Trang Chủ</a>
            <a href="/#about" style={{ color: '#f8fafc', textDecoration: 'none' }}>Giới thiệu</a>
            <a href="/#subjects" style={{ color: '#f8fafc', textDecoration: 'none' }}>Môn học đào tạo</a>
            <a href="/#workflow" style={{ color: '#f8fafc', textDecoration: 'none' }}>Quy trình</a>
            <a href="/tutors" style={{ color: '#f8fafc', textDecoration: 'none' }}>Đội ngũ Gia Sư</a>
            <a href="/#contact" style={{ color: '#f8fafc', textDecoration: 'none' }}>Liên hệ</a>
            {user ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <a 
                  href={user.vaitro === 'GS' ? '/tutor' : user.vaitro === 'HV' ? '/student' : '/admin'} 
                  className="btn btn-primary" 
                  style={{ padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                >
                  <User size={16} /> Tài khoản
                </a>
                <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LogOut size={16} /> Đăng xuất
                </button>
              </div>
            ) : (
              <a href="/login" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '8px' }}>Đăng Nhập</a>
            )}
          </nav>
        </div>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/tutors" element={<PublicTutors />} />
          <Route path="/tutor" element={<TutorDashboard />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      
      {/* Background ambient glows */}
      <div className="glow-bg">
        <div className="glow-circle glow-1"></div>
        <div className="glow-circle glow-2"></div>
      </div>
    </div>
  );
}

export default App;
