const db = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

// Revolving fund balances/history are financial data — restrict to
// accounting and admin, checked inline (no requireRole middleware in use here).
const isAuthorized = (req) => ['accounting', 'admin'].includes(req.user?.role);

// Operations Manager can view (but not replenish) the Operations Revolving
// Fund specifically. Other managers/departments are not included here.
const isOperationsManager = (req) =>
  req.user?.role === 'manager' && req.user?.department === 'OPERATIONS';

// Viewing is allowed for accounting/admin (all funds) or the Operations
// Manager (scoped to their own department's fund, enforced below).
const isViewAuthorized = (req) => isAuthorized(req) || isOperationsManager(req);

// GET /api/revolving-funds
// Returns all revolving funds (e.g. ARF, ORF) with their current balances.
exports.getAllFunds = async (req, res) => {
  if (!isViewAuthorized(req)) {
    return res.status(403).json({ success: false, message: 'Accounting access required.' });
  }
  try {
    // Operations Manager only sees the Operations Revolving Fund; accounting/admin see all.
    // NOTE: revolving_funds.department is a FK into departments.id, not a
    // string — must join to departments and compare on d.name.
    const rows = isAuthorized(req)
      ? (await db.query('SELECT rf.* FROM revolving_funds rf ORDER BY rf.department'))[0]
      : (await db.query(
          `SELECT rf.* FROM revolving_funds rf
           JOIN departments d ON d.id = rf.department
           WHERE UPPER(d.name) = UPPER(?)
           ORDER BY rf.department`,
          [req.user.department]
        ))[0];
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching revolving funds:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch revolving funds.' });
  }
};

// GET /api/revolving-funds/:id
// Returns a single revolving fund by id.
exports.getFundById = async (req, res) => {
  if (!isViewAuthorized(req)) {
    return res.status(403).json({ success: false, message: 'Accounting access required.' });
  }
  try {
    const { id } = req.params;
    if (!Number.isInteger(Number(id))) {
      return res.status(400).json({ success: false, message: 'Invalid fund id.' });
    }

    const [rows] = await db.query(
      `SELECT rf.*, d.name AS department_name
       FROM revolving_funds rf
       JOIN departments d ON d.id = rf.department
       WHERE rf.id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Revolving fund not found.' });
    }

    // Operations Manager can only view the Operations fund, not other departments'.
    // department is a FK id on revolving_funds, so compare against the joined
    // department name, not the raw id.
    if (!isAuthorized(req) && rows[0].department_name?.toUpperCase() !== req.user?.department?.toUpperCase()) {
      return res.status(403).json({ success: false, message: 'Accounting access required.' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching revolving fund:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch revolving fund.' });
  }
};

// GET /api/revolving-funds/history
// Returns transaction history across ALL revolving funds, most recent first.
// `remarks` is a stored column on revolving_funds_history (kept current by
// disbursementsController whenever a request is released/rejected/liquidated),
// not computed here. Standardized values (stored lowercase): 'not settled',
// 'settled', 'rejected', 'refunded', 'replenish'.
exports.getAllHistory = async (req, res) => {
  if (!isViewAuthorized(req)) {
    return res.status(403).json({ success: false, message: 'Accounting access required.' });
  }
  try {
    // Operations Manager only sees history rows belonging to the Operations fund.
    // f.department is a FK id, so scope on the joined department name.
    const scopeClause = isAuthorized(req) ? '' : 'WHERE UPPER(dep.name) = UPPER(?)';
    const scopeParams = isAuthorized(req) ? [] : [req.user.department];

    // remarks is now a stored column on revolving_funds_history, kept up to
    // date at the point each request's status actually changes (see
    // disbursementsController: release/reject/liquidation-release), so it's
    // read here as-is rather than recomputed from related tables each time.
    const [rows] = await db.query(
      `SELECT h.*, u.name AS approver_name,
              f.funding_description
       FROM revolving_funds_history h
       LEFT JOIN users u ON u.id = h.approver_id
       LEFT JOIN revolving_funds f ON f.id = h.revolving_fund_id
       LEFT JOIN departments dep ON dep.id = f.department
       ${scopeClause}
       ORDER BY h.created_at DESC`,
      scopeParams
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching combined revolving fund history:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch revolving fund history.' });
  }
};

// GET /api/revolving-funds/:id/history
// Returns the deduction history for a single revolving fund, most recent first.
exports.getFundHistory = async (req, res) => {
  if (!isViewAuthorized(req)) {
    return res.status(403).json({ success: false, message: 'Accounting access required.' });
  }
  try {
    const { id } = req.params;
    if (!Number.isInteger(Number(id))) {
      return res.status(400).json({ success: false, message: 'Invalid fund id.' });
    }

    // Confirm the fund exists first so a bad id returns a clear 404
    // instead of a silently empty history list.
    const [fundRows] = await db.query(
      `SELECT rf.id, d.name AS department_name
       FROM revolving_funds rf
       JOIN departments d ON d.id = rf.department
       WHERE rf.id = ?`,
      [id]
    );
    if (fundRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Revolving fund not found.' });
    }

    // Operations Manager can only view the Operations fund's history.
    // department is a FK id on revolving_funds, so compare against the
    // joined department name, not the raw id.
    if (!isAuthorized(req) && fundRows[0].department_name?.toUpperCase() !== req.user?.department?.toUpperCase()) {
      return res.status(403).json({ success: false, message: 'Accounting access required.' });
    }

    const [rows] = await db.query(
      `SELECT h.*, u.name AS approver_name
       FROM revolving_funds_history h
       LEFT JOIN users u ON u.id = h.approver_id
       WHERE h.revolving_fund_id = ?
       ORDER BY h.created_at DESC`,
      [id]
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching revolving fund history:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch revolving fund history.' });
  }
};

// POST /api/revolving-funds/:id/replenish
// Adds funds to a revolving fund's balance and records the transaction as a
// 'replenishment' entry in the fund's history (mirrors the deduction rows,
// but represents money added rather than money spent).
exports.replenishFund = async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ success: false, message: 'Accounting access required.' });
  }
  try {
    const { id } = req.params;
    if (!Number.isInteger(Number(id))) {
      return res.status(400).json({ success: false, message: 'Invalid fund id.' });
    }

    const { amount, transaction_number } = req.body;
    const addedAmount = parseFloat(amount);
    if (!addedAmount || addedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Replenishment amount must be greater than zero.' });
    }
    if (!transaction_number || !transaction_number.trim()) {
      return res.status(400).json({ success: false, message: 'Reference number is required.' });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Lock the fund row so concurrent replenish/deduction requests don't race.
      const [fundRows] = await connection.query(
        'SELECT * FROM revolving_funds WHERE id = ? FOR UPDATE',
        [id]
      );
      if (fundRows.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ success: false, message: 'Revolving fund not found.' });
      }

      const fund = fundRows[0];
      const balanceBefore = parseFloat(fund.Amount || 0);
      const balanceAfter = balanceBefore + addedAmount;

      await connection.query(
        'UPDATE revolving_funds SET Amount = ?, updated_at = NOW() WHERE id = ?',
        [balanceAfter, id]
      );

      const [historyResult] = await connection.query(
        `INSERT INTO revolving_funds_history
           (revolving_fund_id, funding_code, transaction_type, transaction_number, replenish_amount, balance_before, balance_after, approver_id, remarks, created_at)
         VALUES (?, ?, 'replenish', ?, ?, ?, ?, ?, 'replenish', NOW())`,
        [id, fund.funding_code, transaction_number.trim(), addedAmount, balanceBefore, balanceAfter, req.user.id]
      );

      await connection.commit();
      connection.release();

      const [updatedFundRows] = await db.query('SELECT * FROM revolving_funds WHERE id = ?', [id]);

      // Log BEFORE responding, and keep it inside the same try block so any
      // logging failure still surfaces as a 500 rather than a silent gap —
      // but never after res.json() has already been sent.
      await logAudit({
        userId: req.user?.id || null,
        action: 'revolving_fund_replenished',
        entity: 'revolving_funds',
        entityId: id,
        details: {
          amount: addedAmount,
          transactionNumber: transaction_number.trim(),
          fundingCode: fund.funding_code,
          balanceBefore,
          balanceAfter,
        },
        ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
      });

      return res.json({
        success: true,
        message: 'Fund replenished successfully.',
        data: {
          fund: updatedFundRows[0],
          historyId: historyResult.insertId,
        },
      });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (error) {
    console.error('Error replenishing revolving fund:', error);
    return res.status(500).json({ success: false, message: 'Failed to replenish revolving fund.' });
  }
};