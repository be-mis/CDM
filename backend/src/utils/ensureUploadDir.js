const fs = require('fs');
const path = require('path');

const BASE_UPLOADS = path.join(__dirname, '..', '..', 'uploads');
const DEFAULT_FOLDERS = ['cash-advances', 'liquidations', 'reimbursements'];

function ensureDir(p) {
  try {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    // Attempt to set directory permissions: rwx for owner and group, rx for others
    try {
      fs.chmodSync(p, 0o770);
    } catch (chmodErr) {
      // On some platforms (Windows) chmod may be a no-op; warn but continue
      console.warn('Failed to set permissions on directory', p, chmodErr.message);
    }
  } catch (err) {
    console.warn('Failed to ensure directory', p, err.message);
  }
}

// Ensure base folders exist on load
ensureDir(BASE_UPLOADS);
for (const f of DEFAULT_FOLDERS) ensureDir(path.join(BASE_UPLOADS, f));

/**
 * Ensure a folder for a specific request exists.
 * type: one of 'cash-advances'|'liquidations'|'reimbursements'
 * number: the request number string (will be used as folder name). If falsy, uses idFallback.
 */
function ensureRequestFolder(type, number, idFallback) {
  const t = String(type || '').trim();
  const folder = t && DEFAULT_FOLDERS.includes(t) ? t : 'misc';
  const name = String(number || idFallback || '').trim();
  const target = name ? path.join(BASE_UPLOADS, folder, name) : path.join(BASE_UPLOADS, folder);
  ensureDir(target);
  return target;
}

module.exports = { ensureRequestFolder, BASE_UPLOADS };
