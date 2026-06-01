const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'giasu_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function migrate() {
  try {
    console.log('Bắt đầu cập nhật cấu trúc cơ sở dữ liệu...');
    
    // Thêm các cột cho tệp đính kèm và ảnh đại diện vào bảng GIASU
    await pool.query(`
      ALTER TABLE GIASU 
      ADD COLUMN IF NOT EXISTS AnhCCCD VARCHAR(255),
      ADD COLUMN IF NOT EXISTS AnhBangCap VARCHAR(255),
      ADD COLUMN IF NOT EXISTS AnhTheSinhVien VARCHAR(255),
      ADD COLUMN IF NOT EXISTS AnhDaiDien VARCHAR(255);
    `);
    
    console.log('Cập nhật cơ sở dữ liệu thành công!');
  } catch (e) {
    console.error('Lỗi khi cập nhật cơ sở dữ liệu:', e.message);
  } finally {
    await pool.end();
  }
}

migrate();
