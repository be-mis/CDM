const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');
require('dotenv').config();

async function run(){
  try{
    const email = process.env.TEMP_USER_EMAIL || 'temp.user@example.com';
    const password = process.env.TEMP_USER_PASSWORD || 'TempPass123!';
    const name = process.env.TEMP_USER_NAME || 'Temp User';

    const hash = await bcrypt.hash(password, 10);

    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows && rows.length) {
      console.log('User already exists, skipping insert:', email);
      process.exit(0);
    }

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, NOW())',
      [name, email, hash]
    );

    console.log('Inserted temp user:', { id: result.insertId, email, password });
    process.exit(0);
  }catch(err){
    console.error('Seed error:', err);
    process.exit(1);
  }
}

run();
