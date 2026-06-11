const db   = require('../config/db');
const fs   = require('fs');
const path = require('path');
const { logAudit } = require('../utils/auditLogger');

/**
 * Liquidation Controller
 *
 * Actual table schemas (cdmdb)
 * ─────────────────────────────────────────────────────────────────
 * liquidations
 *   id, liquidation_number, cash_advance_id, liquidation_date,
 *   submitted_by, department_id, business_unit,
 *   total_advance_amount, total_actual_amount, variance (computed),
 *   refund_amount, additional_payment,
 *   payment_method ENUM('gcash','payroll'),
 *   gcash_name, account_number, remarks,
 *   status ENUM('draft','pending','approved','rejected','cancelled','released'),
 *   created_by, approved_by, approved_by_name, approved_at,
 *   previous_status, released_by, released_at, release_remarks, …
 *
 * liquidation_expenses
 *   id, liquidation_id, expense_date, particular, actual_amount,
 *   receipt_id (→ liquidation_receipts.id), receipt_number,
 *   tin, vendor_name, vat_type ENUM('VAT','NonVAT'), address,
 *   vatable_sales, vat_amount, zero_rated_sales, vat_exempt_sales
 *
 * liquidation_itinerary
 *   id, liquidation_id, travel_date, store_name, amount,
 *   receipt_id (→ liquidation_receipts.id),
 *   transport_from, transport_to, transport_mode
 *
 * liquidation_receipts
 *   id, liquidation_id, source_type ENUM('expense','itinerary'),
 *   source_id, file_name, file_path, file_type, file_size,
 *   uploaded_by, created_at
 *
 * liquidation_attachments
 *   id, liquidation_id, file_name, file_path, file_type, file_size
 */

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper: insert one receipt row and return its new ID.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object} connection
 * @param {number} liquidationId
 * @param {'expense'|'itinerary'} sourceType
 * @param {number|null} sourceId   – ID of the expense/itinerary row (set after insert)
 * @param {object} receipt         – { fileName, filePath, fileType, fileSize }
 * @param {number|null} uploadedBy – req.user?.id
 * @returns {number} insertId of the new liquidation_receipts row
 */
const insertReceipt = async (connection, liquidationId, sourceType, sourceId, receipt, uploadedBy) => {
  const [result] = await connection.query(
    `INSERT INTO liquidation_receipts
       (liquidation_id, source_type, source_id, file_name, file_path, file_type, file_size, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      liquidationId,
      sourceType,
      sourceId   || null,
      receipt.fileName || null,
      receipt.filePath,
      receipt.fileType || null,
      receipt.fileSize || null,
      uploadedBy || null,
    ],
  );
  return result.insertId;
};

/**
 * Delete all liquidation_receipts rows that belong to a liquidation
 * and remove their physical files from disk.
 */
const deleteAllRowReceipts = async (connection, liquidationId) => {
  const [receipts] = await connection.query(
    'SELECT id, file_path FROM liquidation_receipts WHERE liquidation_id = ? AND source_type IN ("expense","itinerary")',
    [liquidationId],
  );
  for (const r of receipts) {
    if (r.file_path) {
      const rel  = r.file_path.startsWith('/') ? r.file_path.slice(1) : r.file_path;
      const full = path.join(__dirname, '..', '..', rel);
      try { if (fs.existsSync(full)) fs.unlinkSync(full); } catch { /* ignore */ }
    }
  }
  if (receipts.length > 0) {
    await connection.query(
      'DELETE FROM liquidation_receipts WHERE liquidation_id = ? AND source_type IN ("expense","itinerary")',
      [liquidationId],
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────
const createLiquidation = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      liquidationNumber,
      liquidationDate,
      cashAdvanceId,
      submittedBy,
      department,
      totalAdvanceAmount,
      totalActualAmount,
      refundAmount,
      additionalPayment,
      paymentMethod,
      gcashName,
      paymentReason,   // legacy alias
      accountNumber,
      remarks,
      status,
      // Expenses Breakdown rows — key name sent by frontend is `items`
      items,
      // Itinerary Sheet rows — key name sent by frontend is `transportation`
      transportation,
      // Travel Advance fields (kept for backward compat)
      otherExpenses,
      advanceType,
      businessUnit,
    } = req.body;

    // ── Required-field validation ────────────────────────────────────────────
    if (!liquidationNumber || !liquidationDate || !cashAdvanceId || !submittedBy || !department) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const isTravelAdvance = advanceType === 'travel';

    if (isTravelAdvance) {
      if (!(transportation?.length > 0) && !(otherExpenses?.length > 0)) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'At least one transportation or expense item is required' });
      }
    } else {
      if (!items || items.length === 0) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: 'At least one expense item is required' });
      }
    }

    // ── Resolve department ID ────────────────────────────────────────────────
    const [deptRows] = await connection.query('SELECT id FROM departments WHERE name = ?', [department]);
    if (deptRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Invalid department' });
    }
    const departmentId = deptRows[0].id;
    const createdBy    = req.user?.email || null;
    const uploadedBy   = req.user?.id    || null;

    // ── Verify cash advance & prevent duplicate ──────────────────────────────
    const [caRows] = await connection.query('SELECT id, status FROM cash_advances WHERE id = ?', [cashAdvanceId]);
    if (caRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Invalid cash advance ID' });
    }
    const previousStatus = caRows[0].status || null;

    const [existingForCA] = await connection.query(
      'SELECT id FROM liquidations WHERE cash_advance_id = ? AND status != "cancelled" LIMIT 1',
      [cashAdvanceId],
    );
    if (existingForCA.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: 'A liquidation already exists for this cash advance. Please edit or cancel the existing one.',
      });
    }

    // ── Insert liquidation header ────────────────────────────────────────────
    const [result] = await connection.query(
      `INSERT INTO liquidations (
         liquidation_number, cash_advance_id, liquidation_date,
         submitted_by, department_id, business_unit,
         total_advance_amount, total_actual_amount,
         refund_amount, additional_payment,
         payment_method, gcash_name, account_number,
         remarks, previous_status, status, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        liquidationNumber,
        cashAdvanceId,
        liquidationDate,
        submittedBy,
        departmentId,
        businessUnit              || null,
        totalAdvanceAmount,
        totalActualAmount,
        refundAmount              || null,
        additionalPayment         || null,
        paymentMethod             || null,
        gcashName || paymentReason || null,
        accountNumber             || null,
        remarks                   || null,
        previousStatus,
        status                    || 'draft',
        createdBy,
      ],
    );
    const liquidationId = result.insertId;

    // ── Expenses Breakdown → liquidation_expenses ────────────────────────────
    // `items` is sent from the frontend for both regular CA and travel advance.
    if (items?.length > 0) {
      for (const item of items) {
        // If a receipt file was uploaded, save it to liquidation_receipts first.
        let receiptId = null;  // ← was 0
        const att = item.attachments?.[0];
        if (att?.filePath) {
          receiptId = await insertReceipt(
            connection, liquidationId, 'expense', null, att, uploadedBy,
          );
        }

        const [expResult] = await connection.query(
          `INSERT INTO liquidation_expenses (
             liquidation_id, expense_date, particular, actual_amount,
             receipt_id, receipt_number,
             tin, vendor_name, vat_type, address,
             vatable_sales, vat_amount, zero_rated_sales, vat_exempt_sales
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            liquidationId,
            item.expenseDate    || null,
            item.description    || '',          // frontend sends `description` (mapped from `particulars`)
            item.amount         || 0,           // frontend sends `amount` (mapped from `actualAmount`)
            receiptId,
            item.receiptNumber  || '',
            item.tin            || null,
            item.vendor         || null,        // frontend sends `vendor` (mapped from `vendor`)
            item.vatType        || 'NonVAT',    // DB ENUM: 'VAT' | 'NonVAT'
            item.address        || null,
            item.vatable        || 0,           // DB: vatable_sales
            item.vatAmount      || 0,           // DB: vat_amount
            item.zeroRatedSales || 0,           // DB: zero_rated_sales
            item.vatExemptSales || 0,           // DB: vat_exempt_sales
          ],
        );

        // Back-fill source_id on the receipt row now that we have the expense ID.
        if (receiptId > 0) {
          await connection.query(
            'UPDATE liquidation_receipts SET source_id = ? WHERE id = ?',
            [expResult.insertId, receiptId],
          );
        }
      }
    }

    // ── Itinerary Sheet → liquidation_itinerary ──────────────────────────────
    // `transportation` is sent from the frontend for both regular CA and travel advance.
    if (transportation?.length > 0) {
      for (const t of transportation) {
        // Save receipt file first if present.
        let receiptId = null;  // ← was 0
        if (t.receipt?.filePath) {
          receiptId = await insertReceipt(
            connection, liquidationId, 'itinerary', null, t.receipt, uploadedBy,
          );
        }

        const [itinResult] = await connection.query(
          `INSERT INTO liquidation_itinerary (
             liquidation_id, travel_date, store_name, amount,
             receipt_id, transport_from, transport_to, transport_mode
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            liquidationId,
            t.dateCovered     || null,    // frontend: dateCovered → DB: travel_date
            t.store           || '',      // frontend: store       → DB: store_name
            t.amount          || 0,
            receiptId,
            t.fromLocation    || null,    // frontend: fromLocation → DB: transport_from
            t.toLocation      || null,    // frontend: toLocation   → DB: transport_to
            t.modeOfTransport || null,    // frontend: modeOfTransport → DB: transport_mode
          ],
        );

        // Back-fill source_id on the receipt row.
        if (receiptId > 0) {
          await connection.query(
            'UPDATE liquidation_receipts SET source_id = ? WHERE id = ?',
            [itinResult.insertId, receiptId],
          );
        }
      }
    }

    // ── Audit log ────────────────────────────────────────────────────────────
    await logAudit({
      connection,
      userId:   req.user?.id || null,
      action:   'create_liquidation',
      entity:   'liquidations',
      entityId: liquidationId,
      details:  { liquidationNumber, cashAdvanceId, status: status || 'draft', advanceType: advanceType || 'cash' },
      ip:       req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null,
    });

    await connection.commit();

    // Ensure upload folder exists for this liquidation.
    let uploadWebPath = null;
    try {
      const { ensureRequestFolder } = require('../utils/ensureUploadDir');
      const folderName = liquidationNumber || String(liquidationId);
      ensureRequestFolder('liquidations', folderName, liquidationId);
      uploadWebPath = `/uploads/liquidations/${folderName}`;
    } catch (e) {
      console.warn('Failed to create liquidation upload folder', e.message);
    }

    const respData = { id: liquidationId, liquidationNumber, status: status || 'draft' };
    if (uploadWebPath) respData.uploadFolder = uploadWebPath;

    return res.status(201).json({
      success: true,
      message: status === 'draft' ? 'Draft saved successfully' : 'Liquidation submitted successfully',
      data:    respData,
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating liquidation:', error);
    return res.status(500).json({ success: false, message: 'Error creating liquidation', error: error.message });
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────────────────────
const updateLiquidation = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const {
      liquidationDate,
      cashAdvanceId,
      submittedBy,
      department,
      totalAdvanceAmount,
      totalActualAmount,
      refundAmount,
      additionalPayment,
      paymentMethod,
      gcashName,
      paymentReason,
      accountNumber,
      remarks,
      status,
      items,
      transportation,
      otherExpenses,
      advanceType,
      businessUnit,
    } = req.body;

    // ── Verify liquidation exists and is editable ────────────────────────────
    const [existing] = await connection.query(
      'SELECT id, status, liquidation_number FROM liquidations WHERE id = ?',
      [id],
    );
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Liquidation not found' });
    }
    if (!['draft', 'rejected', 'cancelled'].includes(existing[0].status)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Cannot update liquidation in current status' });
    }

    // ── Resolve department ID ────────────────────────────────────────────────
    const [deptRows] = await connection.query('SELECT id FROM departments WHERE name = ?', [department]);
    if (deptRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Invalid department' });
    }
    const departmentId = deptRows[0].id;
    const uploadedBy   = req.user?.id || null;

    // Capture current CA status for rollback on cancel/delete.
    let previousStatusForRecord = null;
    try {
      const [ca] = await connection.query('SELECT status FROM cash_advances WHERE id = ?', [cashAdvanceId]);
      if (ca?.length) previousStatusForRecord = ca[0].status;
    } catch { /* ignore */ }

    // ── Update liquidation header ────────────────────────────────────────────
    await connection.query(
      `UPDATE liquidations SET
         liquidation_date = ?, cash_advance_id = ?, submitted_by = ?,
         department_id = ?, business_unit = ?,
         total_advance_amount = ?, total_actual_amount = ?,
         refund_amount = ?, additional_payment = ?,
         payment_method = ?, gcash_name = ?, account_number = ?,
         remarks = ?, previous_status = ?, status = ?
       WHERE id = ?`,
      [
        liquidationDate,
        cashAdvanceId,
        submittedBy,
        departmentId,
        businessUnit              || null,
        totalAdvanceAmount,
        totalActualAmount,
        refundAmount              || null,
        additionalPayment         || null,
        paymentMethod             || null,
        gcashName || paymentReason || null,
        accountNumber             || null,
        remarks                   || null,
        previousStatusForRecord,
        status                    || 'draft',
        id,
      ],
    );

    // ── Delete old row-level receipts (files + DB rows) ──────────────────────
    // Must happen BEFORE deleting expenses/itinerary rows.
    await deleteAllRowReceipts(connection, id);

    // ── Delete old expenses and itinerary rows ───────────────────────────────
    await connection.query('DELETE FROM liquidation_expenses  WHERE liquidation_id = ?', [id]);
    await connection.query('DELETE FROM liquidation_itinerary WHERE liquidation_id = ?', [id]);

    // ── Re-insert expenses ───────────────────────────────────────────────────
    if (items?.length > 0) {
      for (const item of items) {
        let receiptId = null;  // ← was 0
        const att = item.attachments?.[0];
        if (att?.filePath) {
          receiptId = await insertReceipt(
            connection, id, 'expense', null, att, uploadedBy,
          );
        }

        const [expResult] = await connection.query(
          `INSERT INTO liquidation_expenses (
             liquidation_id, expense_date, particular, actual_amount,
             receipt_id, receipt_number,
             tin, vendor_name, vat_type, address,
             vatable_sales, vat_amount, zero_rated_sales, vat_exempt_sales
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            item.expenseDate    || null,
            item.description    || '',
            item.amount         || 0,
            receiptId,
            item.receiptNumber  || '',
            item.tin            || null,
            item.vendor         || null,
            item.vatType        || 'NonVAT',
            item.address        || null,
            item.vatable        || 0,
            item.vatAmount      || 0,
            item.zeroRatedSales || 0,
            item.vatExemptSales || 0,
          ],
        );

        if (receiptId > 0) {
          await connection.query(
            'UPDATE liquidation_receipts SET source_id = ? WHERE id = ?',
            [expResult.insertId, receiptId],
          );
        }
      }
    }

    // ── Re-insert itinerary rows ─────────────────────────────────────────────
    if (transportation?.length > 0) {
      for (const t of transportation) {
        let receiptId = null;  // ← was 0
        if (t.receipt?.filePath) {
          receiptId = await insertReceipt(
            connection, id, 'itinerary', null, t.receipt, uploadedBy,
          );
        }

        const [itinResult] = await connection.query(
          `INSERT INTO liquidation_itinerary (
             liquidation_id, travel_date, store_name, amount,
             receipt_id, transport_from, transport_to, transport_mode
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            t.dateCovered     || null,
            t.store           || '',
            t.amount          || 0,
            receiptId,
            t.fromLocation    || null,
            t.toLocation      || null,
            t.modeOfTransport || null,
          ],
        );

        if (receiptId > 0) {
          await connection.query(
            'UPDATE liquidation_receipts SET source_id = ? WHERE id = ?',
            [itinResult.insertId, receiptId],
          );
        }
      }
    }

    // ── Audit log ────────────────────────────────────────────────────────────
    await logAudit({
      connection,
      userId:   req.user?.id || null,
      action:   'update_liquidation',
      entity:   'liquidations',
      entityId: id,
      details:  {
        liquidationNumber: existing[0].liquidation_number || id,
        status:            status || existing[0].status,
        advanceType,
      },
      ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null,
    });

    await connection.commit();

    // Ensure upload folder exists post-commit.
    let uploadWebPath = null;
    try {
      const { ensureRequestFolder } = require('../utils/ensureUploadDir');
      const folderName = existing[0].liquidation_number || String(id);
      ensureRequestFolder('liquidations', folderName, id);
      uploadWebPath = `/uploads/liquidations/${folderName}`;
    } catch { /* ignore */ }

    const resp = { id, status: status || 'draft' };
    if (uploadWebPath) resp.uploadFolder = uploadWebPath;

    return res.status(200).json({ success: true, message: 'Liquidation updated successfully', data: resp });

  } catch (error) {
    await connection.rollback();
    console.error('Error updating liquidation:', error);
    return res.status(500).json({ success: false, message: 'Error updating liquidation', error: error.message });
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET LIST
// ─────────────────────────────────────────────────────────────────────────────
const getLiquidations = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    const userId    = req.user?.id;

    const [liquidations] = await db.query(
      `SELECT
         l.id,
         l.liquidation_number,
         l.liquidation_date,
         l.cash_advance_id,
         ca.advance_number  AS cash_advance_number,
         l.submitted_by,
         d.name             AS department,
         l.total_advance_amount,
         l.total_actual_amount,
         l.variance,
         l.refund_amount,
         l.additional_payment,
         l.payment_method,
         l.gcash_name,
         l.account_number,
         l.remarks,
         l.release_remarks,
         l.status,
         l.created_at,
         l.updated_at,
         l.approved_at,
         l.approved_by_name AS approver_name
       FROM liquidations l
       LEFT JOIN departments d    ON l.department_id   = d.id
       LEFT JOIN cash_advances ca ON l.cash_advance_id = ca.id
       WHERE (l.created_by = ? OR l.created_by = ?)
       ORDER BY l.created_at DESC`,
      [userEmail, String(userId)],
    );

    return res.status(200).json({ success: true, data: liquidations });

  } catch (error) {
    console.error('Error fetching liquidations:', error);
    return res.status(500).json({ success: false, message: 'Error fetching liquidations', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE  (with expenses, itinerary, and their receipts)
// ─────────────────────────────────────────────────────────────────────────────
const getLiquidationById = async (req, res) => {
  try {
    const { id } = req.params;

    // Header
    const [liquidations] = await db.query(
      `SELECT
         l.id, l.liquidation_number, l.liquidation_date,
         l.cash_advance_id,
         ca.advance_number AS cash_advance_number,
         ca.advance_type,  ca.purpose,
         l.submitted_by,
         d.name            AS department,
         l.business_unit,
         l.total_advance_amount, l.total_actual_amount, l.variance,
         l.refund_amount, l.additional_payment,
         l.payment_method, l.gcash_name, l.account_number,
         l.remarks, l.release_remarks, l.status,
         l.created_at, l.updated_at,
         l.approved_at, l.approved_by_name
       FROM liquidations l
       LEFT JOIN departments d    ON l.department_id   = d.id
       LEFT JOIN cash_advances ca ON l.cash_advance_id = ca.id
       WHERE l.id = ?`,
      [id],
    );

    if (liquidations.length === 0) {
      return res.status(404).json({ success: false, message: 'Liquidation not found' });
    }

    // ── Expenses ─────────────────────────────────────────────────────────────
    const [expenseRows] = await db.query(
      `SELECT
         e.id, e.expense_date, e.particular, e.actual_amount,
         e.receipt_id, e.receipt_number,
         e.tin, e.vendor_name, e.vat_type, e.address,
         e.vatable_sales, e.vat_amount, e.zero_rated_sales, e.vat_exempt_sales,
         -- join receipt file info so the frontend can show/download it
         r.file_name  AS receipt_file_name,
         r.file_path  AS receipt_file_path,
         r.file_type  AS receipt_file_type,
         r.file_size  AS receipt_file_size
       FROM liquidation_expenses e
       LEFT JOIN liquidation_receipts r ON r.id = e.receipt_id
       WHERE e.liquidation_id = ?
       ORDER BY e.id`,
      [id],
    );

    // Map back to the shape the frontend's mapIncomingItem expects.
    // Frontend key names:  particulars, actualAmount, vendor, vatable, vatAmount,
    //                      zeroRatedSales, vatExemptSales, attachment
    const items = expenseRows.map((e) => ({
      id:             e.id,
      particulars:    e.particular,           // DB: particular
      actualAmount:   e.actual_amount,        // DB: actual_amount
      receiptNumber:  e.receipt_number,
      tin:            e.tin,
      vendor:         e.vendor_name,          // DB: vendor_name
      address:        e.address,
      vatType:        e.vat_type,
      vatable:        e.vatable_sales,        // DB: vatable_sales
      vatAmount:      e.vat_amount,
      zeroRatedSales: e.zero_rated_sales,
      vatExemptSales: e.vat_exempt_sales,
      expenseDate:    e.expense_date,
      // Nest receipt info inside `attachments[]` so mapIncomingItem works as-is.
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

    // ── Itinerary rows ───────────────────────────────────────────────────────
    const [itinRows] = await db.query(
      `SELECT
         i.id, i.travel_date, i.store_name, i.amount,
         i.receipt_id,
         i.transport_from, i.transport_to, i.transport_mode,
         r.file_name  AS receipt_file_name,
         r.file_path  AS receipt_file_path,
         r.file_type  AS receipt_file_type,
         r.file_size  AS receipt_file_size
       FROM liquidation_itinerary i
       LEFT JOIN liquidation_receipts r ON r.id = i.receipt_id
       WHERE i.liquidation_id = ?
       ORDER BY i.id`,
      [id],
    );

    // Map back to the shape mapIncomingItinerary expects.
    // Frontend key names: storeName, fromPlace, toPlace, modeOfTransportation, receipt
    const transportation = itinRows.map((t) => ({
      id:                   t.id,
      dateCovered:          t.travel_date,        // DB: travel_date
      storeName:            t.store_name,         // DB: store_name
      fromPlace:            t.transport_from,     // DB: transport_from
      toPlace:              t.transport_to,       // DB: transport_to
      modeOfTransportation: t.transport_mode,     // DB: transport_mode
      amount:               t.amount,
      receipt: t.receipt_file_path
        ? {
            id:        t.receipt_id,
            file_name: t.receipt_file_name,
            file_path: t.receipt_file_path,
            file_type: t.receipt_file_type,
            file_size: t.receipt_file_size,
          }
        : null,
    }));

    // ── Top-level supporting documents ───────────────────────────────────────
    const [attachments] = await db.query(
      `SELECT id, file_name, file_path, file_type, file_size, created_at
       FROM liquidation_attachments
       WHERE liquidation_id = ?
       ORDER BY created_at`,
      [id],
    );

    return res.status(200).json({
      success: true,
      data: {
        ...liquidations[0],
        items,
        transportation,
        attachments,
      },
    });

  } catch (error) {
    console.error('Error fetching liquidation:', error);
    return res.status(500).json({ success: false, message: 'Error fetching liquidation', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE (draft only)
// ─────────────────────────────────────────────────────────────────────────────
const deleteLiquidation = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    const [liquidations] = await connection.query(
      'SELECT id, status, cash_advance_id, previous_status FROM liquidations WHERE id = ?',
      [id],
    );
    if (liquidations.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Liquidation not found' });
    }
    if (liquidations[0].status !== 'draft') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Only draft liquidations can be deleted' });
    }

    // Delete top-level attachment files from disk.
    try {
      const [attachments] = await connection.query(
        'SELECT file_path FROM liquidation_attachments WHERE liquidation_id = ?', [id],
      );
      for (const a of attachments) {
        if (a.file_path) {
          const rel  = a.file_path.startsWith('/') ? a.file_path.slice(1) : a.file_path;
          const full = path.join(__dirname, '..', '..', rel);
          try { if (fs.existsSync(full)) fs.unlinkSync(full); } catch { /* ignore */ }
        }
      }
    } catch (err) {
      console.error('Error cleaning attachment files for liquidation', err.message);
    }

    // Delete row-level receipt files.
    await deleteAllRowReceipts(connection, id);

    const cashAdvanceId  = liquidations[0].cash_advance_id;
    const previousStatus = liquidations[0].previous_status || null;

    // Cascade delete (FK ON DELETE CASCADE handles child rows).
    await connection.query('DELETE FROM liquidations WHERE id = ?', [id]);

    // Revert CA status if no other blocking liquidations remain.
    const [blocking] = await connection.query(
      `SELECT 1 FROM liquidations
       WHERE cash_advance_id = ? AND status IN ('pending','approved','disbursed','liquidated')
       LIMIT 1`,
      [cashAdvanceId],
    );
    if (!blocking.length) {
      const newStatus = previousStatus || 'released';
      const caQuery   = newStatus === 'liquidated'
        ? 'UPDATE cash_advances SET status = ?, liquidated_at = NOW()  WHERE id = ?'
        : 'UPDATE cash_advances SET status = ?, liquidated_at = NULL WHERE id = ?';
      await connection.query(caQuery, [newStatus, cashAdvanceId]);
    }

    await connection.commit();

    await logAudit({
      connection,
      userId:   req.user?.id || null,
      action:   'delete_liquidation',
      entity:   'liquidations',
      entityId: id,
      details:  { status: liquidations[0].status },
      ip:       req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null,
    });

    return res.status(200).json({ success: true, message: 'Liquidation deleted successfully' });

  } catch (error) {
    await connection.rollback();
    console.error('Error deleting liquidation:', error);
    return res.status(500).json({ success: false, message: 'Error deleting liquidation', error: error.message });
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ATTACHMENTS  (top-level supporting documents)
// ─────────────────────────────────────────────────────────────────────────────
const addAttachment = async (req, res) => {
  try {
    const { liquidationId }                          = req.params;
    const { fileName, filePath, fileType, fileSize } = req.body;

    let fp = String(filePath || '');
    fp = fp.replace(/\\/g, '/');
    const m       = fp.match(/(\/uploads\/.*)$/i);
    const webPath = m ? m[1] : (fp.startsWith('/') ? fp : '/' + fp);

    const [liq] = await db.query('SELECT id FROM liquidations WHERE id = ?', [liquidationId]);
    if (liq.length === 0) {
      return res.status(404).json({ success: false, message: 'Liquidation not found' });
    }

    const [result] = await db.query(
      `INSERT INTO liquidation_attachments
         (liquidation_id, file_name, file_path, file_type, file_size)
       VALUES (?, ?, ?, ?, ?)`,
      [liquidationId, fileName, webPath, fileType, fileSize],
    );

    await logAudit({
      userId:   req.user?.id || null,
      action:   'add_attachment',
      entity:   'liquidation_attachments',
      entityId: result.insertId,
      details:  { liquidationId, fileName, fileType, fileSize },
      ip:       req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null,
    });

    return res.status(201).json({ success: true, message: 'Attachment added successfully', data: { id: result.insertId } });

  } catch (error) {
    console.error('Error adding attachment:', error);
    return res.status(500).json({ success: false, message: 'Error adding attachment', error: error.message });
  }
};

const deleteAttachment = async (req, res) => {
  try {
    const { liquidationId, attachmentId } = req.params;

    const [rows] = await db.query(
      'SELECT id, file_name, file_path, file_type, file_size FROM liquidation_attachments WHERE id = ? AND liquidation_id = ?',
      [attachmentId, liquidationId],
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    const filePath = rows[0].file_path;
    if (filePath) {
      const rel  = filePath.startsWith('/') ? filePath.slice(1) : filePath;
      const full = path.join(__dirname, '..', '..', rel);
      try { if (fs.existsSync(full)) fs.unlinkSync(full); } catch (err) { console.warn('Failed to delete file', full, err.message); }
    }

    await db.query('DELETE FROM liquidation_attachments WHERE id = ?', [attachmentId]);

    await logAudit({
      userId:   req.user?.id || null,
      action:   'delete_attachment',
      entity:   'liquidation_attachments',
      entityId: attachmentId,
      details:  { liquidationId, fileName: rows[0].file_name, filePath },
      ip:       req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null,
    });

    return res.status(200).json({ success: true, message: 'Attachment deleted' });

  } catch (err) {
    console.error('Error deleting liquidation attachment', err.message);
    return res.status(500).json({ success: false, message: 'Error deleting attachment', error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL
// ─────────────────────────────────────────────────────────────────────────────
const cancelLiquidation = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const [existing] = await connection.query(
      'SELECT id, status, cash_advance_id, previous_status FROM liquidations WHERE id = ?',
      [id],
    );
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Liquidation not found' });
    }
    if (existing[0].status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Only pending liquidations can be cancelled' });
    }

    const cashAdvanceId  = existing[0].cash_advance_id;
    const previousStatus = existing[0].previous_status || null;

    await connection.query('UPDATE liquidations SET status = ? WHERE id = ?', ['cancelled', id]);

    const newStatus = previousStatus || 'released';
    const caQuery   = newStatus === 'liquidated'
      ? 'UPDATE cash_advances SET status = ?, liquidated_at = NOW()  WHERE id = ?'
      : 'UPDATE cash_advances SET status = ?, liquidated_at = NULL WHERE id = ?';
    await connection.query(caQuery, [newStatus, cashAdvanceId]);

    await connection.commit();

    await logAudit({
      connection,
      userId:   req.user?.id || null,
      action:   'cancel_liquidation',
      entity:   'liquidations',
      entityId: id,
      details:  { previousStatus },
      ip:       req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null,
    });

    return res.status(200).json({ success: true, message: 'Liquidation cancelled and cash advance reverted' });

  } catch (error) {
    await connection.rollback();
    console.error('Error cancelling liquidation:', error);
    return res.status(500).json({ success: false, message: 'Error cancelling liquidation', error: error.message });
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PENDING LIQUIDATIONS  (accounting dashboard)
// ─────────────────────────────────────────────────────────────────────────────
const getPendingLiquidations = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [pendingCAs] = await connection.query(`
      SELECT
        ca.id,
        ca.advance_number,
        ca.requested_amount,
        ca.status,
        ca.liquidation_deadline,
        ca.created_by,
        u.name          AS employee_name,
        u.department,
        d.business_unit,
        DATEDIFF(CURDATE(), ca.created_at)           AS days_since_release,
        DATEDIFF(ca.liquidation_deadline, CURDATE()) AS days_until_deadline,
        CASE
          WHEN DATEDIFF(ca.liquidation_deadline, CURDATE()) <  0 THEN 'overdue'
          WHEN DATEDIFF(ca.liquidation_deadline, CURDATE()) <= 3 THEN 'urgent'
          WHEN DATEDIFF(ca.liquidation_deadline, CURDATE()) <= 7 THEN 'warning'
          ELSE 'normal'
        END AS urgency,
        (SELECT COUNT(*)
           FROM liquidations
          WHERE cash_advance_id = ca.id AND status != 'rejected') AS liquidation_count,
        (SELECT status
           FROM liquidations
          WHERE cash_advance_id = ca.id AND status != 'rejected'
          ORDER BY created_at DESC LIMIT 1) AS liquidation_status
      FROM cash_advances ca
      LEFT JOIN users       u ON ca.created_by COLLATE utf8mb4_general_ci = u.email COLLATE utf8mb4_general_ci
      LEFT JOIN departments d ON u.department = d.name
      WHERE ca.status IN ('released', 'disbursed')
        AND (
          NOT EXISTS (
            SELECT 1 FROM liquidations
            WHERE cash_advance_id = ca.id AND status != 'rejected'
          )
          OR EXISTS (
            SELECT 1 FROM liquidations
            WHERE cash_advance_id = ca.id AND status IN ('draft', 'pending')
          )
        )
      ORDER BY ca.liquidation_deadline ASC, ca.created_at DESC
    `);

    return res.status(200).json({ success: true, data: pendingCAs || [], count: pendingCAs?.length || 0 });

  } catch (error) {
    console.error('Error fetching pending liquidations:', error);
    return res.status(500).json({ success: false, message: 'Error fetching pending liquidations', error: error.message });
  } finally {
    connection.release();
  }
};

module.exports = {
  createLiquidation,
  updateLiquidation,
  getLiquidations,
  getLiquidationById,
  deleteLiquidation,
  addAttachment,
  deleteAttachment,
  cancelLiquidation,
  getPendingLiquidations,
};