const db = require('./src/config/db');

(async () => {
  try {
    const conn = await db.getConnection();
    await conn.query(`INSERT INTO _migrations (filename, applied_at) VALUES ('024-add-previous-status-to-liquidations.sql', NOW()) ON DUPLICATE KEY UPDATE filename=filename`);
    console.log('Marked 024 as applied');
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
