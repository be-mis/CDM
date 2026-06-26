import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  HandCoins, ReceiptText, Coins, TrendingUp, AlertTriangle, Eye, X,
  Clock, Send, Banknote, FileEdit, CheckCircle, XCircle
} from 'lucide-react';
import AttachmentViewer from '../components/AttachmentViewer';
import CashAdvanceForm from '../components/CashAdvanceForm';
import LiquidationForm from '../components/LiquidationForm';
import { formatCurrency } from '../utils/formatters';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Loading, Spinner } from '../components/ui/Loading';
import StatusChip from '../components/StatusChip';

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
    actor: pick('requested_by', 'submitted_by', 'created_by', 'requestedBy', 'submittedBy'),
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

const EmployeeDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.name || user?.username || user?.email || 'User';

  const [loading, setLoading] = useState(true);
  const [cashAdvances, setCashAdvances] = useState([]);
  const [liquidations, setLiquidations] = useState([]);
  const [reimbursements, setReimbursements] = useState([]);
  const [selectedOverviewType, setSelectedOverviewType] = useState('cashAdvances');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    disbursed: 0,
    draft: 0,
    totalAmount: 0,
    liquidationsCount: 0,
    overdueCount: 0,
    reimbursementsCount: 0
  });

  useEffect(() => {
    fetchCashAdvances();
    fetchLiquidations();
    fetchReimbursements();
  }, []);

  const fetchCashAdvances = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cash-advances');
      if (response.data.success) {
        const data = response.data.data;
        setCashAdvances(data);

        const newStats = {
          total: data.length,
          pending: data.filter(ca => ca.status === 'pending').length,
          approved: data.filter(ca => ca.status === 'approved').length,
          released: data.filter(ca => ca.status === 'released').length,
          draft: data.filter(ca => ca.status === 'draft').length,
          totalAmount: data.reduce((sum, ca) => sum + parseFloat(ca.requested_amount || 0), 0),
          liquidationsCount: stats.liquidationsCount,
          overdueCount: data.filter(ca => !!ca.is_overdue).length
        };
        setStats(newStats);
      }
    } catch (error) {
      console.error('Error fetching cash advances:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiquidations = async () => {
    try {
      const response = await api.get('/liquidations');
      if (response.data.success) {
        const data = response.data.data;
        setLiquidations(data);
        setStats(prev => ({ ...prev, liquidationsCount: data.length }));
      }
    } catch (error) {
      console.error('Error fetching liquidations:', error);
    }
  };

  const fetchReimbursements = async () => {
    try {
      const response = await api.get('/reimbursements');
      if (response.data.success) {
        const data = response.data.data;
        setReimbursements(data);
        setStats(prev => ({ ...prev, reimbursementsCount: data.length }));
      }
    } catch (error) {
      console.error('Error fetching reimbursements:', error);
    }
  };

  const formatStatus = (status) => {
    const statusMap = {
      'draft': 'Draft',
      'pending': 'Pending',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'disbursed': 'Disbursed',
      'liquidated': 'Liquidated',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  };

  const overviewStats = useMemo(() => {
    const normalize = (status) => (status || '').toString().toLowerCase();
    const count = (items, predicate) => items.filter(predicate).length;

    if (selectedOverviewType === 'liquidations') {
      return {
        title: 'Liquidations',
        stats: [
          { label: 'Pending Approval', count: count(liquidations, item => normalize(item.status).includes('pending')) },
          { label: 'Approved', count: count(liquidations, item => normalize(item.status).includes('approved')) },
          { label: 'Liquidated', count: count(liquidations, item => normalize(item.status).includes('liquidated') || normalize(item.status).includes('completed')) },
          { label: 'Draft', count: count(liquidations, item => normalize(item.status) === 'draft') }
        ]
      };
    }

    if (selectedOverviewType === 'reimbursements') {
      return {
        title: 'Reimbursements',
        stats: [
          { label: 'Pending Approval', count: count(reimbursements, item => normalize(item.status).includes('pending')) },
          { label: 'Approved', count: count(reimbursements, item => normalize(item.status).includes('approved')) },
          { label: 'Released', count: count(reimbursements, item => normalize(item.status).includes('released') || normalize(item.status).includes('disbursed')) },
          { label: 'Draft', count: count(reimbursements, item => normalize(item.status) === 'draft') }
        ]
      };
    }

    return {
      title: 'Cash Advances',
      stats: [
        { label: 'Pending Approval', count: count(cashAdvances, item => normalize(item.status).includes('pending')) },
        { label: 'Approved', count: count(cashAdvances, item => normalize(item.status).includes('approved')) },
        { label: 'Disbursed', count: count(cashAdvances, item => normalize(item.status).includes('disbursed') || normalize(item.status).includes('released')) },
        { label: 'Draft', count: count(cashAdvances, item => normalize(item.status) === 'draft') }
      ]
    };
  }, [selectedOverviewType, cashAdvances, liquidations, reimbursements]);

  // Get recent 4 requests
  const combinedRequests = [
    ...cashAdvances.map(ca => ({
      ...ca,
      type: 'cash-advance',
      refNumber: ca.advance_number,
      amount: ca.requested_amount,
      date: ca.created_at
    })),
    ...liquidations.map(liq => ({
      ...liq,
      type: 'liquidation',
      refNumber: liq.liquidation_number,
      amount: liq.total_actual_amount,
      date: liq.created_at
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
  const recentRequests = combinedRequests;

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const handleCloseView = () => {
    setViewModalOpen(false);
    setViewData(null);
    setViewLoading(false);
  };

  const handleView = async (request) => {
    try {
      setViewLoading(true);
      if (request.type === 'cash-advance') {
        const response = await api.get(`/cash-advances/${request.id}`);
        if (response?.data?.success) {
          const data = response.data.data;
          const viewData = {
            id: data.id,
            refNumber: data.advance_number || data.advanceNumber || request.refNumber,
            requestDate: data.advance_date || data.advanceDate || request.requestDate,
            requestedBy: data.requested_by || data.requestedBy,
            department: data.department,
            employeeId: data.employee_id || data.employeeId,
            purpose: data.purpose,
            projectName: data.project_name || data.projectName,
            destination: data.destination,
            startDate: data.start_date || data.startDate,
            endDate: data.end_date || data.endDate,
            activities: Array.isArray(data.activities) ? data.activities.map(a => ({ id: a.id, destination: a.destination, start_date: a.start_date, end_date: a.end_date })) : [],
            paymentMethod: data.payment_method || data.paymentMethod,
            paymentReason: data.payment_reason || data.paymentReason || '',
            checkNumber: data.check_number || data.checkNumber,
            accountNumber: data.account_number || data.accountNumber,
            liquidationDeadline: data.liquidation_deadline || data.liquidationDeadline,
            status: data.status,
            remarks: data.remarks,
            reject_remarks: data.reject_remarks || '',
            release_remarks: data.release_remarks || '',
            items: Array.isArray(data.items) ? data.items.map(it => ({ id: it.id, description: it.description || it.item_description || '', estimatedAmount: it.estimated_amount ?? it.estimatedAmount ?? it.amount ?? 0 })) : [],
            attachments: data.attachments || [],
            // Timeline fields — passed through as-is from the API so
            // RequestTimeline can render submission/approval/release history
            created_at: data.created_at || data.advance_date,
            approved_at: data.approved_at,
            approved_by: data.approver_name || data.approved_by,
            rejected_at: data.rejected_at,
            rejected_by: data.rejected_by || data.approver_name,
            released_at: data.released_at,
            released_by: data.released_by,
            type: 'cash-advance'
          };
          setViewData(viewData);
        } else {
          setViewData({ ...request, type: 'cash-advance' });
        }
      } else if (request.type === 'liquidation') {
        const response = await api.get(`/liquidations/${request.id}`);
        if (response?.data?.success) {
          const data = response.data.data;
          const viewData = {
            id: data.id,
            liquidationNumber: data.liquidation_number || request.refNumber,
            liquidationDate: data.liquidation_date || request.submitDate,
            cashAdvanceId: data.cash_advance_id,
            cashAdvanceNumber: data.cash_advance_number || request.cashAdvanceRef,
            submittedBy: data.submitted_by || request.submittedBy,
            department: data.department,
            totalAdvanceAmount: data.total_advance_amount || request.totalExpenses || 0,
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
            items: Array.isArray(data.items) ? data.items.map(it => ({ id: it.id, description: it.description || '', category: it.category || '', estimatedAmount: it.estimated_amount ?? it.estimatedAmount ?? 0, actualAmount: it.actual_amount ?? it.actualAmount ?? 0, receiptNumber: it.receipt_number || '', vendor: it.vendor || '', expenseDate: it.expense_date || '' })) : [],
            attachments: data.attachments || [],
            // Timeline fields
            created_at: data.created_at || data.liquidation_date,
            approved_at: data.approved_at,
            approved_by: data.approver_name || data.approved_by,
            rejected_at: data.rejected_at,
            rejected_by: data.rejected_by || data.approver_name,
            released_at: data.released_at,
            released_by: data.released_by,
            type: 'liquidation'
          };
          setViewData(viewData);
        } else {
          setViewData({ ...request, type: 'liquidation' });
        }
      }
      setViewModalOpen(true);
    } catch (err) {
      console.error('Error fetching request details for view', err);
      setViewData({ ...request, type: request.type });
      setViewModalOpen(true);
    } finally {
      setViewLoading(false);
    }
  };

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {displayName}! 👋
        </h1>
        <p className="text-gray-600">Here's what's happening with your requests today</p>
      </div>

      {/* Pending Liquidations Alert Banner */}
      {!loading && stats.overdueCount > 0 && (
        <div className="mb-6 rounded-xl overflow-hidden bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 shadow-lg animate-fade-in">
          <div className="flex items-center gap-4 px-6 py-5 flex-wrap">
            <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-red-50 border border-red-200 animate-pulse">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 leading-tight">
                ⚠️ {stats.overdueCount} Cash Advance{stats.overdueCount > 1 ? 's' : ''} Pending Liquidation
              </h3>
              <p className="text-sm text-red-800 mt-1">
                {stats.overdueCount > 1
                  ? 'These cash advances are past their liquidation deadline. Please submit your liquidation reports.'
                  : 'This cash advance is past its liquidation deadline. Please submit your liquidation report.'}
              </p>
            </div>
            <Button
              variant="danger"
              size="md"
              onClick={() => navigate('/my-requests', { state: { tab: 0 } })}
            >
              View Requests
            </Button>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
        <Card
          hover
          className={`bg-gradient-to-br from-primary-500 to-secondary-500 text-white cursor-pointer transition-transform ${
            selectedOverviewType === 'cashAdvances' ? 'scale-105 shadow-xl' : ''
          }`}
          onClick={() => setSelectedOverviewType('cashAdvances')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm mb-2">Cash Advances</p>
                <h3 className="text-4xl font-bold">
                  {loading ? <Spinner size="md" className="text-white" /> : cashAdvances.length}
                </h3>
              </div>
              <HandCoins className="w-12 h-12 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card
          hover
          className={`bg-gradient-to-br from-pink-400 to-rose-500 text-white cursor-pointer transition-transform ${
            selectedOverviewType === 'liquidations' ? 'scale-105 shadow-xl' : ''
          }`}
          onClick={() => setSelectedOverviewType('liquidations')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm mb-2">Liquidations</p>
                <h3 className="text-4xl font-bold">
                  {loading ? <Spinner size="md" className="text-white" /> : liquidations.length}
                </h3>
              </div>
              <ReceiptText className="w-12 h-12 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card
          hover
          className={`bg-gradient-to-br from-cyan-400 to-blue-500 text-white cursor-pointer transition-transform ${
            selectedOverviewType === 'reimbursements' ? 'scale-105 shadow-xl' : ''
          }`}
          onClick={() => setSelectedOverviewType('reimbursements')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm mb-2">Reimbursements</p>
                <h3 className="text-4xl font-bold">
                  {loading ? <Spinner size="md" className="text-white" /> : reimbursements.length}
                </h3>
              </div>
              <Coins className="w-12 h-12 opacity-30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Request Modal */}
      <Modal
        open={viewModalOpen}
        onClose={handleCloseView}
        title={viewData ? (viewData.type === 'cash-advance' ? `Cash Advance - ${viewData.refNumber || viewData.advance_number}` : `Liquidation - ${viewData.liquidationNumber || viewData.refNumber}`) : 'Request Details'}
        maxWidth="xl"
      >
        {viewLoading ? (
          <Loading message="Loading details..." />
        ) : viewData ? (
          <>
            <RequestTimeline request={viewData} />
            {viewData.type === 'cash-advance' ? (
              <CashAdvanceForm editData={viewData} viewOnly onClose={handleCloseView} />
            ) : (
              <LiquidationForm editData={viewData} viewOnly onClose={handleCloseView} />
            )}
          </>
        ) : (
          <p className="text-gray-600">No details available.</p>
        )}
      </Modal>

      {/* Status Overview & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Overview */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Request Status Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {overviewStats.stats.map((item) => (
                <div key={item.label} className="text-center p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">
                    {loading ? <Spinner size="sm" /> : item.count}
                  </h3>
                  <p className="text-sm text-gray-600">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                startIcon={<HandCoins className="w-5 h-5" />}
                onClick={() => navigate('/cash-advance')}
                className="py-3 border-primary-500 text-primary-600 hover:bg-primary-50"
              >
                New Cash Advance
              </Button>
              <Button
                variant="secondary"
                size="md"
                fullWidth
                startIcon={<ReceiptText className="w-5 h-5" />}
                onClick={() => navigate('/liquidation')}
                className="py-3 border-pink-500 text-pink-600 hover:bg-pink-50"
              >
                Liquidate
              </Button>
              <Button
                variant="secondary"
                size="md"
                fullWidth
                startIcon={<Coins className="w-5 h-5" />}
                onClick={() => navigate('/reimbursement')}
                className="py-3 border-cyan-500 text-cyan-600 hover:bg-cyan-50"
              >
                Reimbursement
              </Button>
              <Button
                variant="secondary"
                size="md"
                fullWidth
                startIcon={<TrendingUp className="w-5 h-5" />}
                onClick={() => navigate('/reports')}
                className="py-3 border-yellow-500 text-yellow-700 hover:bg-yellow-50"
              >
                View Reports
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Requests */}
        <Card>
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
                      {request.type === 'cash-advance' ? (
                        <HandCoins className="w-6 h-6 text-primary-600" />
                      ) : (
                        <ReceiptText className="w-6 h-6 text-pink-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {request.type === 'cash-advance'
                          ? `Cash Advance - ${request.refNumber}`
                          : `Liquidation - ${request.refNumber}`}
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
    </div>
  );
};

export default EmployeeDashboard;