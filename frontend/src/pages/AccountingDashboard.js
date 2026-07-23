import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, PieChart, Pie, Label } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/Chart';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  Receipt, Coins,
  CreditCard, CheckCircle, ClockAlert,
  Search, Filter, ChevronDown, ChevronRight,
  Clock, Eye, HandCoins, XCircle, Send, Banknote, FileEdit,
} from 'lucide-react';
import { formatLongDate } from '../utils/formatters';
import CashAdvanceForm from '../components/CashAdvanceForm';
import LiquidationForm from '../components/LiquidationForm';
import ReimbursementForm from '../components/ReimbursementForm';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Loading } from '../components/ui/Loading';

// ─── helpers ────────────────────────────────────────────────────────────────

const formatPeso = (amount) =>
  `₱${parseFloat(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Returns how many calendar days have elapsed since a given date string/value.
const daysPending = (dateValue) => {
  if (!dateValue) return null;
  const filed = new Date(dateValue);
  if (isNaN(filed.getTime())) return null;
  const now = new Date();
  return Math.floor((now - filed) / (1000 * 60 * 60 * 24));
};

const TYPE_STYLES = {
  'Cash Advance':  'bg-indigo-50 text-indigo-700',
  'Liquidation':   'bg-pink-50 text-pink-700',
  'Reimbursement': 'bg-cyan-50 text-cyan-700',
};

// Release/processing stage aging: 2-day window starting from approvedAt
// (the day approval finished), not the original request date.
// Day 0-1 = Normal, Day 2 = Deadline, Day 3+ = Overdue.
const getReleasePriority = (days) => {
  if (days === null) return null;
  if (days >= 3) return 'Overdue';
  if (days === 2) return 'Deadline';
  return 'Normal';
};

const RELEASE_PRIORITY_STYLES = {
  Overdue:  'bg-red-100 text-red-700 border border-red-200',
  Deadline: 'bg-amber-100 text-amber-700 border border-amber-200',
  Normal:   'bg-green-100 text-green-700 border border-green-200',
};

// Liquidation stage aging: due 3 days after the cash advance's coverage end
// date, or else overdue. Day 0-2 = Normal, Day 3 = Deadline (due today),
// Day 4+ = Overdue. Same 3-tier pattern as approval and release aging above,
// just clocked from coverageEnd instead of created_at/approved_at.
const getLiquidationPriority = (days, dueDays) => {
  if (days === null) return null;
  if (days > dueDays) return 'Overdue';
  if (days === dueDays) return 'Deadline';
  return 'Normal';
};

// Maps raw DB row → normalised display row
const normaliseRow = (item, type) => {
  const reqNumber =
    item.advance_number ||
    item.liquidation_number ||
    item.reimbursement_number ||
    '—';

  const employee =
    item.requested_by ||
    item.submitted_by ||
    item.employee_name ||
    '—';

  const amount = parseFloat(
    item.calculated_amount ||
    item.requested_amount  ||
    item.total_actual_amount ||
    item.total_amount      ||
    0,
  );

  const approvalType =
    type === 'Cash Advance'  ? 'cash-advance'   :
    type === 'Liquidation'   ? 'liquidation'    :
    'reimbursement';

  return {
    ...item,
    type,
    approvalType,
    reqNumber,
    requestor: employee,
    department: item.department_name || item.department || '—',
    amount,
    date:       item.created_at,
    approvedAt: item.approved_at || item.approval_date || null,  // ✅ ADD THIS
    releasedBy: item.released_by  || null,
    releasedAt: item.released_at  || null,
    // ✅ Date Coverage of the Transaction (Cash Advance only).
    // Confirmed against CashAdvanceForm.js: the form stores start_date/end_date
    // (camelCase startDate/endDate on submit) and derives a display-only
    // "dateCoverage" string from them — so we read the two raw dates directly
    // rather than relying on that derived string.
    coverageStart: item.start_date || item.startDate || null,
    coverageEnd:   item.end_date   || item.endDate   || null,
    // ⚠️ Liquidation-tracking fields (Cash Advance only). Adjust the source
    // field names below to match whatever your API actually returns.
    liquidationSubmitted: Boolean(
      item.liquidation_id ||
      item.liquidation_submitted ||
      ['submitted', 'approved', 'released'].includes((item.liquidation_status || '').toLowerCase()),
    ),
    liquidatedAt: item.liquidation_submitted_at || item.liquidation_date || null,
  };
};
// Donut chart with centered total, built on shadcn/ui's Chart + Recharts Pie
// (same {label, value, color} shape as before, so every call site is unchanged)
const DonutChart = ({ data, size = 120 }) => {
  // ✅ Filter out zero values for cleaner rendering
  const nonZeroData = data.filter(d => d.value > 0);
  const total = useMemo(() => nonZeroData.reduce((s, d) => s + d.value, 0), [nonZeroData]);

  const config = useMemo(() => {
    const cfg = {};
    data.forEach(d => { cfg[d.label] = { label: d.label, color: d.color }; });
    return cfg;
  }, [data]);

  if (total === 0)
    return <div className="text-center text-sm text-gray-400 py-4">No data</div>;

  return (
    <ChartContainer config={config} className="mx-auto" style={{ width: size, height: size }}>
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Pie 
          data={nonZeroData}  // ✅ Use filtered data
          dataKey="value" 
          nameKey="label" 
          innerRadius={size * 0.35} 
          outerRadius={size * 0.48}
          strokeWidth={4}
        >
          {nonZeroData.map((d, i) => (
            <Cell key={`slice-${i}`} fill={d.color} style={{ fill: d.color }} />
          ))}
          <Label
            content={({ viewBox }) => {
              if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-gray-900 text-lg font-bold">
                      {total}
                    </tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 16} className="fill-gray-500 text-[10px]">
                      items
                    </tspan>
                  </text>
                );
              }
              return null;
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
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
// happens to return. Supports a few common naming conventions so it works
// across cash advances, liquidations, and reimbursements without requiring
// a specific backend shape. Steps with no matching timestamp are skipped,
// except "Submitted", which always shows (falling back to "date filed" or
// the record's created date).
const buildTimelineSteps = (request) => {
  if (!request) return [];

  const pick = (...keys) => {
    for (const k of keys) {
      if (request[k]) return request[k];
    }
    return null;
  };

  const status = (request.status || '').toLowerCase();
  const steps = [];

  // 1. Submitted — always already done
  const submittedAt = pick('created_at', 'submitted_at', 'date_filed', 'requested_at');
  steps.push({
    key: 'submitted',
    label: 'Request Submitted',
    actor: pick('requested_by', 'submitted_by', 'created_by'),
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
      remarks: pick('rejection_reason', 'remarks', 'reject_remarks'),
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
      isDone: Boolean(approvedAt) || ['approved', 'released'].includes(status),
      doneColor: 'text-green-600 bg-green-100',
    });
  }

  // 4. Released / Processed (only relevant once approved, and only shown if applicable)
  const releasedAt = pick('released_at', 'processed_at', 'disbursed_at');
  if (status === 'released' || releasedAt) {
    steps.push({
      key: 'released',
      label: 'Funds Released',
      actor: pick('released_by', 'processed_by', 'disbursed_by'),
      timestamp: releasedAt,
      remarks: pick('release_remarks'),
      icon: Banknote,
      isDone: Boolean(releasedAt) || status === 'released',
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
      return { ...step, state: 'current', color: 'text-amber-600 bg-amber-100 ring-2 ring-amber-300 ring-offset-2' };
    }
    return { ...step, state: 'upcoming', color: 'text-gray-400 bg-gray-100' };
  });
};

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
            // Connector after this step is colored only once this step is done —
            // it represents "has the process moved past this point yet?"
            const connectorClass = isDone ? 'bg-gray-400' : 'bg-gray-200';
            return (
              <li key={step.key} className={`flex items-start ${isLast ? '' : 'flex-1'}`}>
                <div className="flex flex-col items-center w-32 shrink-0 text-center">
                  <span className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-all ${step.color} ${isCurrent ? 'animate-pulse' : ''}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <p className={`mt-2 text-xs leading-snug ${
                    isCurrent ? 'font-bold text-amber-700' : isDone ? 'font-medium text-gray-900' : 'font-medium text-gray-400'
                  }`}>
                    {step.label}
                    {isCurrent && (
                      <span className="block text-[11px] font-semibold text-amber-600">In Progress</span>
                    )}
                    {step.state === 'upcoming' && (
                      <span className="block text-[11px] font-normal text-gray-400">Not yet</span>
                    )}
                  </p>
                  <p className={`text-[11px] mt-0.5 leading-snug ${isDone ? 'text-gray-500' : 'text-gray-400'}`}>
                    {dateLabel || (isDone ? 'Date not recorded' : isCurrent ? 'Awaiting action' : 'Not yet processed')}
                  </p>
                  {step.actor && (
                    <p className={`text-[11px] leading-snug truncate max-w-full ${isDone ? 'text-gray-500' : 'text-gray-400'}`} title={step.actor}>
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
                  <div className={`flex-1 min-w-[2.5rem] h-px mt-4 transition-colors ${connectorClass}`} aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

// ─── main component ──────────────────────────────────────────────────────────

const AccountingDashboard = () => {
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const displayName  = user?.name || user?.username || user?.email || 'Accounting';

  // ── raw data from API ──────────────────────────────────────────────────────
  const [loading, setLoading]           = useState(true);
  const [notification, setNotification] = useState(null);

  const [cashAdvances,    setCashAdvances]    = useState([]);
  const [liquidations,    setLiquidations]    = useState([]);
  const [reimbursements,  setReimbursements]  = useState([]);

  // ── queue UI state ─────────────────────────────────────────────────────────
  const [queueSearch,     setQueueSearch]     = useState('');
  const [queueTypeFilter, setQueueTypeFilter] = useState('all');

  // ── view modal ─────────────────────────────────────────────────────────────
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewOpen,        setViewOpen]        = useState(false);
  const [viewLoading,     setViewLoading]     = useState(false);
  const [viewData,        setViewData]        = useState(null);

  // ── action modal ───────────────────────────────────────────────────────────
  const [actionOpen,    setActionOpen]    = useState(false);
  const [actionVerb,    setActionVerb]    = useState('release'); // 'release' | 'reject'
  const [remarks,       setRemarks]       = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ── revolving fund (only relevant for release + cash-advance/reimbursement,
  //    and only when the request wasn't already funded at approval time) ─────
  const [fundInfo,    setFundInfo]    = useState(null); // { id, funding_code, funding_description, Amount } | null
  const [fundLoading, setFundLoading] = useState(false);
  const [fundChoice,  setFundChoice]  = useState('no');  // 'yes'|'no' — defaults to No
  const REVOLVING_FUND_TYPES = ['cash-advance', 'reimbursement'];
  const FUND_LABELS = { ORF: 'Operations Revolving Fund (ORF)', ARF: 'Accounting Revolving Fund (ARF)' };

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/disbursements/pending');
      if (res.data.success) {
        const { cashAdvances = [], liquidations = [], reimbursements = [] } = res.data.data;
        setCashAdvances(cashAdvances.map(i => normaliseRow(i, 'Cash Advance')));
        setLiquidations(liquidations.map(i => normaliseRow(i, 'Liquidation')));
        setReimbursements(reimbursements.map(i => normaliseRow(i, 'Reimbursement')));
      }
    } catch (error) {
      console.error('Error fetching disbursements:', error);
      setNotification({ message: 'Failed to load disbursement data.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── derived lists ──────────────────────────────────────────────────────────
  const allRows = useMemo(
    () => [...cashAdvances, ...liquidations, ...reimbursements],
    [cashAdvances, liquidations, reimbursements],
  );

  const approvedRows  = useMemo(() => allRows.filter(r => r.status === 'approved'),  [allRows]);
  const releasedRows  = useMemo(() => allRows.filter(r => r.status === 'released'),  [allRows]);
  const rejectedRows  = useMemo(() => allRows.filter(r => r.status === 'rejected'),  [allRows]);

  // Most recent releases first, capped to the 10 latest (falls back to the
  // request date if a release timestamp wasn't recorded).
  const recentReleases = useMemo(
    () => [...releasedRows]
      .sort((a, b) => new Date(b.releasedAt || b.date) - new Date(a.releasedAt || a.date))
      .slice(0, 5),
    [releasedRows],
  );

  // ⚠️ Adjust to match your org's liquidation policy.
  const LIQUIDATION_DUE_DAYS = 3;

  // Cash Advances whose funds were released but no Liquidation has been
  // filed against them yet.
  const cashAdvancesPendingLiquidation = useMemo(
    () => cashAdvances.filter(r => r.status === 'released' && !r.liquidationSubmitted),
    [cashAdvances],
  );

  // ✅ Deadline counting starts from the coverage End Date (same rule as
  // Disbursement Monitoring: 0–2 days, 3 days = deadline, >3 days = overdue).
  const overdueLiquidationCount = useMemo(
    () => cashAdvancesPendingLiquidation.filter(r => {
      const days = daysPending(r.coverageEnd || r.releasedAt || r.date);
      return getLiquidationPriority(days, LIQUIDATION_DUE_DAYS) === 'Overdue';
    }).length,
    [cashAdvancesPendingLiquidation],
  );

  const totalPendingLiquidationAmount = useMemo(
    () => cashAdvancesPendingLiquidation.reduce((sum, r) => sum + (r.amount || 0), 0),
    [cashAdvancesPendingLiquidation],
  );

  const filteredQueue = useMemo(() => {
    let rows = approvedRows;
    if (queueTypeFilter !== 'all') rows = rows.filter(r => r.type === queueTypeFilter);
    if (queueSearch) {
      const q = queueSearch.toLowerCase();
      rows = rows.filter(r =>
        (r.reqNumber  || '').toLowerCase().includes(q) ||
        (r.requestor  || '').toLowerCase().includes(q) ||
        (r.department || '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [approvedRows, queueTypeFilter, queueSearch]);

  // ── summary stats (derived from the single API response) ──────────────────
  const stats = useMemo(() => {
    const now = new Date();

    // ✅ Use approvedAt for overdue calculation
    const overdueCount = approvedRows.filter(r => {
      const days = daysPending(r.approvedAt || r.date);
      return getReleasePriority(days) === 'Overdue';
    }).length;

    const releasedThisMonth = releasedRows.filter(r => {
      const d = new Date(r.releasedAt || r.date);
      return !isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const rejectedThisMonth = rejectedRows.filter(r => {
      const d = new Date(r.date);
      return !isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return {
      forRelease: approvedRows.length,
      overdueCount,
      releasedThisMonth,
      rejectedThisMonth,
    };
  }, [approvedRows, releasedRows, rejectedRows]);

  // ── donut chart data ───────────────────────────────────────────────────────
  const typeDonutData = useMemo(() => [
    { label: 'Cash Advance',  value: cashAdvances.filter(r => r.status === 'approved').length,   color: '#6366f1' },
    { label: 'Liquidation',   value: liquidations.filter(r => r.status === 'approved').length,   color: '#ec4899' },
    { label: 'Reimbursement', value: reimbursements.filter(r => r.status === 'approved').length, color: '#06b6d4' },
  ], [cashAdvances, liquidations, reimbursements]);

  const statusDonutData = useMemo(() => [
    { label: 'Approved (Pending Release)', value: approvedRows.length,  color: '#f59e0b' },
    { label: 'Released',                   value: releasedRows.length,  color: '#22c55e' },
    { label: 'Rejected',                   value: rejectedRows.length,  color: '#ef4444' },
  ], [approvedRows, releasedRows, rejectedRows]);

  // ── release aging buckets ──────────────────────────────────────────────────
  const releaseAgingData = useMemo(() => {
    const buckets = [
      { label: 'Day 0–1: Normal',  key: 'Normal',   color: '#22c55e' },
      { label: 'Day 2: Deadline', key: 'Deadline', color: '#f59e0b' },
      { label: 'Day 3+: Overdue', key: 'Overdue',  color: '#ef4444' },
    ];
    return buckets.map(b => ({
      ...b,
      value: approvedRows.filter(r => {
        // ✅ Use approvedAt, fallback to date if not available
        const d = daysPending(r.approvedAt || r.date);
        return getReleasePriority(d) === b.key;
      }).length,
    }));
  }, [approvedRows]);

  const departmentData = useMemo(() => {
    const counts = {};
    approvedRows.forEach(r => {
      const dept = r.department || 'Unassigned';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    const palette = [
      '#6366f1', '#ec4899', '#06b6d4', '#f59e0b', '#22c55e', '#8b5cf6',
      '#f97316', '#14b8a6', '#ef4444', '#3b82f6', '#a855f7', '#84cc16',
    ];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }));
  }, [approvedRows]);

  const departmentChartConfig = useMemo(() => {
    const cfg = { value: { label: 'Requests' } };
    departmentData.forEach(d => {
      cfg[d.label] = { label: d.label, color: d.color };
    });
    return cfg;
  }, [departmentData]);

  // ── liquidation aging buckets (Cash Advance Pending Liquidation) ──────────
  const liquidationAgingData = useMemo(() => {
    const buckets = [
      { label: `Day 0–${LIQUIDATION_DUE_DAYS - 1}: Normal`, key: 'Normal',   color: '#22c55e' },
      { label: `Day ${LIQUIDATION_DUE_DAYS}: Deadline`,       key: 'Deadline', color: '#f59e0b' },
      { label: `Day ${LIQUIDATION_DUE_DAYS}+ : Overdue`, key: 'Overdue',  color: '#ef4444' },
    ];
    return buckets.map(b => ({
      ...b,
      value: cashAdvancesPendingLiquidation.filter(r => {
        const days = daysPending(r.coverageEnd || r.releasedAt || r.date);
        return getLiquidationPriority(days, LIQUIDATION_DUE_DAYS) === b.key;
      }).length,
    }));
  }, [cashAdvancesPendingLiquidation, LIQUIDATION_DUE_DAYS]);

  const liquidationByDepartmentData = useMemo(() => {
    const counts = {};
    cashAdvancesPendingLiquidation.forEach(r => {
      const dept = r.department || 'Unassigned';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    const palette = [
      '#6366f1', '#ec4899', '#06b6d4', '#f59e0b', '#22c55e', '#8b5cf6',
      '#f97316', '#14b8a6', '#ef4444', '#3b82f6', '#a855f7', '#84cc16',
    ];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }));
  }, [cashAdvancesPendingLiquidation]);

  const liquidationByDepartmentConfig = useMemo(() => {
    const cfg = { value: { label: 'Cash Advances' } };
    liquidationByDepartmentData.forEach(d => {
      cfg[d.label] = { label: d.label, color: d.color };
    });
    return cfg;
  }, [liquidationByDepartmentData]);

  const handleView = async (row) => {
    try {
      setViewLoading(true);
      setSelectedRequest(row);
      setViewOpen(true);
      const endpointMap = {
        'cash-advance':  'cash-advances',
        'liquidation':   'liquidations',
        'reimbursement': 'reimbursements',
      };
      const res = await api.get(`/${endpointMap[row.approvalType]}/${row.id}`);
      if (res.data.success) setViewData(res.data.data);
    } catch (error) {
      console.error('Error fetching request details:', error);
      setNotification({ message: 'Failed to load request details.', severity: 'error' });
    } finally {
      setViewLoading(false);
    }
  };

  const openAction = async (row, verb) => {
    setSelectedRequest(row);
    setActionVerb(verb);
    setRemarks('');
    setFundChoice('no');
    setFundInfo(null);
    setViewOpen(false);
    setActionOpen(true);

    // Only offer ARF when releasing, for cash-advance/reimbursement, and only
    // if the request wasn't already funded by a revolving fund at approval time.
    if (verb === 'release' && REVOLVING_FUND_TYPES.includes(row?.approvalType) && !row?.funding_code) {
      try {
        setFundLoading(true);
        const res = await api.get('/disbursements/revolving-fund');
        if (res.data.success) setFundInfo(res.data.data);
      } catch (error) {
        console.error('Error fetching revolving fund info:', error);
      } finally {
        setFundLoading(false);
      }
    }
  };

  const useRevolvingFund = actionVerb === 'release' && fundChoice === 'yes' && !!fundInfo;
  const fundRemaining = fundInfo ? parseFloat(fundInfo.Amount) - (selectedRequest?.amount || 0) : null;
  const fundInsufficient = useRevolvingFund && fundRemaining !== null && fundRemaining < 0;

  const handleAction = async () => {
    if (!selectedRequest) return;
    if (fundInsufficient) return;
    try {
      setActionLoading(true);
      const res = await api.post('/disbursements/process', {
        type:    selectedRequest.approvalType,
        id:      selectedRequest.id,
        action:  actionVerb,           // 'release' | 'reject'
        remarks: remarks || null,
        useRevolvingFund,
      });
      if (res.data.success) {
        setNotification({
          message: actionVerb === 'release'
            ? 'Funds released successfully.'
            : 'Request rejected successfully.',
          severity: 'success',
        });
        setActionOpen(false);
        setRemarks('');
        setSelectedRequest(null);
        setFundInfo(null);
        setFundChoice('no');
        fetchAll();
        setTimeout(() => setNotification(null), 4000);
      } else {
        // Backend responded but explicitly signaled failure (e.g. status already changed)
        console.error('Disbursement action failed:', res.data);
        setNotification({
          message: res.data?.message || 'Error processing action. Please try again.',
          severity: 'error',
        });
      }
    } catch (error) {
      console.error('Error processing disbursement:', error);
      const msg = error?.response?.data?.message || 'Error processing action. Please try again.';
      setNotification({ message: msg, severity: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseView = () => {
    setViewOpen(false);
    setViewData(null);
    setSelectedRequest(null);
  };

  // ── sub-renderers ──────────────────────────────────────────────────────────
  const getRequestIcon = (type) => {
    if (type === 'Cash Advance')  return <HandCoins className="w-4 h-4 text-indigo-500" />;
    if (type === 'Liquidation')   return <Receipt   className="w-4 h-4 text-pink-500" />;
    if (type === 'Reimbursement') return <Coins     className="w-4 h-4 text-cyan-500" />;
    return null;
  };

  const getStatusBadgeClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'approved': return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'released': return 'bg-green-50 text-green-700 border border-green-200';
      case 'rejected': return 'bg-red-50 text-red-700 border border-red-200';
      default:         return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  const renderViewForm = () => {
    if (!viewData) return null;
    const { approvalType } = selectedRequest || {};
    if (approvalType === 'cash-advance')  return <CashAdvanceForm  editData={viewData} viewOnly />;
    if (approvalType === 'liquidation')   return <LiquidationForm  editData={viewData} viewOnly />;
    if (approvalType === 'reimbursement') return <ReimbursementForm editData={viewData} viewOnly />;
    return null;
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Accounting Dashboard</h1>
        <p className="text-gray-500">
          Welcome back, <span className="font-medium text-gray-700">{displayName}</span> — manage disbursements and financial reconciliation.
        </p>
      </div>

      {notification && (
        <Alert severity={notification.severity} onClose={() => setNotification(null)}>
          {notification.message}
        </Alert>
      )}

      
      {/* ── Section 3: Charts ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Disbursement Monitoring</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">

          {/* Pending for Release by Type */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Pending Release by Type</h3>
              <div className="flex flex-col items-center gap-4">
                <DonutChart data={typeDonutData} size={130} />
                <div className="w-full space-y-1.5">
                  {typeDonutData.map(d => (
                    <div key={d.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-gray-600">{d.label}</span>
                      </div>
                      <span className="font-bold text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overall Status Breakdown */}
          {/* <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Overall Status Breakdown</h3>
              <div className="flex flex-col items-center gap-4">
                <DonutChart data={statusDonutData} size={130} />
                <div className="w-full space-y-1.5">
                  {statusDonutData.map(d => (
                    <div key={d.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-gray-600">{d.label}</span>
                      </div>
                      <span className="font-bold text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card> */}

          {/* Release Aging — how long approved items have been waiting */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Release Aging</h3>
              <div className="flex flex-col items-center gap-4">
                <DonutChart data={releaseAgingData} size={130} />
                <div className="w-full space-y-1.5">
                  {releaseAgingData.map(d => (
                    <div key={d.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-gray-600">{d.label}</span>
                      </div>
                      <span className="font-bold text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requests by Department (from Disbursement Queue) */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Pending Requests by Department</h3>
              {departmentData.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">No data</p>
              ) : (
                <ChartContainer config={departmentChartConfig} className="h-[220px] w-full">
                  <BarChart accessibilityLayer data={departmentData} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="label"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={90}
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={4} barSize={24} maxBarSize={28}>
                      {departmentData.map((d, i) => (
                        <Cell key={`dept-cell-${i}`} fill={d.color} style={{ fill: d.color }} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      <Card>
        <CardContent className="p-6">

          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Disbursement Queue</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {filteredQueue.length} of {approvedRows.length} items shown
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search…"
                  value={queueSearch}
                  onChange={e => setQueueSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none w-56"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <select
                  value={queueTypeFilter}
                  onChange={e => setQueueTypeFilter(e.target.value)}
                  className="pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none appearance-none bg-white"
                >
                  <option value="all">All Types</option>
                  <option value="Cash Advance">Cash Advance</option>
                  <option value="Liquidation">Liquidation</option>
                  <option value="Reimbursement">Reimbursement</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <Loading message="Loading disbursements…" />
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">Request No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">Requestor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">Request Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 tracking-wider">Days Pending</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-gray-400 text-sm">
                        No results found.
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((row, i) => (
                      <tr key={`${row.approvalType}-${row.id}`} className="hover:bg-gray-50 transition-colors">

                        {/* Request No. */}
                        <td className="px-4 py-4">
                          <span className="text-sm font-semibold text-gray-900">{row.reqNumber}</span>
                        </td>

                        {/* Type */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_STYLES[row.type] || 'bg-gray-100 text-gray-600'}`}>
                            {getRequestIcon(row.type)}
                            {row.type}
                          </span>
                        </td>

                        {/* Requestor */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                              {(row.requestor || '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-900 truncate max-w-[130px]" title={row.requestor}>
                              {row.requestor}
                            </span>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-600">{row.department}</span>
                        </td>

                        {/* Date Filed */}
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-500">{formatLongDate(row.date)}</span>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-4 text-left">
                          <span className="text-sm font-semibold text-gray-900">{formatPeso(row.amount)}</span>
                        </td>

                        {/* Days Pending */}
                        <td className="px-4 py-4 text-center">
                          {(() => {
                            // ✅ Use approvedAt for "days pending release"
                            const days = daysPending(row.approvedAt || row.date);
                            const priority = getReleasePriority(days);
                            if (priority === null) return <span className="text-gray-400 text-sm">—</span>;
                            return (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${RELEASE_PRIORITY_STYLES[priority]}`}>
                                {priority === 'Overdue' && <ClockAlert className="w-3 h-3" />}
                                {days}d
                              </span>
                            );
                          })()}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleView(row)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openAction(row, 'release')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Release Funds"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openAction(row, 'reject')}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>


      {/* ── Section 3b: Cash Advance Pending Liquidation ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Cash Advance Pending Liquidation
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card className="!bg-purple-50 border border-purple-200 text-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-800 text-sm font-semibold mb-2">Total Pending</p>
                  <span className="text-4xl font-bold text-purple-800">
                    {loading ? '—' : cashAdvancesPendingLiquidation.length}
                  </span>
                </div>
                <Receipt className="w-12 h-12 text-purple-800 opacity-30" />
              </div>
            </CardContent>
          </Card>

          <Card className={`${overdueLiquidationCount > 0 ? '!bg-red-50 border-red-200' : '!bg-gray-50 border-gray-200'} border text-white shadow-sm hover:shadow-md transition-shadow`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold mb-2 ${overdueLiquidationCount > 0 ? 'text-red-800' : 'text-gray-600'}`}>
                    Overdue ({'>'}{LIQUIDATION_DUE_DAYS}d)
                  </p>
                  <span className={`text-4xl font-bold ${overdueLiquidationCount > 0 ? 'text-red-800' : 'text-gray-500'}`}>
                    {loading ? '—' : overdueLiquidationCount}
                  </span>
                </div>
                <ClockAlert className={`w-12 h-12 opacity-30 ${overdueLiquidationCount > 0 ? 'text-red-800' : 'text-gray-500'}`} />
              </div>
            </CardContent>
          </Card>

          <Card className="!bg-orange-50 border border-orange-200 text-white shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-800 text-sm font-semibold mb-2">Total Amount at Risk</p>
                  <span className="text-2xl font-bold text-orange-800">
                    {loading ? '—' : formatPeso(totalPendingLiquidationAmount)}
                  </span>
                </div>
                <HandCoins className="w-12 h-12 text-orange-800 opacity-30" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">

          {/* Liquidation Aging — how long released cash advances have sat unliquidated */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Liquidation Aging</h3>
              <div className="flex flex-col items-center gap-4">
                <DonutChart data={liquidationAgingData} size={130} />
                <div className="w-full space-y-1.5">
                  {liquidationAgingData.map(d => (
                    <div key={d.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-gray-600">{d.label}</span>
                      </div>
                      <span className="font-bold text-gray-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Liquidation by Department */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Pending Liquidation by Department</h3>
              {liquidationByDepartmentData.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">No data</p>
              ) : (
                <ChartContainer config={liquidationByDepartmentConfig} className="h-[220px] w-full">
                  <BarChart accessibilityLayer data={liquidationByDepartmentData} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="label"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      width={90}
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={4} barSize={24} maxBarSize={28}>
                      {liquidationByDepartmentData.map((d, i) => (
                        <Cell key={`liq-dept-cell-${i}`} fill={d.color} style={{ fill: d.color }} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

        </div>

        <Card>
          <CardContent className="p-6">
            {loading ? (
              <Loading message="Loading cash advances…" />
            ) : cashAdvancesPendingLiquidation.length === 0 ? (
              <p className="text-gray-400 text-center py-8 text-sm">
                No released cash advances awaiting liquidation. 🎉
              </p>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Reference No.', 'Requestor', 'Department', 'Amount', 'Date Coverage', 'Days Since Coverage End', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...cashAdvancesPendingLiquidation]
                      .sort((a, b) => (daysPending(b.coverageEnd || b.releasedAt || b.date) ?? 0) - (daysPending(a.coverageEnd || a.releasedAt || a.date) ?? 0))
                      .map((item) => {
                        // ✅ Days are counted from the coverage End Date, not the Released Date
                        const days = daysPending(item.coverageEnd || item.releasedAt || item.date);
                        const priority = getLiquidationPriority(days, LIQUIDATION_DUE_DAYS);
                        return (
                          <tr key={`ca-liq-${item.id}`} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.reqNumber}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                                  {(item.requestor || '?').charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm text-gray-900 truncate max-w-[130px]" title={item.requestor}>
                                  {item.requestor}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.department}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatPeso(item.amount)}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {item.coverageStart || item.coverageEnd ? (
                                <span className="whitespace-nowrap">
                                  {item.coverageStart ? formatLongDate(item.coverageStart) : '—'}
                                  {' – '}
                                  {item.coverageEnd ? formatLongDate(item.coverageEnd) : '—'}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {priority === null ? (
                                <span className="text-gray-400 text-sm">—</span>
                              ) : (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${RELEASE_PRIORITY_STYLES[priority]}`}>
                                  {priority === 'Overdue' && <ClockAlert className="w-3 h-3" />}
                                  {days}d
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${
                                priority === 'Overdue'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : priority === 'Deadline'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}>
                                {priority === 'Overdue' ? 'Overdue' : priority === 'Deadline' ? 'Due today' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Section 4: Recent Releases ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Releases</h2>
        <Card>
          <CardContent className="p-6">
            {loading ? (
              <Loading message="Loading recent releases…" />
            ) : recentReleases.length === 0 ? (
              <p className="text-gray-400 text-center py-8 text-sm">No released transactions yet.</p>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Reference No.', 'Type', 'Requestor', 'Amount', '	Request Date', 'Released By', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentReleases.map((item) => (
                      <tr key={`${item.approvalType}-${item.id}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.reqNumber}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-left gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_STYLES[item.type] || 'bg-gray-100 text-gray-600'}`}>
                            {getRequestIcon(item.type)}{item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.requestor}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatPeso(item.amount)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatLongDate(item.date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.releasedBy || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${getStatusBadgeClass(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* VIEW DETAILS MODAL */}
      <Modal
        open={viewOpen}
        onClose={handleCloseView}
        title={
          <div className="flex items-center gap-3">
            <span>Request Details</span>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              FOR DISBURSEMENT
            </span>
          </div>
        }
        maxWidth="xl"
        actions={
          <>
            <Button variant="secondary" onClick={handleCloseView}>Close</Button>
            <Button
              variant="danger"
              startIcon={<XCircle className="w-4 h-4" />}
              onClick={() => openAction(selectedRequest, 'reject')}
            >
              Reject
            </Button>
            <Button
              variant="success"
              startIcon={<Send className="w-4 h-4" />}
              onClick={() => openAction(selectedRequest, 'release')}
            >
              Release Funds
            </Button>
          </>
        }
      >
        {viewLoading ? (
          <Loading message="Loading request details…" />
        ) : viewData ? (
          <>
            {viewData.funding_code && (
              <div className="mb-4 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-center gap-2">
                <CreditCard className="w-4 h-4 shrink-0" />
                Funded via {FUND_LABELS[viewData.funding_code] || viewData.funding_code}
              </div>
            )}
            <RequestTimeline request={viewData} />
            {renderViewForm()}
          </>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">No details available.</p>
        )}
      </Modal>

      {/* ACTION CONFIRMATION MODAL */}
      <Modal
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        title={actionVerb === 'release' ? 'Confirm Fund Release' : 'Confirm Rejection'}
        maxWidth="sm"
        className="text-center"
        actions={
          <>
            <Button variant="secondary" onClick={() => setActionOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant={actionVerb === 'release' ? 'success' : 'danger'}
              startIcon={actionVerb === 'release' ? <Send className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              onClick={handleAction}
              disabled={actionLoading || (actionVerb === 'reject' && !remarks.trim()) || fundInsufficient}
            >
              {actionLoading
                ? 'Processing…'
                : actionVerb === 'release' ? 'Confirm Release' : 'Confirm Rejection'}
            </Button>
          </>
        }
      >
        <p className="text-gray-700 mb-4">
          {actionVerb === 'release'
            ? 'Are you sure you want to release funds for this request?'
            : 'Are you sure you want to reject this request? Please provide a reason below.'}
        </p>
        {actionVerb === 'reject' && (
          <Input
            label="Reason for Rejection"
            multiline
            rows={3}
            fullWidth
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            required
            autoFocus
          />
        )}
        {actionVerb === 'release' && fundLoading && (
          <p className="text-sm text-gray-400 mb-2">Checking revolving fund availability…</p>
        )}
        {actionVerb === 'release' && !fundLoading && fundInfo && (
          <>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex flex-col gap-1">
            <span className=" font-bold text-gray-800">Request Amount:</span> {formatPeso(selectedRequest?.amount)}
            <span className=" font-bold text-gray-800">Available Fund:</span> {formatPeso(fundInfo.Amount)}
          </div>
          <div className={`mb-4 p-3 rounded-lg text-sm text-gray-800 flex flex-col gap-1 border ${
            fundInsufficient ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'
          }`}>
            <span className=" font-bold text-gray-800">Funding Source:</span>
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
          {fundChoice === 'yes' &&  fundInsufficient && (
            <p className="text-sm text-red-600 font-medium mt-2">
              Insufficient Revolving Fund Balance
            </p>
          )}
          </>
        )}
      </Modal>

    </div>
  );
};

export default AccountingDashboard;