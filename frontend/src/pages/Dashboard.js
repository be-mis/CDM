import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  LayoutDashboard, FileText, TrendingUp, Settings, Menu, X, LogOut,
  Users, History, Upload, Table, DollarSign, ReceiptText, ClipboardList,
  CheckSquare, Coins, User as UserIcon, Star, HandCoins
} from 'lucide-react';

import FileUpload from '../components/FileUpload';
import CashAdvanceForm from '../components/CashAdvanceForm';
import LiquidationForm from '../components/LiquidationForm';
import ReimbursementForm from '../components/ReimbursementForm';
import ExcelTool from './ExcelTool';
import EmployeeDashboard from './EmployeeDashboard';
import ManagerDashboard from './ManagerDashboard';
import AccountingDashboard from './AccountingDashboard';
import MyRequests from './MyRequests';
import Approvals from './Approvals';
import Disbursements from './Disbursements';
import AuditLogs from './AuditLogs';
import Profile from './Profile';
import PaymentRequirementModal from '../components/PaymentRequirementModal';
import Alert from '../components/ui/Alert';
import { InlineAlert } from '../components/ui/Alert';
import Tooltip from '../components/ui/Tooltip';
import { List } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUser } = useAuth();
  const displayName = user?.name || user?.username || user?.email || 'User';

  useEffect(() => {
    const refreshProfile = async () => {
      if (!user) return;
      try {
        const res = await api.get('/auth/profile');
        if (res.data.user) {
          const newUser = res.data.user;
          if (JSON.stringify(newUser) !== JSON.stringify(user)) {
            updateUser(newUser);
          }
        }
      } catch (e) {
        console.error('Failed to refresh profile', e);
      }
    };
    refreshProfile();
  }, []);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Sync currentView with URL
  useEffect(() => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/') {
      setCurrentView('dashboard');
    } else if (path.includes('accounting-dashboard')) {
      setCurrentView('accounting-dashboard');
    } else if (path.includes('my-requests')) {
      setCurrentView('my-requests');
    } else if (path.includes('cash-advance')) {
      setCurrentView('cash-advance');
    } else if (path.includes('liquidation')) {
      setCurrentView('liquidation');
    } else if (path.includes('reimbursement')) {
      setCurrentView('reimbursement');
    } else if (path.includes('excel')) {
      setCurrentView('excel');
    } else if (path.includes('reports')) {
      setCurrentView('reports');
    } else if (path.includes('settings')) {
      setCurrentView('settings');
    } else if (path.includes('user-management')) {
      setCurrentView('usermanagement');
    } else if (path.includes('audit-logs')) {
      setCurrentView('auditlogs');
    } else if (path.includes('approvals')) {
      setCurrentView('approvals');
    } else if (path.includes('disbursements')) {
      setCurrentView('disbursements');
    } else if (path.includes('profile')) {
      setCurrentView('profile');
    } else if (path.includes('reports')) {
      setCurrentView('reports');
    }
    setMobileOpen(false);
  }, [location.pathname]);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Menu Items
  const allMenuItems = [
    { text: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, view: 'dashboard', path: '/dashboard', key: 'dashboard' },
    { text: 'Accounting Dashboard', icon: <TrendingUp className="w-5 h-5" />, view: 'accounting-dashboard', path: '/accounting-dashboard', key: 'accounting-dashboard', adminOnly: true },
    { text: 'My Requests', icon: <ClipboardList className="w-5 h-5" />, view: 'my-requests', path: '/my-requests', key: 'my-requests' },
    { text: 'Cash Advance Form', icon: <HandCoins className="w-5 h-5" />, view: 'cash-advance', path: '/cash-advance', key: 'cash-advance' },
    { text: 'Liquidation Form', icon: <ReceiptText className="w-5 h-5" />, view: 'liquidation', path: '/liquidation', key: 'liquidation' },
    { text: 'Reimbursement Form', icon: <Coins className="w-5 h-5" />, view: 'reimbursement', path: '/reimbursement', key: 'reimbursement' },
    { text: 'Approvals', icon: <CheckSquare className="w-5 h-5" />, view: 'approvals', path: '/approvals', key: 'approvals', approverOnly: true },
    { text: 'Disbursements', icon: <Coins className="w-5 h-5" />, view: 'disbursements', path: '/disbursements', key: 'disbursements', accountingOnly: true },
    { text: 'Profile', icon: <UserIcon className="w-5 h-5" />, view: 'profile', path: '/profile', key: 'profile' },
    { text: 'User Management', icon: <Users className="w-5 h-5" />, view: 'usermanagement', adminOnly: true, path: '/user-management', key: 'usermanagement' },
    { text: 'Audit Logs', icon: <History className="w-5 h-5" />, view: 'auditlogs', adminOnly: true, path: '/audit-logs', key: 'auditlogs' },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    if (item.approverOnly && (!user?.isApprover || user?.role === 'accounting')) return false;
    if (item.accountingOnly && user?.role !== 'accounting' && user?.role !== 'admin') return false;
    return true;
  });

  const renderCurrentView = () => {
    switch (currentView) {
      case 'my-requests':
        return <MyRequests />;

      case 'profile':
        return <Profile />;

      case 'cash-advance':
        return <CashAdvanceForm
          key={location.state?.editData?.id ?? 'new'}
          editData={location.state?.editData}
          onClose={() => navigate(location.state?.returnPath || '/my-requests')}
        />;

      case 'liquidation':
        return <LiquidationForm
          key={location.state?.editData?.id ?? 'new'}
          initialData={location.state?.cashAdvance}
          editData={location.state?.editData}
          onClose={() => navigate(location.state?.returnPath || '/my-requests')}
        />;
      case 'reimbursement':
        return <ReimbursementForm
          key={location.state?.editData?.id ?? 'new'}
          editData={location.state?.editData}
          onClose={() => navigate(location.state?.returnPath || '/my-requests')}
        />;

      case 'usermanagement':
        if (user?.role !== 'admin') {
          return (
            <InlineAlert severity="warning">
              You don't have permission to access User Management. Admin access required.
            </InlineAlert>
          );
        }
        return (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">User Management</h2>
            <p className="text-sm text-gray-600 mb-6">Manage users and permissions</p>
            <InlineAlert severity="info">
              User management functionality will be implemented here.
            </InlineAlert>
          </div>
        );

      case 'auditlogs':
        if (user?.role !== 'admin') {
          return (
            <InlineAlert severity="warning">
              You don't have permission to access Audit Logs. Admin access required.
            </InlineAlert>
          );
        }
        return <AuditLogs />;

      case 'accounting-dashboard':
        if (user?.role !== 'admin') {
          return (
            <InlineAlert severity="warning">
              You don't have permission to access Accounting Dashboard. Admin access required.
            </InlineAlert>
          );
        }
        return <AccountingDashboard />;

      case 'approvals':
        if (!user?.isApprover) {
          return (
            <InlineAlert severity="warning">
              You don't have permission to access Approvals.
            </InlineAlert>
          );
        }
        return <Approvals />;

      case 'disbursements':
        if (user?.role !== 'accounting' && user?.role !== 'admin') {
          return (
            <InlineAlert severity="warning">
              You don't have permission to access Disbursements. Accounting access required.
            </InlineAlert>
          );
        }
        return <Disbursements />;

      case 'dashboard':
      default:
        return (
          <div className="space-y-8">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 md:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">My Requests</h2>
              <EmployeeDashboard />
            </div>
            {user?.isApprover && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 md:p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Pending Approvals (Manager)</h2>
                <ManagerDashboard />
              </div>
            )}
          </div>
        );
    }
  };

  const getTitle = () => {
    if (currentView === 'accounting-dashboard') return 'Accounting Dashboard';
    if (currentView === 'profile') return 'My Profile';
    if (currentView === 'my-requests') return 'My Requests';
    if (currentView === 'cash-advance') return 'Cash Advance Request';
    if (currentView === 'liquidation') return 'Cash Advance Liquidation';
    if (currentView === 'reimbursement') return 'Reimbursement Request';
    if (currentView === 'usermanagement') return 'User Management';
    if (currentView === 'auditlogs') return 'Audit Logs';
    return 'Dashboard';
  };

  const drawer = (
    <div className="h-full flex flex-col bg-white">
      {/* Logo Section */}
      <div className="p-6 text-center border-b border-gray-200">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg mb-4 shadow-md overflow-hidden">
          <img src="/BElogo.png" alt="CMD Logo" className="w-12 h-12 object-cover" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">CMD</h2>
        <p className="text-xs text-gray-600 font-medium">Cash Disbursement Module</p>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.key}>
              <button
                
                onClick={() => { navigate(item.path, { replace: true, state: null }); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                  currentView === item.view
                    ? 'bg-blue-50 border border-blue-200 text-blue-600 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'
                }`}
              >
                <span className={currentView === item.view ? 'text-blue-600' : 'text-current'}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left text-sm">{item.text}</span>
                {currentView === item.view && (
                  <Star className="w-4 h-4 text-purple-600 fill-purple-600" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Snackbar */}
      <Alert
        open={snackbar.open}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        severity={snackbar.severity}
      />

      {/* App Bar */}
      <div className="fixed top-0 right-0 left-0 md:left-[300px] z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={handleDrawerToggle}
              className="md:hidden text-gray-600 hover:text-gray-900"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg md:text-xl font-bold text-gray-900">{getTitle()}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{displayName}</p>
              <p className="text-xs text-gray-600">
                {user?.role || 'Employee'} • {user?.department || 'N/A'}
              </p>
            </div>
            <Tooltip title="Logout">
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="text-gray-600 hover:bg-red-50 hover:text-red-600 p-2 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={handleDrawerToggle}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-[300px] bg-white border-r border-gray-200 shadow-lg z-50 transform transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Mobile Close Button */}
        <button
          onClick={handleDrawerToggle}
          className="absolute top-4 right-4 md:hidden text-gray-600 hover:text-gray-900"
        >
          <X className="w-6 h-6" />
        </button>
        {drawer}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen md:ml-[300px]">
        <div className="h-16" /> {/* Spacer for fixed header */}
        <div className="flex-1 p-4 md:p-8 max-w-[1400px] mx-auto w-full">
          <PaymentRequirementModal />
          {currentView === 'dashboard' ? (
            <div key={currentView}>
              {renderCurrentView()}
            </div>
          ) : (
            <div key={currentView} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 md:p-6">
              {renderCurrentView()}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;