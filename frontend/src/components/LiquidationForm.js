import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Paperclip, Send } from 'lucide-react';
import api from '../api';
import AttachmentViewer from './AttachmentViewer';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';
import Input from './ui/Input';
import Autocomplete from './ui/Autocomplete';
import { Card, CardContent } from './ui/Card';
import { Alert } from './ui/Alert';
import { normalizeDate, formatLongDate } from '../utils/formatters';
import PaymentDetailsSection from './forms/PaymentDetailsSection';
import ExpensesBreakdown, { blankExpense } from './forms/Expensesbreakdown';
import ItinerarySheet, { blankItinerary } from './forms/Itinerarysheet';

// ─────────────────────────────────────────────────────────────────────────────
// Module-level helpers
// ─────────────────────────────────────────────────────────────────────────────
const currencyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Map a server expense row → frontend ExpensesBreakdown shape.
 *
 * Server column  →  Frontend field
 * ─────────────────────────────────
 * particular     →  particulars
 * actual_amount  →  actualAmount
 * vendor_name    →  vendor
 * vatable_sales  →  vatable
 * attachments[]  →  attachment  (receipt joined by controller)
 */
const mapIncomingExpense = (it, idx) => ({
  id:             it.id || idx + 1,
  particulars:    it.particulars   || it.particular    || '',
  actualAmount:   parseFloat(it.actualAmount   || it.actual_amount   || 0),
  receiptNumber:  it.receiptNumber || it.receipt_number || '',
  tin:            it.tin           || '',
  vendor:         it.vendor        || it.vendor_name   || '',
  address:        it.address       || '',
  vatType:        it.vatType       || it.vat_type      || '',
  vatable:        parseFloat(it.vatable        || it.vatable_sales   || 0),
  vatAmount:      parseFloat(it.vatAmount      || it.vat_amount      || 0),
  zeroRatedSales: parseFloat(it.zeroRatedSales || it.zero_rated_sales || 0),
  vatExemptSales: parseFloat(it.vatExemptSales || it.vat_exempt_sales || 0),
  expenseDate:    normalizeDate(it.expenseDate || it.expense_date || ''),
  // Controller returns receipt info inside attachments[].
  attachment:
    it.attachments?.length > 0
      ? {
          id:         it.attachments[0].id,
          fileName:   it.attachments[0].file_name  || it.attachments[0].fileName || it.attachments[0].name,
          filePath:   it.attachments[0].file_path  || it.attachments[0].filePath,
          fileType:   it.attachments[0].file_type  || it.attachments[0].fileType,
          fileSize:   it.attachments[0].file_size  || it.attachments[0].fileSize,
          isExisting: true,
        }
      : null,
});

/**
 * Map a server itinerary / transportation row → frontend ItinerarySheet shape.
 *
 * Server column    →  Frontend field
 * ──────────────────────────────────────
 * travel_date      →  dateCovered
 * store_name       →  storeName
 * transport_from   →  fromPlace
 * transport_to     →  toPlace
 * transport_mode   →  modeOfTransportation
 * receipt (object) →  receipt
 */
const mapIncomingItinerary = (it, idx) => ({
  id:                   it.id || idx + 1,
  dateCovered:          normalizeDate(it.dateCovered || it.date_covered || it.travel_date || ''),
  storeName:            it.storeName    || it.store_name    || it.store          || '',
  fromPlace:            it.fromPlace    || it.from_place    || it.transport_from || '',
  toPlace:              it.toPlace      || it.to_place      || it.transport_to   || '',
  modeOfTransportation: it.modeOfTransportation || it.mode_of_transportation || it.transport_mode || '',
  amount:               parseFloat(it.amount || 0),
  // Controller returns receipt info as a nested object.
  receipt:
    it.receipt
      ? {
          id:         it.receipt.id,
          fileName:   it.receipt.file_name  || it.receipt.fileName || it.receipt.name,
          filePath:   it.receipt.file_path  || it.receipt.filePath,
          fileType:   it.receipt.file_type  || it.receipt.fileType,
          fileSize:   it.receipt.file_size  || it.receipt.fileSize,
          isExisting: true,
        }
      : null,
});

// Read-only display field reused in the header section.
const TruncatedViewField = ({ value, label }) => (
  <div className="relative w-full">
    {label && (
      <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500 z-10">
        {label}
      </span>
    )}
    <div
      className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-900 min-h-[38px] flex items-center w-full"
      title={value || ''}
    >
      <span className="truncate w-full">{value || '-'}</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// LiquidationForm
// ─────────────────────────────────────────────────────────────────────────────
const LiquidationForm = (props) => {
  const { initialData, editData, onClose, viewOnly = false } = props || {};
  const isEditMode = !!editData;
  const { user }   = useAuth();
  const navigate   = useNavigate();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState(() => {
    if (editData) {
      return {
        liquidationNumber:  editData.liquidationNumber  || editData.liquidation_number  || '',
        liquidationDate:    normalizeDate(editData.liquidationDate || editData.liquidation_date) || new Date().toISOString().split('T')[0],
        cashAdvanceId:      editData.cashAdvanceId      || editData.cash_advance_id      || '',
        submittedBy:        editData.submittedBy        || editData.submitted_by         || user?.name || '',
        department:         editData.department         || user?.department              || '',
        businessUnit:       editData.businessUnit       || editData.business_unit        || '',
        dateCoverageFrom:   normalizeDate(editData.dateCoverageFrom || editData.date_coverage_from || ''),  // ← editData
        dateCoverageTo:     normalizeDate(editData.dateCoverageTo   || editData.date_coverage_to   || ''),  // ← editData
        totalAdvanceAmount: parseFloat(editData.totalAdvanceAmount || editData.total_advance_amount) || 0,
        refundAmount:       parseFloat(editData.refundAmount       || editData.refund_amount)        || 0,
        additionalPayment:  parseFloat(editData.additionalPayment  || editData.additional_payment)   || 0,
        paymentMethod:      editData.paymentMethod || editData.payment_method || 'payroll',
        gcashName:          editData.gcashName     || editData.gcash_name     || '',
        accountNumber:      editData.accountNumber || editData.account_number || '',
        remarks:            editData.remarks       || '',
        status:             editData.status        || 'draft',
      };
    }
    return {
      liquidationNumber:  '',
      liquidationDate:    new Date().toISOString().split('T')[0],
      cashAdvanceId:      initialData?.id || '',
      submittedBy:        initialData?.requestedBy || initialData?.requested_by || user?.name || '',
      department:         initialData?.department  || user?.department           || '',
      businessUnit:       initialData?.businessUnit || initialData?.business_unit || '',
      dateCoverageFrom:   normalizeDate(initialData?.dateCoverageFrom || initialData?.date_coverage_from || ''),  // ← initialData
      dateCoverageTo:     normalizeDate(initialData?.dateCoverageTo   || initialData?.date_coverage_to   || ''),  // ← initialData
      totalAdvanceAmount: parseFloat(initialData?.totalAdvanceAmount || initialData?.requestedAmount || initialData?.requested_amount) || 0,
      refundAmount:       0,
      additionalPayment:  0,
      paymentMethod:      'payroll',
      gcashName:          '',
      accountNumber:      '',
      remarks:            '',
      status:             'draft',
    };
  });

  // Expenses Breakdown rows
  const [expenses, setExpenses] = useState(() => {
    // editData.items comes from getLiquidationById which returns `items`
    if (editData?.items?.length > 0)     return editData.items.map(mapIncomingExpense);
    if (editData?.expenses?.length > 0)  return editData.expenses.map(mapIncomingExpense);
    if (initialData?.expenses?.length > 0) {
      return initialData.expenses.map((it, idx) => ({
        ...blankExpense(it.id || idx + 1),
        particulars:   it.particulars || it.particular || it.description || '',
        receiptNumber: it.receiptNumber || it.receipt_number || '',
      }));
    }
    return [blankExpense(1)];
  });

  // Itinerary Sheet rows
  const [itineraryItems, setItineraryItems] = useState(() => {
    // editData.transportation comes from getLiquidationById
    if (editData?.transportation?.length > 0)  return editData.transportation.map(mapIncomingItinerary);
    if (editData?.itineraryItems?.length > 0)  return editData.itineraryItems.map(mapIncomingItinerary);
    return [];
  });

  const [cashAdvances,        setCashAdvances]        = useState([]);
  const [selectedCashAdvance, setSelectedCashAdvance] = useState(null);
  const [departments,         setDepartments]         = useState([]);
  const [userProfile,         setUserProfile]         = useState(null);
  const [attachments,         setAttachments]         = useState(() => {
    if (editData?.attachments?.length > 0) {
      return editData.attachments.map((att) => ({
        id:         att.id,
        fileName:   att.file_name  || att.fileName  || att.name,
        filePath:   att.file_path  || att.filePath,
        fileType:   att.file_type  || att.fileType,
        fileSize:   att.file_size  || att.fileSize,
        isExisting: true,
      }));
    }
    return [];
  });
  const [pendingDeletes, setPendingDeletes] = useState([]);
  const [snackbar,       setSnackbar]       = useState({ open: false, message: '', severity: 'success' });
  const [errors,         setErrors]         = useState({});
  const [submitting,     setSubmitting]     = useState(false);

  const handleExpensesChange = useCallback((updated) => {
    if (typeof updated === 'function') {
      setExpenses(updated);        // ← functional update from OCR callback
    } else {
      setExpenses(updated);        // ← plain array update
    }
  }, []);
  const handleItineraryItemsChange = useCallback((updated) => setItineraryItems(updated), []);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const generateLiquidationNumber = useCallback(() => {
    const d      = new Date();
    const year   = d.getFullYear();
    const month  = String(d.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setFormData((prev) => ({ ...prev, liquidationNumber: `CL-${year}${month}-${random}` }));
  }, []);

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  const fetchAdvances = useCallback(async () => {
    try {
      const [advResp, liqResp] = await Promise.allSettled([
        api.get('/cash-advances?eligible=true'),
        api.get('/liquidations'),
      ]);

      const advances =
        advResp.status === 'fulfilled' && advResp.value.data?.success
          ? advResp.value.data.data.map((item) => ({
              id:            item.id,
              advanceNumber: item.advance_number || item.advanceNumber,
              requestedBy:   item.requested_by   || item.requestedBy,
              amount:        parseFloat(item.requested_amount || item.requestedAmount || item.amount || 0),
              department:    item.department,
              status:        item.status,
            }))
          : [];

      const existingCaIds =
        liqResp.status === 'fulfilled' && liqResp.value.data?.success
          ? new Set(liqResp.value.data.data.map((l) => l.cash_advance_id || l.cashAdvanceId).filter(Boolean))
          : new Set();

          // console.log('Fetched cash advances:', advResp);
          // console.log('Existing cash advance IDs in liquidations:', liqResp);

      setCashAdvances(
        advances.filter((a) => !existingCaIds.has(a.id) && a.status?.toLowerCase() === 'released'),
      );
    } catch {
      setCashAdvances([]);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    const fallback = [
      { id: 1, name: 'Finance' }, { id: 2, name: 'Operations' },
      { id: 3, name: 'HR' },      { id: 4, name: 'IT' }, { id: 5, name: 'Marketing' },
    ];
    try {
      const response = await api.get('/departments');
      const data = response.data;
      if (Array.isArray(data))                  setDepartments(data);
      else if (Array.isArray(data.departments)) setDepartments(data.departments);
      else setDepartments(fallback);
    } catch {
      setDepartments(fallback);
    }
  }, []);

  // ── Initialise ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchDepartments();
    fetchAdvances();
    if (!editData && !initialData?.id) generateLiquidationNumber();
  }, [fetchDepartments, fetchAdvances, generateLiquidationNumber, editData, initialData?.id]);

  // Sync selected cash-advance once list loads (edit mode)
  useEffect(() => {
    if (!formData.cashAdvanceId || cashAdvances.length === 0) return;
    const found = cashAdvances.find((ca) => ca.id === formData.cashAdvanceId);
    if (found) setSelectedCashAdvance(found);
  }, [formData.cashAdvanceId, cashAdvances]);

  // Fetch full user profile for payment-details auto-fill
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/profile');
        if (res.data?.user) setUserProfile(res.data.user);
      } catch (err) {
        console.error('Failed to fetch user profile', err);
      }
    };
    if (user) fetchProfile();
  }, [user]);

  // Auto-populate payment details from profile
  useEffect(() => {
    if (!userProfile) return;
    if (formData.paymentMethod === 'payroll') {
      setFormData((prev) => ({ ...prev, accountNumber: userProfile.payroll_account || prev.accountNumber, gcashName: '' }));
    } else if (formData.paymentMethod === 'gcash') {
      setFormData((prev) => ({
        ...prev,
        accountNumber: userProfile.gcash_number || prev.accountNumber,
        gcashName:     userProfile.gcash_name   || prev.gcashName,
      }));
    }
  }, [formData.paymentMethod, userProfile]);

  // ── Derived totals ─────────────────────────────────────────────────────────
  const totalActual = useMemo(
    () =>
      expenses.reduce((s, it) => s + (parseFloat(it.actualAmount) || 0), 0) +
      itineraryItems.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0),
    [expenses, itineraryItems],
  );

  const variance = useMemo(
    () => formData.totalAdvanceAmount - totalActual,
    [formData.totalAdvanceAmount, totalActual],
  );

  // Sync refund / additional-payment
  useEffect(() => {
    if (variance > 0)
      setFormData((prev) => ({ ...prev, refundAmount: variance,          additionalPayment: 0 }));
    else if (variance < 0)
      setFormData((prev) => ({ ...prev, refundAmount: 0,                 additionalPayment: Math.abs(variance) }));
    else
      setFormData((prev) => ({ ...prev, refundAmount: 0,                 additionalPayment: 0 }));
  }, [variance]);

  // ── Form field handler ─────────────────────────────────────────────────────
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev)    => ({ ...prev, [name]: '' }));
  }, []);

  // ── Cash-advance selection ─────────────────────────────────────────────────
  const handleCashAdvanceSelect = useCallback(async (_event, newValue) => {
    if (!newValue) {
      setSelectedCashAdvance(null);
      setFormData((prev) => ({ ...prev, cashAdvanceId: '', totalAdvanceAmount: 0 }));
      return;
    }
    try {
      const resp = await api.get(`/cash-advances/${newValue.id}`);
      if (resp.data?.success) {
        const data = resp.data.data;
        if (!isEditMode) generateLiquidationNumber();
        setFormData((prev) => ({
          ...prev,
          cashAdvanceId:      data.id,
          submittedBy:        data.requested_by || data.requestedBy || prev.submittedBy,
          department:         data.department   || prev.department,
          businessUnit:       data.business_unit || data.businessUnit || prev.businessUnit,
          dateCoverageFrom: normalizeDate(data.start_date || data.startDate || data.dateCoverageFrom || ''),
          dateCoverageTo:   normalizeDate(data.end_date   || data.endDate   || data.dateCoverageTo   || ''),
          totalAdvanceAmount: parseFloat(data.requested_amount || data.requestedAmount || data.amount || prev.totalAdvanceAmount) || 0,
        }));
        if (data.expenses?.length > 0) {
          setExpenses(
            data.expenses.map((it, idx) => ({
              ...blankExpense(it.id || idx + 1),
              particulars:   it.particulars || it.particular || it.description || '',
              receiptNumber: it.receiptNumber || it.receipt_number || '',
            })),
          );
        }
        if (data.itineraryItems?.length > 0) setItineraryItems(data.itineraryItems.map(mapIncomingItinerary));
        setSelectedCashAdvance({
          id:            data.id,
          advanceNumber: data.advance_number || data.advanceNumber,
          requestedBy:   data.requested_by   || data.requestedBy,
          department:    data.department,
          businessUnit:  data.business_unit || data.businessUnit,
          dateCoverageFrom: normalizeDate(data.start_date || data.startDate || ''),
          dateCoverageTo:   normalizeDate(data.end_date   || data.endDate   || ''),
          amount:        parseFloat(data.requested_amount || data.requestedAmount || data.amount || 0),
        });
        return;
      }
    } catch (e) {
      console.warn('Failed to fetch cash advance details', e?.message || e);
    }
    // Fallback: use list-level data
    setFormData((prev) => ({
      ...prev,
      cashAdvanceId:      newValue.id,
      submittedBy:        newValue.requestedBy || prev.submittedBy,
      department:         newValue.department  || prev.department,
      businessUnit:       newValue.businessUnit || newValue.business_unit || prev.businessUnit,  // ← add this
      totalAdvanceAmount: newValue.amount      || prev.totalAdvanceAmount,
    }));
    setSelectedCashAdvance(newValue);
  }, [isEditMode, generateLiquidationNumber]);

  // ── Top-level supporting documents ────────────────────────────────────────
  const handleFileAttach = useCallback((e) => {
    const files = Array.from(e.target.files).map((f) => {
      try { f.preview = URL.createObjectURL(f); } catch { f.preview = null; }
      return f;
    });
    setAttachments((prev) => [...prev, ...files]);
    showSnackbar(`${files.length} file(s) attached`, 'success');
  }, [showSnackbar]);

  const removeAttachment = useCallback(async (index) => {
    const att = attachments[index];
    if (att?.isExisting && att.id && editData?.id) {
      setPendingDeletes((prev) => Array.from(new Set([...prev, att.id])));
      setAttachments((prev) => prev.filter((_, i) => i !== index));
      showSnackbar('Attachment marked for removal (will be deleted on save)', 'info');
      return;
    }
    try { if (att?.preview) URL.revokeObjectURL(att.preview); } catch { /* ignore */ }
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, [attachments, editData?.id, showSnackbar]);

  // File-upload helpers
  const uploadExpenseAttachments = useCallback(async (currentItems, liquidationId) => {
  const results = [];
  for (const item of currentItems) {
    if (!item.attachment || item.attachment.isExisting) { results.push(item); continue; }
    const fd = new FormData();
    fd.append('file',         item.attachment);
    fd.append('resourceType', 'liquidations');   // ← matches handleUpload maps key
    fd.append('resourceId',   liquidationId);    // ← so file moves to /uploads/liquidations/<LIQ-NUMBER>/
    try {
      const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data?.success) {
        results.push({
          ...item,
          attachment: {
            id:         res.data.id   || null,
            fileName:   item.attachment.name,
            filePath:   res.data.path,            // ← now points to correct folder
            fileType:   item.attachment.type,
            fileSize:   item.attachment.size,
            isExisting: true,
          },
        });
      } else {
        results.push(item);
      }
    } catch (err) {
      console.error('Error uploading expense attachment', err);
      results.push(item);
    }
  }
    return results;
  }, []);

  /**
   * Upload new receipt files attached to itinerary rows.
   * Returns a new array of itinerary objects with resolved server-side receipt info.
   */
  const uploadItineraryReceipts = useCallback(async (currentItems, liquidationId) => {
    const results = [];
    for (const item of currentItems) {
      if (!item.receipt || item.receipt.isExisting) { results.push(item); continue; }
      const fd = new FormData();
      fd.append('file',         item.receipt);
      fd.append('resourceType', 'liquidations');   // ← matches handleUpload maps key
      fd.append('resourceId',   liquidationId);    // ← moves to /uploads/liquidations/<LIQ-NUMBER>/
      try {
        const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (res.data?.success) {
          results.push({
            ...item,
            receipt: {
              id:         res.data.id   || null,
              fileName:   item.receipt.name,
              filePath:   res.data.path,            // ← now points to correct folder
              fileType:   item.receipt.type,
              fileSize:   item.receipt.size,
              isExisting: true,
            },
          });
        } else {
          results.push(item);
        }
      } catch (err) {
        console.error('Error uploading itinerary receipt', err);
        results.push(item);
      }
    }
    return results;
  }, []);

  /**
   * Upload top-level supporting documents and link them to the liquidation.
   */
  const uploadSupportingDocuments = useCallback(async (liquidationId) => {
    try {
      const updated = [];
      for (const file of attachments) {
        if (file.isExisting) { updated.push(file); continue; }
        const fd = new FormData();
        fd.append('file',         file);
        fd.append('resourceType', 'liquidations');
        fd.append('resourceId',   liquidationId);
        try {
          const uploadRes = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          if (uploadRes.data?.success) {
            const attachRes = await api.post(`/liquidations/${liquidationId}/attachments`, {
              fileName: file.name,
              filePath: uploadRes.data.path,
              fileType: file.type,
              fileSize: file.size,
            });
            try { if (file.preview) URL.revokeObjectURL(file.preview); } catch { /* ignore */ }
            updated.push({
              id:         attachRes.data?.data?.id || null,
              fileName:   file.name,
              filePath:   uploadRes.data.path,
              fileType:   file.type,
              fileSize:   file.size,
              isExisting: true,
            });
          } else {
            updated.push(file);
          }
        } catch (err) {
          console.error('Error uploading supporting document', err);
          updated.push(file);
        }
      }
      setAttachments(updated);
    } catch {
      showSnackbar('Warning: Some supporting documents failed to upload', 'warning');
    }
  }, [attachments, showSnackbar]);

  // ── Build the API payload ─────────────────────────────────────────────────
  /**
   * Field name mapping summary (frontend → controller → DB column):
   *
   *  EXPENSES
   *  ─────────────────────────────────────────────────────────
   *  expenses[].particulars      → items[].description    → particular
   *  expenses[].actualAmount     → items[].amount         → actual_amount
   *  expenses[].vendor           → items[].vendor         → vendor_name
   *  expenses[].vatable          → items[].vatable        → vatable_sales
   *  expenses[].vatAmount        → items[].vatAmount      → vat_amount
   *  expenses[].zeroRatedSales   → items[].zeroRatedSales → zero_rated_sales
   *  expenses[].vatExemptSales   → items[].vatExemptSales → vat_exempt_sales
   *  expenses[].attachment       → items[].attachments[0] → liquidation_receipts (via receipt_id)
   *
   *  ITINERARY
   *  ─────────────────────────────────────────────────────────
   *  itineraryItems[].dateCovered          → transportation[].dateCovered   → travel_date
   *  itineraryItems[].storeName            → transportation[].store         → store_name
   *  itineraryItems[].fromPlace            → transportation[].fromLocation  → transport_from
   *  itineraryItems[].toPlace              → transportation[].toLocation    → transport_to
   *  itineraryItems[].modeOfTransportation → transportation[].modeOfTransport → transport_mode
   *  itineraryItems[].receipt              → transportation[].receipt       → liquidation_receipts (via receipt_id)
   */
  const buildPayload = useCallback(
    (status, finalExpenses, finalItinerary) => ({
      liquidationNumber:  formData.liquidationNumber,
      liquidationDate:    formData.liquidationDate,
      cashAdvanceId:      formData.cashAdvanceId,
      submittedBy:        formData.submittedBy,
      department:         formData.department,
      businessUnit:       formData.businessUnit || null,
      dateCoverageFrom:   formData.dateCoverageFrom || null,
      dateCoverageTo:     formData.dateCoverageTo   || null,
      totalAdvanceAmount: formData.totalAdvanceAmount,
      totalActualAmount:  totalActual,
      refundAmount:       formData.refundAmount      || null,
      additionalPayment:  formData.additionalPayment || null,
      // paymentMethod must match DB ENUM: 'gcash' | 'payroll'
      paymentMethod:      formData.paymentMethod     || null,
      gcashName:          formData.gcashName         || null,
      accountNumber:      formData.accountNumber     || null,
      remarks:            formData.remarks           || null,
      status,

      // ── Expenses Breakdown ─────────────────────────────────────────────────
      // Controller key: `items`
      items: finalExpenses.map((item) => ({
        description:    item.particulars,                       // → DB: particular
        amount:         parseFloat(item.actualAmount) || 0,    // → DB: actual_amount
        receiptNumber:  item.receiptNumber  || '',
        tin:            item.tin            || null,
        vendor:         item.vendor         || null,            // → DB: vendor_name
        vatType:        item.vatType        || 'NonVAT',        // → DB: vat_type ENUM
        address:        item.address        || null,
        vatable:        parseFloat(item.vatable)        || 0,  // → DB: vatable_sales
        vatAmount:      parseFloat(item.vatAmount)      || 0,  // → DB: vat_amount
        zeroRatedSales: parseFloat(item.zeroRatedSales) || 0,  // → DB: zero_rated_sales
        vatExemptSales: parseFloat(item.vatExemptSales) || 0,  // → DB: vat_exempt_sales
        expenseDate:    item.expenseDate    || null,
        // Controller reads attachments[0] to create a liquidation_receipts row
        // and store its ID in liquidation_expenses.receipt_id.
        attachments:    item.attachment ? [item.attachment] : [],
      })),

      // ── Itinerary Sheet ────────────────────────────────────────────────────
      // Controller key: `transportation`
      transportation: finalItinerary.map((it) => ({
        dateCovered:      it.dateCovered          || null, // → DB: travel_date
        store:            it.storeName            || '',   // → DB: store_name
        fromLocation:     it.fromPlace            || null, // → DB: transport_from
        toLocation:       it.toPlace              || null, // → DB: transport_to
        modeOfTransport:  it.modeOfTransportation || null, // → DB: transport_mode
        amount:           parseFloat(it.amount)   || 0,
        // Controller creates a liquidation_receipts row and stores its ID
        // in liquidation_itinerary.receipt_id.
        receipt:          it.receipt || null,
      })),
    }),
    [formData, totalActual],
  );

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateForm = useCallback(() => {
    const errs = {};
    if (!formData.cashAdvanceId)
      errs.cashAdvanceId = 'Cash advance is required';
    if (!formData.submittedBy?.toString().trim())
      errs.submittedBy = 'Submitted by is required';
    if (!formData.department)
      errs.department = 'Department is required';
    if (expenses.some((it) => !it.particulars.toString().trim() || (parseFloat(it.actualAmount) || 0) <= 0))
      errs.expenses = 'All expenses must have particulars and a valid actual amount';
    if (formData.dateCoverageFrom && formData.dateCoverageTo) {
      const outOfRange = expenses.some((it) => {
        if (!it.expenseDate) return false;
        return it.expenseDate < formData.dateCoverageFrom || it.expenseDate > formData.dateCoverageTo;
      });
      if (outOfRange)
        errs.expenses = `Expense dates must be within the coverage period (${formatLongDate(formData.dateCoverageFrom)} – ${formatLongDate(formData.dateCoverageTo)})`;
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      showSnackbar(Object.values(errs)[0], 'error');
      return false;
    }
    return true;
  }, [formData, expenses, showSnackbar]);

  // ── Persist (save draft or submit) ─────────────────────────────────────────
  const persistForm = useCallback(async (status) => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      // ── Phase 1: Save liquidation with existing/no attachments first ──────
      // Pass expenses/itinerary as-is (existing receipts stay, new ones pending)
      const phase1Payload = buildPayload(status, expenses, itineraryItems);

      const response = isEditMode && editData?.id
        ? await api.put(`/liquidations/${editData.id}`, phase1Payload)
        : await api.post('/liquidations', phase1Payload);

      if (!response.data?.success) {
        showSnackbar('Failed to save liquidation', 'error');
        return;
      }

      const liquidationId = response.data.data.id;

      // ── Phase 2: Upload new receipt files now that we have the ID ─────────
      const hasNewExpenseReceipts   = expenses.some(e => e.attachment && !e.attachment.isExisting);
      const hasNewItineraryReceipts = itineraryItems.some(t => t.receipt && !t.receipt.isExisting);

      if (hasNewExpenseReceipts || hasNewItineraryReceipts) {
        const finalExpenses  = hasNewExpenseReceipts
          ? await uploadExpenseAttachments(expenses, liquidationId)
          : expenses;

        const finalItinerary = hasNewItineraryReceipts
          ? await uploadItineraryReceipts(itineraryItems, liquidationId)
          : itineraryItems;

        // ── Phase 3: Update liquidation with resolved file paths ─────────────
        const phase3Payload = buildPayload(status, finalExpenses, finalItinerary);
        await api.put(`/liquidations/${liquidationId}`, phase3Payload);
      }

      // ── Phase 4: Upload supporting documents ─────────────────────────────
      if (attachments.some((a) => !a.isExisting)) {
        await uploadSupportingDocuments(liquidationId);
      }

      // ── Phase 5: Process pending attachment deletions ─────────────────────
      if (pendingDeletes.length > 0) {
        await Promise.allSettled(
          pendingDeletes
            .filter(Boolean)
            .map((delId) => api.delete(`/liquidations/${liquidationId}/attachments/${delId}`)),
        );
        setPendingDeletes([]);
      }

      showSnackbar(
        status === 'draft' ? 'Draft saved successfully!' : 'Liquidation submitted successfully!',
        'success',
      );
      if (onClose) onClose();
      else navigate('/my-requests', { state: { tab: 1 } });

    } catch (error) {
      showSnackbar(
        `Error ${status === 'draft' ? 'saving draft' : 'submitting'}: ` +
          (error.response?.data?.message || error.message),
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    validateForm, buildPayload, expenses, itineraryItems,
    isEditMode, editData?.id,
    uploadExpenseAttachments, uploadItineraryReceipts,
    attachments, uploadSupportingDocuments,
    pendingDeletes, showSnackbar, onClose, navigate,
  ]);

  const handleSaveDraft = useCallback(() => persistForm('draft'),   [persistForm]);
  const handleSubmit    = useCallback(() => persistForm('pending'), [persistForm]);

  // ── Reset / cancel ─────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setFormData({
      liquidationNumber: '', liquidationDate: new Date().toISOString().split('T')[0],
      cashAdvanceId: '', submittedBy: user?.name || '', department: user?.department || '',
      businessUnit: '',
      dateCoverageFrom: '',
      dateCoverageTo:   '',
      totalAdvanceAmount: 0, refundAmount: 0, additionalPayment: 0,
      paymentMethod: 'payroll', gcashName: '', accountNumber: '', remarks: '', status: 'draft',
    });
    setExpenses([blankExpense(1)]);
    setItineraryItems([]);
    setAttachments([]);
    setErrors({});
    setPendingDeletes([]);
    setSelectedCashAdvance(null);
    generateLiquidationNumber();
  }, [user, generateLiquidationNumber]);

  const handleCancel = useCallback(() => {
    resetForm();
    if (onClose) onClose();
    else navigate('/my-requests', { state: { tab: 1 } });
  }, [resetForm, onClose, navigate]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      {!viewOnly && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Liquidation Form
          </h2>
        </div>
      )}

      {/* Liquidation Information */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Liquidation Information</h3>
          {!viewOnly ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <TruncatedViewField label="Liquidation Number" value={formData.liquidationNumber} />
              <TruncatedViewField label="Submitted By" value={formData.submittedBy} />
              <TruncatedViewField label="Department"   value={formData.department}  />
              <TruncatedViewField label="Business Unit" value={formData.businessUnit || '—'} />
              <TruncatedViewField
                label="Liquidation Date"
                value={viewOnly ? formatLongDate(formData.liquidationDate) : formData.liquidationDate}
              />
              
              <div className="col-span-1 md:col-span-2 relative border border-gray-200 rounded-lg px-3 h-[38px] flex items-center gap-2 bg-gray-50">
                <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500 z-10">
                  Date Coverage
                </span>
                <span className="text-sm text-gray-900 truncate">
                  {formData.dateCoverageFrom
                    ? formatLongDate(formData.dateCoverageFrom)
                    : '—'}
                </span>
                <span className="text-gray-400 text-sm">–</span>
                <span className="text-sm text-gray-900 truncate">
                  {formData.dateCoverageTo
                    ? formatLongDate(formData.dateCoverageTo)
                    : '—'}
                </span>
              </div>

              <div className="col-span-1 md:col-span-1">
                {!viewOnly && !isEditMode ? (
                  
                  <div className="relative w-full">
                      <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500 z-10">
                        Cash Advance to Liquidate
                      </span>
                      <Autocomplete
                        options={cashAdvances}
                        value={selectedCashAdvance}
                        getOptionLabel={(option) =>
                          option
                            ? `${option.advanceNumber || option.id} - (₱${currencyFormatter.format(option.amount)})`
                            : ''
                        }
                        onChange={(newValue) => handleCashAdvanceSelect(null, newValue)}
                        required
                        error={!!errors.cashAdvanceId}
                        helperText={errors.cashAdvanceId}
                        placeholder="Search cash advance..."
                        className="w-full"
                      />
                  </div>
                ) : (
                  <TruncatedViewField
                    label="Cash Advance to Liquidate"
                    value={
                      selectedCashAdvance
                        ? `${selectedCashAdvance.advanceNumber} - (₱${currencyFormatter.format(selectedCashAdvance.amount)})`
                        : editData?.cash_advance_number || editData?.cashAdvanceNumber
                          ? `${editData.cash_advance_number || editData.cashAdvanceNumber} - (₱${currencyFormatter.format(editData.total_advance_amount || editData.totalAdvanceAmount || 0)})`
                          : '-'
                    }
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
              <div>
                <label className="px-1 text-xs text-gray-600">Liquidation Number</label>
                <div className="px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                  {formData.liquidationNumber}
                </div>
              </div>
              <div>
                <label className="px-1 text-xs text-gray-600">Cash Advance to Liquidate</label>
                <div className="px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                  {`${editData.cash_advance_number || editData.cashAdvanceNumber}`}
                </div>
              </div>
              <div>
                <label className="px-1 text-xs text-gray-600">Submitted By</label>
                <div className="px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                  {formData.submittedBy}
                </div>
              </div>
              <div>
                <label className="px-1 text-xs text-gray-600">Department</label>
                <div className="px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                  {formData.department}
                </div>
              </div>
              <div>
                <label className="px-1 text-xs text-gray-600">Business Unit</label>
                <div className="px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                  {formData.businessUnit}
                </div>
              </div>
              <div>
                <label className="px-1 text-xs text-gray-600">Liquidation Date</label>
                <div className="px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                  {formData.liquidationDate}
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="px-1 text-xs text-gray-600">Date Coverage</label>
                  <div className={` border-b border-gray-200 flex items-center justify-between gap-2 px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900`}>
                    {formatLongDate(formData.dateCoverageFrom)}
                    <span className="text-gray-500">—</span>
                    {formatLongDate(formData.dateCoverageTo)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Summary */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-blue-100 rounded-lg p-4 bg-blue-50/50">
              <span className="text-xs text-gray-500 block mb-1">Total Cash Advance</span>
              <span className="text-xl font-bold text-blue-600">
                ₱ {currencyFormatter.format(formData.totalAdvanceAmount)}
              </span>
            </div>
            <div className="border border-amber-100 rounded-lg p-4 bg-amber-50/50">
              <span className="text-xs text-gray-500 block mb-1">Total Actual Expenses</span>
              <span className="text-xl font-bold text-amber-600">
                ₱ {currencyFormatter.format(totalActual)}
              </span>
            </div>
            <div
              className={`border rounded-lg p-4 ${
                variance >= 0 ? 'border-emerald-100 bg-emerald-50/50' : 'border-red-100 bg-red-50/50'
              }`}
            >
              <span className="text-xs text-gray-500 block mb-1">
                {variance >= 0 ? 'Refund Amount' : 'Additional Payment'}
              </span>
              <span className={`text-xl font-bold ${variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ₱ {currencyFormatter.format(Math.abs(variance))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Breakdown */}
      <Card>
        <CardContent>
          <ExpensesBreakdown
            expenses={expenses}
            onExpensesChange={handleExpensesChange}
            viewOnly={viewOnly}
            errors={errors}
            onSnackbar={showSnackbar}
            minDate={formData.dateCoverageFrom || undefined}
            maxDate={formData.dateCoverageTo   || undefined}
          />
        </CardContent>
      </Card>

      {/* Itinerary Sheet */}
      <Card>
        <CardContent>
          <ItinerarySheet
            itineraryItems={itineraryItems}
            onItineraryItemsChange={handleItineraryItemsChange}
            viewOnly={viewOnly}
            minDate={formData.dateCoverageFrom || undefined}
            maxDate={formData.dateCoverageTo   || undefined}
          />
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card>
        <CardContent>
          <PaymentDetailsSection
            formData={formData}
            viewOnly={viewOnly}
            onInputChange={handleInputChange}
            errors={errors}
            disableAccountFields={true}
          />
        </CardContent>
      </Card>

      {/* Remarks */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Remarks</h3>
          {!viewOnly ? (
          <Input
            fullWidth
            multiline
            rows={3}
            name="remarks"
            value={formData.remarks}
            onChange={handleInputChange}
          />) : (
                        <div>
                            <div className="px-1 py-1 border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                              {formData.remarks ? (
                                <span className="text-sm text-gray-900 whitespace-pre-wrap">{formData.remarks}</span>
                                ) : (
                                <span className="text-sm text-gray-500 italic">No remarks provided.</span>
                                )}
                            </div>
                        </div>
            // <div className="px-3 py-2 border-b border-gray-200 rounded-lg min-h-[80px]">
            //   {formData.remarks ? (
            //     <span className="text-sm text-gray-900 whitespace-pre-wrap">{formData.remarks}</span>
            //   ) : (
            //     <span className="text-sm text-gray-500 italic">No remarks provided.</span>
            //   )}
            // </div>
          )}
        </CardContent>
      </Card>

      {/* Supporting Documents */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Supporting Documents</h3>
          <div className="mb-4">
            {!viewOnly && (
              <>
                <input
                  accept="image/*,.pdf,.doc,.docx"
                  className="hidden"
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileAttach}
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 cursor-pointer w-fit transition-colors"
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Attach Files
                </label>
              </>
            )}
          </div>
          {attachments.length > 0 && (
            <div className="mt-4">
              <AttachmentViewer
                attachments={attachments.map((att) => ({
                  id:        att.id,
                  file_name: att.fileName || att.name,
                  file_path: att.filePath,                   // ← no longer using preview as fallback
                  file_type: att.fileType || att.type,
                  file_size: att.fileSize || att.size,       // ← add this for reliable fallback matching
                  preview:   att.preview  || null,
                }))}
                onRemove={viewOnly ? undefined : (index) => removeAttachment(index)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        {!viewOnly && (
          <>
            {!isEditMode && (
              <Button variant="secondary" onClick={resetForm} disabled={submitting}>
                Reset
              </Button>
            )}
            {isEditMode && (
              <Button variant="secondary" onClick={handleCancel} disabled={submitting}>
                Cancel
              </Button>
            )}
            <Button
              variant="secondary"
              startIcon={<Save className="w-4 h-4" />}
              onClick={handleSaveDraft}
              disabled={submitting}
            >
              {submitting ? 'Saving…' : 'Save Draft'}
            </Button>
            <Button
              variant="primary"
              startIcon={<Send className="w-4 h-4" />}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </Button>
            {/* {onClose && (
              <Button variant="ghost" onClick={onClose} disabled={submitting}>
                {isEditMode ? 'Cancel' : 'Close'}
              </Button>
            )} */}
          </>
        )}
      </div>

      <Alert
        open={snackbar.open}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        message={snackbar.message}
        severity={snackbar.severity}
        duration={4000}
        position="bottom-right"
      />
    </div>
  );
};

export default LiquidationForm;