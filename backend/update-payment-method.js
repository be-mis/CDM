const db = require('./src/config/db');

(async () => {
  try {
    const conn = await db.getConnection();
    
    // Update existing records
    await conn.query(`UPDATE cash_advances SET payment_method = 'payroll' WHERE payment_method IN ('check', 'bank_transfer')`);
    console.log('Updated existing records to use payroll instead of check/bank_transfer');
    
    // Modify the ENUM column
    await conn.query(`ALTER TABLE cash_advances MODIFY COLUMN payment_method ENUM('cash', 'payroll') NOT NULL DEFAULT 'payroll'`);
    console.log('Updated payment_method ENUM to only allow cash and payroll');
    
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
