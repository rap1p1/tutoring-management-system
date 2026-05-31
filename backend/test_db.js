const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});
pool.query('DELETE FROM yeucauhockem WHERE caplop LIKE \'%?%\' OR thoigianmongmuon LIKE \'%?%\';', (err, res) => {
  if (err) console.error(err);
  else console.log('Deleted rows:', res.rowCount);
  pool.end();
});
