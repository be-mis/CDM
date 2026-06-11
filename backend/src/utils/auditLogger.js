const pool = require('../config/db');

const getIp = (req) => {
  if (!req) return null;
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || null;
};

async function logAudit({ connection, userId, action, entity, entityId, details, ip }) {
  const sql = `INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip) VALUES (?, ?, ?, ?, ?, ?)`;
  const params = [
    userId || null,
    action || null,
    entity || null,
    entityId != null ? String(entityId) : null,
    details ? JSON.stringify(details) : null,
    ip || null
  ];

  if (connection) {
    return connection.query(sql, params);
  }

  return pool.query(sql, params);
}

async function logAuditFromRequest(req, { connection, action, entity, entityId, details }) {
  return logAudit({
    connection,
    userId: req.user?.id || null,
    action,
    entity,
    entityId,
    details,
    ip: getIp(req)
  });
}

module.exports = { logAudit, logAuditFromRequest };