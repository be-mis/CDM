import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';

import { useAuth } from './context/AuthContext';

function AppRoutes({ user, logout }) {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={user ? <Dashboard onLogout={logout} /> : <Navigate to="/login" replace />} />
      <Route path="/manager-dashboard" element={user ? <Dashboard onLogout={logout} /> : <Navigate to="/login" replace />} />
      <Route path="/accounting-dashboard" element={user ? <Dashboard onLogout={logout} /> : <Navigate to="/login" replace />} />
      <Route path="/my-requests" element={user ? <Dashboard onLogout={logout} /> : <Navigate to="/login" replace />} />
      <Route path="/all-transactions" element={user ? <Dashboard onLogout={logout} /> : <Navigate to="/login" replace />} />

      <Route path="/cash-advance" element={user ? <Dashboard onLogout={logout} /> : <Navigate to="/login" replace />} />
      <Route path="/liquidation" element={user ? <Dashboard onLogout={logout} /> : <Navigate to="/login" replace />} />
      <Route path="/reimbursement" element={user ? <Dashboard onLogout={logout} /> : <Navigate to="/login" replace />} />
      <Route path="/approvals" element={user ? <Dashboard onLogout={logout} /> : <Navigate to="/login" replace />} />

      <Route path="/profile" element={user ? <Dashboard onLogout={logout} /> : <Navigate to="/login" replace />} />




      <Route path="/user-management" element={user ? <Dashboard onLogout={logout} /> : <Navigate to="/login" replace />} />
      <Route path="/audit-logs" element={user ? <Dashboard onLogout={logout} /> : <Navigate to="/login" replace />} />
      <Route path="/disbursements" element={user ? <Dashboard onLogout={logout} /> : <Navigate to="/login" replace />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/forgot-password' || location.pathname === '/reset-password';
  const isDashboardPage = location.pathname === '/dashboard' || location.pathname.startsWith('/manager-dashboard') || location.pathname.startsWith('/accounting-dashboard') || location.pathname.startsWith('/my-requests') || location.pathname.startsWith('/all-transactions') || location.pathname.startsWith('/cash-advance') || location.pathname.startsWith('/liquidation') || location.pathname.startsWith('/reimbursement') || location.pathname.startsWith('/approvals') || location.pathname.startsWith('/disbursements') || location.pathname.startsWith('/profile') || location.pathname.startsWith('/user-management') || location.pathname.startsWith('/audit-logs');

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthPage || isDashboardPage ? (
        <AppRoutes user={user} logout={logout} />
      ) : (
        <div className="container mx-auto mt-8 px-4">
          <AppRoutes user={user} logout={logout} />
        </div>
      )}
    </div>
  );
}