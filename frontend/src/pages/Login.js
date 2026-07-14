import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { InlineAlert } from '../components/ui/Alert';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await login(formData.email, formData.password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Login failed. Please check your credentials and try again.');
      }
    } catch (err) {
      setError('Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-secondary-500 py-8 px-4">
      <div className="w-full max-w-xl bg-white bg-opacity-95 backdrop-blur-lg rounded-2xl shadow-2xl p-8">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full shadow-lg overflow-hidden flex items-center justify-center">
              <img
                src="/BElogo.png"
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">PRESTO: Cash Disbursement Module</h1>
            <p className="text-gray-600 text-sm">Sign in to your account</p>
          </div>

          {/* Error Alert */}
          {error && (
            <InlineAlert severity="error" className="mb-6">
              {error}
            </InlineAlert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              id="email-address"
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              disabled={loading}
              fullWidth
              startAdornment={<Mail className="w-5 h-5" />}
              autoComplete="email"
              autoFocus
              placeholder="Enter your email"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                disabled={loading}
                fullWidth
                startAdornment={<Lock className="w-5 h-5" />}
                endAdornment={
                  <button
                    type="button"
                    onClick={handleTogglePasswordVisibility}
                    disabled={loading}
                    className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
                autoComplete="current-password"
                placeholder="Enter your password"
              />
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={loading}
              loading={loading}
            >
              Sign In
            </Button>

            {/* Forgot Password Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-primary-600 hover:text-primary-700 hover:underline font-medium"
              >
                Forgot Password?
              </button>
            </div>

            {/* Sign Up Link */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="text-primary-600 hover:text-primary-700 font-semibold hover:underline"
                >
                  Sign Up
                </button>
              </p>
            </div>
          </form>
      </div>
    </div>
  );
}
