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
        // Drop foreign key constraint first for cash_advances
        try {
            await conn.query("ALTER TABLE cash_advances DROP FOREIGN KEY cash_advances_ibfk_3");
            console.log('Dropped FK on cash_advances');
        } catch (e) {
            console.log('FK on cash_advances already dropped or does not exist');
        }

        // Change approved_by column to VARCHAR in cash_advances
        await conn.query("ALTER TABLE cash_advances MODIFY COLUMN approved_by VARCHAR(255) NULL");
        console.log('Modified approved_by in cash_advances to VARCHAR');
    } catch (e) {
        console.error('Error modifying cash_advances:', e.message);
    }

    try {
        // Drop foreign key constraint for liquidations
        try {
            await conn.query("ALTER TABLE liquidations DROP FOREIGN KEY liquidations_ibfk_4");
            console.log('Dropped FK on liquidations');
        } catch (e) {
            console.log('FK on liquidations already dropped or does not exist');
        }

        // Change approved_by column to VARCHAR in liquidations
        await conn.query("ALTER TABLE liquidations MODIFY COLUMN approved_by VARCHAR(255) NULL");
        console.log('Modified approved_by in liquidations to VARCHAR');
    } catch (e) {
        console.error('Error modifying liquidations:', e.message);
    }

    try {
        // Drop foreign key constraint for reimbursements
        try {
            await conn.query("ALTER TABLE reimbursements DROP FOREIGN KEY reimbursements_ibfk_3");
            console.log('Dropped FK on reimbursements');
        } catch (e) {
            console.log('FK on reimbursements already dropped or does not exist');
        }

        // Change approved_by column to VARCHAR in reimbursements
        await conn.query("ALTER TABLE reimbursements MODIFY COLUMN approved_by VARCHAR(255) NULL");
        console.log('Modified approved_by in reimbursements to VARCHAR');
    } catch (e) {
        console.error('Error modifying reimbursements:', e.message);
    }

    await conn.end();
    console.log('Migration complete!');
})();
