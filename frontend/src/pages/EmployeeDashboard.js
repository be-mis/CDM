import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  HandCoins, ReceiptText, Coins, TrendingUp, AlertTriangle, Eye,
  Clock, Send, Banknote, FileEdit, CheckCircle, XCircle, Receipt,
  RefreshCw
} from 'lucide-react';
import CashAdvanceForm from '../components/CashAdvanceForm';
import LiquidationForm from '../components/LiquidationForm';
import { formatCurrency } from '../utils/formatters';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Loading, Spinner } from '../components/ui/Loading';
import StatusChip from '../components/StatusChip';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OVERVIEW_TYPES = {
  CASH_ADVANCES: 'cashAdvances',
  LIQUIDATIONS: 'liquidations',
  REIMBURSEMENTS: 'reimbursements',
};

const REQUEST_TYPES = {
  CASH_ADVANCE: 'cash-advance',
  LIQUIDATION: 'liquidation',
};

const URGENCY_LEVELS = {
  OVERDUE: 'overdue',
  URGENT: 'urgent',
  WARNING: 'warning',
  NORMAL: 'normal',
};

const URGENCY_DAYS = {
  URGENT_THRESHOLD: 3,
  WARNING_THRESHOLD: 7,
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Formats a timestamp for display (date + time). Falls back gracefully
 * if the value is missing or unparsable.
 */
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

/**
 * Formats a date without time component.
 */
const formatLongDate = (value) => {
  if (!value) return '—';
  try {
    const dt = new Date(value);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  } catch (_) {}
  return String(value);
};

/**
 * Human-readable status label mapping.
 */
const STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  disbursed: 'Disbursed',
  released: 'Released',
  liquidated: 'Liquidated',
  cancelled: 'Cancelled',
};

const formatStatus = (status) =>
  STATUS_LABELS[status] ?? status;

/**
 * Normalizes status strings for reliable comparison.
 */
const normalizeStatus = (status) =>
  (status || '').toString().toLowerCase();

/**
 * Picks the first defined, non-null value from an object by trying a list of keys.
 * BUG FIX: original used `if (request[k])` which skips falsy values like 0 or "".
 * Using `!= null` so only null/undefined are skipped.
 */
const pickField = (obj, ...keys) => {
  for (const k of keys) {
    if (obj[k] != null) return obj[k];
  }
  return null;
};

/**
 * Calculates urgency level for a liquidation deadline.
 */
const calcUrgency = (deadline) => {
  if (!deadline) return null;
  const daysLeft = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
  let urgency;
  if (daysLeft < 0) urgency = URGENCY_LEVELS.OVERDUE;
  else if (daysLeft <= URGENCY_DAYS.URGENT_THRESHOLD) urgency = URGENCY_LEVELS.URGENT;
  else if (daysLeft <= URGENCY_DAYS.WARNING_THRESHOLD) urgency = URGENCY_LEVELS.WARNING;
  else urgency = URGENCY_LEVELS.NORMAL;
  return { daysLeft, urgency };
};

// ---------------------------------------------------------------------------
// Timeline builder
// ---------------------------------------------------------------------------

/**
 * Builds an ordered list of timeline steps for any request type.
 * Supports multiple API field-naming conventions (snake_case, camelCase).
 * Steps with no timestamp are shown as "current" or "upcoming" rather than skipped.
 */
const buildTimelineSteps = (request) => {
  if (!request) return [];

  const pick = (...keys) => pickField(request, ...keys);
  const status = normalizeStatus(request.status);
  const steps = [];

  // 1. Submitted — always done
  const submittedAt = pick('created_at', 'submitted_at', 'date_filed', 'requested_at');
  steps.push({
    key: 'submitted',
    label: 'Request Submitted',
    actor: pick('requested_by', 'submitted_by', 'created_by', 'requestedBy', 'submittedBy'),
    timestamp: submittedAt,
    icon: Send,
    isDone: true,
  });

  // 2. Edited/Resubmitted (only if tracked and differs from submission)
  const updatedAt = pick('updated_at', 'last_modified_at');
  if (
    updatedAt &&
    submittedAt &&
    new Date(updatedAt).getTime() > new Date(submittedAt).getTime() &&
    status === 'pending'
  ) {
    steps.push({
      key: 'updated',
      label: 'Request Updated',
      actor: pick('updated_by', 'modified_by'),
      timestamp: updatedAt,
      icon: FileEdit,
      isDone: true,
    });
  }

  // 3. Approved / Rejected (mutually exclusive)
  const approvedAt = pick('approved_at', 'approval_date');
  const rejectedAt = pick('rejected_at', 'rejection_date', 'declined_at');

  if (status === 'rejected' || rejectedAt) {
    steps.push({
      key: 'rejected',
      label: 'Request Rejected',
      actor: pick('rejected_by', 'reviewed_by', 'approver_name', 'action_by'),
      timestamp: rejectedAt,
      remarks: pick('reject_remarks', 'rejection_reason', 'remarks'),
      icon: XCircle,
      isDone: true,
      doneColor: 'text-red-600 bg-red-100',
    });
  } else {
    steps.push({
      key: 'approved',
      label: 'Request Approved',
      actor: pick('approved_by', 'reviewed_by', 'approver_name', 'action_by'),
      timestamp: approvedAt,
      remarks: pick('approval_remarks', 'remarks'),
      icon: CheckCircle,
      isDone:
        Boolean(approvedAt) ||
        ['approved', 'released', 'disbursed', 'liquidated'].includes(status),
      doneColor: 'text-green-600 bg-green-100',
    });
  }

  // 4. Funds Released (only shown when applicable)
  const releasedAt = pick('released_at', 'processed_at', 'disbursed_at');
  if (['released', 'disbursed', 'liquidated'].includes(status) || releasedAt) {
    steps.push({
      key: 'released',
      label: 'Funds Released',
      actor: pick('released_by', 'processed_by', 'disbursed_by'),
      timestamp: releasedAt,
      remarks: pick('release_remarks'),
      icon: Banknote,
      isDone:
        Boolean(releasedAt) || ['released', 'disbursed', 'liquidated'].includes(status),
      doneColor: 'text-blue-600 bg-blue-100',
    });
  }

  // Resolve each step's display state
  let currentAssigned = false;
  return steps.map((step) => {
    if (step.isDone) {
      return { ...step, state: 'done', color: step.doneColor || 'text-gray-500 bg-gray-100' };
    }
    if (!currentAssigned) {
      currentAssigned = true;
      return {
        ...step,
        state: 'current',
        color: 'text-amber-600 bg-amber-100 ring-2 ring-amber-300 ring-offset-2',
      };
    }
    return { ...step, state: 'upcoming', color: 'text-gray-400 bg-gray-100' };
  });
};

// ---------------------------------------------------------------------------
// Normalizers — shape raw API data into consistent view objects
// ---------------------------------------------------------------------------

const normalizeCashAdvanceView = (data, fallback = {}) => ({
  id: data.id,
  refNumber: data.advance_number || data.advanceNumber || fallback.refNumber,
  requestDate: data.advance_date || data.advanceDate || fallback.requestDate,
  requestedBy: data.requested_by || data.requestedBy,
  department: data.department,
  employeeId: data.employee_id || data.employeeId,
  purpose: data.purpose,
  projectName: data.project_name || data.projectName,
  destination: data.destination,
  startDate: data.start_date || data.startDate,
  endDate: data.end_date || data.endDate,
  activities: Array.isArray(data.activities)
    ? data.activities.map((a) => ({
        id: a.id,
        destination: a.destination,
        start_date: a.start_date,
        end_date: a.end_date,
      }))
    : [],
  paymentMethod: data.payment_method || data.paymentMethod,
  paymentReason: data.payment_reason || data.paymentReason || '',
  checkNumber: data.check_number || data.checkNumber,
  accountNumber: data.account_number || data.accountNumber,
  liquidationDeadline: data.liquidation_deadline || data.liquidationDeadline,
  status: data.status,
  remarks: data.remarks,
  reject_remarks: data.reject_remarks || '',
  release_remarks: data.release_remarks || '',
  items: Array.isArray(data.items)
    ? data.items.map((it) => ({
        id: it.id,
        description: it.description || it.item_description || '',
        estimatedAmount: it.estimated_amount ?? it.estimatedAmount ?? it.amount ?? 0,
      }))
    : [],
  attachments: data.attachments || [],
  // Timeline fields
  created_at: data.created_at || data.advance_date,
  approved_at: data.approved_at,
  approved_by: data.approver_name || data.approved_by,
  rejected_at: data.rejected_at,
  rejected_by: data.rejected_by || data.approver_name,
  released_at: data.released_at,
  released_by: data.released_by,
  type: REQUEST_TYPES.CASH_ADVANCE,
});

const normalizeLiquidationView = (data, fallback = {}) => ({
  id: data.id,
  liquidationNumber: data.liquidation_number || fallback.refNumber,
  liquidationDate: data.liquidation_date || fallback.submitDate,
  cashAdvanceId: data.cash_advance_id,
  cashAdvanceNumber: data.cash_advance_number || fallback.cashAdvanceRef,
  submittedBy: data.submitted_by || fallback.submittedBy,
  department: data.department,
  totalAdvanceAmount: data.total_advance_amount || fallback.totalExpenses || 0,
  totalActualAmount: data.total_actual_amount || 0,
  refundAmount: data.refund_amount || 0,
  additionalPayment: data.additional_payment || 0,
  paymentMethod: data.payment_method,
  checkNumber: data.check_number,
  accountNumber: data.account_number,
  remarks: data.remarks,
  reject_remarks: data.reject_remarks || '',
  release_remarks: data.release_remarks || '',
  status: data.status,
  items: Array.isArray(data.items)
    ? data.items.map((it) => ({
        id: it.id,
        description: it.description || '',
        category: it.category || '',
        estimatedAmount: it.estimated_amount ?? it.estimatedAmount ?? 0,
        actualAmount: it.actual_amount ?? it.actualAmount ?? 0,
        receiptNumber: it.receipt_number || '',
        vendor: it.vendor || '',
        expenseDate: it.expense_date || '',
      }))
    : [],
  attachments: data.attachments || [],
  // Timeline fields
  created_at: data.created_at || data.liquidation_date,
  approved_at: data.approved_at,
  approved_by: data.approver_name || data.approved_by,
  rejected_at: data.rejected_at,
  rejected_by: data.rejected_by || data.approver_name,
  released_at: data.released_at,
  released_by: data.released_by,
  type: REQUEST_TYPES.LIQUIDATION,
});

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const RequestTimeline = ({ request }) => {
  const steps = useMemo(() => buildTimelineSteps(request), [request]);
  if (steps.length === 0) return null;

  return (
    <div className="mb-6 border border-gray-200 rounded-lg p-4 bg-gray-50/50">
      <div className="flex items-center gap-2 mb-5">
        <Clock className="w-4 h-4 text-gray-500" />
        <h4 className="text-sm font-semibold text-gray-700">Request Timeline</h4>
      </div>
      <div className="overflow-x-auto">
        <ol className="flex items-start min-w-max md:min-w-0">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === steps.length - 1;
            const dateLabel = formatDateTime(step.timestamp);
            const isDone = step.state === 'done';
            const isCurrent = step.state === 'current';
            const connectorClass = isDone ? 'bg-gray-400' : 'bg-gray-200';

            return (
              <li key={step.key} className={`flex items-start ${isLast ? '' : 'flex-1'}`}>
                <div className="flex flex-col items-center w-32 shrink-0 text-center">
                  <span
                    className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-all ${step.color} ${isCurrent ? 'animate-pulse' : ''}`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <p
                    className={`mt-2 text-xs leading-snug ${
                      isCurrent
                        ? 'font-bold text-amber-700'
                        : isDone
                        ? 'font-medium text-gray-900'
                        : 'font-medium text-gray-400'
                    }`}
                  >
                    {step.label}
                    {isCurrent && (
                      <span className="block text-[11px] font-semibold text-amber-600">
                        In Progress
                      </span>
                    )}
                    {step.state === 'upcoming' && (
                      <span className="block text-[11px] font-normal text-gray-400">
                        Not yet
                      </span>
                    )}
                  </p>
                  <p
                    className={`text-[11px] mt-0.5 leading-snug ${
                      isDone ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    {dateLabel ||
                      (isDone
                        ? 'Date not recorded'
                        : isCurrent
                        ? 'Awaiting action'
                        : 'Not yet processed')}
                  </p>
                  {step.actor && (
                    <p
                      className={`text-[11px] leading-snug truncate max-w-full ${
                        isDone ? 'text-gray-500' : 'text-gray-400'
                      }`}
                      title={step.actor}
                    >
                      {step.actor}
                    </p>
                  )}
                  {step.remarks && (
                    <p className="text-[11px] text-gray-600 mt-1 italic px-1.5 border-l-2 border-gray-200 text-left w-full">
                      "{step.remarks}"
                    </p>
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`flex-1 min-w-[2.5rem] h-px mt-4 transition-colors ${connectorClass}`}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

// Stat card for the summary overview section
const OverviewStatCard = ({ label, count, loading, className = '' }) => (
  <div className={`text-center p-4 bg-blue-50 rounded-lg border ${className}`}>
    <h3 className="text-3xl font-bold mb-2">
      {loading ? <Spinner size="sm" /> : count}
    </h3>
    <p className="text-sm">{label}</p>
  </div>
);

// Urgency badge shown in the pending liquidations table
const UrgencyBadge = ({ urgency, daysLeft }) => {
  const styles = {
    [URGENCY_LEVELS.OVERDUE]: 'bg-red-100 text-red-700 border-red-200',
    [URGENCY_LEVELS.URGENT]: 'bg-orange-100 text-orange-700 border-orange-200',
    [URGENCY_LEVELS.WARNING]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    [URGENCY_LEVELS.NORMAL]: 'bg-green-100 text-green-700 border-green-200',
  };
  const label =
    urgency === URGENCY_LEVELS.OVERDUE
      ? `Overdue by ${Math.abs(daysLeft)}d`
      : `${daysLeft}d left`;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold w-fit border ${styles[urgency]}`}
    >
      {label}
    </span>
  );
};

// Row urgency styles for the pending liquidations table
const URGENCY_ROW_STYLES = {
  [URGENCY_LEVELS.OVERDUE]: 'bg-red-50/50 border-l-4 border-l-red-500',
  [URGENCY_LEVELS.URGENT]: 'bg-orange-50/50 border-l-4 border-l-orange-400',
  [URGENCY_LEVELS.WARNING]: 'bg-yellow-50/50 border-l-4 border-l-yellow-400',
  [URGENCY_LEVELS.NORMAL]: 'hover:bg-gray-50',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.name || user?.username || user?.email || 'User';

  // ── Data state ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  // BUG FIX: track per-resource errors separately so one failure doesn't hide others
  const [errors, setErrors] = useState({ cashAdvances: null, liquidations: null, reimbursements: null });
  const [cashAdvances, setCashAdvances] = useState([]);
  const [liquidations, setLiquidations] = useState([]);
  const [reimbursements, setReimbursements] = useState([]);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [selectedOverviewType, setSelectedOverviewType] = useState(OVERVIEW_TYPES.CASH_ADVANCES);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchCashAdvances = useCallback(async () => {
    try {
      const response = await api.get('/cash-advances');
      if (response.data.success) {
        setCashAdvances(response.data.data);
        setErrors((prev) => ({ ...prev, cashAdvances: null }));
      }
    } catch (error) {
      console.error('Error fetching cash advances:', error);
      setErrors((prev) => ({ ...prev, cashAdvances: 'Failed to load cash advances.' }));
    }
  }, []);

  const fetchLiquidations = useCallback(async () => {
    try {
      const response = await api.get('/liquidations');
      if (response.data.success) {
        setLiquidations(response.data.data);
        setErrors((prev) => ({ ...prev, liquidations: null }));
      }
    } catch (error) {
      console.error('Error fetching liquidations:', error);
      setErrors((prev) => ({ ...prev, liquidations: 'Failed to load liquidations.' }));
    }
  }, []);

  const fetchReimbursements = useCallback(async () => {
    try {
      const response = await api.get('/reimbursements');
      if (response.data.success) {
        setReimbursements(response.data.data);
        setErrors((prev) => ({ ...prev, reimbursements: null }));
      }
    } catch (error) {
      console.error('Error fetching reimbursements:', error);
      setErrors((prev) => ({ ...prev, reimbursements: 'Failed to load reimbursements.' }));
    }
  }, []);

  // BUG FIX: Previously only fetchCashAdvances controlled the `loading` flag,
  // so the spinner could disappear before liquidations/reimbursements resolved.
  // Now all three fetches run in parallel and loading clears when all are done.
  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.allSettled([
      fetchCashAdvances(),
      fetchLiquidations(),
      fetchReimbursements(),
    ]);
    setLoading(false);
  }, [fetchCashAdvances, fetchLiquidations, fetchReimbursements]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Derived / memoised values ──────────────────────────────────────────────

  // Cash advances that are released and have no liquidation filed yet
  const pendingLiquidationCAs = useMemo(() => {
    const liquidatedCaIds = new Set(
      liquidations.map((l) => l.cash_advance_id).filter(Boolean)
    );
    return cashAdvances
      .filter(
        (ca) =>
          ['released', 'disbursed'].includes(normalizeStatus(ca.status)) &&
          !liquidatedCaIds.has(ca.id)
      )
      .map((ca) => {
        const deadlineInfo = calcUrgency(ca.liquidation_deadline);
        return {
          ...ca,
          daysLeft: deadlineInfo?.daysLeft ?? null,
          urgency: deadlineInfo?.urgency ?? null,
        };
      });
  }, [cashAdvances, liquidations]);

  // Status breakdown counts for the selected overview type
  const overviewStats = useMemo(() => {
    const count = (items, predicate) => items.filter(predicate).length;

    if (selectedOverviewType === OVERVIEW_TYPES.LIQUIDATIONS) {
      return {
        title: 'Liquidations',
        stats: [
          { label: 'Pending Approval', count: count(liquidations, (i) => normalizeStatus(i.status).includes('pending')) },
          { label: 'Approved', count: count(liquidations, (i) => normalizeStatus(i.status).includes('approved')) },
          { label: 'Liquidated', count: count(liquidations, (i) => ['liquidated', 'completed'].some((s) => normalizeStatus(i.status).includes(s))) },
          { label: 'Draft', count: count(liquidations, (i) => normalizeStatus(i.status) === 'draft') },
        ],
      };
    }

    if (selectedOverviewType === OVERVIEW_TYPES.REIMBURSEMENTS) {
      return {
        title: 'Reimbursements',
        stats: [
          { label: 'Pending Approval', count: count(reimbursements, (i) => normalizeStatus(i.status).includes('pending')) },
          { label: 'Approved', count: count(reimbursements, (i) => normalizeStatus(i.status).includes('approved')) },
          { label: 'Released', count: count(reimbursements, (i) => ['released', 'disbursed'].some((s) => normalizeStatus(i.status).includes(s))) },
          { label: 'Draft', count: count(reimbursements, (i) => normalizeStatus(i.status) === 'draft') },
        ],
      };
    }

    return {
      title: 'Cash Advances',
      stats: [
        { label: 'Pending Approval', count: count(cashAdvances, (i) => normalizeStatus(i.status).includes('pending')) },
        { label: 'Approved', count: count(cashAdvances, (i) => normalizeStatus(i.status).includes('approved')) },
        { label: 'Disbursed', count: count(cashAdvances, (i) => ['disbursed', 'released'].some((s) => normalizeStatus(i.status).includes(s))) },
        { label: 'Draft', count: count(cashAdvances, (i) => normalizeStatus(i.status) === 'draft') },
      ],
    };
  }, [selectedOverviewType, cashAdvances, liquidations, reimbursements]);

  // Most recent 4 requests (cash advances + liquidations combined)
  const recentRequests = useMemo(() => {
    const combined = [
      ...cashAdvances.map((ca) => ({
        ...ca,
        type: REQUEST_TYPES.CASH_ADVANCE,
        refNumber: ca.advance_number,
        amount: ca.requested_amount,
        date: ca.created_at,
      })),
      ...liquidations.map((liq) => ({
        ...liq,
        type: REQUEST_TYPES.LIQUIDATION,
        refNumber: liq.liquidation_number,
        amount: liq.total_actual_amount,
        date: liq.created_at,
      })),
    ];
    return combined.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
  }, [cashAdvances, liquidations]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCloseView = useCallback(() => {
    setViewModalOpen(false);
    setViewData(null);
    setViewLoading(false);
  }, []);

  const handleView = useCallback(async (request) => {
    try {
      setViewLoading(true);
      setViewModalOpen(true);

      if (request.type === REQUEST_TYPES.CASH_ADVANCE) {
        const response = await api.get(`/cash-advances/${request.id}`);
        if (response?.data?.success) {
          setViewData(normalizeCashAdvanceView(response.data.data, request));
        } else {
          setViewData({ ...request, type: REQUEST_TYPES.CASH_ADVANCE });
        }
      } else if (request.type === REQUEST_TYPES.LIQUIDATION) {
        const response = await api.get(`/liquidations/${request.id}`);
        if (response?.data?.success) {
          setViewData(normalizeLiquidationView(response.data.data, request));
        } else {
          setViewData({ ...request, type: REQUEST_TYPES.LIQUIDATION });
        }
      }
    } catch (err) {
      console.error('Error fetching request details for view', err);
      setViewData({ ...request, type: request.type });
    } finally {
      setViewLoading(false);
    }
  }, []);

  const handleCreateLiquidation = useCallback(async (ca) => {
    try {
      const response = await api.get(`/cash-advances/${ca.id}`);
      if (response.data?.success) {
        const data = response.data.data;
        const now = new Date();
        const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
        const seq = String(data.id).padStart(4, '0');
        const cashAdvance = {
          id: data.id,
          advanceNumber: data.advance_number || data.advanceNumber,
          liquidationNumber: `CL-${yyyymm}-${seq}`,
          requestedBy: data.requested_by || data.requestedBy,
          department: data.department,
          businessUnit: data.business_unit || data.businessUnit || '',
          totalAdvanceAmount: parseFloat(data.requested_amount || data.requestedAmount || 0),
          dateCoverageFrom: data.start_date || data.date_coverage_from || '',
          dateCoverageTo: data.end_date || data.date_coverage_to || '',
          items: data.items || [],
          activities: data.activities || [],
          advanceType: data.advance_type || data.advanceType || 'cash',
        };
        navigate('/liquidation', { state: { cashAdvance } });
      }
    } catch (err) {
      console.error('Error fetching CA for liquidation', err);
      navigate('/liquidation');
    }
  }, [navigate]);

  // ── Urgent items needing attention ───────────────────────────────────────────
  // Collects overdue/urgent liquidation deadlines + long-pending approvals,
  // sorted worst-first. Defined after handlers so useCallback refs are stable.
  const urgentItems = useMemo(() => {
    const items = [];
    const PENDING_STALE_DAYS = 7;
    const now = new Date();

    // 1. Pending liquidation deadlines (overdue / urgent / warning)
    pendingLiquidationCAs.forEach((ca) => {
      if ([URGENCY_LEVELS.OVERDUE, URGENCY_LEVELS.URGENT, URGENCY_LEVELS.WARNING].includes(ca.urgency)) {
        items.push({
          id: `ca-liq-${ca.id}`,
          type: REQUEST_TYPES.CASH_ADVANCE,
          label: 'Cash Advance',
          refNumber: ca.advance_number,
          purpose: ca.purpose,
          amount: ca.requested_amount,
          urgency: ca.urgency,
          daysLeft: ca.daysLeft,
          reason: ca.urgency === URGENCY_LEVELS.OVERDUE
            ? `Liquidation overdue by ${Math.abs(ca.daysLeft)}d`
            : `Liquidation due in ${ca.daysLeft}d`,
          deadline: ca.liquidation_deadline,
          actionLabel: 'Create Liquidation',
          onAction: () => handleCreateLiquidation(ca),
        });
      }
    });

    // 2. Cash advances pending approval for too long
    cashAdvances
      .filter((ca) => {
        if (normalizeStatus(ca.status) !== 'pending') return false;
        const filed = new Date(ca.created_at);
        return !isNaN(filed) && Math.floor((now - filed) / (1000 * 60 * 60 * 24)) >= PENDING_STALE_DAYS;
      })
      .forEach((ca) => {
        const days = Math.floor((now - new Date(ca.created_at)) / (1000 * 60 * 60 * 24));
        items.push({
          id: `ca-pending-${ca.id}`,
          type: REQUEST_TYPES.CASH_ADVANCE,
          label: 'Cash Advance',
          refNumber: ca.advance_number,
          purpose: ca.purpose,
          amount: ca.requested_amount,
          urgency: days >= 14 ? URGENCY_LEVELS.URGENT : URGENCY_LEVELS.WARNING,
          daysLeft: null,
          reason: `Awaiting approval for ${days}d`,
          deadline: null,
          actionLabel: 'View',
          onAction: () => handleView({ ...ca, type: REQUEST_TYPES.CASH_ADVANCE, refNumber: ca.advance_number }),
        });
      });

    // 3. Liquidations pending approval for too long
    liquidations
      .filter((liq) => {
        if (normalizeStatus(liq.status) !== 'pending') return false;
        const filed = new Date(liq.created_at);
        return !isNaN(filed) && Math.floor((now - filed) / (1000 * 60 * 60 * 24)) >= PENDING_STALE_DAYS;
      })
      .forEach((liq) => {
        const days = Math.floor((now - new Date(liq.created_at)) / (1000 * 60 * 60 * 24));
        items.push({
          id: `liq-pending-${liq.id}`,
          type: REQUEST_TYPES.LIQUIDATION,
          label: 'Liquidation',
          refNumber: liq.liquidation_number,
          purpose: liq.remarks || liq.purpose,
          amount: liq.total_actual_amount,
          urgency: days >= 14 ? URGENCY_LEVELS.URGENT : URGENCY_LEVELS.WARNING,
          daysLeft: null,
          reason: `Awaiting approval for ${days}d`,
          deadline: null,
          actionLabel: 'View',
          onAction: () => handleView({ ...liq, type: REQUEST_TYPES.LIQUIDATION, refNumber: liq.liquidation_number }),
        });
      });

    const ORDER = {
      [URGENCY_LEVELS.OVERDUE]: 0,
      [URGENCY_LEVELS.URGENT]: 1,
      [URGENCY_LEVELS.WARNING]: 2,
    };
    return items.sort((a, b) => (ORDER[a.urgency] ?? 3) - (ORDER[b.urgency] ?? 3));
  }, [pendingLiquidationCAs, cashAdvances, liquidations, handleCreateLiquidation, handleView]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {displayName}! 👋
          </h1>
          <p className="text-gray-600">Here's what's happening with your requests today</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          startIcon={<RefreshCw className="w-4 h-4" />}
          onClick={fetchAll}
          disabled={loading}
          className="mt-1"
        >
          Refresh
        </Button>
      </div>

      {/* Error banners */}
      {Object.entries(errors).map(([key, msg]) =>
        msg ? (
          <div
            key={key}
            className="mb-3 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {msg}
          </div>
        ) : null
      )}

      {/* Pending Liquidations Table */}
      {!loading && pendingLiquidationCAs.length > 0 && (
        <div className="mb-6 border border-orange-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 border border-orange-200">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-orange-900">
                Cash Advances Pending Liquidation
              </h3>
              <p className="text-xs text-orange-700 mt-0.5">
                {pendingLiquidationCAs.length} released cash advance
                {pendingLiquidationCAs.length > 1 ? 's' : ''} still need
                {pendingLiquidationCAs.length === 1 ? 's' : ''} a liquidation report
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards & Request Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1 gap-4">
          {[
            {
              type: OVERVIEW_TYPES.CASH_ADVANCES,
              label: 'Cash Advances',
              count: cashAdvances.length,
              Icon: HandCoins,
            },
            {
              type: OVERVIEW_TYPES.LIQUIDATIONS,
              label: 'Liquidations',
              count: liquidations.length,
              Icon: ReceiptText,
            },
            {
              type: OVERVIEW_TYPES.REIMBURSEMENTS,
              label: 'Reimbursements',
              count: reimbursements.length,
              Icon: Coins,
            },
          ].map(({ type, label, count, gradient, Icon }) => (
            <Card
              key={type}
              hover
              className={`h-full border !border-blue-200 !bg-blue-50 text-white cursor-pointer transition-transform ${
                selectedOverviewType === type ? 'shadow-xl3 !bg-blue-700' : ''
              }`}
              onClick={() => setSelectedOverviewType(type)}
            >
              <CardContent className="p-6 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="min-w-0">
                    <p className={`text-sm mb-2 whitespace-nowrap ${selectedOverviewType === type ? 'text-white' : 'text-blue-800'}`}>{label}</p>
                    <h3 className={`text-4xl font-bold min-h-[2.5rem] flex items-center ${selectedOverviewType === type ? 'text-white' : 'text-blue-800'}`}>
                      {loading ? <Spinner size="md" className="text-white" /> : count}
                    </h3>
                  </div>
                  <Icon className={`w-12 h-12 ${selectedOverviewType === type ? 'text-white' : 'text-blue-800'} opacity-50 shrink-0`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Request Status Overview */}
        <Card className="lg:col-span-3 border !border-blue-200">
          <CardContent className="p-6 rounded-lg">
            <h2 className="text-xl font-semibold my-4">
              Request Status Overview
            </h2>
            <div className="grid grid-cols-2 gap-4">
            {overviewStats.stats.map((item) => {
              const borderStyles = {
                'Pending Approval': 'border-orange-200 bg-orange-50 text-orange-800',
                'Approved': 'border-green-300 bg-green-50 text-green-800',
                'Disbursed': 'border-blue-300 bg-blue-50 text-blue-800',
                'Released': 'border-blue-300 bg-blue-50 text-blue-800',
                'Liquidated': 'border-blue-300 bg-blue-50 text-blue-800',
                'Draft': 'border-gray-300 bg-gray-50 text-gray-800',
              };

              return (
                <OverviewStatCard
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  loading={loading}
                  className={borderStyles[item.label] || 'border-gray-200'}
                />
              );
            })}
          </div>
          </CardContent>
        </Card>
      </div>

      {/* View Request Modal */}
      <Modal
        open={viewModalOpen}
        onClose={handleCloseView}
        title={
          viewData
            ? viewData.type === REQUEST_TYPES.CASH_ADVANCE
              ? `Cash Advance — ${viewData.refNumber || viewData.advance_number}`
              : `Liquidation — ${viewData.liquidationNumber || viewData.refNumber}`
            : 'Request Details'
        }
        maxWidth="xl"
      >
        {viewLoading ? (
          <Loading message="Loading details..." />
        ) : viewData ? (
          <>
            <RequestTimeline request={viewData} />
            {viewData.type === REQUEST_TYPES.CASH_ADVANCE ? (
              <CashAdvanceForm editData={viewData} viewOnly onClose={handleCloseView} />
            ) : (
              <LiquidationForm editData={viewData} viewOnly onClose={handleCloseView} />
            )}
          </>
        ) : (
          <p className="text-gray-600">No details available.</p>
        )}
      </Modal>

      {/* Quick Actions & Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {/* Quick Actions */}
        <Card className="col-span-1 border !border-blue-200 ">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: 'New Cash Advance', icon: HandCoins, path: '/cash-advance', color: 'border-primary-500 text-primary-600 hover:bg-primary-50' },
                { label: 'Liquidate', icon: ReceiptText, path: '/liquidation', color: 'border-pink-500 text-pink-600 hover:bg-pink-50' },
                { label: 'Reimbursement', icon: Coins, path: '/reimbursement', color: 'border-cyan-500 text-cyan-600 hover:bg-cyan-50' },
                { label: 'View Reports', icon: TrendingUp, path: '/reports', color: 'border-yellow-500 text-yellow-700 hover:bg-yellow-50' },
              ].map(({ label, icon: Icon, path, color }) => (
                <Button
                  key={path}
                  variant="secondary"
                  size="md"
                  fullWidth
                  startIcon={<Icon className="w-5 h-5" />}
                  onClick={() => navigate(path)}
                  className={`py-3 ${color}`}
                >
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card className="col-span-3 border !border-blue-200 ">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Requests</h2>
            {loading ? (
              <Loading message="Loading requests..." />
            ) : recentRequests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No recent requests</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentRequests.map((request, index) => (
                  <li
                    key={`${request.type}-${request.id}`}
                    className={`flex items-center gap-3 pb-3 ${
                      index < recentRequests.length - 1 ? 'border-b border-gray-200' : ''
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {request.type === REQUEST_TYPES.CASH_ADVANCE ? (
                        <HandCoins className="w-6 h-6 text-primary-600" />
                      ) : (
                        <ReceiptText className="w-6 h-6 text-pink-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {request.type === REQUEST_TYPES.CASH_ADVANCE
                          ? `Cash Advance — ${request.refNumber}`
                          : `Liquidation — ${request.refNumber}`}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatCurrency(request.amount)} • {formatStatus(request.status)}
                      </p>
                    </div>
                    <StatusChip status={request.status} />
                    <button
                      onClick={() => handleView(request)}
                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Urgent Attention Panel ────────────────────────────────────────── */}
      {!loading && urgentItems.length > 0 && (
        <Card className="border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-100 border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Needs Your Attention</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {urgentItems.length} item{urgentItems.length !== 1 ? 's' : ''} require action
                </p>
              </div>
            </div>

            <ul className="space-y-3">
              {urgentItems.map((item) => {
                const urgencyConfig = {
                  [URGENCY_LEVELS.OVERDUE]: {
                    row: 'bg-red-50 border border-red-200',
                    badge: 'bg-red-100 text-red-700 border-red-300',
                    action: 'bg-red-600 hover:bg-red-700 text-white',
                  },
                  [URGENCY_LEVELS.URGENT]: {
                    row: 'bg-orange-50 border border-orange-200',
                    badge: 'bg-orange-100 text-orange-700 border-orange-300',
                    action: 'bg-orange-500 hover:bg-orange-600 text-white',
                  },
                  [URGENCY_LEVELS.WARNING]: {
                    row: 'bg-yellow-50 border border-yellow-200',
                    badge: 'bg-yellow-100 text-yellow-700 border-yellow-300',
                    action: 'bg-yellow-500 hover:bg-yellow-600 text-white',
                  },
                }[item.urgency] || {};

                return (
                  <li
                    key={item.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg ${urgencyConfig.row}`}
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      {item.type === REQUEST_TYPES.CASH_ADVANCE ? (
                        <HandCoins className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ReceiptText className="w-5 h-5 text-gray-600" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 font-mono">
                          {item.refNumber || '—'}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${urgencyConfig.badge}`}>
                          {item.reason}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 truncate" title={item.purpose}>
                        {item.label}{item.purpose ? ` · ${item.purpose}` : ''}
                      </p>
                      <p className="text-xs font-medium text-gray-700 mt-0.5">
                        {formatCurrency(parseFloat(item.amount || 0))}
                        {item.deadline && (
                          <span className="text-gray-500 font-normal ml-2">
                            · Deadline: {formatLongDate(item.deadline)}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Action */}
                    <button
                      onClick={item.onAction}
                      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${urgencyConfig.action}`}
                    >
                      {item.actionLabel === 'Create Liquidation' && <Receipt className="w-3.5 h-3.5" />}
                      {item.actionLabel === 'View' && <Eye className="w-3.5 h-3.5" />}
                      {item.actionLabel}
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeeDashboard;