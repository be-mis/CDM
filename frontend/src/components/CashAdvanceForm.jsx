import React, { useState, useEffect, useRef } from 'react';
import { Save, Send, CheckCircle } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import BudgetBreakdown from './forms/BudgetBreakdown';
import AttachmentsSection from './forms/AttachmentsSection';
import PaymentDetailsSection from './forms/PaymentDetailsSection';
import { formatNumber, sanitizeNumberInput, normalizeDate, formatLongDate } from '../utils/formatters';
import Button from './ui/Button';
import { Alert, InlineAlert } from './ui/Alert';
import Modal from './ui/Modal';

const fieldClassName = (invalid = false, readOnly = false) =>
    `block min-h-[44px] w-full min-w-0 rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors ${
        invalid ? 'border-red-400 focus:ring-2 focus:ring-red-100' : 'border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100'
    } ${readOnly ? 'bg-gray-50' : 'bg-white'}`;

const TruncatedViewField = ({ value, label }) => (
    <div className="min-w-0">
        <p className="mb-2 text-xs font-semibold text-gray-600">{label}</p>
        <div className="min-h-[44px] w-full break-words rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
            {value || '—'}
        </div>
    </div>
);

const CashAdvanceForm = (props) => {
    const { user } = useAuth();

    const getTodayString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getMinDateNeeded = () => {
        let d = new Date();
        let count = 0;
        while (count < 5) {
            d.setDate(d.getDate() + 1);
            const day = d.getDay();
            if (day !== 0 && day !== 6) {
                count++;
            }
        }
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const { editData, onClose, viewOnly = false, hideCloseButton = false, accountingEdit = false, editReason = '', editResultStatus = 'released', onSaved } = props || {};

    const [formData, setFormData] = useState(() => {

        if (editData) {
            return {
                advanceNumber: editData.advanceNumber || editData.advance_number || '',
                advanceDate: (editData.status?.toLowerCase() === 'draft') ? getTodayString() : (normalizeDate(editData.advanceDate) || getTodayString()),
                requestedBy: user?.name || '',
                department: editData.department || user?.department || '',
                employeeId: user?.id || '',
                advanceType: 'cash',
                purpose: editData.purpose || '',
                projectName: editData.projectName || '',
                startDate: normalizeDate(editData.startDate || editData.start_date) || '',
                endDate: normalizeDate(editData.endDate || editData.end_date) || '',
                paymentMethod: (editData.paymentMethod || editData.payment_method || 'payroll').toLowerCase(),
                businessUnit: editData.businessUnit || editData.business_unit || 'EPC',
                dateNeeded: normalizeDate(editData.dateNeeded || editData.date_needed || '') || '',
                dateCoverage: editData.dateCoverage || editData.date_coverage || '',
                gcashName: editData.gcashName || editData.gcash_name || '',
                accountNumber: editData.accountNumber || editData.account_number || '',
                status: editData.status === 'Draft' ? 'draft' : (editData.status === 'Pending Approval' ? 'pending' : editData.status?.toLowerCase() || 'draft'),
                // Approver should always reflect the logged-in user who is
                // doing the (self-)approving — never trust whatever name(s)
                // came back from editData, since the backend may return a
                // joined string of every approver in the department.
                approver: user?.name || '',
                approvedDate: normalizeDate(editData.approvedDate || editData.approved_at || '') || '',
            };
        }
        return {
            advanceNumber: '',
            advanceDate: getTodayString(),
            requestedBy: user?.name || '',
            department: user?.department || '',
            employeeId: user?.id || '',
            advanceType: 'cash',
            purpose: '',
            projectName: '',
            startDate: '',
            endDate: '',
            paymentMethod: 'payroll',
            businessUnit: user?.businessUnit || user?.business_unit || 'EPC',
            dateNeeded: getMinDateNeeded(),
            dateCoverage: '',
            gcashName: '',
            accountNumber: '',
            status: 'draft',
            approver: '',
            approvedDate: '',
        };
    });

    const [items, setItems] = useState(() => {
        if (editData && editData.items) {
            return editData.items.map((item, idx) => ({
                id: item.id || idx + 1,
                description: item.description || item.particulars || '',
                estimatedAmount: item.estimatedAmount || item.estimated_amount || item.amount || 0,
                noOfDays: item.noOfDays || item.no_of_days || 0,
                totalAmount: item.totalAmount || item.total_amount || (item.estimatedAmount || item.estimated_amount || item.amount || 0),
                expenseDate: item.expenseDate || item.expense_date || ''
            }));
        }
        return [{ id: 1, description: '', estimatedAmount: 0, noOfDays: 1, totalAmount: 0 }];
    });

    const [attachments, setAttachments] = useState([]);
    const [pendingDeletes, setPendingDeletes] = useState([]);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [errors, setErrors] = useState({});
    const [userProfile, setUserProfile] = useState(null);
    // FIX 3: Loading state to prevent duplicate submissions on rapid double-click.
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Gate accounting's "Update Transaction" behind an explicit confirmation
    // since saving now also releases the transaction.
    const [confirmReleaseOpen, setConfirmReleaseOpen] = useState(false);
    // Shown after a brand-new request is successfully submitted, instead of
    // redirecting straight away. Holds the confirmed transaction number so
    // the user can note it down before returning to My Requests.
    const [successModal, setSuccessModal] = useState({ open: false, advanceNumber: '' });

    // Track object URLs for cleanup to prevent memory leaks (FIX 6)
    const objectUrlsRef = useRef([]);

    useEffect(() => {
        if (!editData) {
            generateAdvanceNumber();
        }

        if (editData?.attachments && Array.isArray(editData.attachments)) {
            setAttachments(editData.attachments.map(att => ({
                id: att.id,
                fileName: att.file_name || att.fileName,
                filePath: att.file_path || att.filePath,
                fileType: att.file_type || att.fileType,
                fileSize: att.file_size || att.fileSize,
                isExisting: true
            })));
        }

        if (user && !editData) {
            setFormData(prev => ({
                ...prev,
                requestedBy: user.name || '',
                department: user.department || '',
                employeeId: user.id || '',
                businessUnit: user.businessUnit || user.business_unit || prev.businessUnit
            }));
        }
    }, [user, editData]);

    useEffect(() => {
        return () => {
            objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    // Fetch full user profile for payment details
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/auth/profile');
                if (res.data && res.data.user) {
                    setUserProfile(res.data.user);
                }
            } catch (err) {
                console.error("Failed to fetch user profile", err);
            }
        };
        if (user && !viewOnly) fetchProfile(); // ✅ Skip fetch entirely in view-only mode
    }, [user, viewOnly]);

    // Auto-populate Payment Details from Profile
    useEffect(() => {
        if (!userProfile) return;
        if (viewOnly) return; // ✅ Don't overwrite data when in view-only mode

        if (formData.paymentMethod === 'payroll') {
            setFormData(prev => ({
                ...prev,
                accountNumber: userProfile.payroll_account || prev.accountNumber,
                gcashName: ''
            }));
        } else if (formData.paymentMethod === 'gcash') {
            setFormData(prev => ({
                ...prev,
                accountNumber: userProfile.gcash_number || prev.accountNumber,
                gcashName: userProfile.gcash_name || prev.gcashName
            }));
        }
    }, [formData.paymentMethod, userProfile]);

    // FIX 4 (note): Advance number should ideally be server-generated to avoid
    // collisions. For now the client-side generation is kept but the number is
    // treated as provisional until the first save returns the server record.
    const generateAdvanceNumber = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const advanceNum = `CA-${year}${month}-${random}`;
        setFormData(prev => ({ ...prev, advanceNumber: advanceNum }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    // FIX 5: Cursor restoration now uses a ref-based lookup instead of a
    // fragile querySelector + setTimeout(0), which could lose the cursor
    // position if React re-rendered the input between ticks.
    const itemInputRefs = useRef({});

    const handleItemChange = (id, field, value, cursorPos) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };

            if (field === 'estimatedAmount' || field === 'noOfDays') {
                const rate = parseFloat(String(updated.estimatedAmount || '').replace(/,/g, '')) || 0;
                const days = parseFloat(updated.noOfDays) || 0;
                updated.totalAmount = rate * days;
            }
            return updated;
        }));

        if (cursorPos !== undefined && (field === 'estimatedAmount' || field === 'totalAmount')) {
            const refKey = `${id}-${field}`;
            requestAnimationFrame(() => {
                const input = itemInputRefs.current[refKey];
                if (input) {
                    try { input.setSelectionRange(cursorPos, cursorPos); } catch (_) { }
                }
            });
        }
    };

    const addItem = () => {
        const newId = Math.max(...items.map(item => item.id), 0) + 1;
        setItems(prev => [...prev, { id: newId, description: '', estimatedAmount: 0, noOfDays: 1, totalAmount: 0 }]);
    };

    const removeItem = (id) => {
        if (items.length > 1) {
            setItems(prev => prev.filter(item => item.id !== id));
        } else {
            showNotification('At least one item is required', 'warning');
        }
    };

    // Sync dateCoverage string when startDate or endDate changes
    useEffect(() => {
        if (formData.startDate && formData.endDate) {
            setFormData(prev => ({
                ...prev,
                dateCoverage: `${formatLongDate(prev.startDate)} - ${formatLongDate(prev.endDate)}`
            }));
        }
    }, [formData.startDate, formData.endDate]);

    // FIX 1 (continued): Only set startDate from dateNeeded when there is no
    // existing startDate (new form). For edits, do not overwrite a manually
    // entered startDate when dateNeeded changes.
    useEffect(() => {
        if (!formData.dateNeeded) return;

        const needed = new Date(formData.dateNeeded);
        if (!isNaN(needed.getTime())) {
            const neededStr = needed.toISOString().split('T')[0];

            setFormData(prev => {
                // Do not overwrite a startDate the user already set
                if (prev.startDate && prev.startDate !== '') return prev;
                if (prev.startDate === neededStr) return prev;
                return {
                    ...prev,
                    startDate: neededStr,
                    endDate: ''
                };
            });
        }
    }, [formData.dateNeeded]);

    const calculateTotal = () => {
        const itemsTotal = items.reduce((sum, item) => sum + (parseFloat(item.totalAmount || item.estimatedAmount) || 0), 0);
        return Math.round(itemsTotal * 100) / 100;
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.purpose?.toString().trim()) newErrors.purpose = 'Required';
        if (!formData.endDate) newErrors.dateCoverage = 'End Date Required';
        if (formData.paymentMethod === 'gcash') {
            if (!formData.gcashName?.toString().trim()) newErrors.gcashName = 'Required';
            if (!formData.accountNumber?.toString().trim()) newErrors.accountNumber = 'Required';
        }
        if (['payroll', 'bank_transfer'].includes(formData.paymentMethod) && !formData.accountNumber?.toString().trim()) newErrors.accountNumber = 'Required';

        items.forEach((item) => {
            const amount = parseFloat(item.estimatedAmount) || 0;
            if (amount <= 0) {
                newErrors[`item_amount_${item.id}`] = 'Required';
            }
            if (!item.description?.toString().trim() && !item.particulars?.toString().trim()) {
                newErrors[`item_description_${item.id}`] = 'Required';
            }
        });

        if (calculateTotal() === 0) newErrors.total = 'Add at least one item with amount';

        setErrors(newErrors);
        return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
    };

    const validateDraft = () => {
        const newErrors = {};

        // Purpose is required
        if (!formData.purpose?.toString().trim()) {
            newErrors.purpose = 'Required';
        }

        // At least one budget breakdown item must have a description and amount > 0
        const hasValidItem = items.some(item => {
            const hasDescription = item.description?.toString().trim() || item.particulars?.toString().trim();
            const hasAmount = (parseFloat(item.estimatedAmount) || 0) > 0;
            return hasDescription && hasAmount;
        });

        if (!hasValidItem) {
            // Mark all empty items so the red borders appear in the breakdown
            items.forEach((item) => {
                if (!(parseFloat(item.estimatedAmount) || 0 > 0)) {
                    newErrors[`item_amount_${item.id}`] = 'Required';
                }
                if (!item.description?.toString().trim() && !item.particulars?.toString().trim()) {
                    newErrors[`item_description_${item.id}`] = 'Required';
                }
            });
            newErrors.budgetBreakdown = 'At least one budget breakdown item is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveDraft = async () => {
        if (isSubmitting) return;

        const isDraftValid = validateDraft();
        if (!isDraftValid) {
            return showNotification('Please fill in the Purpose and at least one Budget Breakdown item before saving.', 'warning');
        }

        setIsSubmitting(true);
        try {
            // FIX 3: Preserve the original advanceDate for existing records.
            // Only use today's date when creating a new draft.
            const advanceDate = editData?.id ? formData.advanceDate : getTodayString();
            const payload = { ...formData, advanceDate, items, requestedAmount: calculateTotal(), status: 'draft' };
            let res = editData?.id ? await api.put(`/cash-advances/${editData.id}`, payload) : await api.post('/cash-advances', payload);
            if (res.data.success) {
                if (attachments.length > 0 || pendingDeletes.length > 0) await uploadAttachments(res.data.data.id);
                showNotification('Draft saved successfully!');
                if (onClose) onClose();
            }
        } catch (e) {
            showNotification('Error saving draft', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // When the requestor is themselves an approver, their request skips the
    // approval queue and goes directly to Accounting for disbursement.
    // The status is set to 'approved' (same as a manager-approved request) so
    // the Accounting Dashboard picks it up without any extra handling.
    const isApprover = !!(
        user?.role?.toLowerCase().includes('approver') ||
        user?.role?.toLowerCase().includes('manager') ||
        user?.isApprover
    );

    // Cash advances aren't Operations Revolving Fund eligible (ORF is
    // reimbursement-only — see approvalsController.js), so the only
    // self-submit fund choice possible here is Accounting/ARF, mirroring
    // ReimbursementForm.js's Accounting-approver path.
    const isAccountingApprover = isApprover && (user?.role || '').toLowerCase() === 'accounting';
    const showFundChoice = isAccountingApprover && !viewOnly && !accountingEdit;

    const [fundChoice, setFundChoice] = useState('no'); // 'yes' | 'no'
    const [fundInfo, setFundInfo] = useState(null); // { id, funding_code, funding_description, Amount } | null
    const [fundLoading, setFundLoading] = useState(false);
    const [fundModalOpen, setFundModalOpen] = useState(false);

    useEffect(() => {
        if (!showFundChoice) return;
        let cancelled = false;
        (async () => {
            try {
                setFundLoading(true);
                const res = await api.get('/disbursements/revolving-fund', { params: { funding_code: 'ARF' } });
                if (!cancelled && res.data.success) setFundInfo(res.data.data);
            } catch (err) {
                console.error('Error fetching Accounting Revolving Fund info:', err);
            } finally {
                if (!cancelled) setFundLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [showFundChoice]);

    const fundInsufficient =
        showFundChoice && fundChoice === 'yes' && fundInfo && parseFloat(fundInfo.Amount) < calculateTotal();

    const handleSubmit = async () => {
        if (isSubmitting) return;
        if (accountingEdit && !editReason?.trim()) {
            return showNotification('Please provide a reason for this edit before saving.', 'error');
        }
        // Updating an already-approved transaction now also releases it, so
        // guard against accidental clicks with an explicit confirmation.
        if (accountingEdit) {
            setConfirmReleaseOpen(true);
            return;
        }
        // Self-submitting Accounting approver, actually submitting (not
        // saving a draft): validate the rest of the form first, then let
        // them pick ARF vs Regular Disbursement in a modal — same choice
        // they'd otherwise only make later at release — before committing.
        if (showFundChoice) {
            const { isValid } = validateForm();
            if (!isValid) {
                return showNotification('Please fill in all required fields', 'error');
            }
            setFundChoice('no');
            setFundModalOpen(true);
            return;
        }
        await performSubmit();
    };

    const handleConfirmFundChoice = async () => {
        setFundModalOpen(false);
        await performSubmit();
    };

    const handleConfirmRelease = async () => {
        setConfirmReleaseOpen(false);
        await performSubmit();
    };

    const performSubmit = async () => {
        const { isValid } = validateForm();
        if (!isValid) {
            return showNotification('Please fill in all required fields', 'error');
        }
        setIsSubmitting(true);
        try {
            // FIX 3: Same date preservation logic as handleSaveDraft.
            const advanceDate = editData?.id ? formData.advanceDate : getTodayString();

            // Accounting/Admin is correcting a transaction outside the normal
            // flow. Saving the correction also advances its status — the
            // previous status is no longer preserved. `edit_reason` ties the
            // change to the Audit Logs. `editResultStatus` decides where it
            // lands: 'released' when edited from Disbursements (already
            // approved, now being released), or 'approved' when edited from
            // Approvals (admin editing + approving a pending request).
            if (accountingEdit) {
                const isApprovingEdit = editResultStatus === 'approved';
                const payload = {
                    ...formData,
                    advanceDate,
                    items,
                    requestedAmount: calculateTotal(),
                    status: editResultStatus,
                    approver: isApprovingEdit ? user.name : (editData.approver || editData.approved_by || ''),
                    approvedDate: isApprovingEdit ? getTodayString() : (editData.approvedDate || editData.approved_at || ''),
                    editReason: editReason.trim(),
                };
                const res = await api.put(`/cash-advances/${editData.id}`, payload);
                if (res.data.success) {
                    if (attachments.length > 0 || pendingDeletes.length > 0) await uploadAttachments(res.data.data.id);
                    showNotification(
                        isApprovingEdit
                            ? 'Transaction updated and approved successfully. The change has been recorded in the Audit Logs.'
                            : 'Transaction updated and released successfully. The change has been recorded in the Audit Logs.'
                    );
                    if (onSaved) onSaved();
                    else if (onClose) onClose();
                }
                return;
            }

            // If the requestor is an approver, auto-approve and route directly
            // to Accounting — no manager sign-off needed.
            // - approver is always the logged-in user (never the joined
            //   department-approvers string from the backend).
            // - approvedDate is always "today" at the moment of (re-)approval,
            //   even when editing an existing request, since re-submitting
            //   counts as a fresh approval action. advanceDate (Request Date)
            //   is left untouched/preserved above.
            const submitStatus = isApprover ? 'approved' : 'pending';
            const approvedDate = getTodayString();
            const approverFields = isApprover
                ? {
                    approver: user.name,
                    approvedDate,
                    approved_by: user.name,
                    approved_at: approvedDate,
                }
                : {};
            // Only meaningful on the genuine auto-approve self-submit path —
            // the backend independently re-verifies the requester is an
            // Accounting approver, so this flag alone can't fund anything
            // it shouldn't.
            const revolvingFundFields = (isApprover && showFundChoice && fundChoice === 'yes')
                ? { useRevolvingFund: true }
                : {};

            const payload = {
                ...formData,
                advanceDate,
                items,
                requestedAmount: calculateTotal(),
                status: submitStatus,
                ...approverFields,
                ...revolvingFundFields,
            };

            let res = editData?.id
                ? await api.put(`/cash-advances/${editData.id}`, payload)
                : await api.post('/cash-advances', payload);

            if (res.data.success) {
                if (attachments.length > 0 || pendingDeletes.length > 0) await uploadAttachments(res.data.data.id);
                // Trust the server-confirmed advance number over the
                // client-generated provisional one, falling back to the
                // local value if the API doesn't echo it back.
                const confirmedNumber = res.data.data?.advanceNumber || res.data.data?.advance_number || formData.advanceNumber;
                setSuccessModal({ open: true, advanceNumber: confirmedNumber });
            }
        } catch (e) {
            showNotification(e.response?.data?.message || 'Error submitting request', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Called when the user dismisses the success modal — this is what
    // actually triggers the redirect back to My Requests, deferred until
    // they've had a chance to see/note the transaction number.
    const handleSuccessOkay = () => {
        setSuccessModal({ open: false, advanceNumber: '' });
        if (onClose) onClose();
    };

    const uploadAttachments = async (id) => {
        if (pendingDeletes.length > 0) {
            for (const attachmentId of pendingDeletes) {
                try {
                    await api.delete(`/cash-advances/${id}/attachments/${attachmentId}`);
                } catch (e) {
                    console.error(`Failed to delete attachment ${attachmentId}`, e);
                }
            }
        }

        for (const file of attachments) {
            if (file.isExisting) continue;
            const fd = new FormData();
            fd.append('file', file);
            fd.append('resourceType', 'cash-advances');
            fd.append('resourceId', id);
            try {
                const up = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                if (up.data.success) {
                    await api.post(`/cash-advances/${id}/attachments`, { fileName: file.name, filePath: up.data.path, fileType: file.type, fileSize: file.size });
                }
            } catch (e) { console.error('Upload failed', e); }
        }
    };

    const showNotification = (message, severity = 'success') => {
        setSnackbar({ open: true, message, severity });
    };

    const MAX_ATTACHMENT_SIZE_MB = 2;
    const MAX_ATTACHMENT_SIZE_BYTES = MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;

    const handleFileAttach = (e) => {
        const incomingFiles = Array.from(e.target.files);

        const oversizedFiles = incomingFiles.filter(f => f.size > MAX_ATTACHMENT_SIZE_BYTES);
        const acceptedFiles = incomingFiles.filter(f => f.size <= MAX_ATTACHMENT_SIZE_BYTES);

        if (oversizedFiles.length > 0) {
            const message = `${oversizedFiles.map(f => f.name).join(', ')} exceed${oversizedFiles.length === 1 ? 's' : ''} the ${MAX_ATTACHMENT_SIZE_MB}MB size limit and ${oversizedFiles.length === 1 ? 'was' : 'were'} not attached.`;
            showNotification(message, 'error');
        }

        // FIX 6: Track created object URLs so they can be revoked on unmount.
        const files = acceptedFiles.map(f => {
            const url = URL.createObjectURL(f);
            objectUrlsRef.current.push(url);
            f.preview = url;
            return f;
        });
        setAttachments(prev => [...prev, ...files]);

        // Reset input so re-selecting the same (rejected) file re-triggers onChange
        e.target.value = '';
    };

    const removeAttachment = (index) => {
        const file = attachments[index];
        if (file.isExisting) {
            setPendingDeletes(prev => [...prev, file.id]);
        } else if (file.preview) {
            // FIX 6: Revoke the object URL immediately when a non-persisted
            // file is removed, rather than waiting for unmount.
            URL.revokeObjectURL(file.preview);
            objectUrlsRef.current = objectUrlsRef.current.filter(u => u !== file.preview);
        }
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="min-w-0 space-y-5">
            {!viewOnly && (
                <div className="mb-6">
                    <h2 className="mb-1 text-lg font-semibold tracking-tight text-gray-900 sm:text-xl">Cash Advance Form</h2>
                </div>
            )}

            {viewOnly && editData?.status?.toLowerCase() === 'rejected' && editData?.reject_remarks && (
                <InlineAlert severity="error">
                    <div className="font-semibold mb-1">Rejection Reason:</div>
                    <div>{editData.reject_remarks}</div>
                </InlineAlert>
            )}

            <Modal
                open={confirmReleaseOpen}
                onClose={() => setConfirmReleaseOpen(false)}
                title={editResultStatus === 'approved' ? 'Approve Transaction' : 'Release Transaction'}
                maxWidth="sm"
                actions={
                    <>
                        <Button variant="secondary" onClick={() => setConfirmReleaseOpen(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button
                            variant="success"
                            startIcon={<CheckCircle className="w-4 h-4" />}
                            onClick={handleConfirmRelease}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (editResultStatus === 'approved' ? 'Approving…' : 'Releasing…') : (editResultStatus === 'approved' ? 'Confirm Approval' : 'Confirm Release')}
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

            <Modal
                open={fundModalOpen}
                onClose={() => (isSubmitting ? null : setFundModalOpen(false))}
                title="Funding Source"
                maxWidth="sm"
                actions={
                    <>
                        <Button variant="secondary" onClick={() => setFundModalOpen(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            startIcon={<Send className="w-4 h-4" />}
                            onClick={handleConfirmFundChoice}
                            disabled={isSubmitting || fundInsufficient}
                        >
                            {isSubmitting ? 'Submitting…' : 'Confirm Submission'}
                        </Button>
                    </>
                }
            >
                <p className="text-gray-700 mb-4">
                    As the Accounting approver, this request will be auto-approved on submission. Choose how it should be funded.
                </p>
                {fundLoading && (
                    <p className="text-sm text-gray-400 mb-2">Checking Accounting Revolving Fund availability…</p>
                )}
                {!fundLoading && fundInfo && (
                    <>
                        <div className="mb-4 flex flex-col gap-1 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                            <span className="font-bold text-gray-800">Request Amount:</span> {`₱${calculateTotal().toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            <span className="font-bold text-gray-800">Available Fund:</span> {`₱${parseFloat(fundInfo.Amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </div>
                        <div className={`mb-4 p-3 rounded-lg text-sm text-gray-800 flex flex-col gap-1 border ${
                            fundInsufficient ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-200'
                        }`}>
                            <span className="font-bold text-gray-800">Funding Source:</span>
                            <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="radio"
                                    name="useRevolvingFund"
                                    value="yes"
                                    checked={fundChoice === 'yes'}
                                    onChange={() => setFundChoice('yes')}
                                />
                                Accounting Revolving Fund
                            </label>
                            <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                                <input
                                    type="radio"
                                    name="useRevolvingFund"
                                    value="no"
                                    checked={fundChoice === 'no'}
                                    onChange={() => setFundChoice('no')}
                                />
                                Regular Disbursement
                            </label>
                        </div>
                        {fundChoice === 'yes' && fundInsufficient && (
                            <p className="text-sm text-red-600 font-medium mt-2">
                                Insufficient Accounting Revolving Fund Balance
                            </p>
                        )}
                    </>
                )}
                {!fundLoading && !fundInfo && (
                    <p className="text-sm text-gray-500">
                        No revolving fund is configured for Accounting — this will be a Regular Disbursement.
                    </p>
                )}
            </Modal>

            <Modal
                open={successModal.open}
                onClose={handleSuccessOkay}
                title="Request Submitted"
                maxWidth="sm"
                actions={
                    <Button variant="primary" onClick={handleSuccessOkay}>
                        Okay
                    </Button>
                }
            >
                <div className="flex flex-col items-center text-center gap-3 py-2">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                    <p className="text-gray-700">
                        Your cash advance request has been submitted successfully.
                    </p>
                    <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50">
                        <p className="text-xs text-gray-600">Transaction Number</p>
                        <p className="text-lg font-bold text-gray-900">{successModal.advanceNumber}</p>
                    </div>
                </div>
            </Modal>

            <Alert
                open={snackbar.open}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                message={snackbar.message}
                severity={snackbar.severity}
                duration={4000}
                position="bottom-right"
            />

            <section className="min-w-0 rounded-xl border border-gray-200 bg-white">
                <div className="min-w-0 p-4 sm:p-5 lg:p-6">
                    <div className="mb-5 border-b border-gray-100 pb-4">
                        <h3 className="text-sm font-semibold text-gray-900">Request Information</h3>
                        {!viewOnly && <p className="mt-1 text-xs leading-relaxed text-gray-500">Complete the request details and purpose below.</p>}
                    </div>
                    {!viewOnly ? (
                        <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
                            <TruncatedViewField label="Cash Advance Number" value={formData.advanceNumber} />
                            <TruncatedViewField label="Requested By" value={formData.requestedBy} />
                            <TruncatedViewField label="Department" value={formData.department} />
                            <fieldset className="min-w-0">
                                <legend className="mb-2 text-xs font-semibold text-gray-600">Business Unit</legend>
                                <div className="flex min-h-[44px] flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-gray-200 bg-white px-3">
                                    {['EPC', 'NBFI', 'Shared'].map((unit) => (
                                        <label key={unit} className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-gray-700">
                                            <input type="radio" name="businessUnit" value={unit} checked={formData.businessUnit === unit} onChange={handleInputChange} className="h-4 w-4 accent-gray-900" />
                                            {unit}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                            <div className="min-w-0">
                                <label htmlFor="ca-request-date" className="mb-2 block text-xs font-semibold text-gray-600">Request Date</label>
                                <input id="ca-request-date" type="date" name="advanceDate" value={formData.advanceDate} readOnly className={fieldClassName(false, true)} />
                            </div>
                            <div className="min-w-0">
                                <label htmlFor="ca-date-needed" className="mb-2 block text-xs font-semibold text-gray-600">Date Needed</label>
                                <input id="ca-date-needed" type="date" name="dateNeeded" value={formData.dateNeeded} onChange={handleInputChange} min={getMinDateNeeded()} className={fieldClassName()} />
                            </div>
                            <fieldset className="min-w-0 md:col-span-2">
                                <legend className="mb-2 text-xs font-semibold text-gray-600">Period Covered</legend>
                                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="min-w-0">
                                        <label htmlFor="ca-period-start" className="sr-only">Period start date</label>
                                        <input id="ca-period-start" type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} min={formData.dateNeeded || undefined} max={formData.endDate || undefined} aria-invalid={Boolean(errors.dateCoverage)} aria-describedby={errors.dateCoverage ? 'ca-period-error' : undefined} className={fieldClassName(Boolean(errors.dateCoverage))} />
                                    </div>
                                    <div className="min-w-0">
                                        <label htmlFor="ca-period-end" className="sr-only">Period end date</label>
                                        <input id="ca-period-end" type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} min={formData.startDate || undefined} aria-invalid={Boolean(errors.dateCoverage)} aria-describedby={errors.dateCoverage ? 'ca-period-error' : undefined} className={fieldClassName(Boolean(errors.dateCoverage))} />
                                    </div>
                                </div>
                                {errors.dateCoverage && <p id="ca-period-error" className="mt-2 text-xs text-red-600">{typeof errors.dateCoverage === 'string' ? errors.dateCoverage : 'Please check the period covered.'}</p>}
                            </fieldset>
                            <div className="min-w-0 md:col-span-2 2xl:col-span-4">
                                <label htmlFor="ca-purpose" className="mb-2 block text-xs font-semibold text-gray-600">Purpose <span className="text-red-600">*</span></label>
                                <textarea id="ca-purpose" name="purpose" rows={3} required value={formData.purpose} onChange={handleInputChange} aria-invalid={Boolean(errors.purpose)} aria-describedby={errors.purpose ? 'ca-purpose-error' : undefined} placeholder="Describe the purpose of this cash advance" className={`${fieldClassName(Boolean(errors.purpose))} resize-y leading-relaxed`} />
                                {errors.purpose && <p id="ca-purpose-error" className="mt-2 text-xs text-red-600">{typeof errors.purpose === 'string' ? errors.purpose : 'Purpose is required.'}</p>}
                            </div>
                        </div>
                    ) : (
                        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
                            <TruncatedViewField label="Cash Advance Number" value={formData.advanceNumber} />
                            <TruncatedViewField label="Requested By" value={formData.requestedBy} />
                            <TruncatedViewField label="Department" value={formData.department} />
                            <TruncatedViewField label="Business Unit" value={formData.businessUnit} />
                            <TruncatedViewField label="Request Date" value={formatLongDate(formData.advanceDate)} />
                            <TruncatedViewField label="Date Needed" value={formatLongDate(formData.dateNeeded)} />
                            <div className="min-w-0 md:col-span-2">
                                <TruncatedViewField label="Period Covered" value={`${formatLongDate(formData.startDate) || '—'} – ${formatLongDate(formData.endDate) || '—'}`} />
                            </div>
                            <div className="min-w-0 md:col-span-2 2xl:col-span-4">
                                <p className="mb-2 text-xs font-semibold text-gray-600">Purpose</p>
                                <p className="whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm leading-relaxed text-gray-900">{formData.purpose || '—'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section className="min-w-0 rounded-xl border border-gray-200 bg-white">
                <div className="min-w-0 p-4 sm:p-5 lg:p-6">
                    {/* FIX 4 (note): Pass itemInputRefs down so BudgetBreakdown can attach
                        refs to number inputs for reliable cursor position restoration. */}
                    <div className="min-w-0 max-w-full overflow-x-auto">
                    <BudgetBreakdown
                        items={items}
                        advanceType={formData.advanceType}
                        viewOnly={viewOnly}
                        onItemChange={handleItemChange}
                        onAddItem={addItem}
                        onRemoveItem={removeItem}
                        errors={errors}
                        showDays={true}
                        showTotal={true}
                        inputRefs={itemInputRefs}
                    />
                    </div>
                    <div className="mt-6 flex justify-end">
                        <div className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 sm:w-auto sm:min-w-[240px]">
                            <p className="text-xs text-gray-600 mb-1">Grand Total Amount</p>
                            <h3 className={`break-words text-2xl font-semibold tabular-nums ${errors.total ? 'text-red-600' : 'text-gray-900'}`}>
                                ₱ {calculateTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </h3>
                            {errors.total && <p className="text-xs text-red-600 mt-1">{errors.total}</p>}
                        </div>
                    </div>
                </div>
            </section>

            <section className="min-w-0 rounded-xl border border-gray-200 bg-white">
                <div className="min-w-0 p-4 sm:p-5 lg:p-6">
                    <PaymentDetailsSection
                        formData={formData}
                        viewOnly={viewOnly}
                        onInputChange={handleInputChange}
                        errors={errors}
                        disableAccountFields={true}
                    />
                </div>
            </section>

            <section className="min-w-0 rounded-xl border border-gray-200 bg-white">
                <div className="min-w-0 p-4 sm:p-5 lg:p-6">
                    <AttachmentsSection
                        attachments={attachments}
                        viewOnly={viewOnly}
                        onAttach={handleFileAttach}
                        onRemove={removeAttachment}
                    />
                    {!viewOnly && (
                        <p className="text-xs text-gray-500 mt-1">
                            Maximum size per attachment: {MAX_ATTACHMENT_SIZE_MB}MB
                        </p>
                    )}
                </div>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:items-center sm:justify-end">
                {!viewOnly && (
                    <>
                        {!accountingEdit && (
                            <Button
                                variant="secondary"
                                startIcon={<Save className="w-4 h-4" />}
                                onClick={handleSaveDraft}
                                disabled={isSubmitting}
                                className="!min-h-[44px] w-full !rounded-lg !border !border-gray-200 !bg-white !text-gray-700 !shadow-none hover:!bg-gray-50 sm:w-auto"
                            >
                                {isSubmitting ? 'Saving…' : 'Save Draft'}
                            </Button>
                        )}
                        <Button
                            variant="primary"
                            startIcon={<Send className="w-4 h-4" />}
                            onClick={handleSubmit}
                            disabled={isSubmitting || (accountingEdit && !editReason?.trim())}
                            className="!min-h-[44px] w-full !rounded-lg !bg-gray-900 !text-white !shadow-none hover:!bg-gray-800 sm:w-auto"
                        >
                            {isSubmitting
                                ? (accountingEdit ? 'Updating…' : 'Submitting…')
                                : accountingEdit
                                    ? 'Update Transaction'
                                    : isApprover
                                        ? 'Submit'
                                        : 'Submit'}
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};

export default CashAdvanceForm;