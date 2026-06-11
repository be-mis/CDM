require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateStatusEnum() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'cash_disbursement',
        multipleStatements: true
    });

    try {
        console.log('Checking status column type...');

        // Check current column type
        const [columns] = await connection.query("SHOW COLUMNS FROM cash_advances LIKE 'status'");
        console.log('Current status column:', columns[0]);

        // If it's an ENUM, we need to modify it to include 'released'
        if (columns[0] && columns[0].Type && columns[0].Type.includes('enum')) {
            console.log('Status is ENUM type. Updating to include released...');

            // Update cash_advances
            await connection.query(`
        ALTER TABLE cash_advances 
        MODIFY COLUMN status ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled', 'released') 
        DEFAULT 'draft'
      `);
            console.log('Updated cash_advances status column');

            // Update liquidations
            await connection.query(`
        ALTER TABLE liquidations 
        MODIFY COLUMN status ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled', 'released') 
        DEFAULT 'draft'
      `);
            console.log('Updated liquidations status column');

            // Update reimbursements
            await connection.query(`
        ALTER TABLE reimbursements 
        MODIFY COLUMN status ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled', 'released') 
        DEFAULT 'draft'
      `);
            console.log('Updated reimbursements status column');

            console.log('All status columns updated successfully!');
        } else {
            console.log('Status column is VARCHAR or already includes released. No changes needed.');
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

updateStatusEnum();
