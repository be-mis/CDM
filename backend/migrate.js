const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const dbHost = process.env.DB_HOST || '127.0.0.1';
  const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
  const dbUser = process.env.DB_USER || 'root';
  const dbPass = process.env.DB_PASSWORD || '';

  const pool = await mysql.createPool({ host: dbHost, port: dbPort, user: dbUser, password: dbPass, waitForConnections: true, connectionLimit: 5, multipleStatements: true });

  const migrationsDir = path.join(__dirname, 'sql', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  // fetch applied migrations if migrations table exists
  let applied = new Set();
  try {
    const [rows] = await pool.query("SELECT name FROM `cdmdb`.migrations");
    for (const r of rows) applied.add(r.name);
  } catch (e) {
    // migrations table may not exist yet (first run)
    applied = new Set();
  }

  for (const file of files) {
    const name = file;
    if (applied.has(name)) {
      console.log('Skipping already applied migration', name);
      continue;
    }

    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const conn = await pool.getConnection();
    try {
      await conn.query(content);
      // record migration
      try {
        await conn.query("INSERT INTO `cdmdb`.migrations (name) VALUES (?)", [name]);
      } catch (e) {
        // ignore recording errors
      }
      console.log('Applied', name);
    } catch (err) {
      console.error('Error running', name, err.message);
      conn.release();
      process.exit(1);
    }
    conn.release();
  }

  await pool.end();
  console.log('Migrations complete');
}

run().catch(err => { console.error(err); process.exit(1); });
