/**
 * Professional Email Templates
 * Provides consistent, branded email templates for all system communications
 */

/**
 * Generic HTML Email Wrapper
 * Wraps content in a professional email template with consistent styling
 */
function buildEmailTemplate({ title, subtitle, content, ctaButton, footerText }) {
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
                ${title}
              </h1>
              ${subtitle ? `<p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                ${subtitle}
              </p>` : ''}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              ${content}
              
              ${ctaButton ? `
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:24px 0;">
                    <a href="${ctaButton.url}" style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">
                      ${ctaButton.text}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                ${footerText || 'Cash Disbursement Module &copy; ' + new Date().getFullYear()}
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
 * Password Reset Email Template
 */
function buildPasswordResetEmail({ recipientName, resetLink }) {
  const content = `
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
      Hi <strong>${recipientName || 'User'}</strong>,
    </p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
      You requested to reset your password. Click the button below to create a new password:
    </p>
    <p style="margin:0 0 16px;color:#9ca3af;font-size:13px;">
      This link will expire in <strong>1 hour</strong>.
    </p>
    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
      If you didn't request a password reset, please ignore this email and your account will remain unchanged. Your password is safe.
    </p>
  `;

  const html = buildEmailTemplate({
    title: '🔐 Reset Your Password',
    subtitle: 'Cash Disbursement Module',
    content,
    ctaButton: {
      text: 'Reset Password',
      url: resetLink
    },
    footerText: `Or copy this link: <span style="color:#667eea;word-break:break-all;">${resetLink}</span>`
  });

  const text = `Hi ${recipientName || 'User'},\n\nYou requested to reset your password. Copy and paste this link into your browser to reset it:\n\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nThank you.`;

  return { html, text };
}

/**
 * Liquidation Reminder Email Template
 */
function buildLiquidationReminderEmail({ recipientName, advanceNumber, amount, purpose, deadline, daysOverdue, liquidationLink }) {
  const formattedAmount = `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const formattedDeadline = new Date(deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const urgencyColor = daysOverdue >= 7 ? '#dc2626' : daysOverdue >= 3 ? '#d97706' : '#ea580c';

  const content = `
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

    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;text-align:center;">
      This is an automated reminder. If you have already submitted your liquidation, please disregard this message.
    </p>
  `;

  const html = buildEmailTemplate({
    title: '⚠️ Liquidation Reminder',
    subtitle: 'Cash Disbursement Module',
    content,
    ctaButton: {
      text: 'Submit Liquidation Report',
      url: liquidationLink
    }
  });

  const text = `Hi ${recipientName},\n\nThis is a reminder that your Cash Advance ${advanceNumber} for "${purpose}" (${formattedAmount}) is ${daysOverdue} day(s) past the liquidation deadline (${formattedDeadline}).\n\nPlease submit your liquidation report as soon as possible.\n\nClick here to create your liquidation: ${liquidationLink}\n\nThank you.`;

  return { html, text };
}

/**
 * Account Welcome Email Template
 */
function buildWelcomeEmail({ recipientName, loginLink }) {
  const content = `
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
      Welcome <strong>${recipientName}</strong>!
    </p>
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
      Your account has been successfully created. You can now log in to the Cash Disbursement Module and start managing your requests.
    </p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
      <strong>Quick Tips:</strong>
    </p>
    <ul style="margin:0 0 24px;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
      <li>Create a new Cash Advance request</li>
      <li>Submit Liquidation reports for your advances</li>
      <li>Submit Reimbursement requests for personal expenses</li>
      <li>Track the status of all your requests</li>
    </ul>
    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
      If you have any questions, please contact the helpdesk.
    </p>
  `;

  const html = buildEmailTemplate({
    title: '👋 Welcome to Cash Disbursement Module',
    subtitle: 'Account Successfully Created',
    content,
    ctaButton: {
      text: 'Log In Now',
      url: loginLink
    }
  });

  const text = `Welcome ${recipientName}!\n\nYour account has been successfully created. You can now log in to the Cash Disbursement Module.\n\nLogin Link: ${loginLink}\n\nThank you.`;

  return { html, text };
}

/**
 * Approval Notification Email Template
 */
function buildApprovalNotificationEmail({ recipientName, requestType, requestNumber, status, notes, linkUrl }) {
  const statusEmoji = status === 'approved' ? '✅' : status === 'rejected' ? '❌' : '⏸️';
  const statusColor = status === 'approved' ? '#10b981' : status === 'rejected' ? '#ef4444' : '#f59e0b';

  const content = `
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
      Hi <strong>${recipientName}</strong>,
    </p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
      Your <strong>${requestType}</strong> request <strong>${requestNumber}</strong> has been <strong style="color:${statusColor};">${status.toUpperCase()}</strong>.
    </p>
    
    ${notes ? `
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#6b7280;font-size:13px;font-weight:600;">Notes:</p>
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${notes}</p>
    </div>
    ` : ''}

    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
      You can view more details about your request by logging into the system.
    </p>
  `;

  const html = buildEmailTemplate({
    title: `${statusEmoji} Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    subtitle: 'Cash Disbursement Module',
    content,
    ctaButton: linkUrl ? {
      text: 'View Request Details',
      url: linkUrl
    } : null
  });

  const text = `Hi ${recipientName},\n\nYour ${requestType} request ${requestNumber} has been ${status.toUpperCase()}.\n\n${notes ? `Notes: ${notes}\n\n` : ''}Thank you.`;

  return { html, text };
}

/**
 * OTP Verification Email Template (used for both signup verification
 * and forgot-password codes — distinguished by `purpose`)
 */
function buildOtpEmail({ recipientName, otp, purpose, expiryMinutes }) {
  const intro = purpose === 'signup'
    ? 'Use the code below to finish creating your account.'
    : 'Use the code below to reset your password.';
  const greeting = recipientName ? recipientName : 'there';

  const content = `
    <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
      Hi <strong>${greeting}</strong>,
    </p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
      ${intro}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0 24px;">
          <div style="display:inline-block;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 32px;font-size:32px;font-weight:700;letter-spacing:8px;color:#111827;">
            ${otp}
          </div>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px;color:#9ca3af;font-size:13px;">
      This code will expire in <strong>${expiryMinutes} minutes</strong>.
    </p>
    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
      If you didn't request this, please ignore this email — no changes will be made to your account.
    </p>
  `;

  const html = buildEmailTemplate({
    title: purpose === 'signup' ? '🔐 Verify Your Email' : '🔐 Password Reset Code',
    subtitle: 'Cash Disbursement Module',
    content
  });

  const text = `Hi ${greeting},\n\n${intro}\n\nYour verification code: ${otp}\n\nThis code will expire in ${expiryMinutes} minutes. If you didn't request this, please ignore this email.\n\nThank you.`;

  return { html, text };
}


module.exports = {
  buildOtpEmail,
  buildEmailTemplate,
  buildPasswordResetEmail,
  buildLiquidationReminderEmail,
  buildWelcomeEmail,
  buildApprovalNotificationEmail
};