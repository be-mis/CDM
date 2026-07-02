const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { logAudit } = require('../utils/auditLogger');

/**
 * Users Controller
 * Full CRUD for user accounts. isApprover is not a column on `users` —
 * approver status is tracked in a separate `approver` table keyed by
 * (email, department), matching the pattern used in authController /
 * approvalsController. Toggling isApprover here keeps that table in sync.
 */

const ROLES = ['employee', 'manager', 'accounting', 'admin'];

const getIp = (req) =>
  req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;

// GET /api/users
const getUsers = async (req, res) => {
  try {
    const { search, role, department } = req.query;

    let whereClauses = [];
    let params = [];

    if (search) {
      whereClauses.push('(u.name LIKE ? OR u.email LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s);
    }
    if (role) {
      whereClauses.push('u.role = ?');
      params.push(role);
    }
    if (department) {
      whereClauses.push('u.department = ?');
      params.push(department);
    }

    const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.business_unit,
              EXISTS(SELECT 1 FROM approver a WHERE a.email = u.email COLLATE utf8mb4_general_ci) AS isApprover
       FROM users u
       ${whereSQL}
       ORDER BY u.name ASC`,
      params
    );

    res.status(200).json({
      success: true,
      data: rows.map(r => ({ ...r, isApprover: !!r.isApprover }))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
  }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.business_unit,
              EXISTS(SELECT 1 FROM approver a WHERE a.email = u.email COLLATE utf8mb4_general_ci) AS isApprover
       FROM users u WHERE u.id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, data: { ...rows[0], isApprover: !!rows[0].isApprover } });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Error fetching user', error: error.message });
  }
};

// POST /api/users
const createUser = async (req, res) => {
  const { name, email, password, role, department, businessUnit, isApprover } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
  }
  if (role && !ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: `Role must be one of: ${ROLES.join(', ')}` });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'A user with this email already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await conn.query(
      'INSERT INTO users (name, email, password, role, department, business_unit) VALUES (?,?,?,?,?,?)',
      [name, email, hash, role || 'employee', department || null, businessUnit || null]
    );

    if (isApprover) {
      if (!department) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Department is required to set a user as approver' });
      }
      await conn.query('INSERT INTO approver (name, email, department) VALUES (?, ?, ?)', [name, email, department]);
    }

    await conn.commit();

    await logAudit({
      userId: req.user?.id,
      action: 'user_created',
      entity: 'users',
      entityId: result.insertId,
      details: { name, email, role: role || 'employee', department, isApprover: !!isApprover },
      ip: getIp(req)
    });

    res.status(201).json({ success: true, message: 'User created successfully', data: { id: result.insertId } });
  } catch (error) {
    await conn.rollback();
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'Error creating user', error: error.message });
  } finally {
    conn.release();
  }
};

// PUT /api/users/:id
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, department, businessUnit, isApprover, password } = req.body;

  if (role && !ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: `Role must be one of: ${ROLES.join(', ')}` });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existingRows] = await conn.query('SELECT * FROM users WHERE id = ?', [id]);
    if (!existingRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const existingUser = existingRows[0];

    if (email && email !== existingUser.email) {
      const [dupe] = await conn.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (dupe.length) {
        await conn.rollback();
        return res.status(409).json({ success: false, message: 'A user with this email already exists' });
      }
    }

    const newEmail = email || existingUser.email;
    const newDepartment = department !== undefined ? department : existingUser.department;

    const fields = ['name = ?', 'email = ?', 'role = ?', 'department = ?', 'business_unit = ?'];
    const values = [
      name !== undefined ? name : existingUser.name,
      newEmail,
      role !== undefined ? role : existingUser.role,
      newDepartment,
      businessUnit !== undefined ? businessUnit : existingUser.business_unit
    ];

    if (password) {
      fields.push('password = ?');
      values.push(await bcrypt.hash(password, 10));
    }

    values.push(id);
    await conn.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    const newName = name !== undefined ? name : existingUser.name;

    // Keep the approver table in sync with this user's current name/email/
    // department and the requested isApprover flag (only touched if sent).
    if (isApprover !== undefined) {
      await conn.query('DELETE FROM approver WHERE email = ?', [existingUser.email]);
      if (isApprover) {
        if (!newDepartment) {
          await conn.rollback();
          return res.status(400).json({ success: false, message: 'Department is required to set a user as approver' });
        }
        await conn.query('INSERT INTO approver (name, email, department) VALUES (?, ?, ?)', [newName, newEmail, newDepartment]);
      }
    } else {
      // Approver flag wasn't touched — keep an existing approver row's
      // name/email/department in sync with whatever changed on the user.
      await conn.query(
        'UPDATE approver SET name = ?, email = ?, department = ? WHERE email = ?',
        [newName, newEmail, newDepartment, existingUser.email]
      );
    }

    await conn.commit();

    await logAudit({
      userId: req.user?.id,
      action: 'user_updated',
      entity: 'users',
      entityId: id,
      details: { name, email: newEmail, role, department: newDepartment, isApprover },
      ip: getIp(req)
    });

    res.status(200).json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    await conn.rollback();
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Error updating user', error: error.message });
  } finally {
    conn.release();
  }
};

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
  const { id } = req.params;

  if (req.user?.id && String(req.user.id) === String(id)) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT id, name, email FROM users WHERE id = ?', [id]);
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = rows[0];

    await conn.query('DELETE FROM approver WHERE email = ?', [user.email]);
    await conn.query('DELETE FROM users WHERE id = ?', [id]);

    await conn.commit();

    await logAudit({
      userId: req.user?.id,
      action: 'user_deleted',
      entity: 'users',
      entityId: id,
      details: { name: user.name, email: user.email },
      ip: getIp(req)
    });

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    await conn.rollback();
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Error deleting user', error: error.message });
  } finally {
    conn.release();
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};