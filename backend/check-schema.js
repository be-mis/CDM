/**
 * Check Database Schema
 * Find the actual column names in the users table
 */

require('dotenv').config();
const db = require('./src/config/db');

async function checkSchema() {
  let connection;
  try {
    connection = await db.getConnection();

    console.log('\n' + '='.repeat(70));
    console.log('DATABASE SCHEMA CHECK - USERS TABLE');
    console.log('='.repeat(70) + '\n');

    // Get all columns in users table
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Users Table Columns:\n');
    columns.forEach((col, index) => {
      console.log(`${index + 1}. ${col.COLUMN_NAME}`);
      console.log(`   Type: ${col.COLUMN_TYPE}`);
      console.log(`   Nullable: ${col.IS_NULLABLE}`);
      console.log(`   Key: ${col.COLUMN_KEY || 'None'}`);
      console.log(`   Default: ${col.COLUMN_DEFAULT || 'None'}\n`);
    });

    // Get sample of actual data
    console.log('='.repeat(70));
    console.log('Sample User Data:\n');
    
    const [users] = await connection.query(`
      SELECT * FROM users LIMIT 3
    `);

    if (users.length > 0) {
      const firstUser = users[0];
      console.log('First user record:');
      console.log(JSON.stringify(firstUser, null, 2));
    } else {
      console.log('No users found in database');
    }

    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

checkSchema();
