require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'cash_disbursement',
        multipleStatements: true
    });

    try {
        console.log('Running migration 060-reimbursement-enhancements.sql...');

        const sqlPath = path.join(__dirname, 'sql', 'migrations', '060-reimbursement-enhancements.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await connection.query(sql);

        console.log('Migration 060 completed successfully!');
        console.log('Added gcash_name column to reimbursements and created reimbursement_transportation table.');
    } catch (error) {
        console.error('Migration failed:', error.message);
    } finally {
        await connection.end();
    }
}

runMigration();
