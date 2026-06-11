const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const { handleUpload } = require('../controllers/uploadController');
const path = require('path');
const fs = require('fs');

const db = require('../config/db');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsBase = path.join(__dirname, '..', '..', 'uploads');
    // Allow frontend to pass resourceType and resourceId to save files in per-request folders
    const resourceType = req.body && req.body.resourceType ? path.basename(String(req.body.resourceType)) : '';
    const resourceId = req.body && req.body.resourceId ? String(req.body.resourceId) : '';

    // Default destination (uploads/)
    let dest = uploadsBase;

    // If both provided, attempt to resolve a human-friendly folder name (request number)
    if (resourceType && resourceId) {
      // Mapping from resourceType to DB table and column
      const maps = {
        'cash-advances': { table: 'cash_advances', col: 'advance_number' },
        'liquidations': { table: 'liquidations', col: 'liquidation_number' },
        'reimbursements': { table: 'reimbursements', col: 'reimbursement_number' }
      };

      const m = maps[resourceType];
      if (m) {
        // Try to lookup the request number; fall back to resourceId
        db.query(`SELECT \`${m.col}\` as reqnum FROM \`${m.table}\` WHERE id = ? LIMIT 1`, [resourceId])
          .then(([rows]) => {
            const folderName = (rows && rows.length && rows[0].reqnum) ? String(rows[0].reqnum) : resourceId;
            dest = path.join(uploadsBase, resourceType, folderName);
            try { fs.mkdirSync(dest, { recursive: true }); } catch (err) { /* ignore */ }
            cb(null, dest);
          })
          .catch((err) => {
            // On DB error, fall back to numeric id folder
            dest = path.join(uploadsBase, resourceType, resourceId);
            try { fs.mkdirSync(dest, { recursive: true }); } catch (e) { /* ignore */ }
            cb(null, dest);
          });
        return; // we already invoked cb in promise handlers
      }

      // If resourceType isn't recognized, use resourceId directly
      dest = path.join(uploadsBase, resourceType, resourceId);
    }

    try {
      fs.mkdirSync(dest, { recursive: true });
    } catch (err) {
      // ignore, multer will error later if necessary
    }
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    // Prefix with timestamp to avoid collisions
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({ storage });

const router = express.Router();
router.post('/', auth, upload.single('file'), handleUpload);

module.exports = router;
