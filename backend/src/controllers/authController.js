const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendMail } = require('../utils/mailer');
const { buildPasswordResetEmail, buildWelcomeEmail } = require('../utils/emailTemplates');
const { logAudit } = require('../utils/auditLogger');

const register = async (req, res) => {
  const { name, email, password, role, department, businessUnit } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length) return res.status(409).json({ error: 'user exists' });
    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      'INSERT INTO users (name,email,password,role,department,business_unit) VALUES (?,?,?,?,?,?)',
      [name || '', email, hash, role || 'employee', department || null, businessUnit || null]
    );
    res.json({ id: r.insertId, email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  try {
    const [rows] = await pool.query('SELECT id,name,email,password,department,role,business_unit,payroll_account,gcash_number,gcash_name FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ error: 'No account found with this email address' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      try {
        await logAudit({
          userId: user.id,
          action: 'login_failed',
          entity: 'users',
          entityId: user.id,
          details: { email: user.email, reason: 'incorrect_password' },
          ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
        });
      } catch (logErr) {
        console.warn('Audit log failure for login_failed', logErr.message);
      }
      return res.status(401).json({ error: 'Incorrect password. Please try again' });
    }

    // Check if user is an approver
    const [approverRows] = await pool.query('SELECT id FROM approver WHERE email = ?', [email]);
    const isApprover = approverRows.length > 0;

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '8h' });
    await logAudit({
      userId: user.id,
      action: 'login',
      entity: 'users',
      entityId: user.id,
      details: { email: user.email, success: true },
      ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
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

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const [rows] = await pool.query('SELECT id, email, name FROM users WHERE email = ?', [email]);
    if (!rows.length) {
      // Don't reveal if user exists
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    const user = rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, expires, user.id]
    );

    // In development: return the reset link
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3021'}/reset-password?token=${resetToken}`;

    // Send email with reset link
    try {
      const { html, text } = buildPasswordResetEmail({
        recipientName: rows[0].name || 'User',
        resetLink
      });

      await sendMail({
        to: email,
        subject: '🔐 Password Reset Request',
        html,
        text
      });
      console.log(`Password reset email sent to ${email}`);
    } catch (emailErr) {
      console.error('Failed to send reset email:', emailErr);
      // Continue anyway - don't reveal if email sending failed
    }

    res.json({
      message: 'Password reset link sent',
      resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

  try {
    const [rows] = await pool.query(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (!rows.length) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const user = rows[0];
    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hash, user.id]
    );

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, department, role, business_unit, payroll_account, gcash_number, gcash_name FROM users WHERE id = ?',
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
    await pool.query(
      'UPDATE users SET payroll_account = ?, gcash_number = ?, gcash_name = ? WHERE id = ?',
      [payroll_account || null, gcash_number || null, gcash_name || null, req.user.id]
    );

    // Return updated user
    const [rows] = await pool.query(
      'SELECT id, name, email, department, role, business_unit, payroll_account, gcash_number, gcash_name FROM users WHERE id = ?',
      [req.user.id]
    );

    const user = rows[0];
    const [approverRows] = await pool.query('SELECT id FROM approver WHERE email = ?', [user.email]);
    user.isApprover = approverRows.length > 0;

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { register, login, forgotPassword, resetPassword, getProfile, updateProfile };
