import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Paperclip, Send, CheckCircle } from 'lucide-react';
import api from '../api';
import AttachmentViewer from './AttachmentViewer';
import { useAuth } from '../context/AuthContext';
import Button from './ui/Button';
import Input from './ui/Input';
import { Card, CardContent } from './ui/Card';
import { Alert, InlineAlert } from './ui/Alert';
import Modal from './ui/Modal';
import { normalizeDate, formatLongDate } from '../utils/formatters';
import PaymentDetailsSection from './forms/PaymentDetailsSection';
import ExpensesBreakdown, { blankExpense } from './forms/Expensesbreakdown';
import ItinerarySheet, { blankItinerary } from './forms/Itinerarysheet';

// Module-level helpers and constants
const currencyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Normalise a raw expense row coming from the GET /reimbursements/:id response.
 * The backend now returns `expenses[]` with an `attachments[]` array on each row.
 */
const mapIncomingExpense = (it, idx) => ({
  id:             it.id || idx + 1,
  particulars:    it.particulars   || it.particular    || it.description || '',
  actualAmount:   parseFloat(it.actualAmount   || it.actual_amount   || it.amount || 0),
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
  // The GET endpoint returns receipt info inside attachments[]
  attachment:
    it.attachments?.length > 0
      ? {
          id:         it.attachments[0].id,
          fileName:   it.attachments[0].file_name  || it.attachments[0].fileName,
          filePath:   it.attachments[0].file_path  || it.attachments[0].filePath,
          fileType:   it.attachments[0].file_type  || it.attachments[0].fileType,
          fileSize:   it.attachments[0].file_size  || it.attachments[0].fileSize,
          isExisting: true,
        }
      : null,
});

/**
 * Normalise a raw itinerary row from the GET response.
 * The backend returns `itinerary[]` with a `receipt{}` object on each row.
 */
const mapIncomingItinerary = (it, idx) => ({
  id:                   it.id || idx + 1,
  dateCovered:          normalizeDate(it.dateCovered || it.date_covered || it.travel_date || ''),
  storeName:            it.storeName    || it.store_name    || it.store          || '',
  fromPlace:            it.fromPlace    || it.from_place    || it.transport_from || it.fromLocation || '',
  toPlace:              it.toPlace      || it.to_place      || it.transport_to   || it.toLocation   || '',
  modeOfTransportation: it.modeOfTransportation || it.mode_of_transportation || it.transport_mode || '',
  amount:               parseFloat(it.amount || 0),
  receipt:
    it.receipt
      ? {
          id:         it.receipt.id,
          fileName:   it.receipt.file_name  || it.receipt.fileName,
          filePath:   it.receipt.file_path  || it.receipt.filePath,
          fileType:   it.receipt.file_type  || it.receipt.fileType,
          fileSize:   it.receipt.file_size  || it.receipt.fileSize,
          isExisting: true,
        }
      : null,
});

// 7 calendar days from the request date (used as the minimum "Date Needed")
const getMinDateNeeded = (requestDate) => {
  let d;
  if (requestDate) {
    // Parse "YYYY-MM-DD" as local time to avoid UTC off-by-one shifts
    const [y, m, day] = requestDate.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date();
  }
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Safely extract a YYYY-MM-DD string from either a JS Date object, an ISO
// datetime string ("2025-06-20T00:00:00.000Z"), or a plain date string.
const toDateString = (val) => {
  if (!val) return '';
  // JS Date object → use toISOString()
  if (val instanceof Date) return val.toISOString().split('T')[0];
  // Already a plain date string
  const s = String(val);
  // ISO datetime string — take the date part before 'T'
  if (s.includes('T')) return s.split('T')[0];
  return s;
};

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

// ReimbursementForm component
const ReimbursementForm = (props) => {
  const { editData, onClose, viewOnly = false, hideCloseButton = false, accountingEdit = false, editReason = '', editResultStatus = 'released', onSaved } = props || {};
  const isEditMode = !!editData;
  const { user }   = useAuth();
  const navigate   = useNavigate();

  // Form state initialization with editData fallback for edit mode, or sensible defaults for create mode
  const [formData, setFormData] = useState(() => {
    if (editData) {
      return {
        reimbursementNumber: editData.reimbursementNumber || editData.reimbursement_number || '',
        reimbursementDate:   toDateString(editData.reimbursementDate || editData.reimbursement_date) || new Date().toISOString().split('T')[0],
        requestedBy:         editData.requestedBy   || editData.submitted_by  || user?.name       || '',
        department:     editData.department    || editData.department_id   || '',
        departmentName: editData.departmentName || editData.department_name || '',
        employeeId:          editData.employeeId    || '',
        businessUnit:        editData.businessUnit  || editData.business_unit  || 'EPC',
        purpose:             editData.purpose || '',
        dateNeeded:          toDateString(editData.dateNeeded || editData.date_needed || ''),
        dateCoverageFrom:    toDateString(editData.dateCoverageFrom || editData.start_date || ''),
        dateCoverageTo:      toDateString(editData.dateCoverageTo || editData.end_date || ''),
        paymentMethod:       editData.paymentMethod || editData.payment_method || 'payroll',
        gcashName:           editData.gcashName     || editData.gcash_name     || '',
        accountNumber:       editData.accountNumber || editData.account_number || '',
        remarks:             editData.remarks       || '',
        status:              editData.status        || 'draft',
        approver:            editData.approver || editData.approved_by_name || '',
        approvedDate:        toDateString(editData.approvedDate || editData.approved_at || '') || '',
      };
    }
    return {
      reimbursementNumber: '',
      reimbursementDate:   new Date().toISOString().split('T')[0],
      dateNeeded:          '',
      requestedBy:         user?.name       || '',
      department:     user?.department_id || user?.departmentId || '',
      departmentName: user?.department_name || user?.departmentName || user?.department || '',
      employeeId:          '',
      businessUnit:        'EPC',
      purpose:             '',
      dateCoverageFrom:    '',
      dateCoverageTo:      '',
      paymentMethod:       'payroll',
      gcashName:           '',
      accountNumber:       '',
      remarks:             '',
      status:              'draft',
      approver:            '',
      approvedDate:        '',
    };
  });

  // Expenses Breakdown rows
  // The GET endpoint returns the array under the key `expenses`
  const [expenses, setExpenses] = useState(() => {
    if (editData?.expenses?.length > 0)      return editData.expenses.map(mapIncomingExpense);
    if (editData?.items?.length > 0)         return editData.items.map(mapIncomingExpense);
    return [blankExpense(1)];
  });

  // Itinerary Sheet rows
  // The GET endpoint returns the array under the key `itinerary`
  const [itineraryItems, setItineraryItems] = useState(() => {
    if (editData?.itinerary?.length > 0)         return editData.itinerary.map(mapIncomingItinerary);
    if (editData?.transportation?.length > 0)    return editData.transportation.map(mapIncomingItinerary);
    if (editData?.itineraryItems?.length > 0)    return editData.itineraryItems.map(mapIncomingItinerary);
    return [];
  });

  const [departments,  setDepartments]  = useState([]);
  const [userProfile,  setUserProfile]  = useState(null);
  const [attachments,  setAttachments]  = useState(() => {
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
  // Gate accounting's "Update Transaction" behind an explicit confirmation
  // since saving now also releases the transaction.
  const [confirmReleaseOpen, setConfirmReleaseOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);

  const handleExpensesChange = useCallback((updated) => {
    if (typeof updated === 'function') {
      setExpenses(updated);   // functional update from OCR callback
    } else {
      setExpenses(updated);   // plain array update
    }
  }, []);

  const handleItineraryItemsChange = useCallback((updated) => setItineraryItems(updated), []);

  // Helpers for showing snackbars and fetching initial data
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const generateReimbursementNumber = useCallback(() => {
    const d      = new Date();
    const year   = d.getFullYear();
    const month  = String(d.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setFormData((prev) => ({ ...prev, reimbursementNumber: `RI-${year}${month}-${random}` }));
  }, []);

  // Fetch helpers for departments and user profile (for payment-details auto-fill)
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

  // Initialize form with fetched data when in edit mode, or generate a new reimbursement number when in create mode
  useEffect(() => {
    fetchDepartments();
    if (!editData) generateReimbursementNumber();
  }, [fetchDepartments, generateReimbursementNumber, editData]);

  // After fetchDepartments runs, resolve department ID <-> name for both new and edit forms.
  useEffect(() => {
    if (departments.length === 0) return;
    setFormData((prev) => {
      // Case 1: have ID but no name (edit mode race-condition)
      if (prev.department && (!prev.departmentName || prev.departmentName.trim() === '')) {
        const found = departments.find((d) => String(d.id) === String(prev.department));
        if (found) return { ...prev, departmentName: found.name };
      }
      // Case 2: have name but no numeric ID (new form - user object only carries name)
      if ((!prev.department || prev.department === '') && prev.departmentName && prev.departmentName.trim() !== '') {
        const found = departments.find(
          (d) => d.name?.toLowerCase() === prev.departmentName.trim().toLowerCase()
        );
        if (found) return { ...prev, department: found.id };
      }
      return prev;
    });
  }, [departments]);

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
  const totalAmount = useMemo(
    () =>
      expenses.reduce((s, it) => s + (parseFloat(it.actualAmount) || 0), 0) +
      itineraryItems.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0),
    [expenses, itineraryItems],
  );

  // ── Form field handler ─────────────────────────────────────────────────────
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Keep "Period Covered" start in sync with "Date Needed"
      if (name === 'dateNeeded') {
        next.dateCoverageFrom = value;
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [name]: '', ...(name === 'dateNeeded' ? { dateCoverageFrom: '' } : {}) }));
  }, []);

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
    setAttachments((prev) => {
      const att = prev[index];
      if (!att) return prev;
      if (att.isExisting && att.id && editData?.id) {
        setPendingDeletes((pd) => Array.from(new Set([...pd, att.id])));
        showSnackbar('Attachment marked for removal (will be deleted on save)', 'info');
      } else {
        try { if (att?.preview) URL.revokeObjectURL(att.preview); } catch { }
      }
      return prev.filter((_, i) => i !== index);
    });
  }, [editData?.id, showSnackbar]);   // ← no longer needs attachments in deps

  // ── File-upload helpers ────────────────────────────────────────────────────

  /**
   * Upload new receipt files attached to expense rows.
   * Returns a new array of expense objects with resolved server-side attachment info.
   */
  const uploadExpenseAttachments = useCallback(async (currentItems, reimbursementId) => {
    const results = [];
    for (const item of currentItems) {
      if (!item.attachment || item.attachment.isExisting) { results.push(item); continue; }
      const fd = new FormData();
      fd.append('file',         item.attachment);
      fd.append('resourceType', 'reimbursements');
      fd.append('resourceId',   reimbursementId);
      try {
        const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (res.data?.success) {
          results.push({
            ...item,
            attachment: {
              id:         res.data.id   || null,
              fileName:   item.attachment.name,
              filePath:   res.data.path,
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
  const uploadItineraryReceipts = useCallback(async (currentItems, reimbursementId) => {
    const results = [];
    for (const item of currentItems) {
      if (!item.receipt || item.receipt.isExisting) { results.push(item); continue; }
      const fd = new FormData();
      fd.append('file',         item.receipt);
      fd.append('resourceType', 'reimbursements');
      fd.append('resourceId',   reimbursementId);
      try {
        const res = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (res.data?.success) {
          results.push({
            ...item,
            receipt: {
              id:         res.data.id   || null,
              fileName:   item.receipt.name,
              filePath:   res.data.path,
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
   * Upload top-level supporting documents and link them to the reimbursement.
   */
  const uploadSupportingDocuments = useCallback(async (reimbursementId) => {
    try {
      const updated = [];
      for (const file of attachments) {
        if (file.isExisting) { updated.push(file); continue; }
        const fd = new FormData();
        fd.append('file',         file);
        fd.append('resourceType', 'reimbursements');
        fd.append('resourceId',   reimbursementId);
        try {
          const uploadRes = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          if (uploadRes.data?.success) {
            const attachRes = await api.post(`/reimbursements/${reimbursementId}/attachments`, {
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

  const buildPayload = useCallback(
    (status, finalExpenses, finalItinerary) => ({
      reimbursementNumber: formData.reimbursementNumber,
      reimbursementDate:   formData.reimbursementDate,
      requestedBy:         formData.requestedBy,
      department:          formData.department || null,
      businessUnit:        formData.businessUnit,
      purpose:             formData.purpose             || null,
      dateNeeded:          formData.dateNeeded          || null,
      dateCoverageFrom:    formData.dateCoverageFrom    || null,
      dateCoverageTo:      formData.dateCoverageTo      || null,
      totalAmount:         totalAmount,
      // paymentMethod must match DB ENUM: 'gcash' | 'payroll'
      paymentMethod:       formData.paymentMethod       || null,
      gcashName:           formData.gcashName           || null,
      accountNumber:       formData.accountNumber       || null,
      remarks:             formData.remarks             || null,
      status,
      approver:            formData.approver     || null,
      approvedDate:        formData.approvedDate || null,

      items: finalExpenses.map((item) => ({
        description:    item.particulars,
        amount:         parseFloat(item.actualAmount) || 0,
        receiptNumber:  item.receiptNumber  || '',
        tin:            item.tin            || null,
        vendor:         item.vendor         || null,
        vatType:        item.vatType        || 'NonVAT',
        address:        item.address        || null,
        vatable:        parseFloat(item.vatable)        || 0,
        vatAmount:      parseFloat(item.vatAmount)      || 0,
        zeroRatedSales: parseFloat(item.zeroRatedSales) || 0,
        vatExemptSales: parseFloat(item.vatExemptSales) || 0,
        expenseDate:    item.expenseDate    || null,
        // Controller reads attachments[0] to create a reimbursement_receipts row
        attachments:    item.attachment ? [item.attachment] : [],
      })),

      transportation: finalItinerary.map((it) => ({
        dateCovered:      it.dateCovered          || null,
        store:            it.storeName            || '',
        fromLocation:     it.fromPlace            || null,
        toLocation:       it.toPlace              || null,
        modeOfTransport:  it.modeOfTransportation || null,
        amount:           parseFloat(it.amount)   || 0,
        receipt:          it.receipt || null,
      })),
    }),
    [formData, totalAmount],
  );

  // Validation 
  const validateForm = useCallback(() => {
    const errs = {};
    if (!formData.purpose?.trim())
      errs.purpose = 'Purpose is required';
    if (!formData.requestedBy?.toString().trim())
      errs.requestedBy = 'Requested by is required';
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
    if (totalAmount === 0)
      errs.total = 'Total amount must be greater than 0';

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      showSnackbar(Object.values(errs)[0], 'error');
      return false;
    }
    return true;
  }, [formData, expenses, totalAmount, showSnackbar]);

  // Draft-only validation: Purpose required + at least 1 expense with a Particular
  const validateDraft = useCallback(() => {
    const errs = {};

    if (!formData.purpose?.trim()) {
      errs.purpose = 'Purpose is required';
    }
    if (!formData.department) {
      errs.department = 'Department is required';
    }

    // At least one expense must have a Particular filled in
    const hasParticular = expenses.some((it) => it.particulars?.toString().trim());
    if (!hasParticular) {
      expenses.forEach((it) => {
        if (!it.particulars?.toString().trim()) {
          errs[`expense_particulars_${it.id}`] = 'Required';
        }
      });
      errs.expenses = 'At least one expense with a Particular is required';
    }

    // Itinerary: any row that exists must not be entirely empty
    itineraryItems.forEach((it) => {
      if (!it.dateCovered)                         errs[`itinerary_date_${it.id}`]           = 'Required';
      if (!it.storeName?.toString().trim())        errs[`itinerary_storeName_${it.id}`]       = 'Required';
      if (!it.fromPlace?.toString().trim())        errs[`itinerary_fromPlace_${it.id}`]       = 'Required';
      if (!it.toPlace?.toString().trim())          errs[`itinerary_toPlace_${it.id}`]         = 'Required';
      if (!it.modeOfTransportation?.toString().trim()) errs[`itinerary_mode_${it.id}`]        = 'Required';
      if (!(parseFloat(it.amount) > 0))            errs[`itinerary_amount_${it.id}`]          = 'Required';
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData, expenses, itineraryItems]);

  // Full submit validation: all expense fields + receipt required
  const validateSubmit = useCallback(() => {
    const errs = {};
    if (!formData.purpose?.trim())
      errs.purpose = 'Purpose is required';
    if (!formData.requestedBy?.toString().trim())
      errs.requestedBy = 'Requested by is required';
    if (!formData.department)
      errs.department = 'Department is required';

    expenses.forEach((it) => {
      if (!it.particulars?.toString().trim())
        errs[`expense_particulars_${it.id}`] = 'Required';
      if (!(parseFloat(it.actualAmount) > 0))
        errs[`expense_amount_${it.id}`] = 'Required';
      if (!it.attachment)
        errs[`expense_receipt_${it.id}`] = 'Receipt is required';
    });

    if (expenses.some((it) => !it.particulars?.toString().trim() || !(parseFloat(it.actualAmount) > 0) || !it.attachment))
      errs.expenses = 'All expenses must have Particulars, Amount, and a Receipt';

    if (formData.dateCoverageFrom && formData.dateCoverageTo) {
      const outOfRange = expenses.some((it) => {
        if (!it.expenseDate) return false;
        return it.expenseDate < formData.dateCoverageFrom || it.expenseDate > formData.dateCoverageTo;
      });
      if (outOfRange)
        errs.expenses = `Expense dates must be within the coverage period (${formatLongDate(formData.dateCoverageFrom)} – ${formatLongDate(formData.dateCoverageTo)})`;
    }

    if (totalAmount === 0)
      errs.total = 'Total amount must be greater than 0';

    itineraryItems.forEach((it) => {
      if (!it.dateCovered)                              errs[`itinerary_date_${it.id}`]      = 'Required';
      if (!it.storeName?.toString().trim())             errs[`itinerary_storeName_${it.id}`] = 'Required';
      if (!it.fromPlace?.toString().trim())             errs[`itinerary_fromPlace_${it.id}`] = 'Required';
      if (!it.toPlace?.toString().trim())               errs[`itinerary_toPlace_${it.id}`]   = 'Required';
      if (!it.modeOfTransportation?.toString().trim())  errs[`itinerary_mode_${it.id}`]      = 'Required';
      if (!(parseFloat(it.amount) > 0))                 errs[`itinerary_amount_${it.id}`]    = 'Required';
    });

    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      showSnackbar(Object.values(errs)[0], 'error');
      return false;
    }
    return true;
  }, [formData, expenses, itineraryItems, totalAmount, showSnackbar]);

  // When the requestor is themselves an approver, their reimbursement skips
  // the approval queue and is auto-approved on submit — same rule as
  // CashAdvanceForm. The approver is always the logged-in user, and the
  // approved date is today's date at the moment of (re-)submission.
  const isApprover = !!(
    user?.role?.toLowerCase().includes('approver') ||
    user?.role?.toLowerCase().includes('manager') ||
    user?.is_approver
  );

  // Persist (save draft or submit) 
  const persistForm = useCallback(async (requestedStatus) => {
    if (accountingEdit && !editReason?.trim()) {
      showSnackbar('Please provide a reason for this edit before saving.', 'error');
      return;
    }
    // Updating an already-approved reimbursement now also releases it, so
    // guard against accidental clicks with an explicit confirmation.
    if (accountingEdit) {
      setPendingStatus(requestedStatus);
      setConfirmReleaseOpen(true);
      return;
    }
    await commitPersist(requestedStatus);
  }, [accountingEdit, editReason, showSnackbar]);

  const handleConfirmRelease = useCallback(async () => {
    setConfirmReleaseOpen(false);
    await commitPersist(pendingStatus);
  }, [pendingStatus]);

  const commitPersist = useCallback(async (requestedStatus) => {
    if (requestedStatus === 'pending' && !validateSubmit()) return;
    if (requestedStatus === 'draft'   && !validateDraft())  return;
    setSubmitting(true);
    try {
      // Accounting/Admin is correcting a reimbursement outside the normal
      // flow. Saving the correction also advances its status — the previous
      // status is no longer preserved. `edit_reason` ties the change to the
      // Audit Logs. `editResultStatus` decides where it lands: 'released'
      // when edited from Disbursements (already approved, now being
      // released), or 'approved' when edited from Approvals (admin editing +
      // approving a pending request).
      const isApprovingEdit = accountingEdit && editResultStatus === 'approved';
      const autoApprove = !accountingEdit && requestedStatus === 'pending' && isApprover;
      const status = accountingEdit ? editResultStatus : (autoApprove ? 'approved' : requestedStatus);
      const approverFields = isApprovingEdit
        ? { approver: user.name, approvedDate: new Date().toISOString().split('T')[0] }
        : accountingEdit
          ? {}
          : autoApprove
            ? { approver: user.name, approvedDate: new Date().toISOString().split('T')[0] }
            : { approver: '', approvedDate: '' };

      // Phase 1: Save reimbursement header + child rows (no new files yet)
      const phase1Payload = {
        ...buildPayload(status, expenses, itineraryItems),
        ...approverFields,
        ...(accountingEdit ? { edit_reason: editReason.trim() } : {}),
      };

      const response = isEditMode && editData?.id
        ? await api.put(`/reimbursements/${editData.id}`, phase1Payload)
        : await api.post('/reimbursements', phase1Payload);

      if (!response.data?.success) {
        showSnackbar('Failed to save reimbursement', 'error');
        return;
      }

      const reimbursementId = response.data.data.id;

      // Phase 2: Upload new receipt files now that we have the DB ID 
      const hasNewExpenseReceipts   = expenses.some(e => e.attachment && !e.attachment.isExisting);
      const hasNewItineraryReceipts = itineraryItems.some(t => t.receipt && !t.receipt.isExisting);

      if (hasNewExpenseReceipts || hasNewItineraryReceipts) {
        const finalExpenses  = hasNewExpenseReceipts
          ? await uploadExpenseAttachments(expenses, reimbursementId)
          : expenses;

        const finalItinerary = hasNewItineraryReceipts
          ? await uploadItineraryReceipts(itineraryItems, reimbursementId)
          : itineraryItems;

        // Phase 3: Re-save with resolved file paths in the receipt objects 
        const phase3Payload = {
          ...buildPayload(status, finalExpenses, finalItinerary),
          ...approverFields,
          ...(accountingEdit ? { edit_reason: editReason.trim() } : {}),
        };
        await api.put(`/reimbursements/${reimbursementId}`, phase3Payload);
      }

      // Phase 4: Upload top-level supporting documents
      if (attachments.some((a) => !a.isExisting)) {
        await uploadSupportingDocuments(reimbursementId);
      }

      // Phase 5: Delete any attachments the user removed
      if (pendingDeletes.length > 0) {
        await Promise.allSettled(
          pendingDeletes
            .filter(Boolean)
            .map((delId) => api.delete(`/reimbursements/${reimbursementId}/attachments/${delId}`)),
        );
        setPendingDeletes([]);
      }

      showSnackbar(
        accountingEdit
          ? (isApprovingEdit
              ? 'Transaction updated and approved successfully. The change has been recorded in the Audit Logs.'
              : 'Transaction updated and released successfully. The change has been recorded in the Audit Logs.')
          : (status === 'draft' ? 'Draft saved successfully!' : 'Reimbursement submitted successfully!'),
        'success',
      );
      if (accountingEdit && onSaved) onSaved();
      else if (onClose) onClose();
      else navigate('/my-requests', { state: { tab: 0 } });

    } catch (error) {
      showSnackbar(
        `Error ${requestedStatus === 'draft' ? 'saving draft' : 'submitting'}: ` +
          (error.response?.data?.message || error.message),
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    validateForm, buildPayload, expenses, itineraryItems,
    isEditMode, editData?.id, isApprover, user,
    uploadExpenseAttachments, uploadItineraryReceipts,
    attachments, uploadSupportingDocuments,
    pendingDeletes, showSnackbar, onClose, navigate,
    formData.purpose, totalAmount,
    accountingEdit, editReason, onSaved, editData?.status,
  ]);

  const handleSaveDraft = useCallback(() => persistForm('draft'),   [persistForm]);
  const handleSubmit    = useCallback(() => persistForm('pending'), [persistForm]);

  // Render 
  return (
    <div className="space-y-6">
      {/* Header */}
      {!viewOnly && (
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Reimbursement Form
            </h2>
        </div>
      )}

      {/* Rejection Reason Banner */}
      {viewOnly && editData?.status?.toLowerCase() === 'rejected' && editData?.reject_remarks && (
        <InlineAlert severity="error">
          <div className="font-semibold mb-1">Rejection Reason:</div>
          <div>{editData.reject_remarks}</div>
        </InlineAlert>
      )}

      {/* Reimbursement Information */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Information</h3>
          {!viewOnly ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <TruncatedViewField label="Reimbursement Number" value={formData.reimbursementNumber} />
            <TruncatedViewField label="Requested By"         value={formData.requestedBy}         />
            <TruncatedViewField label="Department"           value={formData.departmentName || formData.department} />

            {/* Business Unit */}
            <div>
              {!viewOnly ? (
                <div className="relative border border-gray-300 rounded-lg px-3 h-[38px] flex items-center">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500">Business Unit</span>
                  <div className="flex gap-6 w-full">
                    {['EPC', 'NBFI', 'Shared'].map((unit) => (
                      <label key={unit} className="flex items-center gap-1 text-sm">
                        <input
                          type="radio"
                          name="businessUnit"
                          value={unit}
                          checked={formData.businessUnit === unit}
                          onChange={handleInputChange}
                          className="w-4 h-4"
                        />
                        {unit}
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <TruncatedViewField label="Business Unit" value={formData.businessUnit} />
              )}
            </div>

            {/* Request Date (read-only — auto-filled) */}
            {viewOnly ? (
              <TruncatedViewField label="Request Date" value={formatLongDate(formData.reimbursementDate)} />
            ) : (
              <div className="relative w-full">
                <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600 z-10">Request Date</span>
                <input
                  type="date"
                  name="reimbursementDate"
                  value={formData.reimbursementDate}
                  readOnly
                  className="px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 w-full text-sm text-gray-900 outline-none cursor-default"
                />
              </div>
            )}

            {/* Date Needed */}
            {viewOnly ? (
              <TruncatedViewField label="Date Needed" value={formatLongDate(formData.dateNeeded)} />
            ) : (
              <div className="relative w-full">
                <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600 z-10">Date Needed</span>
                <input
                  type="date"
                  name="dateNeeded"
                  value={formData.dateNeeded}
                  onChange={handleInputChange}
                  min={getMinDateNeeded(formData.reimbursementDate)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white w-full text-sm text-gray-900 outline-none focus:border-primary-600 hover:border-gray-900"
                />
              </div>
            )}

            {/* Period Covered */}
            <div className="col-span-1 md:col-span-2 relative border border-gray-300 rounded-lg px-3 h-[38px] flex items-center gap-2 focus-within:border-primary-600 hover:border-gray-900">
              <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500">Period Covered</span>
              <input
                type={viewOnly ? 'text' : 'date'}
                name="dateCoverageFrom"
                value={viewOnly ? formatLongDate(formData.dateCoverageFrom) : formData.dateCoverageFrom}
                onChange={handleInputChange}
                readOnly={viewOnly}
                max={(!viewOnly && formData.dateCoverageTo) ? formData.dateCoverageTo : undefined}
                className="flex-1 bg-transparent border-none outline-none text-sm"
              />
              <span className="text-gray-500">—</span>
              <input
                type={viewOnly ? 'text' : 'date'}
                name="dateCoverageTo"
                value={viewOnly ? formatLongDate(formData.dateCoverageTo) : formData.dateCoverageTo}
                onChange={handleInputChange}
                readOnly={viewOnly}
                min={(!viewOnly && formData.dateCoverageFrom) ? formData.dateCoverageFrom : undefined}
                className="flex-1 bg-transparent border-none outline-none text-sm text-right"
              />
            </div>

            {/* Purpose – full width */}
            <div className="col-span-1 md:col-span-4">
              {viewOnly ? (
                <TruncatedViewField label="Purpose" value={formData.purpose} />
              ) : (
                <Input
                  fullWidth
                  multiline
                  rows={2}
                  label="Purpose"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  error={errors.purpose}
                />
              )}
            </div>
          </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
              <div>
                <label className="px-1 text-xs text-gray-600">Reimbursement Number</label>
                <div className="px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                  {formData.reimbursementNumber}
                </div>
              </div>
              <div>
                <label className="px-1 text-xs text-gray-600">Requested By</label>
                <div className="px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                  {formData.requestedBy}
                </div>
              </div>
              <div>
                <label className="px-1 text-xs text-gray-600">Department</label>
                <div className="px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                  {formData.departmentName || formData.department}
                </div>
              </div>
              <div>
                <label className="px-1 text-xs text-gray-600">Business Unit</label>
                <div className="px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                  {formData.businessUnit}
                </div>
              </div>
              <div>
                <label className="px-1 text-xs text-gray-600">Request Date</label>
                <div className="px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                  {formatLongDate(formData.reimbursementDate)}
                </div>
              </div>
              <div>
                <label className="px-1 text-xs text-gray-600">Date Needed</label>
                <div className="px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                  {formatLongDate(formData.dateNeeded)}
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
              <div className="col-span-1 md:col-span-8">
                <label className="px-1 text-xs text-gray-600">Purpose</label>
                <div className="px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                  {formData.purpose}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses Summary */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses Summary</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="border border-amber-100 rounded-lg p-4 bg-amber-50/50">
              <span className="text-xs text-gray-500 block mb-1">Total Amount</span>
              <span className="text-xl font-bold text-amber-600">
                ₱ {currencyFormatter.format(totalAmount)}
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
            errors={errors}
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
          { !viewOnly ? (
          <Input
            fullWidth
            multiline
            rows={3}
            name="remarks"
            value={formData.remarks}
            onChange={handleInputChange}
          />
          ) : (
                        <div>
                            <div className="px-1 py-1 border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                              {formData.remarks ? (
                                <span className="text-sm text-gray-900 whitespace-pre-wrap">{formData.remarks}</span>
                                ) : (
                                <span className="text-sm text-gray-500 italic">No remarks provided.</span>
                                )}
                            </div>
                        </div>
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
                  id="reimbursement-file-upload"        // Line 842
                  type="file"
                  multiple
                  onChange={handleFileAttach}
                />
                <label
                  htmlFor="reimbursement-file-upload"
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
                  file_path: att.filePath || null,
                  file_type: att.fileType || att.type,
                  preview:   att.preview  || null,
                }))}
                onRemove={viewOnly ? undefined : (index) => removeAttachment(index)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end items-stretch sm:items-center">
        {!viewOnly && (
          <>
            {!accountingEdit && (
              <Button
                variant="secondary"
                startIcon={<Save className="w-4 h-4" />}
                onClick={handleSaveDraft}
                disabled={submitting}
                className="w-full sm:w-auto"
              >
                {submitting ? 'Saving…' : 'Save Draft'}
              </Button>
            )}
            <Button
              variant="primary"
              startIcon={<Send className="w-4 h-4" />}
              onClick={handleSubmit}
              disabled={submitting || (accountingEdit && !editReason?.trim())}
              className="w-full sm:w-auto"
            >
              {submitting
                ? (accountingEdit ? 'Updating…' : 'Submitting…')
                : accountingEdit
                  ? 'Update Transaction'
                  : 'Submit'}
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

      <Modal
        open={confirmReleaseOpen}
        onClose={() => setConfirmReleaseOpen(false)}
        title={editResultStatus === 'approved' ? 'Approve Transaction' : 'Release Transaction'}
        maxWidth="sm"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmReleaseOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="success"
              startIcon={<CheckCircle className="w-4 h-4" />}
              onClick={handleConfirmRelease}
              disabled={submitting}
            >
              {submitting ? (editResultStatus === 'approved' ? 'Approving…' : 'Releasing…') : (editResultStatus === 'approved' ? 'Confirm Approval' : 'Confirm Release')}
            </Button>
          </>
        }
      >
        <p className="text-gray-700">
          {editResultStatus === 'approved' ? (
            <>Updating this transaction will mark it as <span className="font-semibold text-green-700">Approved</span>, with you as the approver. Continue?</>
          ) : (
            <>Updating this transaction will mark it as <span className="font-semibold text-green-700">Released</span>. Continue?</>
          )}
        </p>
      </Modal>
    </div>
  );
};

export default ReimbursementForm;