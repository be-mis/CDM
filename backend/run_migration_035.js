const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'cash_disbursement'
    });

    try {
        // Add approved_by_name column to cash_advances table
        await conn.query("ALTER TABLE cash_advances ADD COLUMN approved_by_name VARCHAR(255) NULL AFTER approved_by");
        console.log('Added approved_by_name to cash_advances');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('Column approved_by_name already exists in cash_advances');
        } else {
            console.error('Error adding column to cash_advances:', e.message);
        }
    }

    try {
        // Add approved_by_name column to liquidations table
        await conn.query("ALTER TABLE liquidations ADD COLUMN approved_by_name VARCHAR(255) NULL AFTER approved_by");
        console.log('Added approved_by_name to liquidations');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('Column approved_by_name already exists in liquidations');
        } else {
            console.error('Error adding column to liquidations:', e.message);
        }
    }

    try {
        // Add approved_by_name column to reimbursements table
        await conn.query("ALTER TABLE reimbursements ADD COLUMN approved_by_name VARCHAR(255) NULL AFTER approved_by");
        console.log('Added approved_by_name to reimbursements');
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log('Column approved_by_name already exists in reimbursements');
        } else {
            console.error('Error adding column to reimbursements:', e.message);
        }
    }

    await conn.end();
    console.log('Migration complete!');
})();
