import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  HandCoins, Landmark, ReceiptText, Coins, Eye, Edit2, Trash2, Search,
  XCircle, AlertTriangle, Receipt, Loader2, RefreshCw, Clock, CheckCircle,
  ChevronLeft, ChevronRight, Send, Banknote, FileEdit,
} from 'lucide-react';
import CashAdvanceForm from '../components/CashAdvanceForm';
import LiquidationForm from '../components/LiquidationForm';
import ReimbursementForm from '../components/ReimbursementForm';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import { Loading } from '../components/ui/Loading';
import Tooltip from '../components/ui/Tooltip';

// Reusable pagination control used under each request table
const Pagination = ({ currentPage, totalItems, pageSize, onPageChange, onPageSizeChange }) => {
  if (!totalItems) return null;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  return (
    <div className="flex flex-col gap-4 border-t border-gray-200 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <p><span className="font-medium text-gray-900">{start}–{end}</span> of {totalItems} requests</p>
        <label className="flex items-center gap-2">
          Rows
          <select aria-label="Rows per page" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="min-h-[44px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100">
            {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-gray-600">Page <strong className="font-semibold text-gray-900">{currentPage}</strong> of {totalPages}</span>
        <button type="button" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:cursor-not-allowed disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Formats a timestamp for the timeline (date + time). Falls back gracefully
// if the value is missing or unparsable.
const formatDateTime = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

// Builds a timeline of events for a request from whatever fields the API
// happens to return. Supports a few common naming conventions (snake_case
// from the raw API payload, or camelCase if a caller already mapped it) so
// it works across cash advances, liquidations, and reimbursements without
// requiring a specific backend shape. Steps with no matching timestamp are
// skipped, except "Submitted", which always shows.
const buildTimelineSteps = (request) => {
  if (!request) return [];

  const pick = (...keys) => {
    for (const k of keys) {
      if (request[k]) return request[k];
    }
    return null;
  };

  const status = (request.rawStatus || request.status || '').toLowerCase();
  const steps = [];

  // 1. Submitted — always already done
  const submittedAt = pick(
    'created_at', 'submitted_at', 'date_filed', 'requested_at',
    'advanceDate', 'liquidationDate', 'reimbursementDate'
  );
  steps.push({
    key: 'submitted',
    label: 'Request Submitted',
    actor: pick('requested_by', 'submitted_by', 'created_by', 'requestedBy'),
    timestamp: submittedAt,
    icon: Send,
    isDone: true,
  });

  // 2. Edited/Resubmitted (optional, only if the API tracks it and it differs from submission)
  const updatedAt = pick('updated_at', 'last_modified_at');
  if (updatedAt && submittedAt && new Date(updatedAt).getTime() > new Date(submittedAt).getTime() && status === 'pending') {
    steps.push({
      key: 'updated',
      label: 'Request Updated',
      actor: pick('updated_by', 'modified_by'),
      timestamp: updatedAt,
      icon: FileEdit,
      isDone: true,
    });
  }

  // 3. Approved / Rejected (mutually exclusive, depends on final status / fields present)
  const approvedAt = pick('approved_at', 'approval_date');
  const rejectedAt = pick('rejected_at', 'rejection_date', 'declined_at');

  if (status === 'rejected' || rejectedAt) {
    steps.push({
      key: 'rejected',
      label: 'Request Rejected',
      actor: pick('rejected_by', 'reviewed_by', 'approver_name', 'action_by'),
      timestamp: rejectedAt,
      remarks: pick('reject_remarks', 'rejectRemarks', 'rejection_reason', 'remarks'),
      icon: XCircle,
      isDone: true,
      doneColor: 'text-red-600 bg-red-100',
    });
  } else {
    steps.push({
      key: 'approved',
      label: 'Request Approved',
      actor: pick('approved_by', 'reviewed_by', 'approver_name', 'action_by', 'approver'),
      timestamp: approvedAt,
      remarks: pick('approval_remarks', 'remarks'),
      icon: CheckCircle,
      isDone: Boolean(approvedAt) || ['approved', 'released', 'disbursed', 'liquidated'].includes(status),
      doneColor: 'text-green-600 bg-green-100',
    });
  }

  // 4. Released / Processed (only relevant once approved, and only shown if applicable)
  const releasedAt = pick('released_at', 'processed_at', 'disbursed_at');
  if (['released', 'disbursed', 'liquidated'].includes(status) || releasedAt) {
    steps.push({
      key: 'released',
      label: 'Funds Released',
      actor: pick('released_by', 'processed_by', 'disbursed_by', 'releasedBy'),
      timestamp: releasedAt,
      remarks: pick('release_remarks', 'releaseRemarks'),
      icon: Banknote,
      isDone: Boolean(releasedAt) || ['released', 'disbursed', 'liquidated'].includes(status),
      doneColor: 'text-blue-600 bg-blue-100',
    });
  }

  // Resolve each step into a final state: 'done', 'current' (the next step
  // waiting to happen), or 'upcoming' (further down the line, not relevant yet).
  // Only the first not-done step becomes "current" — everything after it
  // stays a muted "upcoming" so the active step is unambiguous.
  let currentAssigned = false;
  return steps.map((step) => {
    if (step.isDone) {
      return { ...step, state: 'done', color: step.doneColor || 'text-gray-500 bg-gray-100' };
    }
    if (!currentAssigned) {
      currentAssigned = true;
      return { ...step, state: 'current', color: 'text-amber-700 bg-amber-50' };
    }
    return { ...step, state: 'upcoming', color: 'text-gray-400 bg-gray-100' };
  });
};

const RequestTimeline = ({ request }) => {
  const steps = useMemo(() => buildTimelineSteps(request), [request]);
  if (!steps.length) return null;
  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
      <h4 className="mb-5 flex items-center gap-2 text-sm font-semibold text-gray-900">
        <Clock className="h-4 w-4 text-gray-500" /> Request Timeline
      </h4>
      <ol className="space-y-5">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const current = step.state === 'current';
          return (
            <li key={step.key} className="relative flex gap-3">
              {index < steps.length - 1 && <span aria-hidden="true" className="absolute left-4 top-8 h-full w-px bg-gray-200" />}
              <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${step.color}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{step.label}</p>
                  {current && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Awaiting action</span>}
                </div>
                <p className="mt-1 text-xs text-gray-500">{formatDateTime(step.timestamp) || (step.state === 'done' ? 'Date not recorded' : 'Not yet processed')}</p>
                {step.actor && <p className="mt-1 break-words text-xs text-gray-600">{step.actor}</p>}
                {step.remarks && <p className="mt-2 whitespace-pre-wrap break-words border-l-2 border-gray-200 pl-3 text-xs leading-relaxed text-gray-600">{step.remarks}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

const MyRequests = () => {
  const { user } = useAuth();
  // When the logged-in user is an Approver/Manager, the "Approver" column
  // is replaced with "Disburse By", showing the accounting person who
  // released/disbursed the funds (released_by) instead of the approver name.
  const isApproverUser = user?.role === 'approver' || user?.role === 'manager';
  const navigate = useNavigate();
  const location = useLocation();
  const TAB_SLUGS = ['cash-advances', 'liquidations', 'reimbursements'];
  const [searchParams, setSearchParams] = useSearchParams();
  const [tabValue, setTabValue] = useState(() => {
    const slug = searchParams.get('tab');
    const idx = TAB_SLUGS.indexOf(slug);
    return idx !== -1 ? idx : 0;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState(false);
  const [cashAdvances, setCashAdvances] = useState([]);
  const [liquidations, setLiquidations] = useState([]);
  const [reimbursements, setReimbursements] = useState([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmType, setConfirmType] = useState(''); // 'cashAdvance' | 'reimbursement' | 'liquidation'
  const [confirmAction, setConfirmAction] = useState(''); // 'cancel' | 'delete'
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [retryCount, setRetryCount] = useState({ cashAdvances: 0, liquidations: 0, reimbursements: 0 });
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState({ cashAdvances: 1, liquidations: 1, reimbursements: 1 });

  // Snackbar handler
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Handler to open view modal (fetch full details)
  const handleView = useCallback(async (request) => {
    try {
      setViewLoading(true);
      const response = await api.get(`/cash-advances/${request.id}`);
      // console.log('Fetched cash advance details for view:', response.data);
      if (response.data && response.data.success) {
        const data = response.data.data;
        const viewData = {
          id: data.id,
          advanceNumber:    data.advance_number || request.refNumber,
          advanceDate:      data.advance_date || request.requestDate,
          requestedBy:      data.requested_by || '',
          department:       data.department || request.department || '',
          businessUnit:     data.business_unit || '',
          purpose:          data.purpose || '',
          projectName:      data.project_name || '',
          dateNeeded:       data.date_needed || '',
          startDate:        data.start_date || '',
          endDate:          data.end_date || '',
          dateCoverage:     data.date_coverage || '',
          requestedAmount:  data.requested_amount,
          approvedAmount:   data.approved_amount,
          paymentMethod:    data.payment_method,
          gcashName:        data.gcash_name || '',
          accountNumber:    data.account_number,
          remarks:          data.remarks,
          reject_remarks:   data.reject_remarks || '',
          status:           data.status,
          // Budget breakdown rows from the cash_advance_breakdown table
          items:            data.items       || [],
          attachments:      data.attachments || [],
          paymentReason:    data.payment_reason || '',
          release_remarks:  data.release_remarks || '',
          // Timeline fields — passed through as-is from the API so
          // RequestTimeline can render submission/approval/release history
          created_at:       data.created_at || data.advance_date,
          approved_at:      data.approved_at,
          approved_by:      data.approver_name || data.approved_by,
          rejected_at:      data.rejected_at,
          rejected_by:      data.rejected_by || data.approver_name,
          released_at:      data.released_at,
          released_by:      data.released_by,
        };
        setSelectedRequest(viewData);
      } else {
        setSelectedRequest(request);
      }
      setViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching cash advance details for view:', error);
      setSelectedRequest(request);
      setViewModalOpen(true);
    } finally {
      setViewLoading(false);
    }
  }, []);

  // Handler to open view modal for liquidations (fetch full details)
  const handleViewLiquidation = useCallback(async (request) => {
    try {
      setViewLoading(true);
      const response = await api.get(`/liquidations/${request.id}`);
      if (response.data && response.data.success) {
        const data = response.data.data;
        const viewData = {
          id: data.id,
          liquidationNumber: data.liquidation_number || request.refNumber,
          liquidationDate:   data.liquidation_date   || request.submitDate,
          requestedBy:         data.submitted_by         || request.submittedBy,
          department:          data.department_id,        // ✅ fix
          departmentName:      data.department_name,      // ✅ fix
          businessUnit:        data.business_unit || '',
          purpose:             data.purpose || '',
          dateNeeded:          data.date_needed || '',    // ✅ ADD THIS
          dateCoverageFrom: data.date_coverage_from || data.start_date || '',
          dateCoverageTo:   data.date_coverage_to   || data.end_date   || '',
          cashAdvanceId:       data.cash_advance_id,
          cashAdvanceNumber:   data.cash_advance_number,
          totalAdvanceAmount:  data.total_advance_amount,
          totalAmount:         data.total_actual_amount,
          paymentMethod:       data.payment_method,
          gcashName:           data.gcash_name || '',
          checkNumber:         data.check_number,
          accountNumber:       data.account_number,
          remarks:             data.remarks,
          reject_remarks:      data.reject_remarks || '',
          status:              data.status,
          items:               data.items         || [],
          transportation:      data.transportation || [],
          attachments:         data.attachments    || [],
          paymentReason:       data.payment_reason || '',
          release_remarks:     data.release_remarks || '',
          // Timeline fields
          created_at:          data.created_at || data.liquidation_date,
          approved_at:         data.approved_at,
          approved_by:         data.approver_name || data.approved_by,
          rejected_at:         data.rejected_at,
          rejected_by:         data.rejected_by || data.approver_name,
          released_at:         data.released_at,
          released_by:         data.released_by,
        };
        setSelectedRequest(viewData);
      } else {
        setSelectedRequest(request);
      }
      setViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching liquidation details for view:', error);
      setSelectedRequest(request);
      setViewModalOpen(true);
    } finally {
      setViewLoading(false);
    }
  }, []);

  const handleViewReimbursement = useCallback(async (request) => {
    try {
      setViewLoading(true);
      const response = await api.get(`/reimbursements/${request.id}`);
      if (response.data && response.data.success) {
        const data = response.data.data;
        const viewData = {
          id: data.id,
          reimbursementNumber: data.reimbursement_number || request.refNumber,
          reimbursementDate:   data.reimbursement_date   || request.submitDate,
          requestedBy:         data.submitted_by         || request.submittedBy,
          department:          data.department_id,        
          departmentName:      data.department_name,      
          businessUnit:        data.business_unit || '',
          purpose:             data.purpose || '',
          dateNeeded:          data.date_needed || '',    
          dateCoverageFrom:    data.start_date || data.period_covered_from || '',
          dateCoverageTo:      data.end_date   || data.period_covered_to   || '',
          totalAmount:         data.total_actual_amount,
          paymentMethod:       data.payment_method,
          gcashName:           data.gcash_name || '',
          checkNumber:         data.check_number,
          accountNumber:       data.account_number,
          remarks:             data.remarks,
          reject_remarks:      data.reject_remarks || '',
          status:              data.status,
          expenses:            data.expenses    || [],
          itinerary:           data.itinerary   || [],
          attachments:         data.attachments || [],
          paymentReason:       data.payment_reason || '',
          release_remarks:     data.release_remarks || '',
          // Timeline fields
          created_at:          data.created_at || data.reimbursement_date,
          approved_at:         data.approved_at,
          approved_by:         data.approver_name || data.approved_by,
          rejected_at:         data.rejected_at,
          rejected_by:         data.rejected_by || data.approver_name,
          released_at:         data.released_at,
          released_by:         data.released_by,
        };
        setSelectedRequest(viewData);
      } else {
        setSelectedRequest(request);
      }
      setViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching reimbursement details for view:', error);
      setSelectedRequest(request);
      setViewModalOpen(true);
    } finally {
      setViewLoading(false);
    }
  }, []);

  const closeConfirmModal = () => {
    setConfirmModalOpen(false);
    setConfirmTarget(null);
    setConfirmType('');
    setConfirmAction('');
    setConfirmLoading(false);
  };

  const performConfirmAction = async () => {
    if (!confirmTarget || !confirmType || !confirmAction) return;
    setConfirmLoading(true);
    try {
      let response;
      if (confirmType === 'cashAdvance') {
        if (confirmAction === 'cancel') response = await api.post(`/cash-advances/${confirmTarget.id}/cancel`);
        else response = await api.delete(`/cash-advances/${confirmTarget.id}`);
      } else if (confirmType === 'reimbursement') {
        if (confirmAction === 'cancel') response = await api.post(`/reimbursements/${confirmTarget.id}/cancel`);
        else response = await api.delete(`/reimbursements/${confirmTarget.id}`);
      } else if (confirmType === 'liquidation') {
        if (confirmAction === 'cancel') response = await api.post(`/liquidations/${confirmTarget.id}/cancel`);
        else response = await api.delete(`/liquidations/${confirmTarget.id}`);
      }

      if (response?.data && response.data.success) {
        const displayName = confirmType === 'cashAdvance' ? 'Cash advance' : confirmType === 'reimbursement' ? 'Reimbursement' : 'Liquidation';
        showSnackbar(
          confirmAction === 'cancel' ? `${displayName} cancelled successfully` : `${displayName} deleted successfully`,
          'success'
        );
        // Dispatch update events so other components can refresh themselves
        try {
          if (confirmType === 'liquidation') {
            // Only fetch if it still exists (cancel, not delete)
            if (confirmAction === 'cancel') {
              const liqResp = await api.get(`/liquidations/${confirmTarget.id}`);
              const liq = liqResp?.data?.data;
              if (liq && liq.cash_advance_id) {
                const caResp = await api.get(`/cash-advances/${liq.cash_advance_id}`);
                const updatedCA = caResp?.data?.data || caResp?.data;
                if (updatedCA) window.dispatchEvent(new CustomEvent('ca:updated', { detail: updatedCA }));
              }
            } else {
              // Deleted — just notify with ID so listeners can remove it
              window.dispatchEvent(new CustomEvent('ca:updated', { detail: { id: confirmTarget.id, deleted: true } }));
            }
          } else if (confirmType === 'cashAdvance') {
            if (confirmAction === 'cancel') {
              const caResp = await api.get(`/cash-advances/${confirmTarget.id}`);
              const updatedCA = caResp?.data?.data || caResp?.data;
              if (updatedCA) window.dispatchEvent(new CustomEvent('ca:updated', { detail: updatedCA }));
            } else {
              // Deleted — no need to fetch
              window.dispatchEvent(new CustomEvent('ca:updated', { detail: { id: confirmTarget.id, deleted: true } }));
            }
          }
        } catch (e) {
          console.warn('Error dispatching ca:updated event', e);
        }

        // Refresh appropriate lists
        if (confirmType === 'cashAdvance') fetchCashAdvances();
        if (confirmType === 'reimbursement') fetchReimbursements();
        if (confirmType === 'liquidation') fetchLiquidations();
        if (confirmType === 'cashAdvance' || confirmType === 'reimbursement') fetchLiquidations();
      } else {
        showSnackbar('Error performing action: ' + (response?.data?.message || 'Unknown'), 'error');
      }
    } catch (error) {
      console.error('Error performing confirm action:', error);
      showSnackbar('Error: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setConfirmLoading(false);
      closeConfirmModal();
      setLoading(false);
    }
  };

  // Handler to navigate to edit form (fetch full details first)
  const handleEdit = async (request) => {
    try {
      setLoading(true);
      const response = await api.get(`/cash-advances/${request.id}`);
      if (response.data && response.data.success) {
        const data = response.data.data;
        const editData = {
          id: data.id,
          advanceNumber:    data.advance_number,
          advanceDate:      data.advance_date,
          requestedBy:      data.requested_by || '',
          department:       data.department || '',
          businessUnit:     data.business_unit || '',
          purpose:          data.purpose || '',
          projectName:      data.project_name || '',
          dateNeeded:       data.date_needed || '',
          startDate:        data.start_date || '',
          endDate:          data.end_date || '',
          dateCoverage:     data.date_coverage || '',
          requestedAmount:  data.requested_amount,
          paymentMethod:    data.payment_method,
          gcashName:        data.gcash_name || '',
          accountNumber:    data.account_number,
          remarks:          data.remarks,
          status:           data.status,
          // Budget breakdown rows from the cash_advance_breakdown table
          items:            data.items       || [],
          attachments:      data.attachments || [],
          paymentReason:    data.payment_reason || '',
          release_remarks:  data.release_remarks || '',
        };

        navigate('/cash-advance', { state: { editData } });
      } else {
        navigate('/cash-advance', { state: { editData: request } });
      }
    } catch (error) {
      console.error('Error fetching cash advance details:', error);
      navigate('/cash-advance', { state: { editData: request } });
    } finally {
      setLoading(false);
    }
  };

  // Handler to close modals
  const handleCloseModal = () => {
    setViewModalOpen(false);
    setSelectedRequest(null);
  };

  const fetchCashAdvances = useCallback(async (isRetry = false) => {
    try {
      setLoading(true);
      const response = await api.get('/cash-advances');
      if (response.data.success) {
        const mappedData = response.data.data.map(item => ({
          id: item.id,
          refNumber: item.advance_number,
          purpose: item.purpose,
          amount: parseFloat(item.requested_amount),
          requestDate: item.advance_date,
          status: formatStatus(item.status),
          rawStatus: item.status,
          approver: item.status === 'pending' ? '-' : item.status === 'draft' ? '-' : (item.approver_name || '-'),
          releasedBy: item.status === 'pending' ? '-' : item.status === 'draft' ? '-' : (item.released_by || '-'),
          department: item.department,
          advanceType: item.advance_type,
          remarks: item.remarks || '',
          rejectRemarks: item.reject_remarks || '',
          releaseRemarks: item.release_remarks || '',
          liquidationDeadline: item.liquidation_deadline || null,
          isOverdue: !!item.is_overdue,
          urgency: (() => {
            if (!item.liquidation_deadline) return null;
            const days = Math.ceil((new Date(item.liquidation_deadline) - new Date()) / (1000 * 60 * 60 * 24));
            if (days < 0) return 'overdue';
            if (days <= 3) return 'urgent';
            if (days <= 7) return 'warning';
            return 'normal';
          })(),
          daysUntilDeadline: item.liquidation_deadline
            ? Math.ceil((new Date(item.liquidation_deadline) - new Date()) / (1000 * 60 * 60 * 24))
            : null
        }));
        setCashAdvances(mappedData);
        setRetryCount(prev => ({ ...prev, cashAdvances: 0 }));
      }
    } catch (error) {
      console.error('Error fetching cash advances:', error);
      if (!isRetry && retryCount.cashAdvances < 2) {
        setRetryCount(prev => ({ ...prev, cashAdvances: prev.cashAdvances + 1 }));
        showSnackbar(`Retrying cash advances... (${retryCount.cashAdvances + 1}/2)`, 'warning');
        setTimeout(() => fetchCashAdvances(true), 1000);
      } else {
        setCashAdvances([]);
        showSnackbar('Failed to load cash advances. Please refresh the page.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount.cashAdvances]);

  const fetchLiquidations = useCallback(async (isRetry = false) => {
    try {
      setLoading(true);
      const response = await api.get('/liquidations');
      if (response.data.success) {
        const mappedData = response.data.data.map(item => ({
          id: item.id,
          refNumber: item.liquidation_number,
          cashAdvanceRef: item.cash_advance_number,
          totalExpenses: parseFloat(item.total_actual_amount),
          refundAmount: parseFloat(item.refund_amount || 0),
          additionalPayment: parseFloat(item.additional_payment || 0),
          variance: parseFloat(item.variance || 0),
          submitDate: item.liquidation_date,
          status: formatStatus(item.status),
          rawStatus: item.status,
          department: item.department,
          approver: item.status === 'pending' ? '-' : item.status === 'draft' ? '-' : (item.approver_name || '-'),
          releasedBy: item.status === 'pending' ? '-' : item.status === 'draft' ? '-' : (item.released_by || '-'),
          paymentMethod: item.payment_method,
          gcashName: item.gcash_name,
          accountNumber: item.account_number,
          remarks: item.remarks || '',
          rejectRemarks: item.reject_remarks || '',
          releaseRemarks: item.release_remarks || ''
        }));
        setLiquidations(mappedData);
        setRetryCount(prev => ({ ...prev, liquidations: 0 }));
      }
    } catch (error) {
      console.error('Error fetching liquidations:', error);
      if (!isRetry && retryCount.liquidations < 2) {
        setRetryCount(prev => ({ ...prev, liquidations: prev.liquidations + 1 }));
        showSnackbar(`Retrying liquidations... (${retryCount.liquidations + 1}/2)`, 'warning');
        setTimeout(() => fetchLiquidations(true), 1000);
      } else {
        setLiquidations([]);
        showSnackbar('Failed to load liquidations. Please refresh the page.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount.liquidations]);

  const fetchReimbursements = useCallback(async (isRetry = false) => {
    try {
      setLoading(true);
      const response = await api.get('/reimbursements');
      if (response.data && response.data.success) {
        const mapped = response.data.data.map(item => ({
          id: item.id,
          refNumber: item.reimbursement_number,
          purpose: item.purpose,
          amount: parseFloat(item.total_actual_amount || 0),
          periodFrom: item.period_covered_from,
          periodTo: item.period_covered_to,
          submitDate: item.reimbursement_date,
          status: formatStatus(item.status),
          rawStatus: item.status,
          approver: item.status === 'pending' ? '-' : item.status === 'draft' ? '-' : (item.approver_name || item.approved_by || '-'),
          releasedBy: item.status === 'pending' ? '-' : item.status === 'draft' ? '-' : (item.released_by || '-'),
          departmentName: item.department_name,
          paymentMethod: item.payment_method,
          gcashName: item.gcash_name,
          accountNumber: item.account_number,
          remarks: item.remarks || '',
          rejectRemarks: item.reject_remarks || '',
          releaseRemarks: item.release_remarks || ''
        }));
        setReimbursements(mapped);
        setRetryCount(prev => ({ ...prev, reimbursements: 0 }));
      }
    } catch (error) {
      console.error('Error fetching reimbursements:', error);
      if (!isRetry && retryCount.reimbursements < 2) {
        setRetryCount(prev => ({ ...prev, reimbursements: prev.reimbursements + 1 }));
        showSnackbar(`Retrying reimbursements... (${retryCount.reimbursements + 1}/2)`, 'warning');
        setTimeout(() => fetchReimbursements(true), 1000);
      } else {
        setReimbursements([]);
        showSnackbar('Failed to load reimbursements. Please refresh the page.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount.reimbursements]);

  // Handler to create a liquidation from an approved cash advance
  const handleCreateLiquidation = async (request) => {
    try {
      setLoading(true);
      const response = await api.get(`/cash-advances/${request.id}`);
      if (response.data && response.data.success) {
        const data = response.data.data;

        // Auto-generate liquidation number based on CA advance_number
        // Format: LIQ-YYYYMM-XXXX  (mirrors the CA numbering convention)
        const now = new Date();
        const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
        const seq = String(data.id).padStart(4, '0');
        const autoLiquidationNumber = `LIQ-${yyyymm}-${seq}`;

        const cashAdvance = {
          id: data.id,
          advanceNumber: data.advance_number || data.advanceNumber,
          liquidationNumber: autoLiquidationNumber,
          requestedBy: data.requested_by || data.requestedBy,
          department: data.department,
          businessUnit: data.business_unit || data.businessUnit || '',
          totalAdvanceAmount: data.requested_amount || data.requestedAmount || data.amount || 0,
          dateCoverageFrom: data.start_date || data.date_coverage_from || '',
          dateCoverageTo: data.end_date || data.date_coverage_to || '',
          items: data.items || [],
          activities: data.activities || [],
          advanceType: data.advance_type || data.advanceType || 'cash'
        };
        navigate('/liquidation', { state: { cashAdvance } });
      } else {
        navigate('/liquidation', { state: { cashAdvance: request } });
      }
    } catch (error) {
      console.error('Error fetching cash advance for liquidation:', error);
      navigate('/liquidation', { state: { cashAdvance: request } });
    } finally {
      setLoading(false);
    }
  };

  // Handler to edit a liquidation
  const handleEditLiquidation = async (request) => {
    try {
      setLoading(true);
      const response = await api.get(`/liquidations/${request.id}`);
      if (response.data && response.data.success) {
        const data = response.data.data;
        const editData = {
          id: data.id,
          liquidationNumber: data.liquidation_number,
          liquidationDate: data.liquidation_date,
          cashAdvanceId: data.cash_advance_id,
          cashAdvanceNumber: data.cash_advance_number,
          advanceType: data.advance_type || 'cash',
          submittedBy: data.submitted_by,
          department: data.department,
          departmentName: data.department_name,
          totalAdvanceAmount: data.total_advance_amount,
          totalActualAmount: data.total_actual_amount,
          refundAmount: data.refund_amount,
          additionalPayment: data.additional_payment,
          paymentMethod: data.payment_method,
          paymentReason: data.payment_reason || '',
          checkNumber: data.check_number,
          accountNumber: data.account_number,
          purpose: data.purpose || '',
          remarks: data.remarks,
          status: data.status,
          businessUnit: data.business_unit || '',
          dateOfCA: data.date_of_ca || '',
          startDate: data.start_date || '',
          endDate: data.end_date || '',
          dateCoverage: data.date_coverage || '',
          date_coverage_from: data.date_coverage_from || null,  // ✅ ADD THIS
          date_coverage_to:   data.date_coverage_to   || null,  // ✅ ADD THIS
          // Pass items and transportation as-is — getLiquidationById already returns
          // the correct shape that LiquidationForm's mapIncomingExpense /
          // mapIncomingItinerary expect (particulars/actualAmount/storeName/fromPlace/etc.)
          items: data.items || [],
          transportation: data.transportation || [],
          attachments: data.attachments || []
        };
        navigate('/liquidation', { state: { editData } });
      } else {
        navigate('/liquidation', { state: { editData: request } });
      }
    } catch (error) {
      console.error('Error fetching liquidation details:', error);
      navigate('/liquidation', { state: { editData: request } });
    } finally {
      setLoading(false);
    }
  };

  // Handler to edit a reimbursement
  const handleEditReimbursement = async (request) => {
    try {
      setLoading(true);
      const response = await api.get(`/reimbursements/${request.id}`);
      if (response.data && response.data.success) {
        const data = response.data.data;
        const editData = {
          id: data.id,
          reimbursementNumber: data.reimbursement_number,
          reimbursementDate: data.reimbursement_date,
          requestedBy: data.submitted_by,
          department: data.department_id,
          departmentName: data.department_name,
          businessUnit: data.business_unit || '',
          purpose: data.purpose || '',
          dateNeeded: data.date_needed || '',
          dateCoverageFrom: data.start_date || data.period_covered_from || '',
          dateCoverageTo:   data.end_date   || data.period_covered_to   || '',
          totalAmount: data.total_actual_amount,
          paymentMethod: data.payment_method,
          gcashName: data.gcash_name || '',
          checkNumber: data.check_number,
          accountNumber: data.account_number,
          remarks: data.remarks,
          status: data.status,
          expenses:  data.expenses  || [],
          itinerary: data.itinerary || [],
          attachments: data.attachments || []
        };
        navigate('/reimbursement', { state: { editData } });
      } else {
        navigate('/reimbursement', { state: { editData: request } });
      }
    } catch (error) {
      console.error('Error fetching reimbursement details:', error);
      navigate('/reimbursement', { state: { editData: request } });
    } finally {
      setLoading(false);
    }
  };

  // Handler to delete a liquidation
  const handleDeleteLiquidation = async (request) => {
    const statusLower = (request.status || '').toLowerCase();
    const action = statusLower.includes('pending') ? 'cancel' : 'delete';
    setConfirmTarget(request);
    setConfirmType('liquidation');
    setConfirmAction(action);
    setConfirmModalOpen(true);
  };

  // Handler to delete or cancel a cash advance
  const handleDeleteCashAdvance = async (request) => {
    const statusLower = (request.status || '').toLowerCase();
    const action = statusLower.includes('pending') ? 'cancel' : 'delete';
    setConfirmTarget(request);
    setConfirmType('cashAdvance');
    setConfirmAction(action);
    setConfirmModalOpen(true);
  };

  // Handler to delete or cancel a reimbursement
  const handleDeleteReimbursement = async (request) => {
    const statusLower = (request.status || '').toLowerCase();
    const action = statusLower.includes('pending') ? 'cancel' : 'delete';
    setConfirmTarget(request);
    setConfirmType('reimbursement');
    setConfirmAction(action);
    setConfirmModalOpen(true);
  };

  useEffect(() => {
    fetchCashAdvances();
    fetchLiquidations();
    fetchReimbursements();
  }, []);

  const formatStatus = (status) => {
    const statusMap = {
      'draft': 'Draft',
      'released': 'Released',
      'pending': 'Pending Approval',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'disbursed': 'Disbursed',
      'liquidated': 'Liquidated',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  };

  const formatLongDate = (d) => {
    if (!d && d !== 0) return '';
    try {
      const dt = new Date(d);
      if (!isNaN(dt.getTime())) return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) { }
    const s = String(d || '');
    const m = s.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) return new Date(m[1]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return s;
  };

  const tabKeyMap = { 0: 'cashAdvances', 1: 'liquidations', 2: 'reimbursements' };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSearchTerm('');
    setPage(prev => ({ ...prev, [tabKeyMap[newValue]]: 1 }));
    setSearchParams({ tab: TAB_SLUGS[newValue] }, { replace: true });
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage({ cashAdvances: 1, liquidations: 1, reimbursements: 1 });
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setPage({ cashAdvances: 1, liquidations: 1, reimbursements: 1 });
  };

  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('pending')) return 'bg-amber-50 text-amber-700 border border-amber-200';
    if (statusLower.includes('approved')) return 'bg-green-50 text-green-700 border border-green-200';
    if (statusLower.includes('disbursed')) return 'bg-blue-50 text-blue-700 border border-gray-200';
    if (statusLower.includes('released')) return 'bg-teal-50 text-teal-700 border border-teal-200';
    if (statusLower.includes('completed') || statusLower.includes('liquidated')) return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
    if (statusLower.includes('rejected')) return 'bg-red-50 text-red-700 border border-red-200';
    if (statusLower.includes('cancelled')) return 'bg-gray-50 text-gray-600 border border-gray-200';
    return 'bg-gray-50 text-gray-600 border border-gray-200';
  };

  // Lookup of each tab's raw dataset, keyed the same way as tabKeyMap
  const tabDataMap = { cashAdvances, liquidations, reimbursements };

  // Derive available statuses dynamically from the ACTIVE TAB's data only,
  // so the pill bar reflects what's actually in the tab you're viewing
  const availableStatuses = useMemo(() => {
    const activeItems = tabDataMap[tabKeyMap[tabValue]] || [];
    const statusSet = new Set(activeItems.map(item => (item.rawStatus || '').toLowerCase()).filter(Boolean));
    const order = ['pending', 'approved', 'released', 'rejected', 'draft', 'cancelled', 'disbursed', 'liquidated'];
    const sorted = order.filter(s => statusSet.has(s));
    statusSet.forEach(s => { if (!order.includes(s)) sorted.push(s); });
    return sorted;
  }, [cashAdvances, liquidations, reimbursements, tabValue]);

  // Count of pending items per tab (for badge) — scoped to the active tab only
  const pendingCount = useMemo(() => {
    const activeItems = tabDataMap[tabKeyMap[tabValue]] || [];
    return activeItems.filter(i => (i.rawStatus || '').toLowerCase() === 'pending').length;
  }, [cashAdvances, liquidations, reimbursements, tabValue]);

  // Auto-switch to All if no pending items exist
  useEffect(() => {
    if (statusFilter === 'pending' && pendingCount === 0 && availableStatuses.length > 0) {
      setStatusFilter('all');
    }
  }, [pendingCount, availableStatuses, statusFilter]);

  const applyStatusFilter = (items) => {
    if (statusFilter === 'all') return items;
    return items.filter(item => (item.rawStatus || '').toLowerCase() === statusFilter);
  };

  // Filtered lists
  const filteredCashAdvances = useMemo(() => {
    const base = applyStatusFilter(cashAdvances);
    if (!searchTerm) return base;
    return base.filter(item =>
      item.refNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.purpose && item.purpose.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [cashAdvances, searchTerm, statusFilter]);

  const filteredLiquidations = useMemo(() => {
    const base = applyStatusFilter(liquidations);
    if (!searchTerm) return base;
    return base.filter(item =>
      item.refNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.cashAdvanceRef && item.cashAdvanceRef.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [liquidations, searchTerm, statusFilter]);

  const filteredReimbursements = useMemo(() => {
    const base = applyStatusFilter(reimbursements);
    if (!searchTerm) return base;
    return base.filter(item =>
      item.refNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.purpose && item.purpose.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [reimbursements, searchTerm, statusFilter]);

  // Paginated slices for each table, sized by the shared pageSize selector
  const paginatedCashAdvances = useMemo(() => {
    const start = (page.cashAdvances - 1) * pageSize;
    return filteredCashAdvances.slice(start, start + pageSize);
  }, [filteredCashAdvances, page.cashAdvances, pageSize]);

  const paginatedLiquidations = useMemo(() => {
    const start = (page.liquidations - 1) * pageSize;
    return filteredLiquidations.slice(start, start + pageSize);
  }, [filteredLiquidations, page.liquidations, pageSize]);

  const paginatedReimbursements = useMemo(() => {
    const start = (page.reimbursements - 1) * pageSize;
    return filteredReimbursements.slice(start, start + pageSize);
  }, [filteredReimbursements, page.reimbursements, pageSize]);

  // Clamp each tab's page if data shrinks (e.g. after a delete) and the current page no longer exists
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredCashAdvances.length / pageSize));
    if (page.cashAdvances > maxPage) setPage(prev => ({ ...prev, cashAdvances: maxPage }));
  }, [filteredCashAdvances.length, page.cashAdvances, pageSize]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredLiquidations.length / pageSize));
    if (page.liquidations > maxPage) setPage(prev => ({ ...prev, liquidations: maxPage }));
  }, [filteredLiquidations.length, page.liquidations, pageSize]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredReimbursements.length / pageSize));
    if (page.reimbursements > maxPage) setPage(prev => ({ ...prev, reimbursements: maxPage }));
  }, [filteredReimbursements.length, page.reimbursements, pageSize]);

  // Stats reflect only the currently active tab, so switching tabs updates the cards
  const activeTabData = tabDataMap[tabKeyMap[tabValue]] || [];

  const stats = useMemo(() => ({
    pending: activeTabData.filter(item => (item.rawStatus || '').toLowerCase() === 'pending').length,
    approved: activeTabData.filter(item => (item.rawStatus || '').toLowerCase() === 'approved').length,
    rejected: activeTabData.filter(item => (item.rawStatus || '').toLowerCase() === 'rejected').length,
    released: activeTabData.filter(item => (item.rawStatus || '').toLowerCase() === 'released').length,
  }), [activeTabData]);

  const tabs = [
    { label: 'Cash Advances', icon: <HandCoins className="w-4 h-4" /> },
    { label: 'Liquidations', icon: <ReceiptText className="w-4 h-4" /> },
    { label: 'Reimbursements', icon: <Coins className="w-4 h-4" /> }
  ];

  return (
    <div className="min-w-0 space-y-5">
      {/* Alert toast notification */}
      <Alert
        open={snackbar.open}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        severity={snackbar.severity}
      />

      {/* Page introduction */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-gray-900 sm:text-xl">My Requests</h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-500">Manage your cash advances, liquidations, and reimbursements.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: 'Pending',
            value: stats.pending,
            icon: Clock,
            color: 'border-amber-200 bg-amber-50',
            text: 'text-amber-800',
            iconColor: 'text-amber-600'
          },
          {
            label: 'Approved',
            value: stats.approved,
            icon: CheckCircle,
            color: 'border-green-200 bg-green-50',
            text: 'text-green-800',
            iconColor: 'text-green-600'
          },
          {
            label: 'Rejected',
            value: stats.rejected,
            icon: XCircle,
            color: 'border-red-200 bg-red-50',
            text: 'text-red-800',
            iconColor: 'text-red-600'
          },
          {
            label: 'Released',
            value: stats.released,
            icon: Banknote,
            color: 'border-blue-200 bg-blue-50',
            text: 'text-blue-800',
            iconColor: 'text-blue-600'
          }
        ].map(({ label, value, icon: Icon, color, text, iconColor }) => (
          <section
            key={label}
            className={`min-w-0 rounded-xl border p-4 sm:p-5 ${color}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className={`text-xs font-medium sm:text-sm ${text}`}>
                {label}
              </p>

              <Icon
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 ${iconColor}`}
              />
            </div>

            <p
              className={`mt-3 text-2xl font-semibold tabular-nums sm:text-3xl ${text}`}
            >
              {value}
            </p>
          </section>
        ))}
      </div>

      {/* Main card panel */}
      <section className="min-w-0 rounded-xl border border-gray-200 bg-white">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex min-w-0 gap-1 overflow-x-auto px-2 sm:px-4">
            {tabs.map((tab, index) => (
              <button
                type="button"
                key={index}
                onClick={() => handleTabChange(null, index)}
                className={`flex min-h-[48px] shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-400 sm:px-4 sm:text-sm ${
                  tabValue === index
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 space-y-4 p-3 sm:p-5 lg:p-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              aria-label="Search requests"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(prev => ({ ...prev, [tabKeyMap[tabValue]]: 1 }));
              }}
              className="min-h-[44px] w-full rounded-lg border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            />
          </div>

          {/* Status Filter Bar */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleStatusFilterChange('all')}
              className={`min-h-[40px] rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 ${
                statusFilter === 'all' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              All Requests
            </button>
            {availableStatuses.map((status) => {
              const isActive = statusFilter === status;
              const isPending = status === 'pending';
              const label = status === 'pending' ? 'Pending Approval' : status.charAt(0).toUpperCase() + status.slice(1);
              const statusColors = {
                pending: {
                  active: 'border-amber-600 bg-amber-600 text-white',
                  inactive: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                },
                approved: {
                  active: 'border-green-700 bg-green-700 text-white',
                  inactive: 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100'
                },
                rejected: {
                  active: 'border-red-700 bg-red-700 text-white',
                  inactive: 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
                },
                released: {
                  active: 'border-blue-700 bg-blue-700 text-white',
                  inactive: 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100'
                },
                disbursed: {
                  active: 'border-teal-700 bg-teal-700 text-white',
                  inactive: 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100'
                },
                liquidated: {
                  active: 'border-indigo-700 bg-indigo-700 text-white',
                  inactive: 'border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                }
              };

              const colors = statusColors[status] || {
                active: 'border-gray-700 bg-gray-700 text-white',
                inactive: 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
              };

              const colorClass = isActive ? colors.active : colors.inactive;
              return (
                <button
                  type="button"
                  key={status}
                  onClick={() => handleStatusFilterChange(status)}
                  className={`flex items-center gap-1.5 min-h-[40px] rounded-lg border px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 ${colorClass}`}
                >
                  {label}
                  {isPending && pendingCount > 0 && (
                    <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Cash Advances Tab Panel */}
          {tabValue === 0 && (
            <>
              {/* Mobile card list */}
              <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
                {loading ? (
                  <Loading message="Loading cash advances..." />
                ) : filteredCashAdvances.length === 0 ? (
                  <p className="py-10 text-center text-sm italic text-gray-500">No results found.</p>
                ) : (
                  paginatedCashAdvances.map((request) => (
                    <div
                      key={request.id}
                      className={`min-w-0 rounded-xl border border-gray-200 bg-white p-4 ${
                        request.urgency === 'overdue' ? 'bg-red-50/40 border-l-4 border-l-red-500' :
                        request.urgency === 'urgent'  ? 'bg-orange-50/40 border-l-4 border-l-orange-400' :
                        request.urgency === 'warning' ? 'bg-yellow-50/40 border-l-4 border-l-yellow-400' : ''
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 break-words text-sm font-semibold text-gray-900">{request.refNumber}</p>
                        <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                          ₱{request.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{formatLongDate(request.requestDate)}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                        {request.urgency && request.urgency !== 'normal' && (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                            request.urgency === 'overdue' ? 'border-red-200 bg-red-50 text-red-700' :
                            request.urgency === 'urgent'  ? 'border-orange-200 bg-orange-50 text-orange-700' :
                                                            'border-yellow-200 bg-yellow-50 text-yellow-700'
                          }`}>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {request.urgency === 'overdue' ? 'Overdue' :
                             request.urgency === 'urgent'  ? 'Urgent' : 'Due soon'}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3">
                        <p className="min-w-0 break-words text-xs text-gray-600">
                          {isApproverUser ? 'Accounting: ' : 'Approver: '}{isApproverUser ? request.releasedBy : request.approver}
                        </p>
                        <div className="flex flex-wrap items-center gap-1">
                          <button type="button" onClick={() => handleView(request)} aria-label="View details" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
                            <Eye className="w-4 h-4" />
                          </button>
                          {['draft', 'cancelled', 'rejected'].includes((request.status || '').toLowerCase()) && (
                            <button type="button" onClick={() => handleEdit(request)} aria-label="Edit request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {request.status === 'Draft' && (
                            <button type="button" onClick={() => handleDeleteCashAdvance(request)} aria-label="Delete or cancel request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {request.status === 'Pending Approval' && (
                            <button type="button" onClick={() => handleDeleteCashAdvance(request)} aria-label="Delete or cancel request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          {request.status.toLowerCase().includes('released') && !liquidations.some(l => l.cashAdvanceRef === request.refNumber) && (
                            <button type="button" onClick={() => handleCreateLiquidation(request)} aria-label="Create liquidation" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden min-w-0 max-w-full overflow-x-auto rounded-lg border border-gray-200 xl:block">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">Reference No.</th>
                    <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">Request Date</th>
                    <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">{isApproverUser ? 'Accounting Handler' : 'Approver'}</th>
                    <th className="px-4 py-3 w-2/12 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12">
                        <Loading message="Loading cash advances..." />
                      </td>
                    </tr>
                  ) : filteredCashAdvances.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm italic text-gray-500">
                        No results found.
                      </td>
                    </tr>
                  ) : (
                    paginatedCashAdvances.map((request) => (
                      <tr
                        key={request.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          request.urgency === 'overdue' ? 'bg-red-50/40 border-l-4 border-red-500' :
                          request.urgency === 'urgent'  ? 'bg-orange-50/40 border-l-4 border-orange-400' :
                          request.urgency === 'warning' ? 'bg-yellow-50/40 border-l-4 border-yellow-400' : ''
                        }`}
                      >
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">{request.refNumber}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-left text-gray-900">
                          ₱{request.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{formatLongDate(request.requestDate)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(request.status)}`}>
                              {request.status}
                            </span>
                            {request.urgency && request.urgency !== 'normal' && (
                              <Tooltip title={
                                request.urgency === 'overdue'
                                  ? `Liquidation overdue since ${request.liquidationDeadline ? new Date(request.liquidationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}`
                                  : `Liquidation due in ${request.daysUntilDeadline} day${request.daysUntilDeadline === 1 ? '' : 's'} — ${request.liquidationDeadline ? new Date(request.liquidationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}`
                              }>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                                  request.urgency === 'overdue' ? 'border-red-200 bg-red-50 text-red-700' :
                                  request.urgency === 'urgent'  ? 'border-orange-200 bg-orange-50 text-orange-700' :
                                                                  'border-yellow-200 bg-yellow-50 text-yellow-700'
                                }`}>
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  {request.urgency === 'overdue' ? 'Overdue Liquidation' :
                                   request.urgency === 'urgent'  ? 'Liquidation Urgent' :
                                                                   'Liquidation Due Soon'}
                                </span>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-[150px] truncate" title={isApproverUser ? request.releasedBy : request.approver}>
                          {isApproverUser ? request.releasedBy : request.approver}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <Tooltip title="View Details">
                              <button type="button" onClick={() => handleView(request)} aria-label="View details" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
                                <Eye className="w-4 h-4" />
                              </button>
                            </Tooltip>
                            {['draft', 'cancelled', 'rejected'].includes((request.status || '').toLowerCase()) && (
                              <Tooltip title="Edit">
                                <button type="button" onClick={() => handleEdit(request)} aria-label="Edit request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                            {request.status === 'Draft' && (
                              <Tooltip title="Delete">
                                <button type="button" onClick={() => handleDeleteCashAdvance(request)} aria-label="Delete or cancel request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                            {request.status === 'Pending Approval' && (
                              <Tooltip title="Cancel Request">
                                <button type="button" onClick={() => handleDeleteCashAdvance(request)} aria-label="Delete or cancel request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                            {request.status.toLowerCase().includes('released') && !liquidations.some(l => l.cashAdvanceRef === request.refNumber) && (
                              <Tooltip title="Create Liquidation">
                                <button type="button" onClick={() => handleCreateLiquidation(request)} aria-label="Create liquidation" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
                                  <Receipt className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </>
          )}

          {/* Cash Advances Pagination */}
          {tabValue === 0 && (
            <Pagination
              currentPage={page.cashAdvances}
              totalItems={filteredCashAdvances.length}
              pageSize={pageSize}
              onPageChange={(p) => setPage(prev => ({ ...prev, cashAdvances: p }))}
              onPageSizeChange={handlePageSizeChange}
            />
          )}

          {/* Liquidations Tab Panel */}
          {tabValue === 1 && (
            <>
              {/* Mobile card list */}
              <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
                {loading ? (
                  <Loading message="Loading liquidations..." />
                ) : filteredLiquidations.length === 0 ? (
                  <p className="py-10 text-center text-sm italic text-gray-500">No results found.</p>
                ) : (
                  paginatedLiquidations.map((request) => (
                    <div key={request.id} className="min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 break-words text-sm font-semibold text-gray-900">{request.refNumber}</p>
                        <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                          ₱{request.totalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        CA ref: {request.cashAdvanceRef} · {formatLongDate(request.submitDate)}
                      </p>
                      <div className="mt-2">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3">
                        <p className="min-w-0 break-words text-xs text-gray-600">
                          {isApproverUser ? 'Disburse by: ' : 'Approver: '}{isApproverUser ? request.releasedBy : request.approver}
                        </p>
                        <div className="flex flex-wrap items-center gap-1">
                          <button type="button" onClick={() => handleViewLiquidation(request)} aria-label="View details" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
                            <Eye className="w-4 h-4" />
                          </button>
                          {['draft', 'cancelled', 'rejected'].includes((request.status || '').toLowerCase()) && (
                            <button type="button" onClick={() => handleEditLiquidation(request)} aria-label="Edit request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {request.status === 'Draft' && (
                            <button type="button" onClick={() => handleDeleteLiquidation(request)} aria-label="Delete or cancel request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {request.status === 'Pending Approval' && (
                            <button type="button" onClick={() => handleDeleteLiquidation(request)} aria-label="Delete or cancel request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden min-w-0 max-w-full overflow-x-auto rounded-lg border border-gray-200 xl:block">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">Reference No.</th>
                    <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">Cash Advance Ref No.</th>
                    <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">Submit Date</th>
                    <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">{isApproverUser ? 'Disburse By' : 'Approver'}</th>
                    <th className="px-4 py-3 w-2/12 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12">
                        <Loading message="Loading liquidations..." />
                      </td>
                    </tr>
                  ) : filteredLiquidations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm italic text-gray-500">
                        No results found.
                      </td>
                    </tr>
                  ) : (
                    paginatedLiquidations.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">{request.refNumber}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{request.cashAdvanceRef}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{formatLongDate(request.submitDate)}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-[150px] truncate" title={isApproverUser ? request.releasedBy : request.approver}>
                          {isApproverUser ? request.releasedBy : request.approver}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <Tooltip title="View Details">
                              <button type="button" onClick={() => handleViewLiquidation(request)} aria-label="View details" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
                                <Eye className="w-4 h-4" />
                              </button>
                            </Tooltip>
                            {['draft', 'cancelled', 'rejected'].includes((request.status || '').toLowerCase()) && (
                              <Tooltip title="Edit">
                                <button type="button" onClick={() => handleEditLiquidation(request)} aria-label="Edit request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                            {request.status === 'Draft' && (
                              <Tooltip title="Delete">
                                <button type="button" onClick={() => handleDeleteLiquidation(request)} aria-label="Delete or cancel request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                            {request.status === 'Pending Approval' && (
                              <Tooltip title="Cancel Request">
                                <button type="button" onClick={() => handleDeleteLiquidation(request)} aria-label="Delete or cancel request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </>
          )}

          {/* Liquidations Pagination */}
          {tabValue === 1 && (
            <Pagination
              currentPage={page.liquidations}
              totalItems={filteredLiquidations.length}
              pageSize={pageSize}
              onPageChange={(p) => setPage(prev => ({ ...prev, liquidations: p }))}
              onPageSizeChange={handlePageSizeChange}
            />
          )}

          {/* Reimbursements Tab Panel */}
          {tabValue === 2 && (
            <>
              {/* Mobile card list */}
              <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:hidden">
                {loading ? (
                  <Loading message="Loading reimbursements..." />
                ) : filteredReimbursements.length === 0 ? (
                  <p className="py-10 text-center text-sm italic text-gray-500">No results found.</p>
                ) : (
                  paginatedReimbursements.map((request) => (
                    <div key={request.id} className="min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 break-words text-sm font-semibold text-gray-900">{request.refNumber}</p>
                        <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                          ₱{request.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{formatLongDate(request.submitDate)}</p>
                      <div className="mt-2">
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-col gap-3 border-t border-gray-100 pt-3">
                        <p className="min-w-0 break-words text-xs text-gray-600">
                          {isApproverUser ? 'Disburse by: ' : 'Approver: '}{isApproverUser ? request.releasedBy : request.approver}
                        </p>
                        <div className="flex flex-wrap items-center gap-1">
                          <button type="button" onClick={() => handleViewReimbursement(request)} aria-label="View details" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
                            <Eye className="w-4 h-4" />
                          </button>
                          {['draft', 'cancelled', 'rejected'].includes((request.status || '').toLowerCase()) && (
                            <button type="button" onClick={() => handleEditReimbursement(request)} aria-label="Edit request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {request.status === 'Draft' && (
                            <button type="button" onClick={() => handleDeleteReimbursement(request)} aria-label="Delete or cancel request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {request.status === 'Pending Approval' && (
                            <button type="button" onClick={() => handleDeleteReimbursement(request)} aria-label="Delete or cancel request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop table */}
              <div className="hidden min-w-0 max-w-full overflow-x-auto rounded-lg border border-gray-200 xl:block">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">Reference No.</th>
                    <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">Submit Date</th>
                    <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">{isApproverUser ? 'Disburse By' : 'Approver'}</th>
                    <th className="px-4 py-3 w-2/12 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12">
                        <Loading message="Loading reimbursements..." />
                      </td>
                    </tr>
                  ) : filteredReimbursements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm italic text-gray-500">
                        No results found.
                      </td>
                    </tr>
                  ) : (
                    paginatedReimbursements.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 text-sm font-semibold text-gray-900">{request.refNumber}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-left text-gray-900">
                          ₱{request.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{formatLongDate(request.submitDate)}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-[150px] truncate" title={isApproverUser ? request.releasedBy : request.approver}>
                          {isApproverUser ? request.releasedBy : request.approver}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <Tooltip title="View Details">
                              <button type="button" onClick={() => handleViewReimbursement(request)} aria-label="View details" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
                                <Eye className="w-4 h-4" />
                              </button>
                            </Tooltip>
                            {['draft', 'cancelled', 'rejected'].includes((request.status || '').toLowerCase()) && (
                              <Tooltip title="Edit">
                                <button type="button" onClick={() => handleEditReimbursement(request)} aria-label="Edit request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                            {request.status === 'Draft' && (
                              <Tooltip title="Delete">
                                <button type="button" onClick={() => handleDeleteReimbursement(request)} aria-label="Delete or cancel request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                            {request.status === 'Pending Approval' && (
                              <Tooltip title="Cancel Request">
                                <button type="button" onClick={() => handleDeleteReimbursement(request)} aria-label="Delete or cancel request" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </>
          )}

          {/* Reimbursements Pagination */}
          {tabValue === 2 && (
            <Pagination
              currentPage={page.reimbursements}
              totalItems={filteredReimbursements.length}
              pageSize={pageSize}
              onPageChange={(p) => setPage(prev => ({ ...prev, reimbursements: p }))}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </div>
      </section>

      {/* View Details Modal */}
      <Modal
        open={viewModalOpen}
        onClose={handleCloseModal}
        title={
          <div className="flex flex-wrap items-center gap-2">
            <span>Request Details</span>
            {selectedRequest && (
              <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${getStatusColor(selectedRequest.status)}`}>
                {selectedRequest.status?.toUpperCase()}
              </span>
            )}
          </div>
        }
        maxWidth="xl"
        actions={
          <Button variant="secondary" onClick={handleCloseModal}>Close</Button>
        }
      >
        {viewLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : selectedRequest ? (
          <>
            <RequestTimeline request={selectedRequest} />
            {tabValue === 0 && <CashAdvanceForm editData={selectedRequest} viewOnly onClose={handleCloseModal} hideCloseButton />}
            {tabValue === 1 && <LiquidationForm editData={selectedRequest} viewOnly onClose={handleCloseModal} hideCloseButton />}
            {tabValue === 2 && <ReimbursementForm editData={selectedRequest} viewOnly onClose={handleCloseModal} hideCloseButton />}
          </>
        ) : (
          <div className="text-sm text-gray-500 py-6 text-center">No details available.</div>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        open={confirmModalOpen}
        onClose={() => { if (!confirmLoading) closeConfirmModal(); }}
        title={confirmAction === 'cancel' ? 'Confirm Cancel' : 'Confirm Delete'}
        maxWidth="sm"
        actions={
          <>
            <Button variant="secondary" onClick={closeConfirmModal} disabled={confirmLoading}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={performConfirmAction}
              disabled={confirmLoading}
              startIcon={confirmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (confirmAction === 'cancel' ? <XCircle className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />)}
            >
              {confirmLoading ? 'Processing...' : (confirmAction === 'cancel' ? 'Confirm Cancel' : 'Confirm Delete')}
            </Button>
          </>
        }
      >
        <p className="text-gray-700 text-sm">
          {confirmAction === 'cancel'
            ? `Are you sure you want to cancel this ${confirmType === 'cashAdvance' ? 'cash advance' : confirmType === 'reimbursement' ? 'reimbursement' : 'liquidation'}?`
            : `Are you sure you want to delete this ${confirmType === 'cashAdvance' ? 'cash advance' : confirmType === 'reimbursement' ? 'reimbursement' : 'liquidation'}?`}
        </p>
      </Modal>
    </div>
  );
};

export default MyRequests;