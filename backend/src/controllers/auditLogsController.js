const pool = require('../config/db');

/**
 * Audit Logs Controller
 * Provides read-only access to the audit_logs table for admin users.
 * Supports filtering by action, entity, user, date range, and free-text search.
 * Results are paginated.
 */

// GET /api/audit-logs
const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      entity,
      userId,
      search,
      startDate,
      endDate,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    // Whitelist sort columns
    const allowedSortColumns = ['created_at', 'action', 'entity', 'user_id'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let whereClauses = [];
    let params = [];

    // Filter by action
    if (action) {
      whereClauses.push('al.action = ?');
      params.push(action);
    }

    // Filter by entity
    if (entity) {
      whereClauses.push('al.entity = ?');
      params.push(entity);
    }

    // Filter by user
    if (userId) {
      whereClauses.push('al.user_id = ?');
      params.push(userId);
    }

    // Filter by date range
    if (startDate) {
      whereClauses.push('al.created_at >= ?');
      params.push(startDate + ' 00:00:00');
    }
    if (endDate) {
      whereClauses.push('al.created_at <= ?');
      params.push(endDate + ' 23:59:59');
    }

    // Free-text search across action, entity, entity_id, details, user name/email
    if (search) {
      whereClauses.push(`(
        al.action LIKE ? OR
        al.entity LIKE ? OR
        al.entity_id LIKE ? OR
        al.details LIKE ? OR
        u.name LIKE ? OR
        u.email LIKE ?
      )`);
      const s = `%${search}%`;
      params.push(s, s, s, s, s, s);
    }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Count total matching rows
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereSQL}`,
      params
    );
    const total = countResult[0].total;

    // Fetch paginated results
    const [rows] = await pool.query(
      `SELECT
         al.id,
         al.user_id,
         u.name AS user_name,
         u.email AS user_email,
         al.action,
         al.entity,
         al.entity_id,
         al.details,
         al.ip,
         al.created_at
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereSQL}
       ORDER BY al.${safeSortBy} ${safeSortOrder}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit logs',
      error: error.message
    });
  }
};

// GET /api/audit-logs/filters — returns distinct actions and entities for filter dropdowns
const getAuditLogFilters = async (req, res) => {
  try {
    const [actions] = await pool.query(
      'SELECT DISTINCT action FROM audit_logs WHERE action IS NOT NULL ORDER BY action'
    );
    const [entities] = await pool.query(
      'SELECT DISTINCT entity FROM audit_logs WHERE entity IS NOT NULL ORDER BY entity'
    );
    const [users] = await pool.query(
      `SELECT DISTINCT al.user_id, u.name AS user_name, u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.user_id IS NOT NULL
       ORDER BY u.name`
    );

    res.status(200).json({
      success: true,
      data: {
        actions: actions.map(r => r.action),
        entities: entities.map(r => r.entity),
        users: users.map(r => ({
          id: r.user_id,
          name: r.user_name || r.user_email || `User #${r.user_id}`
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching audit log filters:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit log filters',
      error: error.message
    });
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogFilters
};
