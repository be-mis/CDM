const nodemailer = require('nodemailer');
require('dotenv').config();

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || ''
  }
});

async function sendMail({ to, subject, text, html }) {
  const fromName = process.env.EMAIL_FROM_NAME || 'Cash Disbursement Module';
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@example.com';
  const from = `"${fromName}" <${fromEmail}>`;
  
  const info = await transport.sendMail({ from, to, subject, text, html });
  return info;
}

module.exports = { sendMail, transport };
