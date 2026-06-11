const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'cash_disbursement'
    });

    console.log('=== Migrating approved_by from ID to Name ===\n');

    const tables = ['cash_advances', 'liquidations', 'reimbursements'];

    for (const table of tables) {
        // Select records where approved_by is a number (stringified ID)
        const [records] = await conn.query(`
      SELECT id, approved_by FROM ${table} 
      WHERE approved_by IS NOT NULL 
      AND approved_by REGEXP '^[0-9]+$'
    `);

        console.log(`Checking ${table}: Found ${records.length} records to potentially migrate.`);

        for (const row of records) {
            const idStr = row.approved_by;
            const id = parseInt(idStr, 10);

            // Look up user name
            const [users] = await conn.query('SELECT name FROM users WHERE id = ?', [id]);

            if (users.length > 0) {
                const name = users[0].name;
                await conn.query(`UPDATE ${table} SET approved_by = ? WHERE id = ?`, [name, row.id]);
                console.log(`  Updated ${table} #${row.id}: ${idStr} -> ${name}`);
            } else {
                console.log(`  Skipped ${table} #${row.id}: User ID ${idStr} not found.`);
            }
        }
    }

    await conn.end();
    console.log('\n=== Migration Complete ===');
})();
