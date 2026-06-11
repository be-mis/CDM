const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'cash_disbursement'
    });

    console.log('Starting migration...\n');

    // Step 1: Remove approved_by_name columns
    console.log('=== Step 1: Remove approved_by_name columns ===');

    const tables = ['cash_advances', 'liquidations', 'reimbursements'];
    for (const table of tables) {
        try {
            await conn.query(`ALTER TABLE ${table} DROP COLUMN approved_by_name`);
            console.log(`Dropped approved_by_name from ${table}`);
        } catch (e) {
            if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log(`Column approved_by_name does not exist in ${table} (already removed)`);
            } else {
                console.error(`Error dropping column from ${table}:`, e.message);
            }
        }
    }

    // Step 2: Drop foreign key constraints on created_by
    console.log('\n=== Step 2: Drop foreign key constraints on created_by ===');

    const fkConstraints = [
        { table: 'cash_advances', fk: 'cash_advances_ibfk_2' },
        { table: 'liquidations', fk: 'liquidations_ibfk_3' },
        { table: 'reimbursements', fk: 'reimbursements_ibfk_2' }
    ];

    for (const { table, fk } of fkConstraints) {
        try {
            await conn.query(`ALTER TABLE ${table} DROP FOREIGN KEY ${fk}`);
            console.log(`Dropped FK ${fk} from ${table}`);
        } catch (e) {
            console.log(`FK ${fk} on ${table} already dropped or does not exist`);
        }
    }

    // Step 3: Migrate existing created_by IDs to emails
    console.log('\n=== Step 3: Migrate existing created_by IDs to emails ===');

    for (const table of tables) {
        try {
            // First update all records with the user's email based on their ID
            const [result] = await conn.query(`
        UPDATE ${table} t
        JOIN users u ON t.created_by = u.id
        SET t.created_by = u.email
        WHERE t.created_by REGEXP '^[0-9]+$'
      `);
            console.log(`Migrated ${result.affectedRows} records in ${table} from ID to email`);
        } catch (e) {
            console.log(`Migration for ${table} skipped or failed:`, e.message);
        }
    }

    // Step 4: Change created_by column type to VARCHAR
    console.log('\n=== Step 4: Change created_by column type to VARCHAR ===');

    for (const table of tables) {
        try {
            await conn.query(`ALTER TABLE ${table} MODIFY COLUMN created_by VARCHAR(255) NULL`);
            console.log(`Modified created_by in ${table} to VARCHAR(255)`);
        } catch (e) {
            console.error(`Error modifying ${table}:`, e.message);
        }
    }

    await conn.end();
    console.log('\n=== Migration complete! ===');
})();
