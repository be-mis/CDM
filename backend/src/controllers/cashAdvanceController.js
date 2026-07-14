const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { logAudit } = require('../utils/auditLogger');

/**
 * Cash Advance Controller
 * Handles all operations related to cash advances including:
 * - Creating new cash advances (draft or submit)
 * - Updating existing cash advances
 * - Retrieving cash advances (single or list)
 * - Deleting draft cash advances
 * - Managing attachments
 */

// Create or update cash advance (handles both draft and submit)
const createCashAdvance = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const {
      advanceNumber,
      advanceDate,
      requestedBy,
      department,
      employeeId,
      advanceType,
      purpose,
      projectName,
      destination,
      startDate,
      endDate,
      paymentMethod,
      gcashName,
      accountNumber,
      businessUnit,
      dateNeeded,
      dateCoverage,
      liquidationDeadline,
      status,
      items,
      otherItems,
      requestedAmount,
      approver,
      approvedDate
    } = req.body;
    // Compute liquidation deadline:
    // - For travel advances, if endDate is provided, use endDate + 3 days.
    // - Otherwise, if status indicates released/disbursed and no deadline provided, default to today + 3 days.
    let computedLiquidationDeadline = liquidationDeadline || null;
    try {
      const statusLower = String(status || '').toLowerCase();
      if ((advanceType === 'travel' || advanceType === 'Travel') && endDate && !computedLiquidationDeadline) {
        const dt = new Date(endDate);
        if (!isNaN(dt.getTime())) {
          dt.setDate(dt.getDate() + 3);
          computedLiquidationDeadline = dt.toISOString().split('T')[0];
        }
      }

      if (!computedLiquidationDeadline && statusLower && ['released', 'disbursed'].includes(statusLower)) {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        computedLiquidationDeadline = d.toISOString().split('T')[0];
      }
    } catch (e) {
      // non-fatal, leave computedLiquidationDeadline as-is
    }

    // Validate required fields
    if (!advanceNumber || !advanceDate || !requestedBy || !department || !purpose) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate items
    if (!items || items.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one item is required'
      });
    }

    // Get department_id from department name
    const [departments] = await connection.query(
      'SELECT id FROM departments WHERE name = ?',
      [department]
    );

    if (departments.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid department'
      });
    }

    const departmentId = departments[0].id;

    // The approver is whoever is actually submitting/approving this request
    // (the logged-in requestor, when they are also an approver — see
    // isApprover logic on the frontend). Only set approved_by/approved_at
    // when the request is actually being auto-approved; otherwise leave
    // them null since no one has approved it yet.
    // NOTE: previously this queried every approver row for the department
    // and joined all their names together, which is why "approved_by" was
    // showing all approvers in the department instead of just one.
    const isApproved = String(status || '').toLowerCase() === 'approved';
    const approvedBy = isApproved ? (approver || requestedBy || null) : null;
    const approvedAt = isApproved ? (approvedDate || advanceDate || null) : null;
    const createdBy = req.user?.email || null;

    // Insert cash advance
    const [result] = await connection.query(
      `INSERT INTO cash_advances (
          advance_number, advance_date, requested_by, department_id, 
          employee_id, business_unit, purpose, project_name, destination, start_date, 
          end_date, requested_amount, payment_method, gcash_name, 
          account_number, date_needed, date_coverage, liquidation_deadline, status, created_by, advance_type, approved_by, approved_at, funding_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
          advanceNumber, advanceDate, requestedBy, departmentId,
          employeeId, businessUnit || null, purpose, projectName || null,
          destination || null, startDate || null, endDate || null,
          requestedAmount, paymentMethod,
          String(paymentMethod).toLowerCase() === 'payroll' ? null : (gcashName || null),
          accountNumber || null, dateNeeded || null, dateCoverage || null,
          computedLiquidationDeadline || null, status || 'draft', createdBy,
          advanceType || 'cash',
          approvedBy,
          approvedAt,
          'RD'
      ]
    );

    const cashAdvanceId = result.insertId;

    // Combine items and otherItems for unified storage
    const allItems = [
      ...(items || []),
      ...(otherItems || [])
    ];

    // Insert cash advance items (batch insert for performance)
    if (allItems.length > 0) {
      const itemValues = allItems.map(item => [
        cashAdvanceId,
        item.description,
        item.estimatedAmount,
        item.noOfDays || item.no_of_days || 1,
        item.totalAmount || item.total_amount || item.estimatedAmount
      ]);
      await connection.query(
        `INSERT INTO cash_advance_breakdown (cash_advance_id, description, estimated_amount, no_of_days, total_amount) VALUES ?`,
        [itemValues]
      );
    }

    // If saving as draft, ensure upload folder exists immediately
    try {
      if (status === 'draft') {
        const { ensureRequestFolder } = require('../utils/ensureUploadDir');
        const folderNameDraft = advanceNumber || String(cashAdvanceId);
        ensureRequestFolder('cash-advances', folderNameDraft, cashAdvanceId);
      }
    } catch (e) {
      console.warn('Failed to ensure cash advance upload folder for draft', e.message);
    }

    await logAudit({
      connection,
      userId: req.user?.id || null,
      action: 'create_cash_advance',
      entity: 'cash_advances',
      entityId: cashAdvanceId,
      details: {
        advanceNumber,
        advanceType,
        status: status || 'draft',
        department
      },
      ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
    });

    await connection.commit();

    // create uploads folder for this cash advance (by advance number) after commit as well
    let cashAdvanceUploadWebPath = null;
    try {
      const { ensureRequestFolder } = require('../utils/ensureUploadDir');
      const folderName = advanceNumber || String(cashAdvanceId);
      ensureRequestFolder('cash-advances', folderName, cashAdvanceId);
      cashAdvanceUploadWebPath = `/uploads/cash-advances/${folderName}`;
    } catch (e) {
      console.warn('Failed to create cash advance upload folder', e.message);
    }

    const respData = { id: cashAdvanceId, advanceNumber, status };
    if (cashAdvanceUploadWebPath) respData.uploadFolder = cashAdvanceUploadWebPath;

    res.status(201).json({
      success: true,
      message: status === 'draft' ? 'Draft saved successfully' : 'Cash advance submitted successfully',
      data: respData
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating cash advance:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating cash advance',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Update existing cash advance
const updateCashAdvance = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const {
      advanceDate,
      requestedBy,
      department,
      employeeId,
      advanceType,
      purpose,
      projectName,
      destination,
      startDate,
      endDate,
      paymentMethod,
      gcashName,

      accountNumber,
      businessUnit,
      dateNeeded,
      dateCoverage,
      liquidationDeadline,
      status,
      items,
      otherItems,
      requestedAmount,
      advanceNumber,
      approver,
      approvedDate,
      editReason,
      edit_reason,
      reason,
      remarks
    } = req.body;

    // Check if cash advance exists
    const [existing] = await connection.query(
      `SELECT id, advance_number, advance_date, requested_by, department_id, employee_id,
              business_unit, purpose, project_name, destination, start_date, end_date,
              requested_amount, payment_method, gcash_name, account_number, date_needed,
              date_coverage, liquidation_deadline, status, advance_type, created_by,
              approved_by, approved_at
       FROM cash_advances WHERE id = ?`,
      [id]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Cash advance not found'
      });
    }

    // Security: Ensure user has permission to update
    // Owners can edit their own requests; admin and accounting can edit/process any request.
    const isOwner = (existing[0].created_by === req.user?.email) ||
      (String(existing[0].employee_id) === String(req.user?.id));
    const isAdmin = req.user?.role === 'admin';
    const isAccounting = req.user?.role === 'accounting';

    if (!isOwner && !isAdmin && !isAccounting) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this request'
      });
    }

    // Allow updates on draft, rejected, or cancelled status for regular owners.
    // Admin can update/process a request in any status.
    // Accounting may only edit a request that is "approved" (i.e. pending
    // release) — once a request has been released or rejected, it is no
    // longer editable, even by accounting.
    const editableStatuses = ['draft', 'rejected', 'cancelled'];
    const currentStatus = existing[0].status;
    const isAccountingEditable = isAccounting && currentStatus === 'approved';

    if (!editableStatuses.includes(currentStatus) && !isAdmin && !isAccountingEditable) {
      await connection.rollback();
      const message = isAccounting
        ? 'Only transactions pending release (approved) can be edited by accounting.'
        : 'Cannot update cash advance in current status';
      return res.status(400).json({
        success: false,
        message
      });
    }

    // Get department_id from department name
    const [departments] = await connection.query(
      'SELECT id FROM departments WHERE name = ?',
      [department]
    );

    if (departments.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid department'
      });
    }

    const departmentId = departments[0].id;

    // When accounting processes/updates a request, it should automatically
    // move to "released" — accounting's role here is to release funds, not
    // to re-approve or edit request details. They can still explicitly
    // reject or cancel a request; those statuses are left untouched.
    let effectiveStatus = status;
    if (isAccounting) {
      const requestedStatusLower = String(status || '').toLowerCase();
      if (!['rejected', 'cancelled'].includes(requestedStatusLower)) {
        effectiveStatus = 'released';
      }
    }

    // Same fix as createCashAdvance: only set approved_by/approved_at when
    // this update is actually an (re-)approval, using the real approver
    // (the logged-in user submitting), not every approver in the department.
    const isApproved = String(effectiveStatus || '').toLowerCase() === 'approved';
    const approvedBy = isApproved ? (approver || requestedBy || null) : null;
    const approvedAt = isApproved ? (approvedDate || advanceDate || null) : null;

    // Advance number for folder naming (already fetched above)
    let existingAdvanceNumber = existing[0].advance_number;

    // Compute liquidation deadline for updates similar to create path.
    let computedLiquidationDeadline = liquidationDeadline || null;
    try {
      const statusLower = String(effectiveStatus || '').toLowerCase();
      if ((advanceType === 'travel' || advanceType === 'Travel') && endDate && !computedLiquidationDeadline) {
        const dt = new Date(endDate);
        if (!isNaN(dt.getTime())) {
          dt.setDate(dt.getDate() + 3);
          computedLiquidationDeadline = dt.toISOString().split('T')[0];
        }
      }

      if (!computedLiquidationDeadline && statusLower && ['released', 'disbursed'].includes(statusLower)) {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        computedLiquidationDeadline = d.toISOString().split('T')[0];
      }
    } catch (e) {
      // ignore
    }

    // Build a before/after diff of changed fields for the audit log.
    // Compares the previously stored values against the incoming update payload.
    const newValues = {
      advance_number: advanceNumber || existing[0].advance_number,
      advance_date: advanceDate,
      requested_by: requestedBy,
      department_id: departmentId,
      employee_id: employeeId,
      business_unit: businessUnit || null,
      purpose: purpose,
      project_name: projectName || null,
      destination: destination || null,
      start_date: startDate || null,
      end_date: endDate || null,
      requested_amount: requestedAmount,
      payment_method: paymentMethod,
      gcash_name: String(paymentMethod).toLowerCase() === 'payroll' ? null : (gcashName || null),
      account_number: accountNumber || null,
      date_needed: dateNeeded || null,
      date_coverage: dateCoverage || null,
      liquidation_deadline: computedLiquidationDeadline || null,
      status: effectiveStatus || 'draft',
      advance_type: advanceType || existing[0].advance_type,
      approved_by: approvedBy,
      approved_at: approvedAt
    };

    const changedFields = {};
    for (const key of Object.keys(newValues)) {
      // Normalize for comparison: treat null/undefined/'' as equivalent, and
      // compare dates/numbers as strings to avoid type-only false positives.
      const oldVal = existing[0][key] ?? null;
      const newVal = newValues[key] ?? null;
      const oldStr = oldVal instanceof Date ? oldVal.toISOString().split('T')[0] : String(oldVal);
      const newStr = newVal instanceof Date ? newVal.toISOString().split('T')[0] : String(newVal);
      if (oldStr !== newStr) {
        changedFields[key] = { from: oldVal, to: newVal };
      }
    }

    const editReasonValue = editReason || edit_reason || reason || remarks || null;

    // Update cash advance
    await connection.query(
      `UPDATE cash_advances SET
          advance_number = ?, advance_date = ?, requested_by = ?, department_id = ?, 
          employee_id = ?, business_unit = ?, purpose = ?, project_name = ?, destination = ?, 
          start_date = ?, end_date = ?, requested_amount = ?, 
          payment_method = ?, gcash_name = ?, account_number = ?, 
          date_needed = ?, date_coverage = ?, liquidation_deadline = ?, status = ?, advance_type = ?,
          approved_by = ?, approved_at = ?
      WHERE id = ?`,
      [
          advanceNumber || existing[0].advance_number, advanceDate, requestedBy, departmentId,
          employeeId, businessUnit || null, purpose, projectName || null,
          destination || null, startDate || null, endDate || null,
          requestedAmount, paymentMethod,
          String(paymentMethod).toLowerCase() === 'payroll' ? null : (gcashName || null),
          accountNumber || null, dateNeeded || null, dateCoverage || null,
          computedLiquidationDeadline || null, effectiveStatus || 'draft',
          advanceType || existing[0].advance_type,
          approvedBy,
          approvedAt,
          id
      ]
    );

    // Delete existing items
    await connection.query(
      'DELETE FROM cash_advance_breakdown WHERE cash_advance_id = ?',
      [id]
    );

    // Combine items and otherItems for unified storage
    const allItems = [
      ...(items || []),
      ...(otherItems || [])
    ];

    // Insert new items (batch insert for performance)
    if (allItems.length > 0) {
      const itemValues = allItems.map(item => [
        id,
        item.description,
        item.estimatedAmount,
        item.noOfDays || item.no_of_days || 1,
        item.totalAmount || item.total_amount || item.estimatedAmount
      ]);
      await connection.query(
        `INSERT INTO cash_advance_breakdown (cash_advance_id, description, estimated_amount, no_of_days, total_amount) VALUES ?`,
        [itemValues]
      );
    }

    // If saving as draft, ensure upload folder exists immediately
    try {
      if (effectiveStatus === 'draft') {
        const { ensureRequestFolder } = require('../utils/ensureUploadDir');
        const folderNameDraft = existingAdvanceNumber || String(id);
        ensureRequestFolder('cash-advances', folderNameDraft, id);
      }
    } catch (e) {
      console.warn('Failed to ensure cash advance upload folder for draft', e.message);
    }

    await connection.commit();

    await logAudit({
      connection,
      userId: req.user?.id || null,
      action: 'update_cash_advance',
      entity: 'cash_advances',
      entityId: id,
      details: {
        advanceNumber: existingAdvanceNumber || id,
        status: effectiveStatus || existing[0].status,
        department,
        editedBy: {
          id: req.user?.id || null,
          email: req.user?.email || null,
          role: req.user?.role || null
        },
        reason: editReasonValue,
        autoReleased: isAccounting && effectiveStatus === 'released' && String(status || '').toLowerCase() !== 'released',
        changes: changedFields
      },
      ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
    });

    // Ensure / create upload folder post-commit and include web path
    let cashAdvanceUploadWebPathUpdate = null;
    try {
      const { ensureRequestFolder } = require('../utils/ensureUploadDir');
      const folderName = existingAdvanceNumber || String(id);
      ensureRequestFolder('cash-advances', folderName, id);
      cashAdvanceUploadWebPathUpdate = `/uploads/cash-advances/${folderName}`;
    } catch (e) {
      // ignore
    }

    const resp = { id };
    if (cashAdvanceUploadWebPathUpdate) resp.uploadFolder = cashAdvanceUploadWebPathUpdate;

    res.status(200).json({
      success: true,
      message: effectiveStatus === 'draft' ? 'Draft updated successfully' : 'Cash advance updated successfully',
      data: resp
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error updating cash advance:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating cash advance',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

// Get all cash advances for current user
const getCashAdvances = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    const userId = req.user?.id;
    const { status, eligible, scope } = req.query;

    // scope=all returns every user's cash advances — only admins may use it.
    // Anyone else asking for it gets rejected rather than silently scoped
    // down to their own requests, so a frontend bug never masquerades as a
    // narrower (but wrong) result set.
    const wantsAllScope = String(scope).toLowerCase() === 'all';
    if (wantsAllScope && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin accounts may request scope=all'
      });
    }

    let query = `
      SELECT 
        ca.id, ca.advance_number, ca.advance_date, ca.requested_by,
        d.name as department, ca.purpose, ca.requested_amount,
        ca.approved_amount, ca.status, ca.payment_method, ca.advance_type,
        ca.funding_code,
        ca.created_at, ca.updated_at, ca.approved_at,
        ca.approved_by as approver_name,
        ca.released_by, ca.released_at,
        ca.remarks, ca.reject_remarks, ca.release_remarks,
        ca.liquidation_deadline,
        CASE 
          WHEN ca.status IN ('released','disbursed')
            AND ca.liquidation_deadline IS NOT NULL 
            AND ca.liquidation_deadline <= CURDATE()
            AND NOT EXISTS (
              SELECT 1 FROM liquidations l 
              WHERE l.cash_advance_id = ca.id 
                AND l.status IN ('draft','pending','approved','rejected','disbursed','liquidated','completed','released')
            )
          THEN 1 ELSE 0
        END as is_overdue
      FROM cash_advances ca
      LEFT JOIN departments d ON ca.department_id = d.id
    `;

    const whereClauses = [];
    const params = [];

    // Admins requesting scope=all skip the owner restriction entirely;
    // everyone else only ever sees their own cash advances.
    if (!wantsAllScope) {
      whereClauses.push('(ca.created_by = ? OR ca.created_by = ?)');
      params.push(userEmail, String(userId));
    }

    // If requesting only cash advances eligible for liquidation,
    // only include advances that have been released/disbursed and
    // exclude any CA that already has a liquidation in a blocking status.
    // Blocking liquidation statuses: draft, pending, approved, rejected, disbursed, liquidated, completed
    if (String(eligible).toLowerCase() === 'true') {
      whereClauses.push(`ca.status IN ('released','disbursed') AND NOT EXISTS (
        SELECT 1 FROM liquidations l
        WHERE l.cash_advance_id = ca.id
          AND l.status IN ('draft','pending','approved','rejected','disbursed','liquidated','completed','released')
      )`);
    }

    if (status) {
      whereClauses.push('ca.status = ?');
      params.push(status);
    }

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    query += ' ORDER BY ca.created_at DESC';

    const [advances] = await db.query(query, params);

    res.status(200).json({
      success: true,
      data: advances
    });

  } catch (error) {
    console.error('Error fetching cash advances:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cash advances',
      error: error.message
    });
  }
};

// Get single cash advance by ID
const getCashAdvanceById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get cash advance details
    const [advances] = await db.query(
      `SELECT 
        ca.*, d.name as department
      FROM cash_advances ca
      LEFT JOIN departments d ON ca.department_id = d.id
      WHERE ca.id = ?`,
      [id]
    );

    // console.log('advances:', JSON.stringify(advances, null, 2));


    if (advances.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cash advance not found'
      });
    }

    // Get items
    const [items] = await db.query(
      'SELECT * FROM cash_advance_breakdown WHERE cash_advance_id = ?',
      [id]
    );

    // Get attachments
    const [attachments] = await db.query(
      'SELECT * FROM cash_advance_attachments WHERE cash_advance_id = ?',
      [id]
    );
    // otherItems are stored together with items in cash_advance_breakdown table
    // The frontend handles separating Per Diem from Other items for travel advances
    const otherItems = [];

    const cashAdvance = {
      ...advances[0],
      items,
      otherItems,
      attachments
    };

    res.status(200).json({
      success: true,
      data: cashAdvance
    });

  } catch (error) {
    console.error('Error fetching cash advance details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cash advance details',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Delete cash advance (only drafts)
const deleteCashAdvance = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if cash advance exists and is draft
    // Check if cash advance exists and is draft
    const [existing] = await db.query(
      'SELECT id, status, created_by, employee_id FROM cash_advances WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cash advance not found'
      });
    }

    // Security: Ensure user has permission to delete
    const isOwner = (existing[0].created_by === req.user?.email) ||
      (String(existing[0].employee_id) === String(req.user?.id));
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }

    if (existing[0].status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft cash advances can be deleted'
      });
    }

    // Delete physical files for attachments belonging to this cash advance
    try {
      const [attachments] = await db.query('SELECT file_path FROM cash_advance_attachments WHERE cash_advance_id = ?', [id]);
      for (const a of attachments) {
        if (a.file_path) {
          const rel = a.file_path.startsWith('/') ? a.file_path.slice(1) : a.file_path;
          const full = path.join(__dirname, '..', '..', rel);
          try {
            if (fs.existsSync(full)) fs.unlinkSync(full);
          } catch (err) {
            console.warn('Failed to delete file', full, err.message);
          }
        }
      }
      // attempt to remove parent dir if empty
      const dir = path.join(__dirname, '..', '..', 'uploads', 'cash-advances', String(id));
      try { if (fs.existsSync(dir)) fs.rmdirSync(dir, { recursive: true }); } catch (e) { }
    } catch (err) {
      console.error('Error cleaning attachment files for cash advance', err.message);
    }

    await db.query('DELETE FROM cash_advances WHERE id = ?', [id]);

    await logAudit({
      userId: req.user?.id || null,
      action: 'delete_cash_advance',
      entity: 'cash_advances',
      entityId: id,
      details: {
        status: existing[0].status
      },
      ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
    });

    res.status(200).json({
      success: true,
      message: 'Cash advance deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting cash advance:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting cash advance',
      error: error.message
    });
  }
};

// Add attachment to cash advance
const addAttachment = async (req, res) => {
  try {
    const { cashAdvanceId } = req.params;

    // Check existence and ownership
    const [existing] = await db.query(
      'SELECT id, created_by, employee_id FROM cash_advances WHERE id = ?',
      [cashAdvanceId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Cash advance not found' });
    }

    const isOwner = (existing[0].created_by === req.user?.email) ||
      (String(existing[0].employee_id) === String(req.user?.id));
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    const { fileName, filePath, fileType, fileSize } = req.body;
    // Normalize filePath to web-accessible path starting at /uploads/...
    let fp = String(filePath || '');
    fp = fp.replace(/\\/g, '/');
    const m = fp.match(/(\/uploads\/.*)$/i);
    const webPath = m ? m[1].replace(/\\/g, '/') : (fp.startsWith('/') ? fp : '/' + fp);
    const uploadedBy = req.user?.id || null;

    const [result] = await db.query(
      `INSERT INTO cash_advance_attachments (
        cash_advance_id, file_name, file_path, file_type, file_size, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [cashAdvanceId, fileName, webPath, fileType, fileSize, uploadedBy]
    );

    await logAudit({
      userId: req.user?.id || null,
      action: 'add_attachment',
      entity: 'cash_advance_attachments',
      entityId: result.insertId,
      details: {
        cashAdvanceId,
        fileName,
        fileType,
        fileSize
      },
      ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
    });

    res.status(201).json({
      success: true,
      message: 'Attachment added successfully',
      data: { id: result.insertId }
    });

  } catch (error) {
    console.error('Error adding attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding attachment',
      error: error.message
    });
  }
};

// Delete an attachment by id for a cash advance
const deleteAttachment = async (req, res) => {
  try {
    const { cashAdvanceId, attachmentId } = req.params;

    // Fetch attachment and request details to verify ownership
    const [rows] = await db.query(`
      SELECT a.id, a.file_name, a.file_path, a.file_type, a.file_size, a.uploaded_by, ca.requested_by, ca.employee_id, ca.created_by 
      FROM cash_advance_attachments a
      JOIN cash_advances ca ON a.cash_advance_id = ca.id
      WHERE a.id = ? AND a.cash_advance_id = ?
    `, [attachmentId, cashAdvanceId]);

    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Attachment not found' });

    // Security check
    const attachment = rows[0];
    const userEmail = req.user?.email;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    const isOwner = (String(attachment.uploaded_by) === String(userId)) ||
      (String(attachment.employee_id) === String(userId)) ||
      (attachment.created_by === userEmail);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Attachment not found' });
    const filePath = rows[0].file_path;
    if (filePath) {
      const rel = filePath.startsWith('/') ? filePath.slice(1) : filePath;
      const full = path.join(__dirname, '..', '..', rel);
      try { if (fs.existsSync(full)) fs.unlinkSync(full); } catch (err) { console.warn('Failed to delete file', full, err.message); }
    }
    await db.query('DELETE FROM cash_advance_attachments WHERE id = ?', [attachmentId]);
    await logAudit({
      userId: req.user?.id || null,
      action: 'delete_attachment',
      entity: 'cash_advance_attachments',
      entityId: attachmentId,
      details: {
        cashAdvanceId,
        fileName: attachment.file_name,
        fileType: attachment.file_type,
        fileSize: attachment.file_size,
        filePath
      },
      ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
    });
    res.status(200).json({ success: true, message: 'Attachment deleted' });
  } catch (err) {
    console.error('Error deleting cash advance attachment', err.message);
    res.status(500).json({ success: false, message: 'Error deleting attachment', error: err.message });
  }
};

// Cancel pending cash advance
const cancelCashAdvance = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.query(
      'SELECT id, status, created_by, employee_id FROM cash_advances WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Cash advance not found' });
    }

    // Security check
    const isOwner = (existing[0].created_by === req.user?.email) ||
      (String(existing[0].employee_id) === String(req.user?.id));
    const isAdmin = req.user?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    if (existing[0].status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending cash advances can be cancelled' });
    }
    await db.query('UPDATE cash_advances SET status = ? WHERE id = ?', ['cancelled', id]);
    await logAudit({
      userId: req.user?.id || null,
      action: 'cancel_cash_advance',
      entity: 'cash_advances',
      entityId: id,
      details: {
        previousStatus: existing[0].status
      },
      ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
    });
    res.status(200).json({ success: true, message: 'Cash advance cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling cash advance:', error);
    res.status(500).json({ success: false, message: 'Error cancelling cash advance', error: error.message });
  }
};

module.exports = {
  createCashAdvance,
  updateCashAdvance,
  getCashAdvances,
  getCashAdvanceById,
  deleteCashAdvance,
  addAttachment,
  deleteAttachment,
  cancelCashAdvance
};