import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CheckCircle, XCircle, Eye, X, Clock, DollarSign, Receipt, Coins, List
} from 'lucide-react';
import api from '../api';
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

const Approvals = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({ cashAdvances: [], liquidations: [], reimbursements: [] });
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [actionOpen, setActionOpen] = useState(false);
    const [actionType, setActionType] = useState('approve'); // 'approve' or 'reject'
    const [remarks, setRemarks] = useState('');
    const [notification, setNotification] = useState(null);

    const fetchPendingApprovals = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/approvals/pending');
            if (res.data.success) {
                setData(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching pending approvals:', error);
            setNotification({ message: 'Failed to load pending approvals', severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPendingApprovals();
    }, [fetchPendingApprovals]);

    const handleView = async (row) => {
        try {
            setLoading(true);
            const typeMap = { 0: 'cash-advances', 1: 'liquidations', 2: 'reimbursements' };
            const endpoint = typeMap[activeTab];
            const res = await api.get(`/${endpoint}/${row.id}`);

            if (res.data.success) {
                setSelectedRequest(res.data.data);
                setViewOpen(true);
            }
        } catch (error) {
            console.error('Error fetching request details:', error);
            setNotification({ message: 'Failed to load request details', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async () => {
        try {
            const typeMap = { 0: 'cash-advance', 1: 'liquidation', 2: 'reimbursement' };
            const res = await api.post('/approvals/process', {
                type: typeMap[activeTab],
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

    const renderViewForm = () => {
        if (!selectedRequest) return null;
        if (activeTab === 0) return <CashAdvanceForm editData={selectedRequest} viewOnly />;
        if (activeTab === 1) return <LiquidationForm editData={selectedRequest} viewOnly />;
        if (activeTab === 2) return <ReimbursementForm editData={selectedRequest} viewOnly />;
        return null;
    };

    const renderTable = (items) => (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reference No.</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Requested By</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Purpose</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan="7" className="py-8 text-center text-gray-500">No pending requests</td>
                        </tr>
                    ) : (
                        items.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 text-sm font-semibold font-mono text-gray-900">
                                    {row.advance_number || row.liquidation_number || row.reimbursement_number}
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2 max-w-[180px]">
                                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-semibold text-indigo-600">
                                            {(row.requested_by || row.submitted_by)?.charAt(0)}
                                        </div>
                                        <span className="text-sm truncate" title={row.requested_by || row.submitted_by}>
                                            {row.requested_by || row.submitted_by}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-700 max-w-[150px] truncate" title={row.department_name}>
                                    {row.department_name}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-700 max-w-[200px] truncate" title={row.purpose}>
                                    {row.purpose}
                                </td>
                                <td className="px-4 py-4 text-sm font-semibold text-right text-gray-900">
                                    ₱{parseFloat(row.calculated_amount || row.requested_amount || row.total_actual_amount || row.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-700">
                                    {formatLongDate(row.advance_date || row.liquidation_date || row.reimbursement_date)}
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => handleView(row)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => { setSelectedRequest(row); setActionType('approve'); setActionOpen(true); }}
                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
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
    );

    const stats = useMemo(() => ({
        cashAdvances: data.cashAdvances.length,
        liquidations: data.liquidations.length,
        reimbursements: data.reimbursements.length,
        total: data.cashAdvances.length + data.liquidations.length + data.reimbursements.length
    }), [data]);

    const tabs = [
        `Cash Advances (${data.cashAdvances.length})`,
        `Liquidations (${data.liquidations.length})`,
        `Reimbursements (${data.reimbursements.length})`
    ];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Approvals ✅</h1>
                <p className="text-gray-600">Review and process pending disbursement requests</p>
            </div>

            {notification && (
                <div className="mb-6">
                    <Alert severity={notification.severity} onClose={() => setNotification(null)}>
                        {notification.message}
                    </Alert>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <Card className="bg-gradient-to-br from-primary-500 to-secondary-500 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/90 text-sm font-semibold mb-2">Cash Advances</p>
                                <h3 className="text-4xl font-bold">{stats.cashAdvances}</h3>
                            </div>
                            <DollarSign className="w-12 h-12 opacity-30" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-pink-400 to-rose-500 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/90 text-sm font-semibold mb-2">Liquidations</p>
                                <h3 className="text-4xl font-bold">{stats.liquidations}</h3>
                            </div>
                            <Receipt className="w-12 h-12 opacity-30" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/90 text-sm font-semibold mb-2">Reimbursements</p>
                                <h3 className="text-4xl font-bold">{stats.reimbursements}</h3>
                            </div>
                            <Coins className="w-12 h-12 opacity-30" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-rose-400 to-yellow-400 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/90 text-sm font-semibold mb-2">Total Pending</p>
                                <h3 className="text-4xl font-bold">{stats.total}</h3>
                            </div>
                            <List className="w-12 h-12 opacity-30" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Card */}
            <Card>
                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <div className="flex px-4">
                        {tabs.map((tab, index) => (
                            <button
                                key={index}
                                onClick={() => setActiveTab(index)}
                                className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                                    activeTab === index
                                        ? 'border-primary-600 text-primary-600'
                                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table Content */}
                {loading ? (
                    <Loading message="Loading approvals..." />
                ) : (
                    <div className="p-6">
                        {activeTab === 0 && renderTable(data.cashAdvances)}
                        {activeTab === 1 && renderTable(data.liquidations)}
                        {activeTab === 2 && renderTable(data.reimbursements)}
                    </div>
                )}
            </Card>

            {/* View Details Modal */}
            <Modal
                open={viewOpen}
                onClose={() => setViewOpen(false)}
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
                        <Button variant="secondary" onClick={() => setViewOpen(false)}>Close</Button>
                        <Button
                            variant="danger"
                            startIcon={<XCircle className="w-4 h-4" />}
                            onClick={() => { setViewOpen(false); setActionType('reject'); setActionOpen(true); }}
                        >
                            Reject
                        </Button>
                        <Button
                            variant="success"
                            startIcon={<CheckCircle className="w-4 h-4" />}
                            onClick={() => { setViewOpen(false); setActionType('approve'); setActionOpen(true); }}
                        >
                            Approve
                        </Button>
                    </>
                }
            >
                {renderViewForm()}
            </Modal>

            {/* Action Confirmation Modal */}
            <Modal
                open={actionOpen}
                onClose={() => setActionOpen(false)}
                title={actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
                maxWidth="sm"
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

export default Approvals;
