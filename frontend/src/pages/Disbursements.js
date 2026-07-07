import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CheckCircle, XCircle, Eye, X, Hourglass, DollarSign, Receipt, Coins,
    Search, ChevronLeft, ChevronRight, Clock, Send, Banknote, FileEdit,
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

// Reusable pagination control
const Pagination = ({ currentPage, totalItems, pageSize, onPageChange, onPageSizeChange }) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (totalItems === 0) return null;

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalItems);

    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
            pageNumbers.push(i);
        } else if (pageNumbers[pageNumbers.length - 1] !== '...') {
            pageNumbers.push('...');
        }
    }

    return (
        <div className="flex items-center justify-between flex-wrap gap-3 px-2 py-3">
            <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-gray-600">
                    Showing <span className="font-medium text-gray-900">{start}</span>–
                    <span className="font-medium text-gray-900">{end}</span> of{' '}
                    <span className="font-medium text-gray-900">{totalItems}</span>
                </p>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 whitespace-nowrap">Rows per page</label>
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                {pageNumbers.map((p, idx) =>
                    p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-sm text-gray-400">…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`min-w-[2rem] px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                p === currentPage
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-50 border border-gray-300'
                            }`}
                        >
                            {p}
                        </button>
                    )
                )}
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
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

const Disbursements = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({ cashAdvances: [], liquidations: [], reimbursements: [] });
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [actionOpen, setActionOpen] = useState(false);
    const [actionType, setActionType] = useState('release'); // 'release' or 'reject'
    const [remarks, setRemarks] = useState('');
    const [notification, setNotification] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('approved');
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState({ cashAdvances: 1, liquidations: 1, reimbursements: 1 });

    const tabKeyMap = { 0: 'cashAdvances', 1: 'liquidations', 2: 'reimbursements' };

    const fetchPendingDisbursements = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/disbursements/pending');
            if (res.data.success) {
                setData(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching pending disbursements:', error);
            setNotification({ message: 'Failed to load pending disbursements', severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPendingDisbursements();
    }, [fetchPendingDisbursements]);

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
        if (!selectedRequest) {
            console.error('handleAction called with no selectedRequest');
            setNotification({ message: 'No request selected. Please try again.', severity: 'error' });
            return;
        }

        try {
            const typeMap = { 0: 'cash-advance', 1: 'liquidation', 2: 'reimbursement' };
            const res = await api.post('/disbursements/process', {
                type: typeMap[activeTab],
                id: selectedRequest.id,
                action: actionType,
                remarks: remarks
            });

            if (res.data.success) {
                setNotification({
                    message: `Request ${actionType === 'release' ? 'released' : 'rejected'} successfully`,
                    severity: 'success'
                });
                setActionOpen(false);
                setRemarks('');
                setSelectedRequest(null);
                fetchPendingDisbursements();
                setTimeout(() => setNotification(null), 3000);
            } else {
                // Backend responded but explicitly signaled failure (e.g. status already changed)
                console.error('Disbursement action failed:', res.data);
                setNotification({
                    message: res.data?.message || 'Error processing action',
                    severity: 'error'
                });
            }
        } catch (error) {
            console.error('Error processing action:', error?.response?.data || error);
            setNotification({
                message: error?.response?.data?.message || 'Error processing action',
                severity: 'error'
            });
        }
    };

    const renderViewForm = () => {
        if (!selectedRequest) return null;
        if (activeTab === 0) return <CashAdvanceForm editData={selectedRequest} viewOnly />;
        if (activeTab === 1) return <LiquidationForm editData={selectedRequest} viewOnly />;
        if (activeTab === 2) return <ReimbursementForm editData={selectedRequest} viewOnly />;
        return null;
    };

    const getStatusBadge = (status) => {
        if (status === 'approved') return 'bg-yellow-100 text-yellow-800';
        if (status === 'released') return 'bg-green-100 text-green-800';
        return 'bg-red-100 text-red-800';
    };

    const getStatusText = (status) => {
        if (status === 'approved') return 'Pending Release';
        if (status === 'released') return 'Released';
        return 'Rejected';
    };

    const handleTabChange = (index) => {
        setActiveTab(index);
        setSearchTerm('');
        setPage(prev => ({ ...prev, [tabKeyMap[index]]: 1 }));
    };

    const handlePageSizeChange = (newSize) => {
        setPageSize(newSize);
        setPage({ cashAdvances: 1, liquidations: 1, reimbursements: 1 });
    };

    const handleStatusFilterChange = (status) => {
        setStatusFilter(status);
        setPage({ cashAdvances: 1, liquidations: 1, reimbursements: 1 });
    };

    // Count of items pending release (status === 'approved'), per tab — used for the active tab's badge
    const pendingCounts = useMemo(() => ({
        cashAdvances: data.cashAdvances.filter(i => (i.status || '').toLowerCase() === 'approved').length,
        liquidations: data.liquidations.filter(i => (i.status || '').toLowerCase() === 'approved').length,
        reimbursements: data.reimbursements.filter(i => (i.status || '').toLowerCase() === 'approved').length,
    }), [data]);

    // Derive available statuses dynamically from the ACTIVE TAB's data only,
    // so the pill bar reflects what's actually in the tab you're viewing
    const availableStatuses = useMemo(() => {
        const activeItems = data[tabKeyMap[activeTab]] || [];
        const statusSet = new Set(activeItems.map(item => (item.status || '').toLowerCase()).filter(Boolean));
        // Preferred display order
        const order = ['approved', 'released', 'rejected'];
        const sorted = order.filter(s => statusSet.has(s));
        // Append any statuses not in the preferred order
        statusSet.forEach(s => { if (!order.includes(s)) sorted.push(s); });
        return sorted;
    }, [data, activeTab]);

    // Auto-correct statusFilter for the active tab: default to "Pending Release" if that
    // tab has any approved items, otherwise fall back to "All Requests"
    useEffect(() => {
        const activeTabPendingCount = pendingCounts[tabKeyMap[activeTab]];
        if (statusFilter === 'approved' && activeTabPendingCount === 0 && availableStatuses.length > 0) {
            setStatusFilter('all');
        }
    }, [activeTab, pendingCounts, availableStatuses, statusFilter]);

    const applyStatusFilter = useCallback((items) => {
        if (statusFilter === 'all') return items;
        return items.filter(item => (item.status || '').toLowerCase() === statusFilter);
    }, [statusFilter]);

    // Filtered lists — search by ref number, requester, purpose, or department
    const filteredCashAdvances = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return applyStatusFilter(data.cashAdvances).filter(item =>
            !searchTerm ||
            (item.advance_number || '').toLowerCase().includes(q) ||
            (item.requested_by || '').toLowerCase().includes(q) ||
            (item.purpose || '').toLowerCase().includes(q) ||
            (item.department_name || '').toLowerCase().includes(q)
        );
    }, [data.cashAdvances, searchTerm, applyStatusFilter]);

    const filteredLiquidations = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return applyStatusFilter(data.liquidations).filter(item =>
            !searchTerm ||
            (item.liquidation_number || '').toLowerCase().includes(q) ||
            (item.submitted_by || '').toLowerCase().includes(q) ||
            (item.purpose || '').toLowerCase().includes(q) ||
            (item.department_name || '').toLowerCase().includes(q)
        );
    }, [data.liquidations, searchTerm, applyStatusFilter]);

    const filteredReimbursements = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return applyStatusFilter(data.reimbursements).filter(item =>
            !searchTerm ||
            (item.reimbursement_number || '').toLowerCase().includes(q) ||
            (item.submitted_by || '').toLowerCase().includes(q) ||
            (item.purpose || '').toLowerCase().includes(q) ||
            (item.department_name || '').toLowerCase().includes(q)
        );
    }, [data.reimbursements, searchTerm, applyStatusFilter]);

    // Paginated slices
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

    // Clamp pages when data shrinks
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
    const activeTabData = data[tabKeyMap[activeTab]] || [];

    const stats = useMemo(() => ({
        pending: activeTabData.filter(item => item.status === 'approved').length,
        released: activeTabData.filter(item => item.status === 'released').length,
        rejected: activeTabData.filter(item => item.status === 'rejected').length,
    }), [activeTabData]);

    const tabs = [
        'Cash Advances',
        'Liquidations',
        'Reimbursements'
    ];

    const renderTable = (items, filteredTotal, tabKey) => (
        <div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">Reference No.</th>
                        <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">Requested By</th>
                        <th className="px-4 py-3 w-1/12 text-left text-sm font-semibold text-gray-700">Department</th>
                        <th className="px-4 py-3 w-1/12 text-left text-sm font-semibold text-gray-700">Amount</th>
                        <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 w-2/12 text-left text-sm font-semibold text-gray-700">Approved By</th>
                        <th className="px-4 py-3 w-2/12 text-center text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan="8" className="py-10 text-center text-gray-400 text-sm">
                                {searchTerm
                                    ? 'No results found.'
                                    : statusFilter === 'all'
                                        ? 'No results found.'
                                        : 'No results found.'}
                            </td>
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
                                <td className="px-4 py-4 text-sm font-semibold text-left text-gray-900">
                                    ₱{parseFloat(row.calculated_amount || row.requested_amount || row.total_actual_amount || row.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusBadge(row.status)}`}>
                                        {getStatusText(row.status)}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-700">{row.approved_by || '—'}</td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => handleView(row)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        {row.status === 'approved' && (
                                            <>
                                                <button
                                                    onClick={() => { setSelectedRequest(row); setActionType('release'); setActionOpen(true); }}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                    title="Release Funds"
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
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
            <Pagination
                currentPage={page[tabKey]}
                totalItems={filteredTotal}
                pageSize={pageSize}
                onPageChange={(p) => setPage(prev => ({ ...prev, [tabKey]: p }))}
                onPageSizeChange={handlePageSizeChange}
            />
        </div>
    );


    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Disbursements 💸</h1>
                <p className="text-gray-600">Release and manage approved disbursement requests</p>
            </div>

            {notification && (
                <div className="mb-6">
                    <Alert severity={notification.severity} onClose={() => setNotification(null)}>
                        {notification.message}
                    </Alert>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                <Card className="!bg-orange-50 border border-orange-200 text-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-orange-800 text-sm font-semibold mb-2">Pending Request</p>
                                <h3 className="text-4xl text-orange-800 font-bold">{stats.pending}</h3>
                            </div>
                            <Clock className="w-12 h-12 text-orange-800 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="!bg-green-50 border border-green-200 text-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-700 text-sm font-semibold mb-2">Released</p>
                                <h3 className="text-4xl text-green-700 font-bold">{stats.released}</h3>
                            </div>
                            <CheckCircle className="w-12 h-12 text-green-700 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="!bg-red-50 border border-red-200 text-white shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-red-700 text-sm font-semibold mb-2">Rejected</p>
                                <h3 className="text-4xl text-red-700 font-bold">{stats.rejected}</h3>
                            </div>
                            <XCircle className="w-12 h-12 text-red-700 opacity-50" />
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
                                onClick={() => handleTabChange(index)}
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
                    <Loading message="Loading disbursements..." />
                ) : (
                    <div className="p-6 space-y-4">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search by reference number, requester, department, or purpose..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setPage(prev => ({ ...prev, [tabKeyMap[activeTab]]: 1 }));
                                }}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm outline-none transition-colors"
                            />
                        </div>

                        {/* Status Filter Bar */}
                        <div className="flex flex-wrap gap-2">
                            {/* All Requests pill */}
                            <button
                                onClick={() => handleStatusFilterChange('all')}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                                    statusFilter === 'all'
                                        ? 'bg-gray-800 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                All Requests
                            </button>
                            {availableStatuses.map((status) => {
                                const isActive = statusFilter === status;
                                const isPendingRelease = status === 'approved';
                                const count = isPendingRelease ? pendingCounts[tabKeyMap[activeTab]] : null;
                                const label = getStatusText(status);

                                const colorMap = {
                                    approved: isActive
                                        ? 'bg-yellow-500 text-white'
                                        : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
                                    released: isActive
                                        ? 'bg-green-600 text-white'
                                        : 'bg-green-50 text-green-700 hover:bg-green-100',
                                    rejected: isActive
                                        ? 'bg-red-600 text-white'
                                        : 'bg-red-50 text-red-700 hover:bg-red-100',
                                };
                                const colorClass = colorMap[status] || (isActive ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200');

                                return (
                                    <button
                                        key={status}
                                        onClick={() => handleStatusFilterChange(status)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${colorClass}`}
                                    >
                                        {label}
                                        {isPendingRelease && count > 0 && (
                                            <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-bold ${
                                                isActive ? 'bg-white/25 text-white' : 'bg-yellow-500 text-white'
                                            }`}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {activeTab === 0 && renderTable(paginatedCashAdvances, filteredCashAdvances.length, 'cashAdvances')}
                        {activeTab === 1 && renderTable(paginatedLiquidations, filteredLiquidations.length, 'liquidations')}
                        {activeTab === 2 && renderTable(paginatedReimbursements, filteredReimbursements.length, 'reimbursements')}
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
                        {selectedRequest?.status === 'approved' && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full flex items-center gap-1">
                                <Hourglass className="w-3 h-3" />
                                Pending
                            </span>
                        )}
                    </div>
                }
                maxWidth="xl"
                actions={
                    <>
                        <Button variant="secondary" onClick={() => setViewOpen(false)}>Close</Button>
                        {selectedRequest?.status === 'approved' && (
                            <>
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
                                    onClick={() => { setViewOpen(false); setActionType('release'); setActionOpen(true); }}
                                >
                                    Release Funds
                                </Button>
                            </>
                        )}
                    </>
                }
            >
                {selectedRequest && <RequestTimeline request={selectedRequest} />}
                {renderViewForm()}
            </Modal>

            {/* Action Confirmation Modal */}
            <Modal
                open={actionOpen}
                onClose={() => setActionOpen(false)}
                title={actionType === 'release' ? 'Release Funds' : 'Reject Request'}
                maxWidth="sm"
                actions={
                    <>
                        <Button variant="secondary" onClick={() => setActionOpen(false)}>Cancel</Button>
                        <Button
                            variant={actionType === 'release' ? 'success' : 'danger'}
                            startIcon={actionType === 'release' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            onClick={handleAction}
                            disabled={actionType === 'reject' && !remarks.trim()}
                        >
                            {actionType === 'release' ? 'Confirm Release' : 'Confirm Rejection'}
                        </Button>
                    </>
                }
            >
                <p className="text-gray-700 mb-4">
                    {actionType === 'release'
                        ? 'Are you sure you want to release funds for this request?'
                        : 'Are you sure you want to reject this request? Please provide a reason below.'}
                </p>
                {actionType === 'reject' && (
                    <Input
                        label="Reason for Rejection"
                        multiline
                        fullWidth
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

export default Disbursements;