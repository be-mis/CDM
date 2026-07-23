const pool = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

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

// ─── GET Accounting Revolving Fund info ───────────────────────────────────────
// Always resolves by funding_code (default 'ARF'), NOT by department — unlike
// Approvals' revolving fund lookup, Accounting releases funds for every
// department, not just its own.
// GET /disbursements/revolving-fund?funding_code=ARF
const getRevolvingFund = async (req, res) => {
  try {
    const fundingCode = (req.query.funding_code || 'ARF').toUpperCase();
    const [rows] = await pool.query(
      `SELECT id, department, funding_code, funding_description, Amount
       FROM revolving_funds
       WHERE funding_code = ?`,
      [fundingCode],
    );

    return res.status(200).json({
      success: true,
      data: rows.length > 0 ? rows[0] : null,
    });
  } catch (error) {
    console.error('Error fetching accounting revolving fund:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching revolving fund',
      error: error.message,
    });
  }
};

// Which request types can be funded from the Accounting Revolving Fund at
// release time, and which column holds their own reference number — matches
// revolving_funds_history.transaction_number. Liquidations are excluded, same
// as at approval time (they aren't in revolving_funds_history's enum). Cash
// advances are also excluded — revolving funds may only be used for
// reimbursements.
const REVOLVING_FUND_ELIGIBLE_TYPES = {
  'reimbursement': { transactionType: 'reimbursement', numberColumn: 'reimbursement_number' },
};

// ─── POST  process disbursement (release or reject) ──────────────────────────
const processDisbursement = async (req, res) => {
  const { type, id, action, remarks, useRevolvingFund } = req.body; // action: 'release' | 'reject'
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

  // cash_advances uses requested_amount; liquidations/reimbursements use total_actual_amount
  const amountColumn = tableName === 'cash_advances' ? 'requested_amount' : 'total_actual_amount';

  try {
    // Verify record exists and is approved — also grab the amount, funding_code
    // (to know if a revolving fund already covered this at approval time), and
    // this request's own reference number (needed for revolving_funds_history).
    const eligibility = REVOLVING_FUND_ELIGIBLE_TYPES[type];
    const numberColumn = eligibility ? eligibility.numberColumn : null;
    const [request] = await pool.query(
      `SELECT id, status, department_id, ${amountColumn} AS amount${eligibility ? `, funding_code` : ''}${numberColumn ? `, ${numberColumn} AS transaction_number` : ''}${type === 'liquidation' ? ', cash_advance_id' : ''} FROM \`${tableName}\` WHERE id = ? LIMIT 1`,
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

    // Release remarks go to release_remarks; rejection remarks overwrite reject_remarks
    const remarksColumn = action === 'reject' ? 'reject_remarks' : 'release_remarks';

    const wantsRevolvingFund = action === 'release' && (useRevolvingFund === true || useRevolvingFund === 'true');

    if (wantsRevolvingFund) {
      if (!eligibility) {
        return res.status(400).json({
          success: false,
          message: 'This request type cannot be funded from a revolving fund',
        });
      }
      if (request[0].funding_code) {
        return res.status(400).json({
          success: false,
          message: `Request is already funded via ${request[0].funding_code}`,
        });
      }

      const [fundRows] = await pool.query(
        `SELECT id, Amount, funding_code, funding_description FROM revolving_funds WHERE funding_code = 'ARF' FOR UPDATE`,
      );
      if (fundRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Accounting Revolving Fund is not configured',
        });
      }

      const fund = fundRows[0];
      const fundBalance = parseFloat(fund.Amount);
      const amountNeeded = parseFloat(request[0].amount);

      if (fundBalance < amountNeeded) {
        return res.status(400).json({
          success: false,
          message: 'Fund is not enough to cover the total amount requested',
          remainingFund: fundBalance,
        });
      }

      const balanceAfter = fundBalance - amountNeeded;
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        await connection.query(
          `UPDATE \`${tableName}\`
           SET status = ?, released_by = ?, released_at = NOW(), \`${remarksColumn}\` = ?, funding_code = ?
           WHERE id = ?`,
          [newStatus, userName, remarks || null, fund.funding_code, id],
        );

        await connection.query(
          `UPDATE revolving_funds SET Amount = ? WHERE id = ?`,
          [balanceAfter, fund.id],
        );

        // Reimbursement is the only revolving-fund-eligible type at release,
        // and it's fully settled the moment it's released (no further step
        // exists), so its deducted row is recorded as settled immediately.
        const initialRemarks = 'settled';

        await connection.query(
          `INSERT INTO revolving_funds_history
             (transaction_type, transaction_id, transaction_number, revolving_fund_id, funding_code, total_amount, deducted_amount, balance_before, balance_after, approver_id, remarks, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            eligibility.transactionType,
            id,
            request[0].transaction_number || null,
            fund.id,
            fund.funding_code,
            amountNeeded,
            amountNeeded,
            fundBalance,
            balanceAfter,
            req.user.id,
            initialRemarks,
          ],
        );

        await connection.commit();
      } catch (txError) {
        await connection.rollback();
        throw txError;
      } finally {
        connection.release();
      }
    } else if (action === 'reject' && eligibility && request[0].funding_code) {
      // This request was already funded from a revolving fund at approval
      // time (funding_code is set), so rejecting it now must reverse that
      // deduction — the money never actually went out.
      const [fundRows] = await pool.query(
        `SELECT id, Amount FROM revolving_funds WHERE funding_code = ? FOR UPDATE`,
        [request[0].funding_code],
      );
      if (fundRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Revolving fund ${request[0].funding_code} not found; cannot reverse its deduction.`,
        });
      }

      const fund = fundRows[0];
      const refundAmount = parseFloat(request[0].amount);
      const balanceBefore = parseFloat(fund.Amount);
      const balanceAfter = balanceBefore + refundAmount;

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        await connection.query(
          `UPDATE \`${tableName}\`
           SET status          = ?,
               released_by     = ?,
               released_at     = NOW(),
               \`${remarksColumn}\` = ?
           WHERE id = ?`,
          [newStatus, userName, remarks || null, id],
        );

        await connection.query(
          `UPDATE revolving_funds SET Amount = ? WHERE id = ?`,
          [balanceAfter, fund.id],
        );

        // The original deducted row for this request now reflects the
        // rejection directly — no longer computed on read.
        await connection.query(
          `UPDATE revolving_funds_history SET remarks = 'rejected'
           WHERE transaction_type = ? AND transaction_id = ?`,
          [eligibility.transactionType, id],
        );

        // transaction_type stays the ORIGIN request type (cash_advance /
        // reimbursement) — not a literal 'refund' — so this row stays
        // grouped with the rest of that request's history and so it's a
        // valid value for the transaction_type ENUM (which has no 'refund'
        // member). remarks='refunded' is what actually marks this row as
        // the refund, and replenish_amount is what carries the credit.
        await connection.query(
          `INSERT INTO revolving_funds_history
             (transaction_type, transaction_id, transaction_number, revolving_fund_id, funding_code, total_amount, replenish_amount, balance_before, balance_after, approver_id, remarks, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'refunded', NOW())`,
          [
            eligibility.transactionType,
            id,
            request[0].transaction_number || null,
            fund.id,
            request[0].funding_code,
            refundAmount,
            refundAmount,
            balanceBefore,
            balanceAfter,
            req.user.id,
          ],
        );

        await connection.commit();
      } catch (txError) {
        await connection.rollback();
        throw txError;
      } finally {
        connection.release();
      }
    } else {
      // NOTE: this UPDATE was previously duplicated (ran twice back to back) — removed the extra copy
      await pool.query(
        `UPDATE \`${tableName}\`
         SET status          = ?,
             released_by     = ?,
             released_at     = NOW(),
             \`${remarksColumn}\` = ?
         WHERE id = ?`,
        [newStatus, userName, remarks || null, id],
      );

      if (type === 'cash-advance' && action === 'release') {
        await pool.query(
          `UPDATE cash_advances
           SET liquidation_deadline = COALESCE(liquidation_deadline, DATE_ADD(NOW(), INTERVAL 3 DAY))
           WHERE id = ?`,
          [id],
        );
      }

      // A reimbursement is settled the moment it's released — if it was
      // funded from a revolving fund earlier (at approval), mark that
      // deducted history row as Settled now.
      if (type === 'reimbursement' && action === 'release') {
        // Scoped to remarks = 'not settled' so this only ever touches the
        // single currently-open deduction row for this request. Without
        // that condition, a request that had already been funded, rejected
        // (creating a 'refunded' row), and re-funded would have THIS update
        // also flip that old 'refunded' row back to 'settled'.
        await pool.query(
          `UPDATE revolving_funds_history SET remarks = 'settled'
           WHERE transaction_type = 'reimbursement' AND transaction_id = ? AND remarks = 'not settled'`,
          [id],
        );
      }

      // LEGACY CLEANUP ONLY: cash advances are no longer revolving-fund
      // eligible (see REVOLVING_FUND_ELIGIBLE_TYPES above), so no NEW
      // 'not settled' cash_advance row can ever be created going forward.
      // This block only matters for cash advances that were funded from a
      // revolving fund before that policy change and are still awaiting
      // liquidation — it settles their existing history row so they don't
      // stay open forever. Once those are all cleared, this is a no-op.
      if (type === 'liquidation' && action === 'release' && request[0].cash_advance_id) {
        // Same scoping as the reimbursement case above — only the currently
        // open ('not settled') deduction row for this cash advance should
        // flip to 'settled'; a prior 'refunded' row for the same
        // transaction_id must not be touched.
        await pool.query(
          `UPDATE revolving_funds_history SET remarks = 'settled'
           WHERE transaction_type = 'cash_advance' AND transaction_id = ? AND remarks = 'not settled'`,
          [request[0].cash_advance_id],
        );
      }
    }

    await logAudit({
      userId: req.user?.id || null,
      action: `${type}_${newStatus}`, // e.g. cash-advance_released
      entity: tableName,
      entityId: id,
      details: { amount: request[0].amount, remarks: remarks || null, usedRevolvingFund: wantsRevolvingFund },
      ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
    });

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
  getRevolvingFund,
};