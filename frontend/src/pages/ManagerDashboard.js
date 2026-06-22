import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  HandCoins, Receipt, Coins, TrendingUp,
  Clock, CheckCircle, XCircle, Eye,
  PieChart, BarChart3
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

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.name || user?.username || user?.email || 'Manager';

  const [loading, setLoading] = useState(false);
  const [pendingData, setPendingData] = useState({ cashAdvances: [], liquidations: [], reimbursements: [] });
  const [notification, setNotification] = useState(null);

  // Approve/Reject state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // 'cash-advance' | 'liquidation' | 'reimbursement'
  const [actionOpen, setActionOpen] = useState(false);
  const [actionType, setActionType] = useState('approve');
  const [remarks, setRemarks] = useState('');

  // View modal state
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewData, setViewData] = useState(null);

  // Stats sourced from the employee-level lists, for "Approved This Month" / "Total Disbursed"
  const [allCashAdvances, setAllCashAdvances] = useState([]);
  const [allLiquidations, setAllLiquidations] = useState([]);
  const [allReimbursements, setAllReimbursements] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchPendingApprovals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/approvals/pending');
      if (res.data.success) {
        setPendingData(res.data.data);
      }
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
      const [caRes, liqRes, reimbRes] = await Promise.all([
        api.get('/cash-advances'),
        api.get('/liquidations'),
        api.get('/reimbursements')
      ]);
      if (caRes.data.success) setAllCashAdvances(caRes.data.data);
      if (liqRes.data.success) setAllLiquidations(liqRes.data.data);
      if (reimbRes.data.success) setAllReimbursements(reimbRes.data.data);
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

  // Flatten the three pending lists into one table, each row tagged with its type
  const pendingApprovals = useMemo(() => {
    const items = [
      ...pendingData.cashAdvances.map(item => ({
        ...item,
        type: 'Cash Advance',
        approvalType: 'cash-advance',
        refNumber: item.advance_number,
        employee: item.requested_by || item.submitted_by || 'Unknown',
        department: item.department_name || item.department,
        amount: parseFloat(item.requested_amount || item.calculated_amount || item.total_amount || 0),
        date: item.advance_date || item.created_at
      })),
      ...pendingData.liquidations.map(item => ({
        ...item,
        type: 'Liquidation',
        approvalType: 'liquidation',
        refNumber: item.liquidation_number,
        employee: item.requested_by || item.submitted_by || 'Unknown',
        department: item.department_name || item.department,
        amount: parseFloat(item.total_actual_amount || item.total_amount || 0),
        date: item.liquidation_date || item.created_at
      })),
      ...pendingData.reimbursements.map(item => ({
        ...item,
        type: 'Reimbursement',
        approvalType: 'reimbursement',
        refNumber: item.reimbursement_number,
        employee: item.requested_by || item.submitted_by || 'Unknown',
        department: item.department_name || item.department,
        amount: parseFloat(item.total_amount || item.total_actual_amount || 0),
        date: item.reimbursement_date || item.created_at
      }))
    ];
    return items.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [pendingData]);

  // Department breakdown computed from the real pending-approval data
  const departmentBreakdown = useMemo(() => {
    const byDept = {};
    pendingApprovals.forEach(item => {
      const dept = item.department || 'Unassigned';
      if (!byDept[dept]) byDept[dept] = { count: 0, amount: 0 };
      byDept[dept].count += 1;
      byDept[dept].amount += item.amount || 0;
    });
    return Object.entries(byDept)
      .map(([department, vals]) => ({ department, ...vals }))
      .sort((a, b) => b.amount - a.amount);
  }, [pendingApprovals]);

  // "Approved This Month" - count across all three request types with status approved this month
  // "Total Disbursed" - sum of disbursed/released amounts across cash advances and reimbursements
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const isThisMonth = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };
    const normalize = (status) => (status || '').toString().toLowerCase();

    const approvedThisMonth = [
      ...allCashAdvances.filter(ca => normalize(ca.status).includes('approved') && isThisMonth(ca.updated_at || ca.created_at)),
      ...allLiquidations.filter(l => normalize(l.status).includes('approved') && isThisMonth(l.updated_at || l.created_at)),
      ...allReimbursements.filter(r => normalize(r.status).includes('approved') && isThisMonth(r.updated_at || r.created_at))
    ].length;

    const totalDisbursed = [
      ...allCashAdvances.filter(ca => normalize(ca.status).includes('disbursed') || normalize(ca.status).includes('released'))
        .map(ca => parseFloat(ca.requested_amount || 0)),
      ...allReimbursements.filter(r => normalize(r.status).includes('disbursed') || normalize(r.status).includes('released'))
        .map(r => parseFloat(r.total_amount || 0))
    ].reduce((sum, val) => sum + val, 0);

    return { approvedThisMonth, totalDisbursed };
  }, [allCashAdvances, allLiquidations, allReimbursements]);

  const formatPesoCompact = (amount) => {
    if (amount >= 1000000) return `₱${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `₱${(amount / 1000).toFixed(0)}K`;
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const handleView = async (row) => {
    try {
      setViewLoading(true);
      const typeMap = {
        'cash-advance': 'cash-advances',
        'liquidation': 'liquidations',
        'reimbursement': 'reimbursements'
      };
      const endpoint = typeMap[row.approvalType];
      const res = await api.get(`/${endpoint}/${row.id}`);
      if (res.data.success) {
        setViewData(res.data.data);
        setSelectedType(row.approvalType);
        setViewOpen(true);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      setNotification({ message: 'Failed to load request details', severity: 'error' });
    } finally {
      setViewLoading(false);
    }
  };

  const handleAction = async () => {
    try {
      const res = await api.post('/approvals/process', {
        type: selectedRequest.approvalType,
        id: selectedRequest.id,
        action: actionType,
        remarks: remarks
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
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error('Error processing approval:', error);
      setNotification({ message: 'Error processing action', severity: 'error' });
    }
  };

  const handleCloseView = () => {
    setViewOpen(false);
    setViewData(null);
    setSelectedType(null);
  };

  const getRequestIcon = (type) => {
    switch (type) {
      case 'Cash Advance':
        return <HandCoins className="w-5 h-5 text-primary-600" />;
      case 'Liquidation':
        return <Receipt className="w-5 h-5 text-pink-600" />;
      case 'Reimbursement':
        return <Coins className="w-5 h-5 text-cyan-600" />;
      default:
        return null;
    }
  };

  const renderViewForm = () => {
    if (!viewData) return null;
    if (selectedType === 'cash-advance') return <CashAdvanceForm editData={viewData} viewOnly />;
    if (selectedType === 'liquidation') return <LiquidationForm editData={viewData} viewOnly />;
    if (selectedType === 'reimbursement') return <ReimbursementForm editData={viewData} viewOnly />;
    return null;
  };

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome, {displayName}! 👔
        </h1>
        <p className="text-gray-600">Manager Dashboard - Review and approve your team's requests</p>
      </div>

      {notification && (
        <div className="mb-6">
          <Alert severity={notification.severity} onClose={() => setNotification(null)}>
            {notification.message}
          </Alert>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm mb-2">Pending Approvals</p>
                <h3 className="text-4xl font-bold">
                  {loading ? '—' : pendingApprovals.length}
                </h3>
              </div>
              <Clock className="w-12 h-12 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm mb-2">Approved This Month</p>
                <h3 className="text-4xl font-bold">
                  {statsLoading ? '—' : monthlyStats.approvedThisMonth}
                </h3>
              </div>
              <CheckCircle className="w-12 h-12 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm mb-2">Total Disbursed</p>
                <h3 className="text-4xl font-bold">
                  {statsLoading ? '—' : formatPesoCompact(monthlyStats.totalDisbursed)}
                </h3>
              </div>
              <TrendingUp className="w-12 h-12 opacity-30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Request Modal */}
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
              onClick={() => {
                setSelectedRequest({ ...viewData, approvalType: selectedType });
                handleCloseView();
                setActionType('reject');
                setActionOpen(true);
              }}
            >
              Reject
            </Button>
            <Button
              variant="success"
              startIcon={<CheckCircle className="w-4 h-4" />}
              onClick={() => {
                setSelectedRequest({ ...viewData, approvalType: selectedType });
                handleCloseView();
                setActionType('approve');
                setActionOpen(true);
              }}
            >
              Approve
            </Button>
          </>
        }
      >
        {viewLoading ? <Loading message="Loading details..." /> : renderViewForm()}
      </Modal>

      {/* Action Confirmation Modal */}
      <Modal
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        title={actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
        maxWidth="sm"
        className="text-center"
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

      {/* Pending Approvals Table */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Pending Approvals</h2>
            <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full">
              {pendingApprovals.length} requests
            </span>
          </div>
          {loading ? (
            <Loading message="Loading pending approvals..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reference No.</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingApprovals.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-gray-500">No pending requests</td>
                    </tr>
                  ) : (
                    pendingApprovals.map((request) => (
                      <tr key={`${request.approvalType}-${request.id}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {getRequestIcon(request.type)}
                            <span className="text-sm font-medium text-gray-900">{request.type}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-mono text-gray-700">{request.refNumber}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-sm">
                              {request.employee?.charAt(0) || '?'}
                            </div>
                            <span className="text-sm text-gray-900">{request.employee}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-600">{request.department || 'N/A'}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            ₱{request.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-600">{formatLongDate(request.date)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleView(request)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setSelectedRequest(request); setActionType('approve'); setActionOpen(true); }}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setSelectedRequest(request); setActionType('reject'); setActionOpen(true); }}
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

      {/* Quick Stats and Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Department Breakdown - computed from real pending approvals */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Department Breakdown</h2>
            {loading ? (
              <Loading message="Loading..." />
            ) : departmentBreakdown.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pending requests by department</p>
            ) : (
              <ul className="space-y-4">
                {departmentBreakdown.map((dept, index) => (
                  <li
                    key={dept.department}
                    className={`flex items-center gap-4 ${
                      index < departmentBreakdown.length - 1 ? 'pb-4 border-b border-gray-200' : ''
                    }`}
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <PieChart className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{dept.department}</p>
                      <p className="text-sm text-gray-600">{dept.count} pending request{dept.count > 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{formatPesoCompact(dept.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="secondary"
                fullWidth
                startIcon={<BarChart3 className="w-5 h-5" />}
                onClick={() => navigate('/reports')}
                className="py-3 border-indigo-500 text-indigo-600 hover:bg-indigo-50"
              >
                View Reports
              </Button>
              <Button
                variant="secondary"
                fullWidth
                startIcon={<Eye className="w-5 h-5" />}
                onClick={() => navigate('/approvals')}
                className="py-3 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
              >
                Full Approvals List
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerDashboard;