const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: 'cash_disbursement',
            multipleStatements: true
        });

        const migrationFile = path.join(__dirname, 'sql', 'migrations', '039-add-user-payment-info.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log('Running migration 039...');
        await connection.query(sql);

        console.log('Migration complete.');
        await connection.end();
    } catch (error) {
        console.error('Migration failed:', error);
    }
})();
