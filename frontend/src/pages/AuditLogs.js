import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, RotateCw, History, User, Shield, Paperclip, X,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../api';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Loading } from '../components/ui/Loading';

// Action label mapping for cleaner display
const actionLabels = {
  create_cash_advance: 'Created Cash Advance',
  update_cash_advance: 'Updated Cash Advance',
  delete_cash_advance: 'Deleted Cash Advance',
  cancel_cash_advance: 'Cancelled Cash Advance',
  create_liquidation: 'Created Liquidation',
  update_liquidation: 'Updated Liquidation',
  delete_liquidation: 'Deleted Liquidation',
  cancel_liquidation: 'Cancelled Liquidation',
  create_reimbursement: 'Created Reimbursement',
  update_reimbursement: 'Updated Reimbursement',
  delete_reimbursement: 'Deleted Reimbursement',
  cancel_reimbursement: 'Cancelled Reimbursement',
  add_attachment: 'Added Attachment',
  delete_attachment: 'Deleted Attachment',
  approve_request: 'Approved Request',
  reject_request: 'Rejected Request',
  release_funds: 'Released Funds',
  login: 'Logged In',
  login_failed: 'Login Failed',
  register: 'Registered Account',
  update_profile: 'Updated Profile',
};

// Color chips for actions
const getActionColor = (action) => {
  if (!action) return 'bg-gray-100 text-gray-700';
  if (action.startsWith('create')) return 'bg-green-100 text-green-800';
  if (action.startsWith('update')) return 'bg-blue-100 text-blue-800';
  if (action.startsWith('delete')) return 'bg-red-100 text-red-800';
  if (action.startsWith('cancel')) return 'bg-yellow-100 text-yellow-800';
  if (action.includes('attachment') && action.includes('add')) return 'bg-indigo-100 text-indigo-800';
  if (action.includes('attachment') && action.includes('delete')) return 'bg-pink-100 text-pink-800';
  if (action.includes('approve')) return 'bg-green-100 text-green-800';
  if (action.includes('reject')) return 'bg-red-100 text-red-800';
  if (action.includes('login')) return 'bg-purple-100 text-purple-800';
  return 'bg-gray-100 text-gray-700';
};

// Entity label mapping
const entityLabels = {
  cash_advances: 'Cash Advance',
  cash_advance_attachments: 'CA Attachment',
  liquidations: 'Liquidation',
  liquidation_attachments: 'Liq. Attachment',
  reimbursements: 'Reimbursement',
  reimbursement_attachments: 'Reimb. Attachment',
  users: 'User',
};

const formatDateTime = (d) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return dt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '';
  }
};

// Reusable pagination control (mirrors Approvals.js / UserManagement.js)
const Pagination = ({ currentPage, totalItems, pageSize, onPageChange, onPageSizeChange, disabled }) => {
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
            disabled={disabled}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white disabled:opacity-50"
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
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || disabled}
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
              type="button"
              key={p}
              onClick={() => onPageChange(p)}
              disabled={disabled}
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
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || disabled}
          className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 0, limit: 25, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ action: '', entity: '', userId: '', search: '', startDate: '', endDate: '' });
  const [filterOptions, setFilterOptions] = useState({ actions: [], entities: [], users: [] });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  const fetchFilters = useCallback(async () => {
    try {
      const res = await api.get('/audit-logs/filters');
      if (res.data.success) {
        setFilterOptions(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  }, []);

  const fetchLogs = useCallback(async (pageNum = 1, pageLimit = 25) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', pageNum);
      params.append('limit', pageLimit);
      if (filters.action) params.append('action', filters.action);
      if (filters.entity) params.append('entity', filters.entity);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.search) params.append('search', filters.search);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const res = await api.get(`/audit-logs?${params.toString()}`);
      if (res.data.success) {
        setLogs(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchLogs(1, pagination.limit);
  }, [filters]);

  const handlePageChange = (newPage) => {
    fetchLogs(newPage, pagination.limit);
  };

  const handleRowsPerPageChange = (newLimit) => {
    fetchLogs(1, newLimit);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({ action: '', entity: '', userId: '', search: '', startDate: '', endDate: '' });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const renderDetails = (details) => {
    if (!details) return <span className="text-gray-500">—</span>;
    let parsed = details;
    if (typeof details === 'string') {
      try {
        parsed = JSON.parse(details);
      } catch {
        return <span className="text-gray-600">{details}</span>;
      }
    }

    // Pull out the special-cased keys we render with custom UI; everything
    // else falls back to simple key: value chips.
    const { editedBy, changes, reason, ...rest } = parsed;

    const scalarEntries = Object.entries(rest).filter(
      ([, value]) => value === null || typeof value !== 'object'
    );
    const otherObjectEntries = Object.entries(rest).filter(
      ([, value]) => value !== null && typeof value === 'object'
    );

    return (
      <div className="space-y-3">
        {/* Simple scalar fields */}
        {scalarEntries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {scalarEntries.map(([key, value]) => (
              <span
                key={key}
                className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700"
              >
                {key}: {value === null || value === undefined ? '—' : String(value)}
              </span>
            ))}
          </div>
        )}

        {/* Who made the change */}
        {editedBy && (
          <div className="text-xs text-gray-700">
            <span className="font-semibold">Edited by:</span>{' '}
            {editedBy.email || editedBy.name || (editedBy.id != null ? `User #${editedBy.id}` : 'Unknown')}
            {editedBy.role ? ` (${editedBy.role})` : ''}
          </div>
        )}

        {/* Reason for the edit */}
        {reason && (
          <div className="text-xs text-gray-700">
            <span className="font-semibold">Reason:</span> {reason}
          </div>
        )}

        {/* Before/after diff table */}
        {changes && Object.keys(changes).length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">Changes:</p>
            <table className="text-xs border border-gray-200 rounded overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold text-gray-600">Field</th>
                  <th className="px-2 py-1 text-left font-semibold text-gray-600">From</th>
                  <th className="px-2 py-1 text-left font-semibold text-gray-600">To</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(changes).map(([field, diff]) => (
                  <tr key={field} className="border-t border-gray-200">
                    <td className="px-2 py-1 font-mono text-gray-700">{field}</td>
                    <td className="px-2 py-1 text-red-600">{diff?.from ?? '—'}</td>
                    <td className="px-2 py-1 text-green-700">{diff?.to ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Fallback for any other nested objects we didn't special-case */}
        {otherObjectEntries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {otherObjectEntries.map(([key, value]) => (
              <span
                key={key}
                className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700 font-mono"
              >
                {key}: {JSON.stringify(value)}
              </span>
            ))}
          </div>
        )}

        {scalarEntries.length === 0 && !editedBy && !reason && !changes && otherObjectEntries.length === 0 && (
          <span className="text-gray-500">—</span>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Audit Logs 🔍</h1>
        <p className="text-gray-600">Track all system activities, changes, and user actions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <Card className="!bg-purple-50 border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-800 text-sm font-semibold mb-2">Total Entries</p>
                <h3 className="text-4xl text-purple-800 font-bold">{pagination.total.toLocaleString()}</h3>
              </div>
              <History className="w-12 h-12 text-purple-800 opacity-30" />
            </div>
          </CardContent>
        </Card>
        <Card className="!bg-blue-50 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-800 text-sm font-semibold mb-2">Action Types</p>
                <h3 className="text-4xl text-blue-800 font-bold">{filterOptions.actions.length}</h3>
              </div>
              <Shield className="w-12 h-12 text-blue-800 opacity-30" />
            </div>
          </CardContent>
        </Card>
        <Card className="!bg-pink-50 border border-pink-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-800 text-sm font-semibold mb-2">Entities Tracked</p>
                <h3 className="text-4xl text-pink-800 font-bold">{filterOptions.entities.length}</h3>
              </div>
              <Paperclip className="w-12 h-12 text-pink-800 opacity-30" />
            </div>
          </CardContent>
        </Card>
        <Card className="!bg-teal-50 border border-teal-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-800 text-sm font-semibold mb-2">Active Users</p>
                <h3 className="text-4xl text-teal-800 font-bold">{filterOptions.users.length}</h3>
              </div>
              <User className="w-12 h-12 text-teal-800 opacity-30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {filters.search && (
                <button
                  type="button"
                  onClick={() => handleFilterChange('search', '')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters ? 'primary' : 'secondary'}
              size="md"
              startIcon={<Filter className="w-4 h-4" />}
              onClick={() => setShowFilters(!showFilters)}
              className={hasActiveFilters && !showFilters ? 'border-blue-600 text-blue-600' : ''}
            >
              Filters {hasActiveFilters ? `(${Object.values(filters).filter(v => v !== '').length})` : ''}
            </Button>
            <button
              type="button"
              onClick={() => fetchLogs(pagination.page, pagination.limit)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                startIcon={<X className="w-4 h-4" />}
                onClick={clearFilters}
                className="text-red-600 hover:bg-red-50"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Expandable Filters Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4 pt-4 border-t border-gray-200">
              <div>
                <Select
                  label="Action"
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                >
                  <option value="">All Actions</option>
                  {filterOptions.actions.map(a => (
                    <option key={a} value={a}>{actionLabels[a] || a}</option>
                  ))}
                </Select>
              </div>
              <div>
              <Select
                label="Entity"
                value={filters.entity}
                onChange={(e) => handleFilterChange('entity', e.target.value)}
              >
                <option value="">All Entities</option>
                {filterOptions.entities.map(e => (
                  <option key={e} value={e}>{entityLabels[e] || e}</option>
                ))}
              </Select>
              </div>
              <div>
              <Select
                label="User"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
              >
                <option value="">All Users</option>
                {filterOptions.users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
              </div>
              <div>
              <Input
                label="From"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
              <Input
                label="To"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {loading && logs.length === 0 ? (
          <Loading message="Loading audit logs..." />
        ) : (
          <>
            <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-sm font-bold text-gray-700 w-10"></th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Timestamp</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">User</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Action</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Entity</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Entity ID</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center">
                        <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-900 font-medium mb-1">No audit log entries found</p>
                        <p className="text-gray-500 text-sm">
                          {hasActiveFilters ? 'Try adjusting your filters' : 'Activity will appear here when actions are performed'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const isExpanded = expandedRow === log.id;

                      return (
                        <React.Fragment key={log.id}>
                          <tr
                            className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                              isExpanded ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                          >
                            <td className="px-3 py-3">
                              <button type="button" className="text-gray-400">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                              {formatDateTime(log.created_at)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900 max-w-[160px] truncate" title={log.user_email || ''}>
                                {log.user_name || log.user_email || `User #${log.user_id}` || 'System'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${getActionColor(log.action)}`}>
                                {actionLabels[log.action] || log.action}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {entityLabels[log.entity] || log.entity || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-600">
                              {log.entity_id || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-400">
                              {log.ip || '—'}
                            </td>
                          </tr>

                          {/* Expanded Details Row */}
                          {isExpanded && (
                            <tr className="bg-gray-50">
                              <td colSpan="7" className="px-8 py-4">
                                <div>
                                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                                    Details
                                  </p>
                                  {renderDetails(log.details)}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={pagination.page || 1}
              totalItems={pagination.total}
              pageSize={pagination.limit}
              onPageChange={handlePageChange}
              onPageSizeChange={handleRowsPerPageChange}
              disabled={loading}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default AuditLogs;