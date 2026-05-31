require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  // Cấu hình kết nối tới database mặc định 'postgres' để tạo DB mới
  const defaultClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'postgres' // connect to default db first
  });

  try {
    console.log('Đang kết nối tới PostgreSQL...');
    await defaultClient.connect();
    
    // Kiểm tra xem database giasu_db đã tồn tại chưa
    const checkDb = await defaultClient.query("SELECT 1 FROM pg_database WHERE datname = $1", [process.env.DB_NAME || 'giasu_db']);
    
    if (checkDb.rows.length === 0) {
      console.log(`Đang tạo cơ sở dữ liệu: ${process.env.DB_NAME || 'giasu_db'}...`);
      await defaultClient.query(`CREATE DATABASE "${process.env.DB_NAME || 'giasu_db'}"`);
      console.log('Tạo database thành công!');
    } else {
      console.log(`Database '${process.env.DB_NAME || 'giasu_db'}' đã tồn tại từ trước.`);
    }
  } catch (e) {
    console.error('Lỗi khi kiểm tra/tạo database:', e.message);
    process.exit(1);
  } finally {
    await defaultClient.end();
  }

  // Kết nối trực tiếp vào database 'giasu_db' mới tạo để import bảng
  const dbClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'giasu_db'
  });

  try {
    console.log(`Đang kết nối tới database '${process.env.DB_NAME || 'giasu_db'}' để nạp bảng...`);
    await dbClient.connect();

    const sqlPath = path.join(__dirname, 'database.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error('Không tìm thấy file database.sql ở thư mục gốc.');
    }

    let sqlContent = fs.readFileSync(sqlPath, 'utf8');
    // Thay thế NVARCHAR bằng VARCHAR để tương thích với PostgreSQL
    sqlContent = sqlContent.replace(/NVARCHAR/gi, 'VARCHAR');
    
    console.log('Đang nạp dữ liệu cấu trúc và dữ liệu mẫu từ database.sql (việc này có thể mất vài giây)...');
    await dbClient.query(sqlContent);
    console.log('Đã nạp thành công toàn bộ bảng dữ liệu và cấu hình mẫu!');

  } catch (e) {
    console.error('Lỗi nạp database.sql:', e.message);
  } finally {
    await dbClient.end();
  }
}

run();
