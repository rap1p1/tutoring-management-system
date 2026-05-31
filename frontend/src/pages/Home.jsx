import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Languages, Calculator, FlaskConical, Atom, MonitorPlay, Users, CalendarCheck, GraduationCap, Phone, Mail, MapPin, Target, Star, Heart, Library, Dna, Laptop } from 'lucide-react';

function Home() {
  return (
    <div style={{ paddingBottom: '50px' }}>
      {/* Hero Section */}
      <section id="home" className="hero" style={{ marginTop: '40px', marginBottom: '60px' }}>
        <h1>Tìm Gia Sư Dễ Dàng<br />Học Tập Hiệu Quả</h1>
        <p>Nền tảng kết nối trực tiếp học viên với hàng ngàn gia sư chất lượng cao, giúp bạn tiến bộ mỗi ngày.</p>
        <div className="hero-actions">
          <Link to="/login" className="btn btn-primary btn-lg">Tìm Gia Sư Ngay</Link>
          <Link to="/login" className="btn btn-secondary btn-lg">Đăng Ký Làm Gia Sư</Link>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" style={{ marginBottom: '80px' }}>
        <div className="glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Về Chúng Tôi</h2>
            <p style={{ color: '#94a3b8', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
              GiaSưConnect ra đời với sứ mệnh xóa bỏ mọi khoảng cách trong giáo dục, tạo ra một nền tảng minh bạch và đáng tin cậy để kết nối những học viên đang cần sự hỗ trợ với những gia sư tài năng, nhiệt huyết trên toàn quốc.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '30px' }}>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Target size={36} className="text-primary" style={{ margin: '0 auto 15px' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Mục Tiêu</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>Trở thành nền tảng giáo dục hàng đầu, mang lại giá trị thực tiễn cho hàng nghìn học viên và sinh viên.</p>
            </div>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Star size={36} className="text-amber" style={{ margin: '0 auto 15px' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Chất Lượng</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>Hồ sơ gia sư được chọn lọc khắt khe, minh bạch về bằng cấp, thẻ sinh viên và kinh nghiệm giảng dạy.</p>
            </div>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Heart size={36} className="text-rose" style={{ margin: '0 auto 15px' }} />
              <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Tận Tâm</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>Luôn đồng hành cùng học viên trong suốt quá trình học tập để đảm bảo sự tiến bộ rõ rệt nhất.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Subjects Section */}
      <section id="subjects" style={{ marginBottom: '80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Các Môn Học Đào Tạo</h2>
          <p style={{ color: '#94a3b8' }}>Đa dạng các môn học từ cấp 1 đến cấp 3 và năng khiếu</p>
        </div>
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>

          <div className="glass-card" style={{ textAlign: 'center', padding: '30px 20px', transition: 'transform 0.3s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <Calculator size={40} className="text-primary" style={{ margin: '0 auto 15px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Toán Học</h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Đại số, Hình học, Luyện thi</p>
          </div>

          <div className="glass-card" style={{ textAlign: 'center', padding: '30px 20px', transition: 'transform 0.3s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <Languages size={40} className="text-teal" style={{ margin: '0 auto 15px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Ngoại Ngữ</h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Tiếng Anh, TOEIC, IELTS</p>
          </div>

          <div className="glass-card" style={{ textAlign: 'center', padding: '30px 20px', transition: 'transform 0.3s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <FlaskConical size={40} className="text-amber" style={{ margin: '0 auto 15px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Hóa Học</h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Hữu cơ, Vô cơ, Luyện thi ĐH</p>
          </div>

          <div className="glass-card" style={{ textAlign: 'center', padding: '30px 20px', transition: 'transform 0.3s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <Atom size={40} className="text-rose" style={{ margin: '0 auto 15px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Vật Lý</h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Cơ học, Điện, Quang học</p>
          </div>

          <div className="glass-card" style={{ textAlign: 'center', padding: '30px 20px', transition: 'transform 0.3s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <Library size={40} className="text-indigo" style={{ margin: '0 auto 15px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Ngữ Văn</h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Tiếng Việt, Văn học, Ngôn ngữ</p>
          </div>

          <div className="glass-card" style={{ textAlign: 'center', padding: '30px 20px', transition: 'transform 0.3s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <Dna size={40} className="text-emerald" style={{ margin: '0 auto 15px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Sinh Học</h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Di truyền, Tế bào, Luyện thi</p>
          </div>

          <div className="glass-card" style={{ textAlign: 'center', padding: '30px 20px', transition: 'transform 0.3s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <Laptop size={40} className="text-primary" style={{ margin: '0 auto 15px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Tin Học</h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Lập trình, Tin học văn phòng</p>
          </div>

          <div className="glass-card" style={{ textAlign: 'center', padding: '30px 20px', transition: 'transform 0.3s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <Target size={40} className="text-teal" style={{ margin: '0 auto 15px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Tổ hợp KHTN</h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Toán, Vật Lý, Hóa Học, Sinh Học</p>
          </div>

          <div className="glass-card" style={{ textAlign: 'center', padding: '30px 20px', transition: 'transform 0.3s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <Users size={40} className="text-amber" style={{ margin: '0 auto 15px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Tổ hợp KHXH</h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Lịch sử, Địa lý, GDCD</p>
          </div>

        </div>
      </section>

      {/* Workflow Process */}
      <section id="workflow" style={{ marginBottom: '80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Quy Trình Hoạt Động</h2>
          <p style={{ color: '#94a3b8' }}>Kết nối học viên và gia sư trong 4 bước đơn giản</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '30px', position: 'relative' }}>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid #6366f1' }}>
              <BookOpen size={32} className="text-primary" />
            </div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>1. Đăng ký yêu cầu</h4>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Học viên tạo yêu cầu môn học, thời gian và địa điểm.</p>
          </div>

          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid #10b981' }}>
              <Users size={32} className="text-teal" />
            </div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>2. Ghép nối Gia sư</h4>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Trung tâm chọn lọc và ghép gia sư phù hợp nhất.</p>
          </div>

          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid #f59e0b' }}>
              <CalendarCheck size={32} className="text-amber" />
            </div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>3. Nhận lớp & Giảng dạy</h4>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Gia sư xác nhận lớp và bắt đầu giảng dạy theo lịch.</p>
          </div>

          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '2px solid #f43f5e' }}>
              <GraduationCap size={32} className="text-rose" />
            </div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>4. Theo dõi & Đánh giá</h4>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Đảm bảo chất lượng và đóng học phí trực tiếp tại trung tâm.</p>
          </div>
        </div>
      </section>

      {/* Hotline / Contact Footer */}
      <footer id="contact" className="glass-card" style={{ padding: '40px', marginTop: '60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <BookOpen className="text-primary" size={28} />
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>GiaSư<span className="text-primary">Connect</span></span>
            </div>
            <p style={{ color: '#94a3b8', lineHeight: '1.6' }}>
              Nền tảng giáo dục thông minh kết nối học viên và gia sư một cách nhanh chóng, minh bạch và hiệu quả nhất.
            </p>
          </div>

          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>Thông Tin Liên Hệ</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px', color: '#cbd5e1' }}>
                <Phone size={20} className="text-teal" />
                <span style={{ fontSize: '1.2rem', fontWeight: '600' }}>Hotline: 1900 1234</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px', color: '#cbd5e1' }}>
                <Mail size={20} className="text-amber" />
                <span>support@giasuconnect.vn</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#cbd5e1' }}>
                <MapPin size={20} className="text-rose" />
                <span>97 Man Thiện, phường Tăng Nhơn Phú, TP.HCM, Việt Nam</span>
              </li>
            </ul>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#64748b', fontSize: '0.9rem' }}>
          &copy; 2026 GiaSưConnect. Mọi quyền được bảo lưu.
        </div>
      </footer>
    </div>
  );
}

export default Home;
