const db = require('../config/db');
const { sendMail } = require('./mailer');
const { buildLiquidationReminderEmail } = require('./emailTemplates');

/**
 * Liquidation Reminder Utility
 * Checks for cash advances that have passed their liquidation_deadline
 * and sends email reminders to the requestors.
 *
 * Rules:
 * 1. Only cash advances with status 'released' or 'disbursed' are considered.
 * 2. Advances that already have a liquidation in a blocking status
 *    (draft, pending, approved, disbursed, liquidated) are excluded.
 * 3. Advances whose liquidation_deadline <= CURRENT_DATE are overdue.
 * 4. We only send one email per day (checked via alert_sent_at).
 */

async function checkOverdueLiquidations() {
  let connection;
  try {
    connection = await db.getConnection();

    // Find all overdue cash advances that do NOT have an existing liquidation
    // and haven't been alerted today yet.
    const [overdueAdvances] = await connection.query(`
      SELECT 
        ca.id,
        ca.advance_number,
        ca.requested_by,
        ca.purpose,
        ca.requested_amount,
        ca.liquidation_deadline,
        ca.created_by,
        ca.alert_sent_at,
        u.email AS user_email,
        u.name AS user_name
      FROM cash_advances ca
      LEFT JOIN users u ON (ca.created_by COLLATE utf8mb4_general_ci = u.email COLLATE utf8mb4_general_ci OR ca.employee_id = u.id)
      WHERE ca.status IN ('released', 'disbursed')
        AND ca.liquidation_deadline IS NOT NULL
        AND ca.liquidation_deadline <= CURDATE()
        AND NOT EXISTS (
          SELECT 1 FROM liquidations l
          WHERE l.cash_advance_id = ca.id
            AND l.status IN ('draft', 'pending', 'approved', 'disbursed', 'liquidated')
        )
        AND (
          ca.alert_sent_at IS NULL
          OR DATE(ca.alert_sent_at) < CURDATE()
        )
      GROUP BY ca.id
      ORDER BY ca.liquidation_deadline ASC
    `);

    if (overdueAdvances.length === 0) {
      console.log('No overdue liquidations found.');
      return { sent: 0, total: 0 };
    }

    console.log(`Found ${overdueAdvances.length} overdue cash advance(s) requiring liquidation reminders.`);

    let sentCount = 0;

    for (const advance of overdueAdvances) {
      const recipientEmail = advance.user_email || advance.created_by;

      if (!recipientEmail) {
        console.warn(`No email found for cash advance ${advance.advance_number} (ID: ${advance.id}), skipping.`);
        continue;
      }

      const recipientName = advance.user_name || advance.requested_by || 'Team Member';

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3021';
      const liquidationLink = `${frontendUrl}/liquidation`;

      const daysOverdue = Math.ceil(
        (new Date() - new Date(advance.liquidation_deadline)) / (1000 * 60 * 60 * 24)
      );

      const subject = `⚠️ Liquidation Reminder: ${advance.advance_number} is ${daysOverdue} day(s) overdue`;

      const { html, text } = buildLiquidationReminderEmail({
        recipientName,
        advanceNumber: advance.advance_number,
        amount: parseFloat(advance.requested_amount || 0),
        purpose: advance.purpose,
        deadline: advance.liquidation_deadline,
        daysOverdue,
        liquidationLink
      });

      try {
        await sendMail({
          to: recipientEmail,
          subject,
          text,
          html
        });

        // Update alert_sent_at
        await connection.query(
          'UPDATE cash_advances SET alert_sent_at = NOW() WHERE id = ?',
          [advance.id]
        );

        sentCount++;
        console.log(`Reminder sent to ${recipientEmail} for ${advance.advance_number}`);
      } catch (emailErr) {
        console.error(`Failed to send reminder for ${advance.advance_number} to ${recipientEmail}:`, emailErr.message);
      }
    }

    console.log(`Liquidation reminders complete: ${sentCount}/${overdueAdvances.length} sent.`);
    return { sent: sentCount, total: overdueAdvances.length };

  } catch (error) {
    console.error('Error checking overdue liquidations:', error.message);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Format a date value into a readable string
 */
function formatDate(dateVal) {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  } catch (e) { /* fall through */ }
  return String(dateVal);
}

module.exports = { checkOverdueLiquidations };
