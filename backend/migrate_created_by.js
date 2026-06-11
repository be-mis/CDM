const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'cash_disbursement'
    });

    console.log('=== Migrating existing created_by values to emails ===\n');

    const tables = ['cash_advances', 'liquidations', 'reimbursements'];

    for (const table of tables) {
        // Get all records with numeric created_by values
        const [records] = await conn.query(`
      SELECT DISTINCT created_by FROM ${table} WHERE created_by IS NOT NULL
    `);

        for (const record of records) {
            const oldValue = record.created_by;

            // Check if it looks like an ID (numeric or numeric string)
            if (/^\d+$/.test(oldValue)) {
                // Look up the user email by ID
                const [users] = await conn.query('SELECT email FROM users WHERE id = ?', [parseInt(oldValue)]);

                if (users.length > 0) {
                    const email = users[0].email;
                    const [result] = await conn.query(
                        `UPDATE ${table} SET created_by = ? WHERE created_by = ?`,
                        [email, oldValue]
                    );
                    console.log(`${table}: Updated ${result.affectedRows} records from ID ${oldValue} to email ${email}`);
                } else {
                    console.log(`${table}: No user found for ID ${oldValue}`);
                }
            }
        }
    }

    await conn.end();
    console.log('\n=== Migration complete! ===');
})();
