const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: 'cash_disbursement'
        });

        console.log('=== Checking users table columns ===\n');

        const [columns] = await conn.query(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'cash_disbursement' 
            AND TABLE_NAME = 'users'
        `);

        console.table(columns);

        await conn.end();
    } catch (e) {
        console.error(e);
    }
})();
