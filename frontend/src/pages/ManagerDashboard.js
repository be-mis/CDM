import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Cell, PieChart, Pie, Label } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/Chart';
import {
  HandCoins, Receipt, Coins, TrendingUp, CheckCircle, XCircle, Eye,
  BarChart3, ClockAlert, Download, Search, ChevronDown, Filter, ArrowUpDown, CalendarDays, Banknote, Timer,
  ThumbsDown, Paperclip, ChevronRight, Clock, Send, FileEdit,
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

const daysSince = (dateStr) => {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const getPriority = (days) => {
  if (days >= 5) return 'Overdue';
  if (days >= 3) return 'Urgent';
  if (days >= 2) return 'High';
  return 'Normal';
};

const PRIORITY_ORDER = { Overdue: 0, Urgent: 1, High: 2, Normal: 3 };

const TYPE_STYLES = {
  'Cash Advance':  'bg-indigo-50 text-indigo-700',
  'Liquidation':   'bg-pink-50 text-pink-700',
  'Reimbursement': 'bg-cyan-50 text-cyan-700',
};

const formatPeso = (amount) =>
  `₱${parseFloat(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Donut chart with centered total and hover tooltips, built on shadcn/ui's
// Chart + Recharts Pie (same {label, value, color} shape as before, so
// every call site is unchanged).
const DonutChart = ({ data, size = 120 }) => {
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
          data={nonZeroData}
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
                      requests
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

  // BUG FIX: original used `if (request[k])` which skips falsy values like 0 or "".
  // Using `!= null` so only null/undefined are skipped.
  const pick = (...keys) => {
    for (const k of keys) {
      if (request[k] != null) return request[k];
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
      actor: pick('released_by', 'processed_by', 'disbursed_by'),
      timestamp: releasedAt,
      remarks: pick('release_remarks'),
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

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.name || user?.username || user?.email || 'Manager';

  // ── data state ─────────────────────────────────────────────────────────────
  const [loading, setLoading]         = useState(false);
  const [pendingData, setPendingData] = useState({ cashAdvances: [], liquidations: [], reimbursements: [] });
  const [notification, setNotification] = useState(null);

  const [allCashAdvances, setAllCashAdvances]     = useState([]);
  const [allLiquidations, setAllLiquidations]     = useState([]);
  const [allReimbursements, setAllReimbursements] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── queue filter/sort state ────────────────────────────────────────────────
  const [queueSearch, setQueueSearch]           = useState('');
  const [queueTypeFilter, setQueueTypeFilter]   = useState('all');
  const [queueSortField, setQueueSortField]     = useState('priority');
  const [queueSortDir, setQueueSortDir]         = useState('asc');

  // ── review / action modal state ────────────────────────────────────────────
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedType, setSelectedType]       = useState(null);
  const [viewOpen, setViewOpen]               = useState(false);
  const [viewLoading, setViewLoading]         = useState(false);
  const [viewData, setViewData]               = useState(null);

  // action modal
  const [actionOpen, setActionOpen]   = useState(false);
  const [actionType, setActionType]   = useState('approve'); // 'approve'|'reject'
  const [remarks, setRemarks]         = useState('');

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchPendingApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/approvals/pending');
      if (res.data.success) setPendingData(res.data.data);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      setNotification({ message: 'Failed to load pending approvals', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatsData = useCallback(async () => {
    try {
      setStatsLoading(true);
      // NOTE: /cash-advances, /liquidations, /reimbursements only return
      // requests the CURRENT USER personally submitted (created_by/submitted_by),
      // not the ones they approve. /approvals/all returns every request
      // (any status, excluding drafts) for the departments this user is an
      // approver for — which is what the manager stats below need.
      const res = await api.get('/approvals/all');
      if (res.data.success) {
        const { cashAdvances, liquidations, reimbursements } = res.data.data;
        setAllCashAdvances(cashAdvances || []);
        setAllLiquidations(liquidations || []);
        setAllReimbursements(reimbursements || []);
      }
    } catch (error) {
      console.error('Error fetching stats data:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingApprovals();
    fetchStatsData();
  }, [fetchPendingApprovals, fetchStatsData]);

  // ── derived queue data ─────────────────────────────────────────────────────
  const pendingApprovals = useMemo(() => {
    const toRow = (item, type, approvalType, refField, amountFields, dateField, purposeField, levelField) => {
      const dateStr  = item[dateField] || item.created_at;
      const days     = daysSince(dateStr);
      const priority = getPriority(days);
      return {
        ...item,
        type,
        approvalType,
        refNumber:  item[refField],
        employee:   item.requested_by || item.submitted_by || 'Unknown',
        department: item.department_name || item.department,
        amount:     parseFloat(amountFields.reduce((v, f) => item[f] ?? v, 0)),
        date:       dateStr,
        purpose:    item[purposeField] || item.purpose || '—',
        approvalLevel: item[levelField] || item.current_approval_level || '—',
        days,
        priority,
      };
    };
    const rows = [
      ...pendingData.cashAdvances.map(i =>
        toRow(i, 'Cash Advance', 'cash-advance', 'advance_number',
          ['requested_amount', 'calculated_amount', 'total_amount'],
          'advance_date', 'purpose', 'approval_level')),
      ...pendingData.liquidations.map(i =>
        toRow(i, 'Liquidation', 'liquidation', 'liquidation_number',
          ['total_actual_amount', 'total_amount'],
          'liquidation_date', 'purpose', 'approval_level')),
      ...pendingData.reimbursements.map(i =>
        toRow(i, 'Reimbursement', 'reimbursement', 'reimbursement_number',
          ['total_amount', 'total_actual_amount'],
          'reimbursement_date', 'purpose', 'approval_level')),
    ];
    return rows;
  }, [pendingData]);

  const filteredQueue = useMemo(() => {
    let rows = pendingApprovals;
    if (queueTypeFilter !== 'all') rows = rows.filter(r => r.type === queueTypeFilter);
    if (queueSearch) {
      const q = queueSearch.toLowerCase();
      rows = rows.filter(r =>
        (r.refNumber || '').toLowerCase().includes(q) ||
        (r.employee  || '').toLowerCase().includes(q) ||
        (r.purpose   || '').toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      let va, vb;
      if (queueSortField === 'priority')  { va = PRIORITY_ORDER[a.priority]; vb = PRIORITY_ORDER[b.priority]; }
      else if (queueSortField === 'amount') { va = a.amount; vb = b.amount; }
      else if (queueSortField === 'days')   { va = a.days;   vb = b.days; }
      else if (queueSortField === 'date')   { va = new Date(a.date); vb = new Date(b.date); }
      else { va = a[queueSortField] || ''; vb = b[queueSortField] || ''; }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return queueSortDir === 'asc' ? cmp : -cmp;
    });
  }, [pendingApprovals, queueTypeFilter, queueSearch, queueSortField, queueSortDir]);

  // ── monthly stats ──────────────────────────────────────────────────────────
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const thisMonth = (d) => {
      if (!d) return false;
      const dt = new Date(d);
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    };
    const norm = (s) => (s || '').toString().toLowerCase();
    // processApproval writes `approved_by = req.user.name` (a name string,
    // not an ID) and `approved_at = NOW()` for both approvals AND rejections,
    // for all three request types. So we match on name, not id.
    const myName = (user?.name || '').toLowerCase();

    const allItems = [
      ...allCashAdvances.map(i => ({ ...i, amt: parseFloat(i.requested_amount || 0) })),
      ...allLiquidations.map(i => ({ ...i, amt: parseFloat(i.total_actual_amount || i.total_amount || 0) })),
      ...allReimbursements.map(i => ({ ...i, amt: parseFloat(i.total_amount || 0) })),
    ];

    // Only count actions taken BY this approver, using the approval action
    // timestamp (approved_at) rather than updated_at, which can drift after
    // disbursement/other edits touch the record later.
    const actedByMe = (i) => {
      const actor = (i.approved_by || '').toString().toLowerCase();
      return myName && actor && actor === myName;
    };
    const actionDate = (i) => i.approved_at || i.updated_at || i.created_at;

    const approvedThisMonth = allItems.filter(i =>
      norm(i.status).includes('approved') && actedByMe(i) && thisMonth(actionDate(i))).length;

    const rejectedThisMonth = allItems.filter(i =>
      (norm(i.status).includes('rejected') || norm(i.status).includes('returned')) &&
      actedByMe(i) && thisMonth(actionDate(i))).length;

    const totalAmtPending = pendingApprovals.reduce((s, r) => s + r.amount, 0);

    const overdueCount = pendingApprovals.filter(r => r.priority === 'Overdue').length;

    // Average approval time: approved items where we can compute approved_at - created_at
    const approvedWithTimes = allItems.filter(i => norm(i.status).includes('approved') && i.created_at && i.approved_at);
    const avgApprovalHrs = approvedWithTimes.length
      ? approvedWithTimes.reduce((s, i) => s + (new Date(i.approved_at) - new Date(i.created_at)) / 36e5, 0) / approvedWithTimes.length
      : null;

    return { approvedThisMonth, rejectedThisMonth, totalAmtPending, overdueCount, avgApprovalHrs };
  }, [allCashAdvances, allLiquidations, allReimbursements, pendingApprovals, user]);

  // ── donut chart data ───────────────────────────────────────────────────────
  const typeDonutData = useMemo(() => [
    { label: 'Cash Advance',  value: pendingData.cashAdvances.length,   color: '#6366f1' },
    { label: 'Liquidation',   value: pendingData.liquidations.length,   color: '#ec4899' },
    { label: 'Reimbursement', value: pendingData.reimbursements.length, color: '#06b6d4' },
  ], [pendingData]);

  const agingData = useMemo(() => {
    const buckets = { '0–1 Day': 0, '2 Days': 0, 'Overdue': 0 };
    pendingApprovals.forEach(r => {
      if (r.days <= 1)      buckets['0–1 Day']++;
      else if (r.days === 2) buckets['2 Days']++;
      else                  buckets['Overdue']++;
    });
    return [
      { label: '0–1 Day', value: buckets['0–1 Day'], color: '#22c55e' },
      { label: '2 Days',  value: buckets['2 Days'],  color: '#eab308' },
      { label: 'Overdue', value: buckets['Overdue'], color: '#ef4444' },
    ];
  }, [pendingApprovals]);

  // ── recent actions (approved/rejected/returned, by this approver) ──────────
  const recentActions = useMemo(() => {
    const norm = (s) => (s || '').toString().toLowerCase();
    const myName = (user?.name || '').toLowerCase();
    const actedByMe = (i) => {
      const actor = (i.approved_by || '').toString().toLowerCase();
      return myName && actor && actor === myName;
    };
    const actionDate = (i) => i.approved_at || i.updated_at || i.created_at;

    const allItems = [
      ...allCashAdvances.map(i => ({ ...i, type: 'Cash Advance',  refNumber: i.advance_number,        date: actionDate(i), amount: parseFloat(i.requested_amount || 0) })),
      ...allLiquidations.map(i => ({ ...i, type: 'Liquidation',   refNumber: i.liquidation_number,    date: actionDate(i), amount: parseFloat(i.total_actual_amount || i.total_amount || 0) })),
      ...allReimbursements.map(i => ({ ...i, type: 'Reimbursement', refNumber: i.reimbursement_number, date: actionDate(i), amount: parseFloat(i.total_amount || 0) })),
    ];
    return allItems
      .filter(i => (norm(i.status).includes('approved') || norm(i.status).includes('rejected') || norm(i.status).includes('returned')) && actedByMe(i))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
  }, [allCashAdvances, allLiquidations, allReimbursements, user]);

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleReview = async (row) => {
    try {
      setViewLoading(true);
      const endpointMap = { 'cash-advance': 'cash-advances', liquidation: 'liquidations', reimbursement: 'reimbursements' };
      const res = await api.get(`/${endpointMap[row.approvalType]}/${row.id}`);
      if (res.data.success) {
        setViewData(res.data.data);
        setSelectedType(row.approvalType);
        setSelectedRequest(row);
        setViewOpen(true);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      setNotification({ message: 'Failed to load request details', severity: 'error' });
    } finally {
      setViewLoading(false);
    }
  };

  const openAction = (type) => {
    setActionType(type);
    setRemarks('');
    setViewOpen(false);
    setActionOpen(true);
  };

  const handleAction = async () => {
    if (!selectedRequest) return;
    try {
      const res = await api.post('/approvals/process', {
        type:    selectedRequest.approvalType,
        id:      selectedRequest.id,
        action:  actionType,
        remarks,
      });
      if (res.data.success) {
        setNotification({
          message: `Request ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`,
          severity: 'success'
        });
        setActionOpen(false);
        setRemarks('');
        setSelectedRequest(null);
        fetchPendingApprovals();
        fetchStatsData();
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      setNotification({ message: 'Error processing action. Please try again.', severity: 'error' });
    }
  };

  const handleCloseView = () => {
    setViewOpen(false);
    setViewData(null);
    setSelectedType(null);
  };

  const toggleSort = (field) => {
    if (queueSortField === field) setQueueSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setQueueSortField(field); setQueueSortDir('asc'); }
  };

  // ── sub-renderers ──────────────────────────────────────────────────────────
  const getRequestIcon = (type) => {
    if (type === 'Cash Advance')  return <HandCoins className="w-4 h-4 text-indigo-500" />;
    if (type === 'Liquidation')   return <Receipt   className="w-4 h-4 text-pink-500"   />;
    if (type === 'Reimbursement') return <Coins     className="w-4 h-4 text-cyan-500"   />;
    return null;
  };

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('pending'))  return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    if (s.includes('approved')) return 'bg-green-50 text-green-700 border border-green-200';
    if (s.includes('rejected')) return 'bg-red-50 text-red-700 border border-red-200';
    if (s.includes('return'))   return 'bg-orange-50 text-orange-700 border border-orange-200';
    if (s.includes('released')) return 'bg-blue-50 text-blue-700 border border-blue-200';
    return 'bg-gray-50 text-gray-600 border border-gray-200';
  };

  const renderViewForm = () => {
    if (!viewData) return null;
    if (selectedType === 'cash-advance')  return <CashAdvanceForm  editData={viewData} viewOnly />;
    if (selectedType === 'liquidation')   return <LiquidationForm  editData={viewData} viewOnly />;
    if (selectedType === 'reimbursement') return <ReimbursementForm editData={viewData} viewOnly />;
    return null;
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Approval Dashboard</h1>
        <p className="text-gray-500">Welcome back, <span className="font-medium text-gray-700">{displayName}</span> — here's what needs your attention today.</p>
      </div>

      {notification && (
        <Alert severity={notification.severity} onClose={() => setNotification(null)}>
          {notification.message}
        </Alert>
      )}

      {/* ── Section 1: Summary Cards ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Approval Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          {/* Pending Your Approval */}
          <Card className="border !border-blue-200 !bg-blue-50 text-white col-span-1 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-800 text-sm font-semibold mb-2">Pending Approvals</p>
                  <span className="text-4xl font-bold text-blue-800">{loading ? '—' : pendingApprovals.length}</span>
                </div>
                <Clock className="w-12 h-12 text-blue-800 opacity-50" />
              </div>
            </CardContent>
          </Card>

          {/* Overdue */}
          <Card className={`border text-white col-span-1 shadow-sm hover:shadow-md transition-shadow ${monthlyStats.overdueCount > 0 ? '!bg-red-50 !border-red-200' : '!bg-gray-50 !border-gray-200'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold mb-2 ${monthlyStats.overdueCount > 0 ? 'text-red-800' : 'text-gray-800'}`}>Overdue Requests</p>
                  <span className={`text-4xl font-bold ${monthlyStats.overdueCount > 0 ? 'text-red-800' : 'text-gray-800'}`}>{loading ? '—' : monthlyStats.overdueCount}</span>
                </div>
                <ClockAlert className={`w-12 h-12 ${monthlyStats.overdueCount > 0 ? 'text-red-800' : 'text-gray-800'} opacity-50`} />
              </div>
            </CardContent>
          </Card>

          {/* Approved This Month */}
          <Card className="border !border-green-200 !bg-green-50 text-white col-span-1 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-800 text-sm font-semibold mb-2">Approved This Month</p>
                  <span className="text-4xl font-bold text-green-800">{statsLoading ? '—' : monthlyStats.approvedThisMonth}</span>
                </div>
                <CheckCircle className="w-12 h-12 text-green-800 opacity-50" />
              </div>
            </CardContent>
          </Card>

          {/* Returned / Rejected This Month */}
          <Card className="border !border-red-200 !bg-red-50 text-white col-span-1 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold mb-2 text-red-800">Rejected This Month</p>
                  <span className="text-4xl font-bold text-red-800">{statsLoading ? '—' : monthlyStats.rejectedThisMonth}</span>
                </div>
                <XCircle className="w-12 h-12 text-red-800 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Section 2: Approval Queue ── */}
      <Card>
        <CardContent className="p-6">
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Requests Awaiting Your Approval</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {filteredQueue.length} of {pendingApprovals.length} requests shown
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
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
              {/* Type filter */}
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

          {loading ? (
            <Loading message="Loading approval queue…" />
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Request No.</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Requestor</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Request Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Days Pending</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-gray-400 text-sm">
                        No results found.
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((row) => (
                      <tr
                        key={`${row.approvalType}-${row.id}`}
                        className={`hover:bg-gray-50 transition-colors ${row.priority === 'Overdue' ? 'bg-red-50/40' : ''}`}
                      >
                        <td className="px-4 py-4">
                          <span className="text-sm font-semibold text-gray-900">{row.refNumber}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {getRequestIcon(row.type)}
                            <span className="text-sm font-medium text-gray-900">{row.type}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                              {(row.employee || '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-900 truncate max-w-[120px]" title={row.employee}>{row.employee}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-600">{formatLongDate(row.date)}</span>
                        </td>
                        <td className="px-4 py-4 text-left">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatPeso(row.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {(() => {
                            const days = row.days;
                            const isOverdue = days > 3;
                            const isWarning = days === 3;
                            return (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                isOverdue
                                  ? 'bg-red-100 text-red-700 border border-red-200'
                                  : isWarning
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                  : 'bg-green-100 text-green-700 border border-green-200'
                              }`}>
                                {isOverdue && <span>⚠</span>}
                                {days}d
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleReview(row)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Review Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setSelectedRequest(row); setActionType('approve'); setActionOpen(true); }}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setSelectedRequest(row); setActionType('reject'); setActionOpen(true); }}
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

      {/* ── Section 3 & 4: Charts ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Approval Monitoring</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Pending by Type – donut */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Pending Approval by Type</h3>
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

          {/* Approval Aging – donut */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Approval Aging</h3>
              <div className="flex flex-col items-center gap-4">
                <DonutChart data={agingData} size={130} />
                <div className="w-full space-y-1.5">
                  {agingData.map(d => (
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
        </div>
      </div>

      {/* ── Section 5: Recent Approval Actions ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Approval Actions</h2>
        <Card>
          <CardContent className="p-6">
            {statsLoading ? (
              <Loading message="Loading recent actions…" />
            ) : recentActions.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">No recent approval actions.</p>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Reference No.', 'Type', 'Requestor', 'Amount', 'Date'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{h}</th>
                      ))}
                      <th key="status" className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentActions.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{item.refNumber}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_STYLES[item.type] || 'bg-gray-100 text-gray-600'}`}>
                            {getRequestIcon(item.type)}{item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{item.requested_by || item.submitted_by || '—'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatPeso(item.amount)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatLongDate(item.date)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeClass(item.status)}`}>
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

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW DETAILS MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        open={viewOpen}
        onClose={handleCloseView}
        title={
          <div className="flex items-center gap-3">
            <span>Request Details</span>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" />
              PENDING APPROVAL
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
              onClick={() => openAction('reject')}
            >
              Reject
            </Button>
            <Button
              variant="success"
              startIcon={<CheckCircle className="w-4 h-4" />}
              onClick={() => openAction('approve')}
            >
              Approve
            </Button>
          </>
        }
      >
        {viewLoading ? (
          <Loading message="Loading request details…" />
        ) : viewData ? (
          <>
            <RequestTimeline request={viewData} />
            {renderViewForm()}
          </>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">No details available.</p>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          ACTION CONFIRMATION MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        title={actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
        maxWidth="sm"
        className="text-center "
        actions={
          <>
            <Button variant="secondary" onClick={() => setActionOpen(false)}>Cancel</Button>
            <Button
              variant={actionType === 'approve' ? 'success' : 'danger'}
              startIcon={actionType === 'approve' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              onClick={handleAction}
              disabled={actionType === 'reject' && !remarks.trim()}
            >
              {actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </Button>
          </>
        }
      >
        <p className="text-gray-700 mb-4">
          {actionType === 'approve'
            ? 'Are you sure you want to approve this request?'
            : 'Are you sure you want to reject this request? Please provide a reason below.'}
        </p>
        {actionType === 'reject' && (
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
      </Modal>

    </div>
  );
};

export default ManagerDashboard;