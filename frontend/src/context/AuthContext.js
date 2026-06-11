import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

const DEV_BYPASS = process.env.REACT_APP_DEV_BYPASS_AUTH === 'true';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t && DEV_BYPASS) {
      // set a temporary dev user so protected routes render during development
      const devUser = { id: 1, name: 'Dev User', email: 'dev@local' };
      localStorage.setItem('token', 'dev-bypass-token');
      localStorage.setItem('user', JSON.stringify(devUser));
      setUser(devUser);
    }
  }, []);

  async function login(email, password) {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return { success: true, user };
    } catch (err) {
      const message = err?.response?.data?.error || err.message || 'Login failed';
      return { success: false, error: message };
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  function updateUser(userData) {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
