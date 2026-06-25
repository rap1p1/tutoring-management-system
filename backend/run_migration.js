require('dotenv').config();
const { Pool } = require('pg');

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
    // 1. Make MatKhau nullable
    await client.query('ALTER TABLE taikhoan ALTER COLUMN matkhau DROP NOT NULL');
    console.log('1. MatKhau is now nullable');

    // 2. Add AuthProvider column
    try {
      await client.query("ALTER TABLE taikhoan ADD COLUMN authprovider VARCHAR(10) DEFAULT 'local'");
      console.log('2. AuthProvider column added');
    } catch (e) {
      if (e.code === '42701') {
        console.log('2. AuthProvider column already exists (skipped)');
      } else {
        throw e;
      }
    }

    // 3. Widen TenDangNhap to VARCHAR(50) for Google usernames
    await client.query('ALTER TABLE taikhoan ALTER COLUMN tendangnhap TYPE VARCHAR(50)');
    console.log('3. TenDangNhap widened to VARCHAR(50)');

    // 4. Create OTP_RESET table
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_reset (
        maotp       SERIAL PRIMARY KEY,
        matk        INT NOT NULL REFERENCES taikhoan(matk) ON DELETE CASCADE,
        otphash     VARCHAR(255) NOT NULL,
        hethan      TIMESTAMP NOT NULL,
        solanthu    SMALLINT NOT NULL DEFAULT 0,
        dasudung    BOOLEAN NOT NULL DEFAULT FALSE,
        resettoken  VARCHAR(255),
        ngaytao     TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('4. OTP_RESET table created');

    // 5. Create index
    await client.query('CREATE INDEX IF NOT EXISTS idx_otp_matk ON otp_reset(matk)');
    console.log('5. Index idx_otp_matk created');

    console.log('\n✅ Migration hoàn tất!');
  } catch (e) {
    console.error('❌ Migration error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
