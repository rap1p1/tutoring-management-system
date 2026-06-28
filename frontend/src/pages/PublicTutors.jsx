import React, { useState, useEffect } from 'react';
import { MapPin, BookOpen, GraduationCap, DollarSign, User, Search, Star } from 'lucide-react';

function PublicTutors() {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/giasu/public')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setTutors(json.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi khi tải danh sách gia sư:", err);
        setLoading(false);
      });
  }, []);

  const filteredTutors = tutors.filter(gs => 
    gs.hoten.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (gs.chuyennganh && gs.chuyennganh.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (gs.khuvuc && gs.khuvuc.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="public-tutors-page" style={{ padding: '40px 0', minHeight: '80vh' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.5rem', color: '#f8fafc', marginBottom: '15px' }}>Đội ngũ Gia Sư</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
            Tìm kiếm gia sư phù hợp với nhu cầu học tập của bạn. Các gia sư đã được chúng tôi kiểm duyệt hồ sơ kỹ lưỡng.
          </p>
        </div>

        <div style={{ maxWidth: '600px', margin: '0 auto 40px auto', position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Tìm theo tên, chuyên ngành hoặc khu vực..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 20px 12px 45px',
                borderRadius: '30px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                color: '#f8fafc',
                fontSize: '1rem',
                outline: 'none',
                backdropFilter: 'blur(10px)'
              }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Đang tải danh sách...</div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '25px' 
          }}>
            {filteredTutors.length > 0 ? (
              filteredTutors.map(gs => (
                <div key={gs.mags} className="tutor-card" style={{
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  overflow: 'hidden',
                  backdropFilter: 'blur(10px)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}>
                  <div style={{ 
                    height: '100px', 
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    position: 'relative'
                  }}>
                    <img 
                      src={gs.anhdaidien || `https://ui-avatars.com/api/?name=${encodeURIComponent(gs.hoten)}&background=random`} 
                      alt={gs.hoten}
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        border: '4px solid #1e293b',
                        position: 'absolute',
                        bottom: '-40px',
                        left: '20px',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                  
                  <div style={{ padding: '50px 20px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '5px' }}>
                      <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.25rem' }}>{gs.hoten}</h3>
                      <span style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        GS{gs.mags.toString().padStart(3, '0')}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                      <Star size={16} fill="#fbbf24" color="#fbbf24" />
                      <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '1rem' }}>
                        {gs.diemtrungbinh ? Number(gs.diemtrungbinh).toFixed(1) : '5.0'}
                      </span>
                      {!gs.diemtrungbinh && <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '4px' }}>(Mới)</span>}
                    </div>
                    
                    <p style={{ margin: '0 0 15px 0', color: '#94a3b8', fontSize: '0.9rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <User size={14} /> {gs.tuoi ? `${gs.tuoi} tuổi` : 'Chưa cập nhật'} • {gs.gioitinh}
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '0.95rem' }}>
                        <GraduationCap size={16} color="#8b5cf6" />
                        <span>{gs.trinhdohocvan}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '0.95rem' }}>
                        <BookOpen size={16} color="#3b82f6" />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {gs.chuyennganh || 'Chưa cập nhật chuyên ngành'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '0.95rem' }}>
                        <MapPin size={16} color="#ef4444" />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {gs.khuvuc || 'Chưa cập nhật khu vực'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '0.95rem' }}>
                        <DollarSign size={16} color="#10b981" />
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                          {gs.hocphimongmuon ? gs.hocphimongmuon.toLocaleString() + ' đ/buổi' : 'Thỏa thuận'}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <button className="btn btn-primary" style={{ width: '100%', padding: '10px', borderRadius: '8px', opacity: 0.9 }}>
                        Đăng nhập để xem chi tiết
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: '40px', backgroundColor: 'rgba(30, 41, 59, 0.3)', borderRadius: '12px' }}>
                Không tìm thấy gia sư nào phù hợp với từ khóa của bạn.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicTutors;
