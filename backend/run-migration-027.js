const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cash_disbursement',
      multipleStatements: true
    });

    console.log('Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, 'sql', 'migrations', '027-create-cash-advance-activities.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration 027-create-cash-advance-activities.sql...');

    // Execute migration
    await connection.query(sql);

    console.log('✓ Migration completed successfully!');
    console.log('✓ Table cash_advance_activities created');
    console.log('✓ Existing activity data migrated');

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
