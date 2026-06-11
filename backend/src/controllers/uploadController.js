const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const handleUpload = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'no file' });
  const filePath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();
  const mime = req.file.mimetype;

  // Disallow Excel spreadsheet uploads from supporting documents (e.g. .xlsx/.xls)
  const forbiddenMimes = new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]);
  if (forbiddenMimes.has(mime) || ext === '.xlsx' || ext === '.xls') {
    try { fs.unlinkSync(filePath); } catch (e) {}
    return res.status(400).json({ success: false, error: 'Spreadsheet files are not allowed in supporting documents' });
  }

  // Build web-accessible path. If resourceType/resourceId were provided, we'll attempt
  // to move the uploaded file into the folder named by the request number (advance/liquidation/reimbursement).
  const resourceType = req.body && req.body.resourceType ? path.basename(String(req.body.resourceType)) : '';
  const resourceId = req.body && req.body.resourceId ? String(req.body.resourceId) : '';

  // Default returned web path (file was saved by multer into some folder)
  let webPath = '/uploads/' + req.file.filename;

  if (resourceType && resourceId) {
    // mapping to table and column
    const maps = {
      'cash-advances': { table: 'cash_advances', col: 'advance_number' },
      'liquidations': { table: 'liquidations', col: 'liquidation_number' },
      'reimbursements': { table: 'reimbursements', col: 'reimbursement_number' }
    };

    const m = maps[resourceType];
    try {
      let folderName = resourceId;
      if (m) {
        const [rows] = await db.query(`SELECT \`${m.col}\` as reqnum FROM \`${m.table}\` WHERE id = ? LIMIT 1`, [resourceId]);
        if (rows && rows.length && rows[0].reqnum) folderName = String(rows[0].reqnum);
      }

      const destDir = path.join(__dirname, '..', '..', 'uploads', resourceType, folderName);
      try { fs.mkdirSync(destDir, { recursive: true }); } catch (e) { /* ignore */ }

      const destPath = path.join(destDir, req.file.filename);
      try {
        // Move file from multer temp location into the numbered folder
        fs.renameSync(filePath, destPath);
        webPath = `/uploads/${resourceType}/${folderName}/${req.file.filename}`;
      } catch (moveErr) {
        console.warn('Failed to move uploaded file to request folder, keeping original path', moveErr.message);
        // If move failed, try to keep webPath reflecting multer's location if available
        // multer usually saved to uploads/<resourceType>/<resourceId>/filename
        webPath = `/uploads/${resourceType}/${resourceId}/${req.file.filename}`;
      }
    } catch (err) {
      console.error('Error resolving request folder for upload:', err.message);
      // fallback to resourceId-based path
      webPath = `/uploads/${resourceType}/${resourceId}/${req.file.filename}`;
    }
  }

  const result = { success: true, filename: req.file.filename, path: webPath };

  if (ext === '.xlsx' || ext === '.xls') {
    try {
      const xlsx = require('xlsx');
      const wb = xlsx.readFile(path.join(__dirname, '..', '..', webPath.replace(/^\//, '')));
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet, { defval: null, range: 0, header: 1 });
      result.preview = data.slice(0, 10);
    } catch (err) {
      console.error('xlsx parse error', err);
    }
  }

  res.json(result);
};

module.exports = { handleUpload };
