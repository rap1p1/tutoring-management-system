const { Pool } = require('pg');
require('dotenv').config({ path: 'e:/hoc/Công nghệ phần mềm/tutoring-management-system/backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Inserting default tuition fee configs into THAMSO...');
    const configs = [
      { mats: 'HocPhi_Cap1', tents: 'Học phí mặc định Cấp 1', giatri: '100000' },
      { mats: 'HocPhi_Cap2', tents: 'Học phí mặc định Cấp 2', giatri: '200000' },
      { mats: 'HocPhi_Cap3', tents: 'Học phí mặc định Cấp 3', giatri: '300000' },
      { mats: 'HocPhi_LuyenThiDH', tents: 'Học phí mặc định Luyện thi Đại học', giatri: '400000' },
      { mats: 'HocPhi_TiengAnhGT', tents: 'Học phí mặc định Tiếng Anh Giao tiếp', giatri: '350000' },
      { mats: 'HocPhi_ChungChiQT', tents: 'Học phí mặc định Chứng chỉ Quốc tế', giatri: '500000' },
      { mats: 'HocPhi_Khac', tents: 'Học phí mặc định Khác', giatri: '250000' }
    ];

    for (const cfg of configs) {
      await client.query(`
        INSERT INTO thamso (mats, tents, giatri) 
        VALUES ($1, $2, $3)
        ON CONFLICT (mats) DO NOTHING
      `, [cfg.mats, cfg.tents, cfg.giatri]);
    }
    console.log('Tuition migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
