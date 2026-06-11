const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { logAudit } = require('../utils/auditLogger');

// Cancel pending reimbursement
const cancelReimbursement = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.query('SELECT id, status FROM reimbursements WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Reimbursement not found' });
    }
    if (existing[0].status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending reimbursements can be cancelled' });
    }
    await db.query('UPDATE reimbursements SET status = ? WHERE id = ?', ['cancelled', id]);
    await logAudit({
      userId: req.user?.id || null,
      action: 'cancel_reimbursement',
      entity: 'reimbursements',
      entityId: id,
      details: {
        previousStatus: existing[0].status
      },
      ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
    });
    res.status(200).json({ success: true, message: 'Reimbursement cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling reimbursement:', error);
    res.status(500).json({ success: false, message: 'Error cancelling reimbursement', error: error.message });
  }
};

// Delete reimbursement (only drafts)
const deleteReimbursement = async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.query('SELECT id, status FROM reimbursements WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Reimbursement not found' });
    }
    if (existing[0].status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft reimbursements can be deleted' });
    }

    // Delete physical attachment files for this reimbursement
    try {
      const [attachments] = await db.query('SELECT file_path FROM reimbursement_attachments WHERE reimbursement_id = ?', [id]);
      for (const a of attachments) {
        if (a.file_path) {
          const rel = a.file_path.startsWith('/') ? a.file_path.slice(1) : a.file_path;
          const full = path.join(__dirname, '..', '..', rel);
          try { if (fs.existsSync(full)) fs.unlinkSync(full); } catch (err) { console.warn('Failed to delete file', full, err.message); }
        }
      }
      const dir = path.join(__dirname, '..', '..', 'uploads', 'reimbursements', String(id));
      try { if (fs.existsSync(dir)) fs.rmdirSync(dir, { recursive: true }); } catch (e) { }
    } catch (err) {
      console.error('Error cleaning attachment files for reimbursement', err.message);
    }

    await db.query('DELETE FROM reimbursements WHERE id = ?', [id]);
    await logAudit({
      userId: req.user?.id || null,
      action: 'delete_reimbursement',
      entity: 'reimbursements',
      entityId: id,
      details: {
        status: existing[0].status
      },
      ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
    });
    res.status(200).json({ success: true, message: 'Reimbursement deleted successfully' });
  } catch (error) {
    console.error('Error deleting reimbursement:', error);
    res.status(500).json({ success: false, message: 'Error deleting reimbursement', error: error.message });
  }
};

// Create new reimbursement (draft or submit)
const createReimbursement = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      reimbursementNumber,
      reimbursementDate,
      requestedBy,
      department,
      employeeId,
      businessUnit,
      purpose,
      periodCoveredFrom,
      periodCoveredTo,
      paymentMethod,
      gcashName,
      checkNumber,
      accountNumber,
      remarks,
      status,
      items,
      transportation,
      totalAmount
    } = req.body;

    if (!reimbursementNumber || !reimbursementDate || !requestedBy || !department) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!items || items.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }

    // Get department id
    const [departments] = await connection.query('SELECT id FROM departments WHERE name = ?', [department]);
    if (departments.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Invalid department' });
    }
    const departmentId = departments[0].id;
    const createdBy = req.user?.email || null;

    const [result] = await connection.query(
      `INSERT INTO reimbursements (
        reimbursement_number, reimbursement_date, requested_by, department_id,
        business_unit, employee_id, purpose, period_covered_from, period_covered_to, total_amount,
        payment_method, gcash_name, check_number, account_number, remarks, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reimbursementNumber,
        reimbursementDate,
        requestedBy,
        departmentId,
        businessUnit || null,
        employeeId || null,
        purpose || null,
        periodCoveredFrom || null,
        periodCoveredTo || null,
        totalAmount || 0,
        paymentMethod || null,
        gcashName || null,
        checkNumber || null,
        accountNumber || null,
        remarks || null,
        status || 'draft',
        createdBy
      ]
    );

    const reimbursementId = result.insertId;

    // Insert reimbursement items (batch insert for performance)
    if (items && items.length > 0) {
      const itemValues = items.map(item => [
        reimbursementId,
        item.expenseDate || null,
        item.description,
        item.amount || item.estimatedAmount || 0,
        item.tin || null,
        item.vendor || null,
        item.address || null,
        item.accountCode || null
      ]);
      await connection.query(
        `INSERT INTO reimbursement_items (reimbursement_id, expense_date, description, amount, tin, vendor, address, account_code) VALUES ?`,
        [itemValues]
      );
    }

    // Insert transportation (itinerary)
    if (transportation && transportation.length > 0) {
      const transValues = transportation.map(t => [
        reimbursementId,
        t.dateCovered || null,
        t.store || null,
        t.fromLocation || null,
        t.toLocation || null,
        t.modeOfTransport || null,
        t.amount || 0
      ]);
      await connection.query(
        `INSERT INTO reimbursement_transportation (reimbursement_id, date_covered, store, from_location, to_location, mode_of_transport, amount) VALUES ?`,
        [transValues]
      );
    }

    // If saving as draft, ensure upload folder exists immediately
    try {
      if (status === 'draft') {
        const { ensureRequestFolder } = require('../utils/ensureUploadDir');
        const folderNameDraft = reimbursementNumber || String(reimbursementId);
        ensureRequestFolder('reimbursements', folderNameDraft, reimbursementId);
      }
    } catch (e) {
      console.warn('Failed to ensure reimbursement upload folder for draft', e.message);
    }

    await logAudit({
      connection,
      userId: req.user?.id || null,
      action: 'create_reimbursement',
      entity: 'reimbursements',
      entityId: reimbursementId,
      details: {
        reimbursementNumber,
        status: status || 'draft',
        department
      },
      ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
    });

    await connection.commit();

    // create uploads folder for this reimbursement (by reimbursement number)
    let reimbursementUploadWebPath = null;
    try {
      const { ensureRequestFolder } = require('../utils/ensureUploadDir');
      const folderName = reimbursementNumber || String(reimbursementId);
      ensureRequestFolder('reimbursements', folderName, reimbursementId);
      reimbursementUploadWebPath = `/uploads/reimbursements/${folderName}`;
    } catch (e) {
      console.warn('Failed to create reimbursement upload folder', e.message);
    }

    const respData = { id: reimbursementId };
    if (reimbursementUploadWebPath) respData.uploadFolder = reimbursementUploadWebPath;

    res.status(201).json({ success: true, message: status === 'draft' ? 'Draft saved successfully' : 'Reimbursement submitted successfully', data: respData });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating reimbursement:', error);
    res.status(500).json({ success: false, message: 'Error creating reimbursement', error: error.message });
  } finally {
    connection.release();
  }
};

// Update existing reimbursement
const updateReimbursement = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const {
      reimbursementDate,
      requestedBy,
      department,
      employeeId,
      businessUnit,
      purpose,
      periodCoveredFrom,
      periodCoveredTo,
      paymentMethod,
      gcashName,
      checkNumber,
      accountNumber,
      remarks,
      status,
      items,
      transportation,
      totalAmount
    } = req.body;

    const [existing] = await connection.query('SELECT id, status FROM reimbursements WHERE id = ?', [id]);
    // Fetch reimbursement number for folder naming
    let existingReimbursementNumber = null;
    try {
      const [r] = await connection.query('SELECT reimbursement_number FROM reimbursements WHERE id = ?', [id]);
      if (r && r.length) existingReimbursementNumber = r[0].reimbursement_number;
    } catch (e) {
      // ignore
    }
    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Reimbursement not found' });
    }

    if (existing[0].status !== 'draft' && existing[0].status !== 'rejected' && existing[0].status !== 'cancelled') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Cannot update reimbursement in current status' });
    }

    const [departments] = await connection.query('SELECT id FROM departments WHERE name = ?', [department]);
    if (departments.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Invalid department' });
    }
    const departmentId = departments[0].id;

    await connection.query(
      `UPDATE reimbursements SET
        reimbursement_date = ?, requested_by = ?, department_id = ?, business_unit = ?,
        employee_id = ?, purpose = ?, period_covered_from = ?, period_covered_to = ?, total_amount = ?,
        payment_method = ?, gcash_name = ?, check_number = ?, account_number = ?, remarks = ?, status = ?
      WHERE id = ?`,
      [
        reimbursementDate,
        requestedBy,
        departmentId,
        businessUnit || null,
        employeeId || null,
        purpose || null,
        periodCoveredFrom || null,
        periodCoveredTo || null,
        totalAmount || 0,
        paymentMethod || null,
        gcashName || null,
        checkNumber || null,
        accountNumber || null,
        remarks || null,
        status || 'draft',
        id
      ]
    );

    // Update items
    await connection.query('DELETE FROM reimbursement_items WHERE reimbursement_id = ?', [id]);
    if (items && items.length > 0) {
      const itemValues = items.map(item => [
        id,
        item.expenseDate || null,
        item.description,
        item.amount || item.estimatedAmount || 0,
        item.tin || null,
        item.vendor || null,
        item.address || null,
        item.accountCode || null
      ]);
      await connection.query(
        `INSERT INTO reimbursement_items (reimbursement_id, expense_date, description, amount, tin, vendor, address, account_code) VALUES ?`,
        [itemValues]
      );
    }

    // Update transportation
    await connection.query('DELETE FROM reimbursement_transportation WHERE reimbursement_id = ?', [id]);
    if (transportation && transportation.length > 0) {
      const transValues = transportation.map(t => [
        id,
        t.dateCovered || null,
        t.store || null,
        t.fromLocation || null,
        t.toLocation || null,
        t.modeOfTransport || null,
        t.amount || 0
      ]);
      await connection.query(
        `INSERT INTO reimbursement_transportation (reimbursement_id, date_covered, store, from_location, to_location, mode_of_transport, amount) VALUES ?`,
        [transValues]
      );
    }

    // If saving as draft, ensure upload folder exists immediately
    try {
      if (status === 'draft') {
        const { ensureRequestFolder } = require('../utils/ensureUploadDir');
        const folderNameDraft = existingReimbursementNumber || String(id);
        ensureRequestFolder('reimbursements', folderNameDraft, id);
      }
    } catch (e) {
      console.warn('Failed to ensure reimbursement upload folder for draft', e.message);
    }

    await connection.commit();

    await logAudit({
      connection,
      userId: req.user?.id || null,
      action: 'update_reimbursement',
      entity: 'reimbursements',
      entityId: id,
      details: {
        reimbursementNumber: existingReimbursementNumber || id,
        status: status || existing[0].status,
        department
      },
      ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
    });

    // Ensure upload folder post-commit and include web path
    let reimbursementUploadWebPathUpdate = null;
    try {
      const { ensureRequestFolder } = require('../utils/ensureUploadDir');
      const folderName = existingReimbursementNumber || String(id);
      ensureRequestFolder('reimbursements', folderName, id);
      reimbursementUploadWebPathUpdate = `/uploads/reimbursements/${folderName}`;
    } catch (e) {
      // ignore
    }

    const resp = { id };
    if (reimbursementUploadWebPathUpdate) resp.uploadFolder = reimbursementUploadWebPathUpdate;

    res.status(200).json({ success: true, message: 'Reimbursement updated successfully', data: resp });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating reimbursement:', error);
    res.status(500).json({ success: false, message: 'Error updating reimbursement', error: error.message });
  } finally {
    connection.release();
  }
};

// Get all reimbursements for current user
const getReimbursements = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    const userId = req.user?.id;
    const [rows] = await db.query(
      `SELECT r.id, r.reimbursement_number, r.reimbursement_date, r.requested_by, d.name as department,
              r.business_unit, r.total_amount, r.status, r.created_at, r.updated_at, r.purpose, r.period_covered_from, r.period_covered_to,
              r.approved_at, r.approved_by as approver_name, r.remarks, r.release_remarks, r.gcash_name, r.account_number, r.payment_method
       FROM reimbursements r
       LEFT JOIN departments d ON r.department_id = d.id
       WHERE (r.created_by = ? OR r.created_by = ?)
       ORDER BY r.created_at DESC`,
      [userEmail, String(userId)]
    );
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching reimbursements:', error);
    res.status(500).json({ success: false, message: 'Error fetching reimbursements', error: error.message });
  }
};

// Get single reimbursement by ID
const getReimbursementById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT r.*, d.name as department FROM reimbursements r LEFT JOIN departments d ON r.department_id = d.id WHERE r.id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Reimbursement not found' });

    const [items] = await db.query('SELECT id, expense_date as expenseDate, description, amount, tin, vendor, address, account_code as accountCode FROM reimbursement_items WHERE reimbursement_id = ? ORDER BY id', [id]);
    const [transportation] = await db.query('SELECT id, date_covered as dateCovered, store, from_location as fromLocation, to_location as toLocation, mode_of_transport as modeOfTransport, amount FROM reimbursement_transportation WHERE reimbursement_id = ? ORDER BY id', [id]);
    const [attachments] = await db.query('SELECT id, file_name as fileName, file_path as filePath, file_type as fileType, file_size as fileSize, created_at FROM reimbursement_attachments WHERE reimbursement_id = ? ORDER BY created_at', [id]);

    res.status(200).json({ success: true, data: { ...rows[0], items, transportation, attachments } });
  } catch (error) {
    console.error('Error fetching reimbursement:', error);
    res.status(500).json({ success: false, message: 'Error fetching reimbursement', error: error.message });
  }
};

// Add attachment to reimbursement
const addAttachment = async (req, res) => {
  try {
    const { reimbursementId } = req.params;
    const { fileName, filePath, fileType, fileSize } = req.body;
    // Normalize filePath to web-accessible path starting at /uploads/...
    let fp = String(filePath || '');
    fp = fp.replace(/\\/g, '/');
    const m = fp.match(/(\/uploads\/.*)$/i);
    const webPath = m ? m[1].replace(/\\/g, '/') : (fp.startsWith('/') ? fp : '/' + fp);
    const uploadedBy = req.user?.id || null;

    const [result] = await db.query(
      `INSERT INTO reimbursement_attachments (reimbursement_id, file_name, file_path, file_type, file_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [reimbursementId, fileName, webPath, fileType, fileSize, uploadedBy]
    );

    await logAudit({
      userId: req.user?.id || null,
      action: 'add_attachment',
      entity: 'reimbursement_attachments',
      entityId: result.insertId,
      details: {
        reimbursementId,
        fileName,
        fileType,
        fileSize
      },
      ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
    });

    res.status(201).json({ success: true, message: 'Attachment added successfully', data: { id: result.insertId } });
  } catch (error) {
    console.error('Error adding reimbursement attachment:', error);
    res.status(500).json({ success: false, message: 'Error adding attachment', error: error.message });
  }
};

// Delete an attachment by id for a reimbursement
const deleteAttachment = async (req, res) => {
  try {
    const { reimbursementId, attachmentId } = req.params;
    const [rows] = await db.query('SELECT id, file_name, file_path, file_type, file_size FROM reimbursement_attachments WHERE id = ? AND reimbursement_id = ?', [attachmentId, reimbursementId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Attachment not found' });
    const filePath = rows[0].file_path;
    if (filePath) {
      const rel = filePath.startsWith('/') ? filePath.slice(1) : filePath;
      const full = path.join(__dirname, '..', '..', rel);
      try { if (fs.existsSync(full)) fs.unlinkSync(full); } catch (err) { console.warn('Failed to delete file', full, err.message); }
    }
    await db.query('DELETE FROM reimbursement_attachments WHERE id = ?', [attachmentId]);
    await logAudit({
      userId: req.user?.id || null,
      action: 'delete_attachment',
      entity: 'reimbursement_attachments',
      entityId: attachmentId,
      details: {
        reimbursementId,
        fileName: rows[0].file_name,
        fileType: rows[0].file_type,
        fileSize: rows[0].file_size,
        filePath
      },
      ip: req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
    });
    res.status(200).json({ success: true, message: 'Attachment deleted' });
  } catch (err) {
    console.error('Error deleting reimbursement attachment', err.message);
    res.status(500).json({ success: false, message: 'Error deleting attachment', error: err.message });
  }
};

module.exports = {
  createReimbursement,
  updateReimbursement,
  getReimbursements,
  getReimbursementById,
  addAttachment,
  deleteAttachment,
  cancelReimbursement,
  deleteReimbursement
};
