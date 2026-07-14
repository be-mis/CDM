const db = require('../config/db');

// Revolving fund balances/history are financial data — restrict to
// accounting and admin, checked inline (no requireRole middleware in use here).
const isAuthorized = (req) => ['accounting', 'admin'].includes(req.user?.role);

// GET /api/revolving-funds
// Returns all revolving funds (e.g. ARF, ORF) with their current balances.
exports.getAllFunds = async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ success: false, message: 'Accounting access required.' });
  }
  try {
    const [rows] = await db.query('SELECT * FROM revolving_funds ORDER BY department');
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching revolving funds:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch revolving funds.' });
  }
};

// GET /api/revolving-funds/:id
// Returns a single revolving fund by id.
exports.getFundById = async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ success: false, message: 'Accounting access required.' });
  }
  try {
    const { id } = req.params;
    if (!Number.isInteger(Number(id))) {
      return res.status(400).json({ success: false, message: 'Invalid fund id.' });
    }

    const [rows] = await db.query('SELECT * FROM revolving_funds WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Revolving fund not found.' });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error fetching revolving fund:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch revolving fund.' });
  }
};

// GET /api/revolving-funds/history
// Returns transaction history across ALL revolving funds, most recent first.
// Each row includes the owning fund's description (funding_code is already
// denormalized on the history row itself) plus a derived `remarks` field:
//   - cash_advance: 'Settled' once its liquidation has been released,
//     otherwise 'Not Yet Settled' (including when no liquidation exists yet)
//   - reimbursement: 'Settled' once the reimbursement itself has been
//     released, otherwise 'Not Yet Settled'
//   - anything else (e.g. replenish): remarks is null (not applicable)
exports.getAllHistory = async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ success: false, message: 'Accounting access required.' });
  }
  try {
    const [rows] = await db.query(
      `SELECT h.*, u.name AS approver_name,
              f.funding_description,
              (
                SELECT liq.status FROM liquidations liq
                WHERE liq.cash_advance_id = h.transaction_id
                ORDER BY liq.created_at DESC
                LIMIT 1
              ) AS liquidation_status,
              (
                SELECT r.status FROM reimbursements r
                WHERE r.id = h.transaction_id
              ) AS reimbursement_status
       FROM revolving_funds_history h
       LEFT JOIN users u ON u.id = h.approver_id
       LEFT JOIN revolving_funds f ON f.id = h.revolving_fund_id
       ORDER BY h.created_at DESC`
    );

    const data = rows.map((row) => {
      let remarks = null;
      if (row.transaction_type === 'cash_advance') {
        remarks = row.liquidation_status === 'released' ? 'Settled' : 'Not Yet Settled';
      } else if (row.transaction_type === 'reimbursement') {
        remarks = row.reimbursement_status === 'released' ? 'Settled' : 'Not Yet Settled';
      }
      return { ...row, remarks };
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching combined revolving fund history:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch revolving fund history.' });
  }
};

// GET /api/revolving-funds/:id/history
// Returns the deduction history for a single revolving fund, most recent first.
exports.getFundHistory = async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ success: false, message: 'Accounting access required.' });
  }
  try {
    const { id } = req.params;
    if (!Number.isInteger(Number(id))) {
      return res.status(400).json({ success: false, message: 'Invalid fund id.' });
    }

    // Confirm the fund exists first so a bad id returns a clear 404
    // instead of a silently empty history list.
    const [fundRows] = await db.query('SELECT id FROM revolving_funds WHERE id = ?', [id]);
    if (fundRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Revolving fund not found.' });
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
           (revolving_fund_id, transaction_type, transaction_number, replenish_amount, balance_before, balance_after, approver_id, created_at)
         VALUES (?, 'replenish', ?, ?, ?, ?, ?, NOW())`,
        [id, transaction_number.trim(), addedAmount, balanceBefore, balanceAfter, req.user.id]
      );

      await connection.commit();
      connection.release();

      const [updatedFundRows] = await db.query('SELECT * FROM revolving_funds WHERE id = ?', [id]);

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