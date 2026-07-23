const pool = require('../config/db');

// Helpers
const generateReimbursementNumber = () => {
  const d     = new Date();
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const rand  = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RMB-${year}${month}-${rand}`;
};

// Look up department_id from the departments table using a name or id
const resolveDepartmentId = async (conn, department) => {
  if (!department) return null;

  // If it's already a number, verify it exists and return it
  if (!isNaN(Number(department)) && Number(department) > 0) {
    const [rows] = await conn.query(
      `SELECT id FROM departments WHERE id = ? LIMIT 1`,
      [Number(department)]
    );
    return rows.length > 0 ? rows[0].id : null;
  }

  // Otherwise treat it as a name string and look up the id
  const [rows] = await conn.query(
    `SELECT id FROM departments WHERE name = ? LIMIT 1`,
    [department]
  );
  return rows.length > 0 ? rows[0].id : null;
};

// A reimbursement submitted by an approver auto-approves on submit (see
// ReimbursementForm.js's `isApprover`/`autoApprove`), skipping the Approvals
// queue entirely. Only Operations approvers may additionally choose to fund
// that self-approved request from the Operations Revolving Fund — this is
// intentionally NOT a generic "any approver, any department" rule.
const isOperationsApprover = (user) => {
  const role = (user?.role || '').toLowerCase();
  const isApprover = role.includes('approver') || role.includes('manager') || !!user?.is_approver;
  return isApprover && (user?.department || '').toUpperCase() === 'OPERATIONS';
};

// Locks the Operations Revolving Fund row, verifies it can cover
// `amountNeeded`, and returns { fund, fundBalance } for the caller to apply
// the deduction with. Throws (via a thrown {status, message} object) on any
// failure so callers can rollback and respond in one place.
const lockAndCheckOperationsFund = async (conn, amountNeeded) => {
  const [fundRows] = await conn.query(
    `SELECT rf.id, rf.Amount, rf.funding_code
     FROM revolving_funds rf
     JOIN departments d ON d.id = rf.department
     WHERE UPPER(d.name) = 'OPERATIONS'
     FOR UPDATE`
  );
  if (fundRows.length === 0) {
    throw { status: 400, message: 'No revolving fund is configured for the Operations department.' };
  }
  const fund = fundRows[0];
  const fundBalance = parseFloat(fund.Amount);
  if (fundBalance < amountNeeded) {
    throw {
      status: 400,
      message: 'Fund is not enough to cover the total amount requested',
      remainingFund: fundBalance,
    };
  }
  return { fund, fundBalance };
};

/**
 * Insert a single receipt row into reimbursement_receipts.
 * Returns the new row's insertId.
 */
const insertReceipt = async (conn, reimbursementId, file, sourceType, userId) => {
  const [result] = await conn.query(
    `INSERT INTO reimbursement_receipts
       (reimbursement_id, file_name, file_path, file_type, file_size,
        source_type, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      reimbursementId,
      file.fileName || file.name || null,
      file.filePath || file.path || null,
      file.fileType || file.type || null,
      file.fileSize || file.size || null,
      sourceType,
      userId || null,
    ],
  );
  return result.insertId;
};

/**
 * Insert all expense rows for a reimbursement.
 */
const insertExpenses = async (conn, reimbursementId, items, userId) => {
  for (const item of items) {
    let receiptId = null;

    if (item.attachments?.length > 0) {
      const att = item.attachments[0];
      if (att?.filePath) {
        if (att.id) {
          receiptId = att.id;
        } else {
          receiptId = await insertReceipt(conn, reimbursementId, att, 'expense', userId);
        }
      }
    }

    await conn.query(
      `INSERT INTO reimbursement_expenses
         (reimbursement_id, expense_date, particular, actual_amount,
          receipt_id, receipt_number, tin, vendor_name, vat_type,
          address, vatable_sales, vat_amount, zero_rated_sales, vat_exempt_sales)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reimbursementId,
        item.expenseDate    || null,
        item.description    || '',
        parseFloat(item.amount)         || 0,
        receiptId,
        item.receiptNumber  || '',
        item.tin            || null,
        item.vendor         || null,
        item.vatType        || 'NonVAT',
        item.address        || null,
        parseFloat(item.vatable)        || 0,
        parseFloat(item.vatAmount)      || 0,
        parseFloat(item.zeroRatedSales) || 0,
        parseFloat(item.vatExemptSales) || 0,
      ],
    );
  }
};

/**
 * Insert all itinerary rows for a reimbursement.
 */
const insertItinerary = async (conn, reimbursementId, transportation, userId) => {
  for (const t of transportation) {
    let receiptId = null;

    if (t.receipt?.filePath) {
      if (t.receipt.id) {
        receiptId = t.receipt.id;
      } else {
        receiptId = await insertReceipt(conn, reimbursementId, t.receipt, 'itinerary', userId);
      }
    }

    await conn.query(
      `INSERT INTO reimbursement_itinerary
         (reimbursement_id, travel_date, store_name, amount,
          receipt_id, transport_from, transport_to, transport_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reimbursementId,
        t.dateCovered      || null,
        t.store            || '',
        parseFloat(t.amount) || 0,
        receiptId,
        t.fromLocation     || null,
        t.toLocation       || null,
        t.modeOfTransport  || null,
      ],
    );
  }
};

// POST /reimbursements
const createReimbursement = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      reimbursementNumber,
      reimbursementDate,
      requestedBy,
      department,
      businessUnit,
      dateNeeded,
      purpose,
      dateCoverageFrom,
      dateCoverageTo,
      totalAmount,
      paymentMethod,
      gcashName,
      accountNumber,
      remarks,
      status = 'draft',
      items          = [],
      transportation = [],
      useRevolvingFund,
    } = req.body;

    const userId    = req.user?.id    || null;
    const createdBy = req.user?.email || req.user?.name || null;
    const finalReimbursementNumber = reimbursementNumber || generateReimbursementNumber();
    const amountNeeded = parseFloat(totalAmount) || 0;

    // Only relevant on the auto-approve path (status arrives already
    // 'approved' — see ReimbursementForm.js/autoApprove). Regular pending
    // submissions go through the normal Approvals queue, where ORF funding
    // is handled by approvalsController.js instead.
    const wantsRevolvingFund = status === 'approved' && (useRevolvingFund === true || useRevolvingFund === 'true');

    let fundingCode = 'RD';
    let fund = null;
    let fundBalance = null;

    if (wantsRevolvingFund) {
      if (!isOperationsApprover(req.user)) {
        await conn.rollback();
        return res.status(403).json({
          success: false,
          message: 'Only Operations approvers may fund a self-approved reimbursement from the Operations Revolving Fund.',
        });
      }
      try {
        ({ fund, fundBalance } = await lockAndCheckOperationsFund(conn, amountNeeded));
      } catch (fundErr) {
        await conn.rollback();
        return res.status(fundErr.status || 500).json({
          success: false,
          message: fundErr.message || 'Failed to verify Operations Revolving Fund balance.',
          ...(fundErr.remainingFund !== undefined ? { remainingFund: fundErr.remainingFund } : {}),
        });
      }
      fundingCode = fund.funding_code;
    }

    // Resolve department name → department_id
    const resolvedDepartmentId = await resolveDepartmentId(conn, department);

    const [headerResult] = await conn.query(
      `INSERT INTO reimbursements
        (reimbursement_number, reimbursement_date, start_date, end_date,
          submitted_by, department_id, business_unit, date_needed,
          purpose,
          total_actual_amount, payment_method, gcash_name, account_number,
          remarks, status, created_by, funding_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
        finalReimbursementNumber,
        reimbursementDate   || new Date().toISOString().split('T')[0],
        dateCoverageFrom    || null,
        dateCoverageTo      || null,
        requestedBy         || createdBy,
        resolvedDepartmentId,
        businessUnit        || null,
        dateNeeded          || null,
        purpose             || null,
        amountNeeded,
        paymentMethod       || null,
        gcashName           || null,
        accountNumber       || null,
        remarks             || null,
        status,
        createdBy,
        fundingCode,
      ],
    );

    const reimbursementId = headerResult.insertId;
    if (!reimbursementId || reimbursementId === 0) {
      await conn.rollback();
      return res.status(500).json({ success: false, message: 'Failed to create reimbursement — no ID returned from database' });
    }

    if (wantsRevolvingFund) {
      const balanceAfter = fundBalance - amountNeeded;
      await conn.query(`UPDATE revolving_funds SET Amount = ? WHERE id = ?`, [balanceAfter, fund.id]);
      await conn.query(
        `INSERT INTO revolving_funds_history
           (transaction_type, transaction_id, transaction_number, revolving_fund_id, funding_code, total_amount, deducted_amount, balance_before, balance_after, approver_id, remarks, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not settled', NOW())`,
        [
          'reimbursement',
          reimbursementId,
          finalReimbursementNumber,
          fund.id,
          fund.funding_code,
          amountNeeded,
          amountNeeded,
          fundBalance,
          balanceAfter,
          req.user.id,
        ],
      );
    }

    await insertExpenses(conn, reimbursementId, items, userId);
    await insertItinerary(conn, reimbursementId, transportation, userId);

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: 'Reimbursement created successfully',
      data: { id: reimbursementId },
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error creating reimbursement:', err);
    return res.status(500).json({
      success: false,
      message: 'Error creating reimbursement',
      error: err.message,
    });
  } finally {
    conn.release();
  }
};

// PUT /reimbursements/:id
const updateReimbursement = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const reimbursementId = req.params.id;

    if (!reimbursementId || isNaN(Number(reimbursementId)) || Number(reimbursementId) === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Invalid reimbursement ID' });
    }

    const {
      reimbursementDate,
      department,
      businessUnit,
      dateNeeded,
      purpose,
      dateCoverageFrom,
      dateCoverageTo,
      totalAmount,
      paymentMethod,
      gcashName,
      accountNumber,
      remarks,
      status = 'draft',
      items          = [],
      transportation = [],
      useRevolvingFund,
      edit_reason,
    } = req.body;

    const userId = req.user?.id || null;
    const amountNeeded = parseFloat(totalAmount) || 0;

    // Verify the record exists
    const [existing] = await conn.query(
      `SELECT id, status, funding_code, reimbursement_number FROM reimbursements WHERE id = ? LIMIT 1`,
      [reimbursementId],
    );
    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Reimbursement not found' });
    }

    // Same auto-approve/self-fund path as createReimbursement, for the case
    // where an approver saved a draft first and is now resubmitting it (PUT,
    // not POST). Excludes: edit_reason present (this is an accounting edit,
    // handled by approvalsController/disbursementsController instead), and
    // records that are already approved/released or already fund-tagged
    // (never double-deduct on a resubmit/resave).
    const wasNeverApprovedOrFunded =
      !['approved', 'released'].includes((existing[0].status || '').toLowerCase()) &&
      !['ORF', 'ARF'].includes(existing[0].funding_code);
    const wantsRevolvingFund =
      status === 'approved' &&
      (useRevolvingFund === true || useRevolvingFund === 'true') &&
      !edit_reason &&
      wasNeverApprovedOrFunded;

    let fundingCodeUpdate = null; // only set (and only included in the UPDATE) when actually funding
    let fund = null;
    let fundBalance = null;

    if (wantsRevolvingFund) {
      if (!isOperationsApprover(req.user)) {
        await conn.rollback();
        return res.status(403).json({
          success: false,
          message: 'Only Operations approvers may fund a self-approved reimbursement from the Operations Revolving Fund.',
        });
      }
      try {
        ({ fund, fundBalance } = await lockAndCheckOperationsFund(conn, amountNeeded));
      } catch (fundErr) {
        await conn.rollback();
        return res.status(fundErr.status || 500).json({
          success: false,
          message: fundErr.message || 'Failed to verify Operations Revolving Fund balance.',
          ...(fundErr.remainingFund !== undefined ? { remainingFund: fundErr.remainingFund } : {}),
        });
      }
      fundingCodeUpdate = fund.funding_code;
    }

    // Resolve department name → department_id
    const resolvedDepartmentId = await resolveDepartmentId(conn, department);

    // Update header
    await conn.query(
      `UPDATE reimbursements SET
         reimbursement_date  = ?,
         start_date          = ?,
         end_date            = ?,
         department_id       = ?,
         date_needed         = ?,
         purpose             = ?,
         business_unit       = ?,
         total_actual_amount = ?,
         payment_method      = ?,
         gcash_name          = ?,
         account_number      = ?,
         remarks             = ?,
         status              = ?,
         updated_at          = NOW()
         ${fundingCodeUpdate ? ', funding_code = ?' : ''}
       WHERE id = ?`,
      [
        reimbursementDate        || null,
        dateCoverageFrom         || null,
        dateCoverageTo           || null,
        resolvedDepartmentId,
        dateNeeded               || null,
        purpose                  || null,
        businessUnit             || null,
        amountNeeded,
        paymentMethod            || null,
        gcashName                || null,
        accountNumber            || null,
        remarks                  || null,
        status,
        ...(fundingCodeUpdate ? [fundingCodeUpdate] : []),
        reimbursementId,
      ],
    );

    if (wantsRevolvingFund) {
      const balanceAfter = fundBalance - amountNeeded;
      await conn.query(`UPDATE revolving_funds SET Amount = ? WHERE id = ?`, [balanceAfter, fund.id]);
      await conn.query(
        `INSERT INTO revolving_funds_history
           (transaction_type, transaction_id, transaction_number, revolving_fund_id, funding_code, total_amount, deducted_amount, balance_before, balance_after, approver_id, remarks, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not settled', NOW())`,
        [
          'reimbursement',
          reimbursementId,
          existing[0].reimbursement_number,
          fund.id,
          fund.funding_code,
          amountNeeded,
          amountNeeded,
          fundBalance,
          balanceAfter,
          req.user.id,
        ],
      );
    }

    // Replace child rows
    await conn.query(`DELETE FROM reimbursement_expenses  WHERE reimbursement_id = ?`, [reimbursementId]);
    await conn.query(`DELETE FROM reimbursement_itinerary WHERE reimbursement_id = ?`, [reimbursementId]);

    await insertExpenses(conn, reimbursementId, items, userId);
    await insertItinerary(conn, reimbursementId, transportation, userId);

    await conn.commit();

    return res.status(200).json({
      success: true,
      message: 'Reimbursement updated successfully',
      data: { id: Number(reimbursementId) },
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error updating reimbursement:', err);
    return res.status(500).json({
      success: false,
      message: 'Error updating reimbursement',
      error: err.message,
    });
  } finally {
    conn.release();
  }
};

// GET /reimbursements
const getReimbursements = async (req, res) => {
  try {
    const submittedBy = req.user?.name || req.user?.email;
    const { scope } = req.query;

    // scope=all returns every user's reimbursements — only admins may use it.
    const wantsAllScope = String(scope).toLowerCase() === 'all';
    if (wantsAllScope && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin accounts may request scope=all'
      });
    }

    const [rows] = await pool.query(
      `SELECT r.*, d.name AS department_name,
              r.approved_by AS approver_name
       FROM reimbursements r
       LEFT JOIN departments d ON r.department_id = d.id
       ${wantsAllScope ? '' : 'WHERE r.submitted_by = ?'}
       ORDER BY r.created_at DESC`,
      wantsAllScope ? [] : [submittedBy],
    );

    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching reimbursements:', err);
    return res.status(500).json({
      success: false,
      message: 'Error fetching reimbursements',
      error: err.message,
    });
  }
};

// GET /reimbursements/:id
const getReimbursementById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT r.*, d.name AS department_name
       FROM reimbursements r
       LEFT JOIN departments d ON r.department_id = d.id
       WHERE r.id = ? LIMIT 1`,
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Reimbursement not found' });
    }
    const reimbursement = rows[0];

    const [expenses] = await pool.query(
      `SELECT e.*,
              rr.file_name  AS receipt_file_name,
              rr.file_path  AS receipt_file_path,
              rr.file_type  AS receipt_file_type,
              rr.file_size  AS receipt_file_size
       FROM reimbursement_expenses e
       LEFT JOIN reimbursement_receipts rr
              ON rr.id = e.receipt_id AND rr.source_type = 'expense'
       WHERE e.reimbursement_id = ?
       ORDER BY e.id ASC`,
      [id],
    );

    const shapedExpenses = expenses.map((e) => ({
      ...e,
      attachments: e.receipt_file_path
        ? [{
            id:        e.receipt_id,
            file_name: e.receipt_file_name,
            file_path: e.receipt_file_path,
            file_type: e.receipt_file_type,
            file_size: e.receipt_file_size,
          }]
        : [],
    }));

    const [itinerary] = await pool.query(
      `SELECT i.*,
              rr.id        AS receipt_id_fk,
              rr.file_name AS receipt_file_name,
              rr.file_path AS receipt_file_path,
              rr.file_type AS receipt_file_type,
              rr.file_size AS receipt_file_size
       FROM reimbursement_itinerary i
       LEFT JOIN reimbursement_receipts rr
              ON rr.id = i.receipt_id AND rr.source_type = 'itinerary'
       WHERE i.reimbursement_id = ?
       ORDER BY i.id ASC`,
      [id],
    );

    const shapedItinerary = itinerary.map((t) => ({
      ...t,
      receipt: t.receipt_file_path
        ? {
            id:        t.receipt_id_fk,
            file_name: t.receipt_file_name,
            file_path: t.receipt_file_path,
            file_type: t.receipt_file_type,
            file_size: t.receipt_file_size,
          }
        : null,
    }));

    const [attachments] = await pool.query(
      `SELECT * FROM reimbursement_attachments
       WHERE reimbursement_id = ?
       ORDER BY created_at ASC`,
      [id],
    );

    return res.status(200).json({
      success: true,
      data: {
        ...reimbursement,
        expenses:    shapedExpenses,
        itinerary:   shapedItinerary,
        attachments,
      },
    });
  } catch (err) {
    console.error('Error fetching reimbursement:', err);
    return res.status(500).json({
      success: false,
      message: 'Error fetching reimbursement',
      error: err.message,
    });
  }
};

// POST /reimbursements/:id/attachments
const addAttachment = async (req, res) => {
  try {
    const { id }                                     = req.params;
    const { fileName, filePath, fileType, fileSize } = req.body;

    if (!fileName || !filePath) {
      return res.status(400).json({ success: false, message: 'fileName and filePath are required' });
    }

    const [result] = await pool.query(
      `INSERT INTO reimbursement_attachments
         (reimbursement_id, file_name, file_path, file_type, file_size, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, fileName, filePath, fileType || null, fileSize || null, req.user?.id || null],
    );

    return res.status(201).json({
      success: true,
      message: 'Attachment added successfully',
      data: { id: result.insertId },
    });
  } catch (err) {
    console.error('Error adding attachment:', err);
    return res.status(500).json({
      success: false,
      message: 'Error adding attachment',
      error: err.message,
    });
  }
};

// DELETE /reimbursements/:id/attachments/:attId
const deleteAttachment = async (req, res) => {
  try {
    const { id, attId } = req.params;

    const [result] = await pool.query(
      `DELETE FROM reimbursement_attachments
       WHERE id = ? AND reimbursement_id = ?`,
      [attId, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    return res.status(200).json({ success: true, message: 'Attachment deleted successfully' });
  } catch (err) {
    console.error('Error deleting attachment:', err);
    return res.status(500).json({
      success: false,
      message: 'Error deleting attachment',
      error: err.message,
    });
  }
};

// DELETE /reimbursements/:id  – Hard delete draft only
const deleteReimbursement = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { id } = req.params;

    const [existing] = await conn.query(
      `SELECT id, status FROM reimbursements WHERE id = ? LIMIT 1`,
      [id],
    );
    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Reimbursement not found' });
    }
    if (existing[0].status !== 'draft') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only draft reimbursements can be deleted. Submitted requests must be cancelled by an approver.',
      });
    }

    await conn.query(`DELETE FROM reimbursement_expenses    WHERE reimbursement_id = ?`, [id]);
    await conn.query(`DELETE FROM reimbursement_itinerary   WHERE reimbursement_id = ?`, [id]);
    await conn.query(`DELETE FROM reimbursement_attachments WHERE reimbursement_id = ?`, [id]);
    await conn.query(`DELETE FROM reimbursement_receipts    WHERE reimbursement_id = ?`, [id]);
    await conn.query(`DELETE FROM reimbursements WHERE id = ?`, [id]);

    await conn.commit();

    return res.status(200).json({ success: true, message: 'Reimbursement deleted successfully' });
  } catch (err) {
    await conn.rollback();
    console.error('Error deleting reimbursement:', err);
    return res.status(500).json({
      success: false,
      message: 'Error deleting reimbursement',
      error: err.message,
    });
  } finally {
    conn.release();
  }
};

module.exports = {
  createReimbursement,
  updateReimbursement,
  getReimbursements,
  getReimbursementById,
  addAttachment,
  deleteAttachment,
  deleteReimbursement,
};