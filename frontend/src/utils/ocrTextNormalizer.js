// =============================================================================
// ocrTextNormalizer.js
//
// Two normalization levels:
//
//   normalizeOcrText(text)
//     Full-document pass. Fixes known whole-word OCR misreads before any
//     field extraction runs. Safe to run on the entire raw OCR string.
//
//   canonicalizeLabel(text)
//     Turns a single label string (or a line containing a label) into a
//     canonical comparison key. Used internally by the matcher in
//     receiptExtractor.js so every label variant in receiptFieldConfig.js
//     is compared on equal footing.
//
//     Transformations applied to the LABEL PORTION ONLY (trailing amounts
//     are preserved verbatim so amount regexes on the original line stay safe):
//       - uppercase
//       - collapse whitespace, underscores, hyphens → single space
//       - OCR character substitutions: U→V, 0→O, 1→I, 5→S
//       - known whole-word fixes: ANOUNT/ARNOUNT → AMOUNT, etc.
// =============================================================================

// ─── Full-document normalization ─────────────────────────────────────────────
export const normalizeOcrText = (text = '') =>
  text
    .replace(/\r/g, '\n')
    .replace(/[|]/g, 'I')
    // VAT / VATABLE misreads
    .replace(/\bUATABLE\b/gi, 'VATABLE')
    .replace(/\bUAT\b/gi,     'VAT')
    // AMOUNT misreads
    .replace(/\bANOUNT\b/gi,  'AMOUNT')
    .replace(/\bARNOUNT\b/gi, 'AMOUNT')
    .replace(/\bAM0UNT\b/gi,  'AMOUNT')
    // SALES misreads
    .replace(/\bSA1ES\b/gi,   'SALES')
    .replace(/\bSALE5\b/gi,   'SALES')
    // EXEMPT misreads
    .replace(/\bEXENPT\b/gi,  'EXEMPT')
    .replace(/\bEXEMPI\b/gi,  'EXEMPT')
    // ZERO / RATED misreads
    .replace(/\bZER0\b/gi,    'ZERO')
    .replace(/\bRATFD\b/gi,   'RATED')
    .replace(/\bRATEO\b/gi,   'RATED')
    // TIN misreads
    .replace(/\bT1N\b/g,      'TIN')
    .replace(/\bTlN\b/g,      'TIN');


// ─── Label canonicalization ───────────────────────────────────────────────────

/** Regex that matches a trailing currency amount on a line. */
const TRAILING_AMOUNT_RE =
  /[₱Pp]?\s*[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?\s*$|[₱Pp]?\s*[0-9]+(?:\.[0-9]{1,2})?\s*$/;

/**
 * canonicalizeLabel(text) → string
 *
 * Strips and normalizes the label portion of a line for comparison.
 * Amounts at the end of the string are left untouched.
 *
 * Examples:
 *   "VAT_AMOUNT"          → "VAT AMOUNT"
 *   "VAT _AMT"            → "VAT AMT"
 *   "ZERO-RATED SALES"    → "ZERO RATED SALES"
 *   "Zero Hated Sales"    → "ZERO HATED SALES"   (HATED matched by config)
 *   "VATABLE SALES 1,250.00" → "VATABLE SALES 1,250.00"  (amount preserved)
 */
export const canonicalizeLabel = (text = '') => {
  // Split off any trailing amount so digit replacements don't corrupt it
  const amountMatch = text.match(TRAILING_AMOUNT_RE);
  const splitIdx    = amountMatch ? text.lastIndexOf(amountMatch[0]) : text.length;
  const labelPart   = text.slice(0, splitIdx);
  const amountPart  = text.slice(splitIdx);

  const normalized = labelPart
    .toUpperCase()
    // Collapse separators (underscores, hyphens, extra spaces) → single space
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g,    ' ')
    // OCR character substitutions (label-safe — amount is already split off)
    .replace(/\bU\b/g, 'V')   // standalone U  (e.g. "U VAT" edge case)
    .replace(/U(?=[A-Z])/g, 'V') // U before letter (UAT → VAT, UATABLE → VATABLE)
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/5/g, 'S')
    // Whole-word fixes that survive the char substitutions
    .replace(/\bANOVNT\b/g, 'AMOUNT')
    .replace(/\bARNOVNT\b/g, 'AMOUNT')
    .trim();

  return amountPart.trim()
    ? normalized + ' ' + amountPart.trim()
    : normalized;
};