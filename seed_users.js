const fs = require('fs');

async function seedData() {
  const password = 'admin123';
  const BASE_URL = 'http://localhost:3000/api';

  for (let i = 2; i <= 6; i++) {
    // 1. Tạo Học Viên
    const studentData = {
      username: `hv${i}`,
      password: password,
      hoten: `Học Viên ${i}`,
      ngaysinh: '2005-01-01',
      sdt: `090000000${i}`,
      email: `hv${i}@gmail.com`
    };

    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
      });
      const data = await res.json();
      console.log(`Tạo Học viên ${i} (${studentData.username}):`, data.success ? 'Thành công' : `Lỗi - ${data.message}`);
    } catch (e) {
      console.error(`Lỗi kết nối khi tạo Học viên ${i}:`, e.message);
    }

    if (i === 3 || i === 5) {
      const tutorData = {
        username: `gs${i}`,
        password: password,
        hoten: `Gia Sư ${i}`,
        ngaysinh: '1995-01-01',
        gioitinh: 'Nu',
        cccd: `01234567890${i}`,
        sdt: `091111111${i}`,
        email: `gs${i}@gmail.com`,
        trinhdohocvan: 'Đại học',
        chuyennganh: 'Sư phạm Toán',
        kinhnghiem: 2,
        khuvuc: 'Quận 1',
        hocphimongmuon: 200000,
        anhcccd: 'dummy.jpg',
        anhbangcap: 'dummy2.jpg'
      };

      try {
        const res2 = await fetch(`${BASE_URL}/giasu/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tutorData)
        });
        const data2 = await res2.json();
        console.log(`Tạo Gia sư ${i} (${tutorData.username}):`, data2.success ? 'Thành công' : `Lỗi - ${data2.message}`);
      } catch (e) {
        console.error(`Lỗi kết nối khi tạo Gia sư ${i}:`, e.message);
      }
    }
  }
}

seedData();
