import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, RotateCw, History, User, Shield, Paperclip, X,
  ChevronDown, ChevronUp
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
    fetchLogs(newPage + 1, pagination.limit);
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

    return (
      <div className="flex flex-wrap gap-2">
        {Object.entries(parsed).map(([key, value]) => (
          <span
            key={key}
            className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700"
          >
            {key}: {value ?? '—'}
          </span>
        ))}
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
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <Loading message="Loading audit logs..." />
        ) : (
          <>
            <div className="overflow-x-auto">
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
                              <button className="text-gray-400">
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
            {logs.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.page || 1) - 1) * pagination.limit + 1} to{' '}
                  {Math.min((pagination.page || 1) * pagination.limit, pagination.total)} of {pagination.total} entries
                </div>
                <div className="flex items-center gap-4">
                  <select
                    value={pagination.limit}
                    onChange={(e) => handleRowsPerPageChange(parseInt(e.target.value, 10))}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={(pagination.page || 1) <= 1}
                      onClick={() => handlePageChange((pagination.page || 1) - 2)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={(pagination.page || 1) >= pagination.totalPages}
                      onClick={() => handlePageChange(pagination.page || 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default AuditLogs;
