/**
 * Test Script: Send Sample Liquidation Reminder Email
 * Usage: node send-test-liquidation-email.js
 * 
 * This script sends a test liquidation reminder email to verify the email format
 * and content before the automated system sends it.
 */

require('dotenv').config();
const { sendMail } = require('./src/utils/mailer');

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

/**
 * Build a professional HTML email template for the liquidation reminder
 */
function buildReminderEmail({ recipientName, advanceNumber, amount, purpose, deadline, daysOverdue, liquidationLink }) {
  const formattedAmount = `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const formattedDeadline = formatDate(deadline);
  const urgencyColor = daysOverdue >= 7 ? '#dc2626' : daysOverdue >= 3 ? '#d97706' : '#ea580c';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">
                ⚠️ Liquidation Reminder
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                Cash Disbursement Module
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                Hi <strong>${recipientName}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                This is a friendly reminder that your cash advance requires a liquidation report. Please submit your liquidation as soon as possible.
              </p>

              <!-- Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;width:45%;">CA Number:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${advanceNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Amount:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${formattedAmount}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Purpose:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;">${purpose || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Liquidation Deadline:</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${formattedDeadline}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Days Overdue:</td>
                        <td style="padding:6px 0;font-size:14px;font-weight:700;color:${urgencyColor};">${daysOverdue} day(s)</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${liquidationLink}" style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                      Submit Liquidation Report
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;text-align:center;">
                This is an automated reminder. If you have already submitted your liquidation, please disregard this message.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                Cash Disbursement Module &copy; ${new Date().getFullYear()}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send test email
 */
async function sendTestEmail() {
  try {
    console.log('📧 Preparing test liquidation reminder email...\n');

    // Test data
    const testData = {
      recipientName: 'Roland Alavera',
      advanceNumber: 'CA-000123',
      amount: 5000,
      purpose: 'Team Building Activity - Q1 2026',
      deadline: new Date(2026, 2, 21), // March 21, 2026
      daysOverdue: 4,
      liquidationLink: 'http://localhost:3021/liquidation'
    };

    const html = buildReminderEmail(testData);
    
    const subject = `⚠️ Liquidation Reminder: ${testData.advanceNumber} is ${testData.daysOverdue} day(s) overdue`;
    
    const text = `Hi ${testData.recipientName},\n\nThis is a reminder that your Cash Advance ${testData.advanceNumber} for "${testData.purpose}" (₱${testData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}) is ${testData.daysOverdue} day(s) past the liquidation deadline (${formatDate(testData.deadline)}).\n\nPlease submit your liquidation report as soon as possible.\n\nClick here to create your liquidation: ${testData.liquidationLink}\n\nThank you.`;

    console.log('Subject:', subject);
    console.log('To: roland.alavera@barbizonfashion.com');
    console.log('\nSending email...\n');

    await sendMail({
      to: 'roland.alavera@barbizonfashion.com',
      subject,
      text,
      html
    });

    console.log('✅ Email sent successfully to roland.alavera@barbizonfashion.com!\n');
    console.log('Preview:');
    console.log('─'.repeat(60));
    console.log('Subject:', subject);
    console.log('To: roland.alavera@barbizonfashion.com');
    console.log('─'.repeat(60));
    console.log('This email was sent with the following details:');
    console.log(`  • CA Number: ${testData.advanceNumber}`);
    console.log(`  • Amount: ₱${testData.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
    console.log(`  • Purpose: ${testData.purpose}`);
    console.log(`  • Days Overdue: ${testData.daysOverdue}`);
    console.log(`  • Deadline: ${formatDate(testData.deadline)}`);
    console.log('─'.repeat(60));

  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    process.exit(1);
  }
}

// Run the test
sendTestEmail();
