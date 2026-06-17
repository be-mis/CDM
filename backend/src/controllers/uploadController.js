const fs   = require('fs');
const path = require('path');
const db   = require('../config/db');

const handleUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file received' });
  }

  const filePath = req.file.path;
  const ext      = path.extname(req.file.originalname).toLowerCase();
  const mime     = req.file.mimetype;

  // Disallow Excel spreadsheet uploads from supporting documents
  const forbiddenMimes = new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]);
  if (forbiddenMimes.has(mime) || ext === '.xlsx' || ext === '.xls') {
    try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
    return res.status(400).json({
      success: false,
      error:   'Spreadsheet files are not allowed in supporting documents',
    });
  }

  // ── Resolve optional resource context ──────────────────────────────────────
  // Frontend sends resourceType ('reimbursements') and resourceId (the row id).
  // We look up the human-readable request number to use as the folder name so
  // files end up in  uploads/reimbursements/RMB-202606-1234/filename.jpg
  const resourceType = req.body?.resourceType
    ? path.basename(String(req.body.resourceType))
    : '';
  const resourceId   = req.body?.resourceId ? String(req.body.resourceId) : '';

  // Default web path (multer already saved the file somewhere)
  let webPath = '/uploads/' + req.file.filename;

  if (resourceType && resourceId) {
    // Map resourceType → { DB table, number column }
    // NOTE: reimbursement table is singular in this DB
    const maps = {
      'cash-advances':   { table: 'cash_advances',  col: 'advance_number'       },
      'liquidations':    { table: 'liquidations',   col: 'liquidation_number'   },
      'reimbursements':  { table: 'reimbursements',  col: 'reimbursement_number' }, // ← singular table
    };

    const m = maps[resourceType];
    try {
      let folderName = resourceId; // fallback: use the raw ID

      if (m) {
        const [rows] = await db.query(
          `SELECT \`${m.col}\` AS reqnum FROM \`${m.table}\` WHERE id = ? LIMIT 1`,
          [resourceId],
        );
        if (rows?.length && rows[0].reqnum) {
          folderName = String(rows[0].reqnum);
        }
      }

      const destDir  = path.join(__dirname, '..', '..', 'uploads', resourceType, folderName);
      const destFile = path.join(destDir, req.file.filename);

      try { fs.mkdirSync(destDir, { recursive: true }); } catch (_) { /* already exists */ }

      try {
        fs.renameSync(filePath, destFile);
        webPath = `/uploads/${resourceType}/${folderName}/${req.file.filename}`;
      } catch (moveErr) {
        console.warn(
          'Could not move uploaded file to request folder; keeping original path.',
          moveErr.message,
        );
        // If rename failed the file stayed in multer's temp location
        webPath = `/uploads/${resourceType}/${resourceId}/${req.file.filename}`;
      }
    } catch (err) {
      console.error('Error resolving request folder for upload:', err.message);
      webPath = `/uploads/${resourceType}/${resourceId}/${req.file.filename}`;
    }
  }

  // Build response
  const result = {
    success:  true,
    filename: req.file.filename,
    path:     webPath,
  };

  return res.json(result);
};

module.exports = { handleUpload };