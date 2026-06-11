const fs = require('fs').promises;
const path = require('path');
const db = require('../config/db');

async function walkDir(dir, fileList = []) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        await walkDir(full, fileList);
      } else if (ent.isFile()) {
        fileList.push(full);
      }
    }
  } catch (err) {
    // ignore missing dir
  }
  return fileList;
}

async function isReferenced(fileWebPath) {
  // check attachments tables for the exact stored path or without leading slash
  const candidates = [fileWebPath, fileWebPath.startsWith('/') ? fileWebPath.slice(1) : `/${fileWebPath}`];
  const tables = [
    'cash_advance_attachments',
    'liquidation_attachments',
    'reimbursement_attachments'
  ];

  for (const t of tables) {
    const placeholders = candidates.map(() => '?').join(',');
    const sql = `SELECT COUNT(*) as cnt FROM ${t} WHERE file_path IN (${placeholders})`;
    try {
      const [rows] = await db.query(sql, candidates);
      if (rows && rows[0] && rows[0].cnt > 0) return true;
    } catch (err) {
      // ignore db errors per-table
    }
  }
  return false;
}

async function cleanupUploads(options = {}) {
  const retentionHours = Number(options.retentionHours || process.env.CLEANUP_RETENTION_HOURS || 24);
  const dryRun = !!options.dryRun;
  const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
  const now = Date.now();
  const retentionMs = retentionHours * 60 * 60 * 1000;
  const result = { scanned: 0, deleted: 0, skippedReferenced: 0, errors: [] };

  try {
    const files = await walkDir(uploadsDir, []);
    result.scanned = files.length;

    for (const fullPath of files) {
      try {
        const stat = await fs.stat(fullPath);
        const age = now - stat.mtimeMs;
        if (age < retentionMs) continue; // keep recent files

        // compute web path as stored in DB: /uploads/... with forward slashes
        const rel = path.relative(path.join(__dirname, '..', '..'), fullPath).replace(/\\/g, '/');
        const webPath = '/' + rel;

        const referenced = await isReferenced(webPath);
        if (referenced) {
          result.skippedReferenced += 1;
          continue;
        }

        if (!dryRun) {
          await fs.unlink(fullPath);
          result.deleted += 1;
        } else {
          result.deleted += 0;
        }
      } catch (err) {
        result.errors.push({ file: fullPath, error: err.message });
      }
    }

    // attempt to remove empty directories under uploads
    async function rmdirIfEmpty(dir) {
      try {
        const entries = await fs.readdir(dir);
        if (entries.length === 0) {
          await fs.rmdir(dir);
          return true;
        }
        for (const e of entries) {
          const p = path.join(dir, e);
          const stat = await fs.stat(p);
          if (stat.isDirectory()) await rmdirIfEmpty(p);
        }
        const after = await fs.readdir(dir);
        if (after.length === 0) {
          await fs.rmdir(dir);
          return true;
        }
      } catch (err) {
        // ignore
      }
      return false;
    }

    try { await rmdirIfEmpty(uploadsDir); } catch (e) {}

  } catch (err) {
    result.errors.push({ error: err.message });
  }

  return result;
}

module.exports = { cleanupUploads };
