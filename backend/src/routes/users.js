const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/usersController');

// Admin-only middleware (same pattern as auditLogs.js)
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// GET /api/users — list all users
router.get('/', authenticateToken, requireAdmin, getUsers);

// GET /api/users/:id — get a single user
router.get('/:id', authenticateToken, requireAdmin, getUserById);

// POST /api/users — create a user
router.post('/', authenticateToken, requireAdmin, createUser);

// PUT /api/users/:id — update a user
router.put('/:id', authenticateToken, requireAdmin, updateUser);

// DELETE /api/users/:id — delete a user
router.delete('/:id', authenticateToken, requireAdmin, deleteUser);

module.exports = router;