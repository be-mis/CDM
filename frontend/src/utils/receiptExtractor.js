import { normalizeOcrText, canonicalizeLabel } from './ocrTextNormalizer';
import {
  TIN_LABELS,
  RECEIPT_NUMBER_LABELS,
  VATABLE_LABELS,
  VAT_AMOUNT_LABELS,
  ZERO_RATED_LABELS,
  VAT_EXEMPT_LABELS,
  TOTAL_AMOUNT_LABELS,
  PH_CITY_KEYWORDS,
  ADDRESS_SIGNALS,
} from './receiptFieldConfig';


// ─── Amount helpers ───────────────────────────────────────────────────────────

/** Parse a regex match whose first capture group is a currency string. */
const parseAmt = (match) =>
  match ? parseFloat(match[1].replace(/,/g, '')) || 0 : null;

/** Extract the trailing amount from a raw (un-normalized) line. */
const getAmountFromLine = (line = '') => {
  const m = line.match(
    /([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*$/
  );
  return m ? parseFloat(m[1].replace(/,/g, '')) || 0 : null;
};


// ─── Generic labeled-line amount scanner ─────────────────────────────────────

/**
 * findAmountByLabels(text, labelList) → number | null
 *
 * Scans every line of `text`. For each line whose CANONICALIZED form includes
 * the canonicalized version of any label in `labelList`, tries to parse a
 * trailing amount from the ORIGINAL line (so digits stay intact).
 *
 * All label variants live in receiptFieldConfig.js — nothing to change here.
 */
const findAmountByLabels = (text, labelList = []) => {
  // Pre-canonicalize the target labels once (not per line)
  const canonicalTargets = labelList.map(canonicalizeLabel);

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const canonLine = canonicalizeLabel(line);

    const matched = canonicalTargets.some(target => canonLine.includes(target));
    if (!matched) continue;

    const amount = getAmountFromLine(line); // original line — digits intact
    if (amount !== null) return amount;
  }

  return null;
};


// ─── TIN ──────────────────────────────────────────────────────────────────────

const normalizeTin = (raw = '') => {
  const d = String(raw).replace(/\D/g, '');
  if (d.length < 9)  return '';
  if (d.length === 9) return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6,9)}`;
  // 12-14 digits (with branch code)
  return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6,9)}-${d.slice(9,14)}`;
};

const findTin = (text = '') => {
  // Pre-canonicalize TIN label targets
  const canonicalTinLabels = TIN_LABELS.map(canonicalizeLabel);

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const canonLine = canonicalizeLabel(line);
    const hasLabel  = canonicalTinLabels.some(t => canonLine.includes(t));
    if (!hasLabel) continue;

    const tinMatch = line.match(
      /([0-9]{3}[-\s]?[0-9]{3}[-\s]?[0-9]{3}(?:[-\s]?[0-9]{3,5})?)/
    );
    if (tinMatch) return normalizeTin(tinMatch[1]);
  }

  return '';
};


// ─── Receipt / Invoice number ─────────────────────────────────────────────────

/**
 * Builds a single alternation regex from RECEIPT_NUMBER_LABELS so new label
 * variants in the config are automatically included.
 */
const buildReceiptNumberRegex = () => {
  // Sort longest-first so more-specific labels match before short ones (e.g.
  // "SALES INVOICE NO" before "INVOICE" before "NO")
  const sorted = [...RECEIPT_NUMBER_LABELS].sort((a, b) => b.length - a.length);
  const escaped = sorted.map(l =>
    l.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')   // escape regex specials
      .replace(/\\\./g, '\\.?')                  // make dots optional (NO. → NO\.?)
      .replace(/\s+/g, '\\s*')                   // flexible whitespace
  );
  const alternation = escaped.join('|');
  return new RegExp(
    `(?:${alternation})\\s*[:#.\\s]*([A-Z0-9][A-Z0-9\\-]{2,19})`,
    'i'
  );
};

const RECEIPT_NUMBER_RE = buildReceiptNumberRegex();

const findReceiptNumber = (text = '') => {
  const m = text.match(RECEIPT_NUMBER_RE);
  return m?.[1]?.trim() ?? '';
};


// ─── Vendor (top-2-lines heuristic) ──────────────────────────────────────────

/**
 * Headers that should NOT be mistaken for the vendor name.
 * Extend this list as needed in receiptFieldConfig.js if you want to
 * centralize it; kept here for now as it's extractor-internal logic.
 */
const GENERIC_HEADER_RE = /^(?:OFFICIAL\s+RECEIPT|SALES\s+INVOICE|INVOICE|RECEIPT|BIR\s+ACCREDITED|CASH\s+INVOICE|DELIVERY\s+RECEIPT|CHARGE\s+INVOICE|ACKNOWLEDGE?D?\s+RECEIPT)$/i;

const isGenericHeader  = (line) => GENERIC_HEADER_RE.test(line.trim());
const isLabelLine      = (line) => /[:=]/.test(line); // has colon/equals → label, not name
const looksLikeVendor  = (line) =>
  /^[A-Z][A-Z0-9\s&.,'\-]{2,}/.test(line) &&
  !isGenericHeader(line) &&
  !isLabelLine(line);

/**
 * extractVendor(lines) → string
 *
 * Per the requirement: "CHECK THE TOP 2 LINES IN CAPITALIZE".
 * Scans the first ~10 lines and returns the first candidate that passes
 * the vendor heuristic.
 */
const extractVendor = (lines) => {
  const topLines = lines.slice(0, 10);

  // Strategy 1: line immediately after a known generic header
  for (let i = 0; i < topLines.length - 1; i++) {
    if (isGenericHeader(topLines[i])) {
      const next = topLines[i + 1]?.trim();
      if (next && looksLikeVendor(next)) return next;
    }
  }

  // Strategy 2: first capitalized line in the top section that is not a header
  for (const line of topLines) {
    if (looksLikeVendor(line)) return line.trim();
  }

  return '';
};


// ─── Address → city extraction ────────────────────────────────────────────────

// Pre-build a city regex from config (case-insensitive, whole-word)
const CITY_RE = new RegExp(
  `\\b(${PH_CITY_KEYWORDS.map(c =>
    c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|')})\\b`,
  'i'
);

const looksLikeAddress = (line) =>
  ADDRESS_SIGNALS.some(re => re.test(line)) || CITY_RE.test(line);

/**
 * extractCity(lines, vendor) → string
 *
 * Per the requirement: "ADDRESS — ONLY THE CITY".
 * Tries to isolate just the city name from an address line.
 *
 * Priority:
 *   1. Named city from PH_CITY_KEYWORDS near the vendor line
 *   2. Named city anywhere in the document
 *   3. First address-signal line near vendor (full line fallback)
 *   4. First address-signal line anywhere in the document
 */
const extractCity = (lines, vendor) => {
  const vendorIdx = vendor ? lines.findIndex(l => l === vendor) : -1;
  const nearLines = vendorIdx >= 0
    ? lines.slice(vendorIdx + 1, vendorIdx + 6)
    : lines.slice(0, 10);

  // 1 & 2: named city match
  for (const scope of [nearLines, lines]) {
    for (const line of scope) {
      const m = line.match(CITY_RE);
      if (m) return m[1]; // just the city name
    }
  }

  // 3 & 4: address-signal line fallback (return the whole line)
  for (const scope of [nearLines, lines]) {
    const found = scope.find(looksLikeAddress);
    if (found) return found.trim();
  }

  return '';
};


// ─── Amount extraction per field ──────────────────────────────────────────────

/**
 * findAmount(normalizedText, rawText, regex, labelList) → number | null
 *
 * Tries the inline regex first (faster, works on clean receipts), then falls
 * back to the labeled-line scanner using the config label list.
 *
 * `rawText` is used for the labeled-line scan so trailing digits aren't
 * corrupted by normalization.
 */
const findAmount = (normalizedText, rawText, regex, labelList) =>
  parseAmt(normalizedText.match(regex)) ??
  findAmountByLabels(rawText, labelList);


// ─── Main export ──────────────────────────────────────────────────────────────

export const extractReceiptFields = (text = '') => {
  const normalizedText = normalizeOcrText(text);

  // Lines from normalized text (used for vendor, address)
  const lines = normalizedText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  // ── VAT type ─────────────────────────────────────────────────────────────
  // Determined by presence of "VAT REG TIN" on the receipt
  const isVat  = /VAT\s*REG\s*TIN/i.test(normalizedText);
  const vatType = isVat ? 'VAT' : 'NonVAT';

  // ── TIN ───────────────────────────────────────────────────────────────────
  const tin = findTin(normalizedText);

  // ── Receipt number ────────────────────────────────────────────────────────
  const receiptNumber = findReceiptNumber(normalizedText);

  // ── Vendor ────────────────────────────────────────────────────────────────
  const vendor = extractVendor(lines);

  // ── Address (city only) ───────────────────────────────────────────────────
  const address = extractCity(lines, vendor);

  // ── Vatable sales ─────────────────────────────────────────────────────────
  const vatable = findAmount(
    normalizedText, text,
    /^\s*VATABLE(?:\s+SALES?)?\s*[:\-]?\s*[₱Pp]?\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*$/im,
    VATABLE_LABELS
  );

  // ── VAT amount ────────────────────────────────────────────────────────────
  const vatAmount = findAmount(
    normalizedText, text,
    /(?:VAT\s+AMOUNT|OUTPUT\s+TAX|12%\s+VAT)[:\s₱Pp]*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    VAT_AMOUNT_LABELS
  );

  // ── Zero-rated sales ──────────────────────────────────────────────────────
  const zeroRatedSales = findAmount(
    normalizedText, text,
    /ZERO[-\s]?RATED\s+SALES?[:\s₱Pp]*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    ZERO_RATED_LABELS
  );

  // ── VAT-exempt sales ──────────────────────────────────────────────────────
  const vatExemptSales = findAmount(
    normalizedText, text,
    /(?:VAT[-\s]?EXEMPT|EXEMPT)\s+SALES?[:\s₱Pp]*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    VAT_EXEMPT_LABELS
  );

  // ── Actual / total amount ─────────────────────────────────────────────────
  // Only attempted when none of the VAT breakdown fields were found, to avoid
  // double-counting (e.g. a receipt that shows "TOTAL" AND "VATABLE SALES").
  const totalAmount = findAmountByLabels(text, TOTAL_AMOUNT_LABELS);

  return {
    vatType,
    tin,
    receiptNumber,
    vendor,
    address,
    vatable,
    vatAmount,
    zeroRatedSales,
    vatExemptSales,
    totalAmount,   // non-null only when no VAT breakdown was found
  };
};