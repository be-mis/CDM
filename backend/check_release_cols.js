require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
    const c = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const [r1] = await c.query('SHOW COLUMNS FROM liquidations LIKE "release_remarks"');
    console.log('liquidations release_remarks:', r1.length > 0 ? 'exists' : 'missing');

    const [r2] = await c.query('SHOW COLUMNS FROM reimbursements LIKE "release_remarks"');
    console.log('reimbursements release_remarks:', r2.length > 0 ? 'exists' : 'missing');

    await c.end();
}

check();
