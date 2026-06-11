const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { getAuditLogs, getAuditLogFilters } = require('../controllers/auditLogsController');

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// GET /api/audit-logs — list audit logs (paginated, filterable)
router.get('/', authenticateToken, requireAdmin, getAuditLogs);

// GET /api/audit-logs/filters — get distinct filter values
router.get('/filters', authenticateToken, requireAdmin, getAuditLogFilters);

module.exports = router;
