import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  DollarSign, Receipt, Coins, TrendingUp, 
  Clock, CheckCircle, XCircle, Eye,
  Users, PieChart, BarChart3
} from 'lucide-react';
import AttachmentViewer from '../components/AttachmentViewer';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Loading } from '../components/ui/Loading';

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.name || user?.username || user?.email || 'Manager';

  // Sample pending approvals data
  const [pendingApprovals] = useState([
    {
      id: 1,
      type: 'Cash Advance',
      refNumber: 'CA-202512-0045',
      employee: 'Juan Dela Cruz',
      department: 'Operations',
      amount: 50000,
      date: '2025-12-26',
      priority: 'High'
    },
    {
      id: 2,
      type: 'Reimbursement',
      refNumber: 'RMB-202512-0033',
      employee: 'Maria Santos',
      department: 'Sales',
      amount: 8500,
      date: '2025-12-25',
      priority: 'Medium'
    },
    {
      id: 3,
      type: 'Liquidation',
      refNumber: 'LIQ-202512-0029',
      employee: 'Pedro Garcia',
      department: 'Operations',
      amount: 45000,
      date: '2025-12-24',
      priority: 'Medium'
    },
    {
      id: 4,
      type: 'Cash Advance',
      refNumber: 'CA-202512-0046',
      employee: 'Ana Lopez',
      department: 'Marketing',
      amount: 30000,
      date: '2025-12-26',
      priority: 'Low'
    },
  ]);

  const handleApprove = (id) => {
    console.log('Approve request:', id);
    // TODO: Implement approve logic
  };

  const handleReject = (id) => {
    console.log('Reject request:', id);
    // TODO: Implement reject logic
  };

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const handleView = (id) => {
    (async () => {
      try {
        setViewLoading(true);
        const request = pendingApprovals.find(p => p.id === id) || {};
        let response;
        if (request.type === 'Cash Advance') {
          response = await api.get(`/cash-advances/${id}`);
        } else if (request.type === 'Reimbursement') {
          response = await api.get(`/reimbursements/${id}`);
        } else if (request.type === 'Liquidation') {
          response = await api.get(`/liquidations/${id}`);
        }

        if (response && response.data && response.data.success) {
          setViewData(response.data.data);
        } else {
          setViewData(request);
        }
        setViewModalOpen(true);
      } catch (err) {
        console.error('Error fetching request details for view', err);
        setViewData(pendingApprovals.find(p => p.id === id) || { id });
        setViewModalOpen(true);
      } finally {
        setViewLoading(false);
      }
    })();
  };

  const handleCloseView = () => {
    setViewModalOpen(false);
    setViewData(null);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-700';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'Low':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRequestIcon = (type) => {
    switch (type) {
      case 'Cash Advance':
        return <DollarSign className="w-5 h-5 text-primary-600" />;
      case 'Liquidation':
        return <Receipt className="w-5 h-5 text-pink-600" />;
      case 'Reimbursement':
        return <Coins className="w-5 h-5 text-cyan-600" />;
      default:
        return null;
    }
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm mb-2">Pending Approvals</p>
                <h3 className="text-4xl font-bold">24</h3>
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
                <h3 className="text-4xl font-bold">156</h3>
              </div>
              <CheckCircle className="w-12 h-12 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm mb-2">Team Members</p>
                <h3 className="text-4xl font-bold">32</h3>
              </div>
              <Users className="w-12 h-12 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm mb-2">Total Disbursed</p>
                <h3 className="text-4xl font-bold">₱2.4M</h3>
              </div>
              <TrendingUp className="w-12 h-12 opacity-30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Request Modal */}
      <Modal
        open={viewModalOpen}
        onClose={handleCloseView}
        title="Request Details"
        maxWidth="lg"
      >
        {viewLoading ? (
          <Loading message="Loading details..." />
        ) : viewData ? (
          <div>
            <h3 className="text-lg font-semibold mb-2">
              {viewData.advance_number || viewData.reimbursement_number || viewData.liquidation_number || `Request #${viewData.id}`}
            </h3>
            <p className="text-gray-600 mb-4">{viewData.remarks || viewData.purpose || ''}</p>
            <h4 className="text-md font-semibold mb-2">Attachments</h4>
            <AttachmentViewer attachments={viewData.attachments} />
          </div>
        ) : (
          <p className="text-gray-600">No data available</p>
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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Priority</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingApprovals.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors">
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
                          {request.employee.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-900">{request.employee}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{request.department}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        ₱{request.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600">{request.date}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(request.priority)}`}>
                        {request.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleView(request.id)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats and Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Department Breakdown */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Department Breakdown</h2>
            <ul className="space-y-4">
              <li className="flex items-center gap-4 pb-4 border-b border-gray-200">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <PieChart className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Operations</p>
                  <p className="text-sm text-gray-600">12 pending requests</p>
                </div>
                <span className="text-lg font-bold text-blue-600">₱850K</span>
              </li>
              <li className="flex items-center gap-4 pb-4 border-b border-gray-200">
                <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <PieChart className="w-5 h-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Sales</p>
                  <p className="text-sm text-gray-600">8 pending requests</p>
                </div>
                <span className="text-lg font-bold text-yellow-600">₱620K</span>
              </li>
              <li className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <PieChart className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Marketing</p>
                  <p className="text-sm text-gray-600">4 pending requests</p>
                </div>
                <span className="text-lg font-bold text-green-600">₱450K</span>
              </li>
            </ul>
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
                startIcon={<Users className="w-5 h-5" />}
                onClick={() => navigate('/user-management')}
                className="py-3 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
              >
                Team Management
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagerDashboard;
