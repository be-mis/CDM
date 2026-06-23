const pool = require('../config/db');

/**
 * Disbursements Controller
 * Handles fetching and processing approved requests ready for fund release
 * by Accounting.
 *
 * NOTE: All three tables use plural names: cash_advances, liquidations, reimbursements.
 */

// ─── GET all approved requests pending disbursement / release ────────────────
const getPendingDisbursements = async (req, res) => {
  try {
    // Cash Advances
    const [cashAdvances] = await pool.query(
      `SELECT ca.*, d.name AS department_name,
              COALESCE(
                (SELECT SUM(total_amount)
                 FROM cash_advance_breakdown
                 WHERE cash_advance_id = ca.id),
                ca.requested_amount
              ) AS calculated_amount
       FROM cash_advances ca
       JOIN departments d ON ca.department_id = d.id
       WHERE ca.status IN ('approved', 'released', 'rejected')
       ORDER BY ca.created_at DESC`,
    );

    // Liquidations
    const [liquidations] = await pool.query(
      `SELECT l.*, d.name AS department_name,
              ca.advance_number AS cash_advance_number
       FROM liquidations l
       JOIN departments d ON l.department_id = d.id
       LEFT JOIN cash_advances ca ON l.cash_advance_id = ca.id
       WHERE l.status IN ('approved', 'released', 'rejected')
       ORDER BY l.created_at DESC`,
    );

    // Reimbursements
    const [reimbursements] = await pool.query(
      `SELECT r.*, d.name AS department_name
       FROM reimbursements r
       JOIN departments d ON r.department_id = d.id
       WHERE r.status IN ('approved', 'released', 'rejected')
       ORDER BY r.created_at DESC`,
    );

    return res.status(200).json({
      success: true,
      data: { cashAdvances, liquidations, reimbursements },
    });
  } catch (error) {
    console.error('Error fetching pending disbursements:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching pending disbursements',
      error: error.message,
    });
  }
};

// ─── POST  process disbursement (release or reject) ──────────────────────────
const processDisbursement = async (req, res) => {
  const { type, id, action, remarks } = req.body; // action: 'release' | 'reject'
  const userName = req.user?.name;

  if (!['release', 'reject'].includes(action)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid action. Must be "release" or "reject".',
    });
  }

  // Map request type → table name
  const tableMap = {
    'cash-advance':   'cash_advances',
    'liquidation':    'liquidations',
    'reimbursement':  'reimbursements',
  };

  const tableName = tableMap[type];
  if (!tableName) {
    return res.status(400).json({ success: false, message: 'Invalid request type' });
  }

  try {
    // Verify record exists and is approved
    const [request] = await pool.query(
      `SELECT id, status FROM \`${tableName}\` WHERE id = ? LIMIT 1`,
      [id],
    );
    if (request.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    if (request[0].status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Request must be in "approved" status before processing',
      });
    }

    const newStatus = action === 'release' ? 'released' : 'rejected';

    await pool.query(
      `UPDATE \`${tableName}\`
       SET status          = ?,
           released_by     = ?,
           released_at     = NOW(),
           release_remarks = ?
       WHERE id = ?`,
      [newStatus, userName, remarks || null, id],
    );

    const successMsg =
      action === 'release' ? 'Funds released successfully' : 'Request rejected successfully';

    return res.status(200).json({ success: true, message: successMsg });
  } catch (error) {
    console.error('Error processing disbursement:', error);
    return res.status(500).json({
      success: false,
      message: 'Error processing disbursement',
      error: error.message,
    });
  }
};

module.exports = {
  getPendingDisbursements,
  processDisbursement,
};