require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkRemarksColumns() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'cash_disbursement'
    });

    try {
        // Check cash_advances
        const [caColumns] = await connection.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'cash_advances' 
      AND column_name IN ('remarks', 'release_remarks')
    `);
        console.log('cash_advances columns:', caColumns.map(c => c.COLUMN_NAME || c.column_name));

        // Check liquidations
        const [liqColumns] = await connection.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'liquidations' 
      AND column_name IN ('remarks', 'release_remarks')
    `);
        console.log('liquidations columns:', liqColumns.map(c => c.COLUMN_NAME || c.column_name));

        // Check reimbursements
        const [rColumns] = await connection.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'reimbursements' 
      AND column_name IN ('remarks', 'release_remarks')
    `);
        console.log('reimbursements columns:', rColumns.map(c => c.COLUMN_NAME || c.column_name));
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkRemarksColumns();
