const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: 'cash_disbursement'
    });

    // Check cash advances amounts
    console.log('=== Cash Advances ===');
    const [cashAdvances] = await conn.query("SELECT id, advance_number, requested_amount FROM cash_advances WHERE status = 'pending' ORDER BY id DESC LIMIT 5");
    console.log(JSON.stringify(cashAdvances, null, 2));

    // Check items for a specific cash advance
    if (cashAdvances.length > 0) {
        const caId = cashAdvances[0].id;
        console.log(`\n=== Items for Cash Advance ID ${caId} ===`);
        const [items] = await conn.query('SELECT id, particulars, estimated_amount FROM cash_advance_items WHERE cash_advance_id = ?', [caId]);
        console.log(JSON.stringify(items, null, 2));

        const totalFromItems = items.reduce((sum, item) => sum + parseFloat(item.estimated_amount || 0), 0);
        console.log(`\nTotal from items (estimated_amount sum): ${totalFromItems}`);
    }

    await conn.end();
})();
