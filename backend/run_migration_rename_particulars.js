const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const config = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'cmd_db'
    };

    console.log('Connecting to database:', config.host, config.database);
    const conn = await mysql.createConnection(config);

    console.log('Starting migration to rename "particulars" to "description"...\n');

    const tables = [
        'cash_advance_items',
        'reimbursement_items',
        'liquidation_items',
        'liquidation_other_expenses'
    ];

    for (const table of tables) {
        try {
            // Check if column exists before renaming
            const [columns] = await conn.query(`SHOW COLUMNS FROM ${table} LIKE 'particulars'`);
            if (columns.length > 0) {
                // Get the current type if possible, or default to TEXT
                const currentType = columns[0].Type;
                console.log(`Found particulars in ${table} with type ${currentType}`);

                // Rename
                await conn.query(`ALTER TABLE ${table} CHANGE COLUMN particulars description ${currentType}`);
                console.log(`Renamed particulars to description in ${table}`);
            } else {
                // Check if it's already description
                const [descCols] = await conn.query(`SHOW COLUMNS FROM ${table} LIKE 'description'`);
                if (descCols.length > 0) {
                    console.log(`Column "description" already exists in ${table}, skipping.`);
                } else {
                    console.warn(`Column "particulars" not found in ${table} and "description" missing!`);
                }
            }
        } catch (e) {
            console.error(`Error processing table ${table}:`, e.message);
        }
    }

    await conn.end();
    console.log('\n=== Migration complete! ===');
})();
