import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  DollarSign, Receipt, Coins, TrendingUp,
  CreditCard, ShieldCheck, Clock, CheckCircle,
  FileCheck
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

const AccountingDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const displayName = user?.name || user?.username || user?.email || 'Accounting';
  const [activeTab, setActiveTab] = useState(0);

  // Sample data for processing
  const [pendingDisbursements] = useState([
    {
      id: 1,
      type: 'Cash Advance',
      refNumber: 'CA-202512-0045',
      employee: 'Juan Dela Cruz',
      department: 'Operations',
      amount: 50000,
      status: 'Approved - For Disbursement',
      approvedBy: 'Manager A',
      approvedDate: '2025-12-26'
    },
    {
      id: 2,
      type: 'Reimbursement',
      refNumber: 'RMB-202512-0033',
      employee: 'Maria Santos',
      department: 'Sales',
      amount: 8500,
      status: 'Approved - For Disbursement',
      approvedBy: 'Manager B',
      approvedDate: '2025-12-25'
    },
    {
      id: 3,
      type: 'Liquidation',
      refNumber: 'LIQ-202512-0029',
      employee: 'Pedro Garcia',
      department: 'Operations',
      amount: 1750,
      status: 'For Verification',
      approvedBy: 'Manager A',
      approvedDate: '2025-12-24'
    },
  ]);

  const [recentTransactions] = useState([
    { refNumber: 'CA-202512-0044', amount: 75000, status: 'Disbursed', date: '2025-12-26' },
    { refNumber: 'RMB-202512-0032', amount: 3500, status: 'Disbursed', date: '2025-12-26' },
    { refNumber: 'LIQ-202512-0028', amount: 2250, status: 'Processed', date: '2025-12-25' },
    { refNumber: 'CA-202512-0043', amount: 60000, status: 'Disbursed', date: '2025-12-25' },
  ]);

  const handleProcess = (id) => {
    console.log('Process disbursement:', id);
    // TODO: Implement process logic
  };

  const handleVerify = (id) => {
    console.log('Verify liquidation:', id);
    // TODO: Implement verify logic
  };

  const getStatusColor = (status) => {
    if (status.includes('Approved')) return 'bg-yellow-100 text-yellow-700';
    if (status.includes('Verification')) return 'bg-blue-100 text-blue-700';
    if (status.includes('Disbursed')) return 'bg-green-100 text-green-700';
    if (status.includes('Processed')) return 'bg-indigo-100 text-indigo-700';
    return 'bg-gray-100 text-gray-700';
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

  const tabs = ['For Disbursement', 'For Verification', 'Recent Transactions'];

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Accounting Dashboard 💰
        </h1>
        <p className="text-gray-600">Manage disbursements, payments, and financial reconciliation</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm mb-2">For Disbursement</p>
                <h3 className="text-4xl font-bold">18</h3>
              </div>
              <Clock className="w-12 h-12 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm mb-2">For Verification</p>
                <h3 className="text-4xl font-bold">12</h3>
              </div>
              <ShieldCheck className="w-12 h-12 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm mb-2">Processed Today</p>
                <h3 className="text-4xl font-bold">45</h3>
              </div>
              <CheckCircle className="w-12 h-12 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm mb-2">Total Disbursed</p>
                <h3 className="text-4xl font-bold">₱3.2M</h3>
              </div>
              <TrendingUp className="w-12 h-12 opacity-30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Card>
        {/* Tab Headers */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {tabs.map((tab, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
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

        <CardContent className="p-6">
          {/* For Disbursement Tab */}
          {activeTab === 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Approved Requests - Ready for Disbursement
                </h2>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full">
                  {pendingDisbursements.filter(p => p.status.includes('Approved')).length} items
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reference No.</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Approved By</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pendingDisbursements.filter(p => p.status.includes('Approved')).map((request) => (
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
                          <span className="text-sm text-gray-900">{request.employee}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-600">{request.department}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-sm font-semibold text-green-600">
                            ₱{request.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-600">{request.approvedBy}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Button
                            variant="success"
                            size="sm"
                            startIcon={<CreditCard className="w-4 h-4" />}
                            onClick={() => handleProcess(request.id)}
                          >
                            Process
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* For Verification Tab */}
          {activeTab === 1 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Liquidations - For Verification
                </h2>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                  {pendingDisbursements.filter(p => p.status.includes('Verification')).length} items
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reference No.</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pendingDisbursements.filter(p => p.status.includes('Verification')).map((request) => (
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
                          <span className="text-sm text-gray-900">{request.employee}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            ₱{request.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Button
                            variant="primary"
                            size="sm"
                            startIcon={<FileCheck className="w-4 h-4" />}
                            onClick={() => handleVerify(request.id)}
                          >
                            Verify
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Transactions Tab */}
          {activeTab === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Recent Transactions</h2>
              <ul className="space-y-3">
                {recentTransactions.map((transaction, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-mono text-sm font-medium text-gray-900">{transaction.refNumber}</p>
                        <p className="text-xs text-gray-600">{transaction.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        ₱{transaction.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountingDashboard;
