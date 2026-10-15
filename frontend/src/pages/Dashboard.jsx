import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

import {
  LayoutDashboard,
  Menu,
  X,
  LogOut,
  Users,
  History,
  Table,
  ReceiptText,
  ClipboardList,
  CheckSquare,
  Coins,
  User as UserIcon,
  HandCoins,
  Banknote,
  ClipboardCheck,
  Wallet
} from 'lucide-react';

import CashAdvanceForm from '../components/CashAdvanceForm';
import LiquidationForm from '../components/LiquidationForm';
import ReimbursementForm from '../components/ReimbursementForm';
import EmployeeDashboard from './EmployeeDashboard';
import ManagerDashboard from './ManagerDashboard';
import AccountingDashboard from './AccountingDashboard';
import MyRequests from './MyRequests';
import AdminAllTransactions from './AdminAllTransactions';
import Approvals from './Approvals';
import UserManagement from './UserManagement';
import Disbursements from './Disbursements';
import AuditLogs from './AuditLogs';
import Profile from './Profile';
import PaymentRequirementModal from '../components/PaymentRequirementModal';
import RevolvingFunds from './RevolvingFunds';
import { InlineAlert } from '../components/ui/Alert';

const MENU_ITEMS = [
  {
    text: 'Dashboard',
    icon: LayoutDashboard,
    view: 'dashboard',
    path: '/dashboard',
    group: 'Overview'
  },
  {
    text: 'Approval Dashboard',
    icon: ClipboardCheck,
    view: 'manager-dashboard',
    path: '/manager-dashboard',
    adminOnly: true,
    group: 'Overview'
  },
  {
    text: 'Disbursement Dashboard',
    icon: Banknote,
    view: 'accounting-dashboard',
    path: '/accounting-dashboard',
    adminOnly: true,
    group: 'Overview'
  },
  {
    text: 'My Requests',
    icon: ClipboardList,
    view: 'my-requests',
    path: '/my-requests',
    group: 'Transactions'
  },
  {
    text: 'All Transactions',
    icon: Table,
    view: 'all-transactions',
    path: '/all-transactions',
    adminOnly: true,
    group: 'Transactions'
  },
  {
    text: 'Cash Advance',
    icon: HandCoins,
    view: 'cash-advance',
    path: '/cash-advance',
    group: 'Transactions'
  },
  {
    text: 'Liquidation',
    icon: ReceiptText,
    view: 'liquidation',
    path: '/liquidation',
    group: 'Transactions'
  },
  {
    text: 'Reimbursement',
    icon: Wallet,
    view: 'reimbursement',
    path: '/reimbursement',
    group: 'Transactions'
  },
  {
    text: 'Revolving Funds',
    icon: Wallet,
    view: 'revolving-funds',
    path: '/revolving-funds',
    accountingOnly: true,
    group: 'Transactions'
  },
  {
    text: 'Approvals',
    icon: CheckSquare,
    view: 'approvals',
    path: '/approvals',
    approverOnly: true,
    group: 'Transactions'
  },
  {
    text: 'Disbursements',
    icon: Coins,
    view: 'disbursements',
    path: '/disbursements',
    accountingOnly: true,
    group: 'Transactions'
  },
  {
    text: 'User Management',
    icon: Users,
    view: 'usermanagement',
    path: '/user-management',
    adminOnly: true,
    group: 'Administration'
  },
  {
    text: 'Audit Logs',
    icon: History,
    view: 'auditlogs',
    path: '/audit-logs',
    adminOnly: true,
    group: 'Administration'
  },
  {
    text: 'Profile',
    icon: UserIcon,
    view: 'profile',
    path: '/profile',
    group: 'Account'
  }
];

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  'accounting-dashboard': 'Disbursement Dashboard',
  'manager-dashboard': 'Approval Dashboard',
  profile: 'My Profile',
  'my-requests': 'My Requests',
  'all-transactions': 'All Transactions',
  'cash-advance': 'Cash Advance Request',
  liquidation: 'Cash Advance Liquidation',
  reimbursement: 'Reimbursement Request',
  usermanagement: 'User Management',
  'revolving-funds': 'Revolving Funds',
  auditlogs: 'Audit Logs',
  approvals: 'Approvals',
  disbursements: 'Disbursements'
};

const MENU_GROUPS = [
  'Overview',
  'Transactions',
  'Administration',
  'Account'
];

const panelClassName =
  'min-w-0 rounded-xl border border-gray-200 bg-white p-3 sm:p-5 lg:p-6';

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUser } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName =
    user?.name || user?.username || user?.email || 'User';

  const currentView =
    MENU_ITEMS.find(
      (item) =>
        location.pathname === item.path ||
        location.pathname.startsWith(`${item.path}/`)
    )?.view || 'dashboard';

  const pageTitle = PAGE_TITLES[currentView] || 'Dashboard';

  const isOperationsManager =
    user?.role === 'manager' && user?.department === 'OPERATIONS';

  // Refresh the profile once when this layout mounts.
  useEffect(() => {
    let mounted = true;

    const refreshProfile = async () => {
      if (!user) return;

      try {
        const response = await api.get('/auth/profile');
        const refreshedUser = response.data.user;

        if (
          mounted &&
          refreshedUser &&
          JSON.stringify(refreshedUser) !== JSON.stringify(user)
        ) {
          updateUser(refreshedUser);
        }
      } catch (error) {
        console.error('Failed to refresh profile', error);
      }
    };

    refreshProfile();

    return () => {
      mounted = false;
    };

    // Profile refresh runs only when this layout mounts.
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close the mobile sidebar with Escape.
  useEffect(() => {
    if (!mobileOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mobileOpen]);

  const menuItems = MENU_ITEMS.filter((item) => {
    if (item.adminOnly && user?.role !== 'admin') return false;

    if (
      item.approverOnly &&
      user?.role !== 'admin' &&
      !user?.isApprover
    ) {
      return false;
    }

    if (
      item.accountingOnly &&
      user?.role !== 'accounting' &&
      user?.role !== 'admin' &&
      !(item.view === 'revolving-funds' && isOperationsManager)
    ) {
      return false;
    }

    return true;
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path) => {
    setMobileOpen(false);
    navigate(path, { replace: true, state: null });
  };

  const permissionMessage = (message) => (
    <InlineAlert severity="warning">{message}</InlineAlert>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'my-requests':
        return <MyRequests />;

      case 'all-transactions':
        return user?.role === 'admin'
          ? <AdminAllTransactions />
          : permissionMessage(
              "You don't have permission to access All Transactions. Admin access required."
            );

      case 'profile':
        return <Profile />;

      case 'cash-advance':
        return (
          <CashAdvanceForm
            key={location.state?.editData?.id ?? 'new'}
            editData={location.state?.editData}
            onClose={() =>
              navigate(location.state?.returnPath || '/my-requests')
            }
          />
        );

      case 'liquidation':
        return (
          <LiquidationForm
            key={location.state?.editData?.id ?? 'new'}
            initialData={location.state?.cashAdvance}
            editData={location.state?.editData}
            onClose={() =>
              navigate(location.state?.returnPath || '/my-requests')
            }
          />
        );

      case 'reimbursement':
        return (
          <ReimbursementForm
            key={location.state?.editData?.id ?? 'new'}
            editData={location.state?.editData}
            onClose={() =>
              navigate(location.state?.returnPath || '/my-requests')
            }
          />
        );

      case 'usermanagement':
        return user?.role === 'admin'
          ? <UserManagement />
          : permissionMessage(
              "You don't have permission to access User Management. Admin access required."
            );

      case 'auditlogs':
        return user?.role === 'admin'
          ? <AuditLogs />
          : permissionMessage(
              "You don't have permission to access Audit Logs. Admin access required."
            );

      case 'accounting-dashboard':
        return user?.role === 'admin'
          ? <AccountingDashboard />
          : permissionMessage(
              "You don't have permission to access Disbursement Dashboard. Admin access required."
            );

      case 'manager-dashboard':
        return user?.role === 'admin'
          ? <ManagerDashboard />
          : permissionMessage(
              "You don't have permission to access Approval Dashboard. Admin access required."
            );

      case 'approvals':
        return user?.role === 'admin' || user?.isApprover
          ? <Approvals />
          : permissionMessage(
              "You don't have permission to access Approvals."
            );

      case 'disbursements':
        return user?.role === 'accounting' || user?.role === 'admin'
          ? <Disbursements />
          : permissionMessage(
              "You don't have permission to access Disbursements. Accounting access required."
            );

      case 'revolving-funds':
        return (
          user?.role === 'accounting' ||
          user?.role === 'admin' ||
          isOperationsManager
        )
          ? <RevolvingFunds />
          : permissionMessage(
              "You don't have permission to access Revolving Funds. Accounting access required."
            );

      case 'dashboard':
      default:
        return (
          <div className="space-y-5">
            <section className={panelClassName}>
              <EmployeeDashboard />
            </section>

            {user?.role === 'accounting' ? (
              <section className={panelClassName}>
                <AccountingDashboard />
              </section>
            ) : (
              user?.role !== 'admin' &&
              user?.isApprover && (
                <section className={panelClassName}>
                  <ManagerDashboard />
                </section>
              )
            )}
          </div>
        );
    }
  };

  const renderSidebar = (mobile = false) => (
    <div className="flex h-full flex-col bg-white">
      {/* Branding */}
      <div className="flex min-h-[88px] items-center gap-3 border-b border-gray-200 px-5">
        <img
          src="/BElogo.png"
          alt="Barbizon Everyday"
          className="h-10 w-10 shrink-0 object-contain"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold tracking-wide text-gray-900">
            PRESTO
          </p>
          <p className="mt-0.5 text-xs leading-5 text-gray-500">
            Cash Disbursement Module
          </p>
        </div>

        {mobile && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}
        className="flex-1 space-y-6 overflow-y-auto px-3 py-5"
      >
        {MENU_GROUPS.map((group) => {
          const items = menuItems.filter((item) => item.group === group);

          if (!items.length) return null;

          return (
            <div key={group}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                {group}
              </p>

              <ul className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = currentView === item.view;

                  return (
                    <li key={item.view}>
                      <button
                        type="button"
                        onClick={() => handleNavigation(item.path)}
                        aria-current={active ? 'page' : undefined}
                        className={`flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 ${
                          active
                            ? 'bg-gray-100 font-semibold text-gray-950'
                            : 'font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <Icon
                          aria-hidden="true"
                          className={`h-[18px] w-[18px] shrink-0 ${
                            active ? 'text-gray-900' : 'text-gray-500'
                          }`}
                        />
                        <span>{item.text}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Account and logout */}
      <div className="border-t border-gray-200 p-3">
        <div className="mb-3 px-3 pt-2">
          <p className="truncate text-sm font-semibold text-gray-900">
            {displayName}
          </p>
          <p className="mt-1 truncate text-xs text-gray-500">
            <span className="capitalize">
              {user?.role || 'Employee'}
            </span>
            {user?.department ? ` · ${user.department}` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
        >
          <LogOut aria-hidden="true" className="h-[18px] w-[18px]" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <a
        href="#dashboard-content"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:shadow"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-gray-200 lg:block">
        {renderSidebar()}
      </aside>

      {/* Mobile and tablet sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-gray-950/40"
          />

          <aside
            id="mobile-navigation"
            aria-label="Navigation sidebar"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-gray-200 bg-white shadow-xl"
          >
            {renderSidebar(true)}
          </aside>
        </div>
      )}

      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-gray-200 bg-white lg:left-64">
        <div className="flex h-full items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <h1 className="min-w-0 truncate text-sm font-semibold text-gray-900 sm:text-base lg:text-lg">
              {pageTitle}
            </h1>
          </div>

          <div className="hidden min-w-0 max-w-[180px] shrink-0 text-right md:block xl:max-w-[240px]">
            {/* <p className="truncate text-sm font-medium text-gray-800">
              {displayName}
            </p> */}

            {user?.businessUnit && (
              <p className="mt-0.5 text-xs text-gray-500">
                {user.businessUnit}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main
        id="dashboard-content"
        className="min-h-screen min-w-0 pt-16 lg:ml-64"
      >
        <div className="w-full min-w-0 p-3 sm:p-4 lg:p-5">
          <PaymentRequirementModal />

          <div
            key={currentView}
            className={
              currentView === 'dashboard'
                ? 'min-w-0'
                : `${panelClassName} min-w-0`
            }
          >
            {renderCurrentView()}
          </div>
        </div>
      </main>
    </div>
  );
}