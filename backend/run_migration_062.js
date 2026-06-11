/**
 * Run migration 062: Add alert_sent_at column to cash_advances
 * Usage: node run_migration_062.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cdmdb'
  });

  try {
    // Check if column already exists
    const [cols] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'cash_advances' AND COLUMN_NAME = 'alert_sent_at'`,
      [process.env.DB_NAME || 'cdmdb']
    );

    if (cols.length > 0) {
      console.log('Column alert_sent_at already exists. Skipping migration.');
    } else {
      await connection.query(
        'ALTER TABLE `cash_advances` ADD COLUMN `alert_sent_at` TIMESTAMP NULL'
      );
      console.log('Migration 062 applied: Added alert_sent_at column to cash_advances.');
    }
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run();
