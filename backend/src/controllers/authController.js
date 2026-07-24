const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendMail } = require('../utils/mailer');
const { buildPasswordResetEmail, buildWelcomeEmail, buildOtpEmail } = require('../utils/emailTemplates');
const { logAudit } = require('../utils/auditLogger');

const getIp = (req) =>
  req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;

// ---------------------------------------------------------------------------
// Allowed signup email domains
// ---------------------------------------------------------------------------
const ALLOWED_EMAIL_DOMAINS = [
  'barbizonfashion.com',
  'everydayproductscorp.net',
  'everydayproductscorp.com'
];

const isAllowedEmailDomain = (email) => {
  const domain = String(email || '').toLowerCase().split('@')[1];
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
};

// ---------------------------------------------------------------------------
// OTP helpers
// ---------------------------------------------------------------------------
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MIN_RESEND_SECONDS = 30; // server-side floor, independent of the frontend's own cooldown UI

const generateOtp = () =>
  crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0');

// Creates (or overwrites) the pending OTP for this email+purpose.
// Returns { throttled: true } if a code was sent too recently.
const issueOtp = async (email, purpose) => {
  const [existing] = await pool.query(
    'SELECT last_sent_at FROM otp_verifications WHERE email = ? AND purpose = ?',
    [email, purpose]
  );

  if (existing.length) {
    const secondsSinceLastSend = (Date.now() - new Date(existing[0].last_sent_at).getTime()) / 1000;
    if (secondsSinceLastSend < OTP_MIN_RESEND_SECONDS) {
      return { throttled: true };
    }
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await pool.query(
    `INSERT INTO otp_verifications (email, purpose, otp_hash, expires_at, attempts, last_sent_at)
     VALUES (?, ?, ?, ?, 0, NOW())
     ON DUPLICATE KEY UPDATE
       otp_hash = VALUES(otp_hash),
       expires_at = VALUES(expires_at),
       attempts = 0,
       last_sent_at = NOW()`,
    [email, purpose, otpHash, expiresAt]
  );

  return { throttled: false, otp };
};

// Verifies a submitted code against the stored one, tracking attempts.
// Returns { valid: true } | { valid: false, reason: 'not_found' | 'expired' | 'too_many_attempts' | 'mismatch' }
const verifyOtp = async (email, purpose, submittedOtp) => {
  const [rows] = await pool.query(
    'SELECT id, otp_hash, expires_at, attempts FROM otp_verifications WHERE email = ? AND purpose = ?',
    [email, purpose]
  );

  if (!rows.length) return { valid: false, reason: 'not_found' };
  const record = rows[0];

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await pool.query('DELETE FROM otp_verifications WHERE id = ?', [record.id]);
    return { valid: false, reason: 'too_many_attempts' };
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    await pool.query('DELETE FROM otp_verifications WHERE id = ?', [record.id]);
    return { valid: false, reason: 'expired' };
  }

  const matches = await bcrypt.compare(submittedOtp, record.otp_hash);
  if (!matches) {
    await pool.query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?', [record.id]);
    return { valid: false, reason: 'mismatch' };
  }

  await pool.query('DELETE FROM otp_verifications WHERE id = ?', [record.id]);
  return { valid: true };
};

const otpFailureMessage = (reason) => {
  switch (reason) {
    case 'expired':
      return 'This code has expired. Please request a new one.';
    case 'too_many_attempts':
      return 'Too many incorrect attempts. Please request a new code.';
    case 'not_found':
      return 'No pending verification for this email. Please request a new code.';
    default:
      return 'Invalid verification code. Please try again.';
  }
};

// ---------------------------------------------------------------------------
// Signup OTP
// ---------------------------------------------------------------------------

// POST /auth/send-otp  { email, purpose: 'signup' }
const sendSignupOtp = async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  if (!isAllowedEmailDomain(email)) {
    return res.status(400).json({
      error: 'Email must be a company address (@barbizonfashion.com, @everydayproductscorp.com, or @everydayproductscorp.net)'
    });
  }

  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const result = await issueOtp(email, 'signup');
    if (result.throttled) {
      return res.status(429).json({ error: 'Please wait before requesting another code' });
    }

    try {
      const { html, text } = buildOtpEmail({
        recipientName: name || '',
        otp: result.otp,
        purpose: 'signup',
        expiryMinutes: OTP_EXPIRY_MINUTES
      });
      await sendMail({
        to: email,
        subject: '🔐 Verify your email',
        html,
        text
      });
    } catch (emailErr) {
      console.error('Failed to send signup OTP email:', emailErr);
      return res.status(502).json({ error: 'Failed to send verification email. Please try again.' });
    }

    res.json({ message: 'Verification code sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /auth/register  { name, email, password, role, department, businessUnit, otp }
const register = async (req, res) => {
  const { name, email, password, role, department, businessUnit, otp } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  if (!otp) return res.status(400).json({ error: 'Verification code required' });

  if (!isAllowedEmailDomain(email)) {
    return res.status(400).json({
      error: 'Email must be a company address (@barbizonfashion.com, @everydayproductscorp.com, or @everydayproductscorp.net)'
    });
  }

  try {
    const verification = await verifyOtp(email, 'signup', otp);
    if (!verification.valid) {
      return res.status(400).json({ error: otpFailureMessage(verification.reason) });
    }

    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length) return res.status(409).json({ error: 'user exists' });

    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      'INSERT INTO users (name,email,password,role,department,business_unit) VALUES (?,?,?,?,?,?)',
      [name || '', email, hash, role || 'employee', department || null, businessUnit || null]
    );

    try {
      const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:3021'}/login`;
      const { html, text } = buildWelcomeEmail({ recipientName: name || 'there', loginLink });
      await sendMail({ to: email, subject: 'Welcome!', html, text });
    } catch (emailErr) {
      console.warn('Welcome email failed to send:', emailErr.message);
      // Registration already succeeded — don't fail the request over this.
    }

    res.json({ id: r.insertId, email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
};

// ---------------------------------------------------------------------------
// Login (unchanged)
// ---------------------------------------------------------------------------

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  try {
    const [rows] = await pool.query('SELECT id,name,email,password,department,role,business_unit,payroll_account,gcash_number,gcash_name,is_active FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'No account found with this email address' });
    const user = rows[0];

    if (!user.is_active) {
      try {
        await logAudit({
          userId: user.id,
          action: 'login_failed',
          entity: 'users',
          entityId: user.id,
          details: { email: user.email, reason: 'account_deactivated' },
          ip: getIp(req)
        });
      } catch (logErr) {
        console.warn('Audit log failure for login_failed (deactivated)', logErr.message);
      }
      return res.status(403).json({ error: 'This account has been deactivated. Please contact your administrator.' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      try {
        await logAudit({
          userId: user.id,
          action: 'login_failed',
          entity: 'users',
          entityId: user.id,
          details: { email: user.email, reason: 'incorrect_password' },
          ip: getIp(req)
        });
      } catch (logErr) {
        console.warn('Audit log failure for login_failed', logErr.message);
      }
      return res.status(401).json({ error: 'Incorrect password. Please try again' });
    }

    // Check if user is an approver
    const [approverRows] = await pool.query('SELECT id FROM approver WHERE email = ?', [email]);
    const isApprover = approverRows.length > 0;

    const token = jwt.sign({ 
      id: user.id, 
      email: user.email, 
      name: user.name,
      role: user.role,
      department:    user.department    || null,
      isApprover:    isApprover, }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '8h' });
    await logAudit({
      userId: user.id,
      action: 'login',
      entity: 'users',
      entityId: user.id,
      details: { email: user.email, success: true },
      department:    user.department, 
      ip: getIp(req)
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        role: user.role,
        business_unit: user.business_unit,
        payroll_account: user.payroll_account,
        gcash_number: user.gcash_number,
        gcash_name: user.gcash_name,
        isApprover: isApprover
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error. Please try again later' });
  }
};

// ---------------------------------------------------------------------------
// Forgot password — OTP based (replaces the old reset-token/email-link flow)
// ---------------------------------------------------------------------------

// POST /auth/forgot-password/send-otp  { email }
const sendForgotPasswordOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const [rows] = await pool.query('SELECT id, name FROM users WHERE email = ?', [email]);
    if (!rows.length) {
      return res.status(404).json({ error: 'No account found with this email address' });
    }

    const result = await issueOtp(email, 'reset');
    if (result.throttled) {
      return res.status(429).json({ error: 'Please wait before requesting another code' });
    }

    try {
      const { html, text } = buildOtpEmail({
        recipientName: rows[0].name || 'there',
        otp: result.otp,
        purpose: 'reset',
        expiryMinutes: OTP_EXPIRY_MINUTES
      });
      await sendMail({
        to: email,
        subject: '🔐 Password Reset Code',
        html,
        text
      });
    } catch (emailErr) {
      console.error('Failed to send password reset OTP email:', emailErr);
      return res.status(502).json({ error: 'Failed to send verification email. Please try again.' });
    }

    res.json({ message: 'Verification code sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /auth/forgot-password/verify-otp  { email, otp, password }
const verifyForgotPasswordOtp = async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) {
    return res.status(400).json({ error: 'Email, code, and new password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    const verification = await verifyOtp(email, 'reset', otp);
    if (!verification.valid) {
      return res.status(400).json({ error: otpFailureMessage(verification.reason) });
    }

    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (!rows.length) {
      // Shouldn't normally happen since send-otp checked existence, but guard anyway.
      return res.status(400).json({ error: 'Invalid or expired code' });
    }
    const user = rows[0];

    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, user.id]);

    await logAudit({
      userId: user.id,
      action: 'password_reset',
      entity: 'users',
      entityId: user.id,
      details: { method: 'otp' },
      ip: getIp(req)
    });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// Profile (unchanged)
// ---------------------------------------------------------------------------

const getProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, department, role, business_unit, payroll_account, gcash_number, gcash_name FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const user = rows[0];
    // Check if user is an approver
    const [approverRows] = await pool.query('SELECT id FROM approver WHERE email = ?', [user.email]);
    user.isApprover = approverRows.length > 0;

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  const { payroll_account, gcash_number, gcash_name } = req.body;
  try {
    // Fetch the CURRENT values before overwriting them — this is the only way
    // to know afterward whether the payout destination actually changed.
    const [beforeRows] = await pool.query(
      'SELECT payroll_account, gcash_number, gcash_name FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!beforeRows.length) return res.status(404).json({ error: 'User not found' });
    const before = beforeRows[0];

    await pool.query(
      'UPDATE users SET payroll_account = ?, gcash_number = ?, gcash_name = ? WHERE id = ?',
      [payroll_account || null, gcash_number || null, gcash_name || null, req.user.id]
    );

    // Return updated user
    const [rows] = await pool.query(
      `SELECT id, name, email, role, business_unit,
              department,
              payroll_account, gcash_number, gcash_name
      FROM users WHERE id = ?`,
      [req.user.id]
    );

    const user = rows[0];
    const [approverRows] = await pool.query('SELECT id FROM approver WHERE email = ?', [user.email]);
    user.isApprover = approverRows.length > 0;

    // Only log when the payout destination actually changed — this is the
    // event that matters (money gets redirected), not every profile save.
    const payoutChanged =
      (payroll_account || null) !== before.payroll_account ||
      (gcash_number || null) !== before.gcash_number;

    if (payoutChanged) {
      await logAudit({
        userId: req.user.id,
        action: 'payout_details_updated',
        entity: 'users',
        entityId: req.user.id,
        details: {
          oldGcash: before.gcash_number,
          newGcash: gcash_number || null,
          oldPayroll: before.payroll_account,
          newPayroll: payroll_account || null
        },
        ip: getIp(req)
      });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  register,
  login,
  sendSignupOtp,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  getProfile,
  updateProfile
};