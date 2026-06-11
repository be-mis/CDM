import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Lock, Mail, User, CheckCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { InlineAlert } from '../components/ui/Alert';

const API_BASE_URL = process.env.REACT_APP_API_BASE || 'http://localhost:5000/api';

export default function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    businessUnit: '',
    department: ''
  });
  const [departments, setDepartments] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Auto-set Business Unit based on email domain
  useEffect(() => {
    if (formData.email) {
      const emailLower = formData.email.toLowerCase();

      if (emailLower.endsWith('@barbizonfashion.com')) {
        setFormData(prev => ({ ...prev, businessUnit: 'NBFI' }));
      } else if (emailLower.endsWith('@everydayproductscorp.com') || emailLower.endsWith('@everydayproductscorp.net')) {
        setFormData(prev => ({ ...prev, businessUnit: 'EPC' }));
      }
    }
  }, [formData.email]);

  // Fetch departments from backend
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/departments`);
        if (mounted && res.data) {
          const deptData = Array.isArray(res.data) ? res.data : (res.data.departments || []);
          setDepartments(deptData);
        }
      } catch (err) {
        console.error('Failed to load departments', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
  };

  // Helper to title-case full name
  const titleCase = (s) => String(s || '').trim().split(/\s+/).filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  const validateForm = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword || !formData.businessUnit || !formData.department) {
      setError('All fields are required');
      return false;
    }

    if (formData.name.length < 3) {
      setError('Name must be at least 3 characters long');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const capitalizedName = titleCase(formData.name);
    setFormData(prev => ({ ...prev, name: capitalizedName }));
    try {
      setLoading(true);
      setError('');

      await axios.post(`${API_BASE_URL}/auth/register`, {
        name: capitalizedName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        businessUnit: formData.businessUnit,
        department: formData.department
      });

      setSuccess(true);

      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);
      setError(
        err.response?.data?.message ||
        'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-secondary-500 py-8 px-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white bg-opacity-95 backdrop-blur-lg rounded-2xl shadow-2xl p-8">
          {/* Logo and Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-gray-600 text-sm">Create your account now!</p>
          </div>

          {/* Success Alert */}
          {success && (
            <InlineAlert severity="success" className="mb-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>Account created successfully! Redirecting to login...</span>
              </div>
            </InlineAlert>
          )}

          {/* Error Alert */}
          {error && (
            <InlineAlert severity="error" className="mb-6">
              {error}
            </InlineAlert>
          )}

          {/* Sign Up Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              value={formData.name}
              onChange={handleChange('name')}
              onBlur={() => setFormData(prev => ({ ...prev, name: titleCase(prev.name) }))}
              disabled={loading || success}
              fullWidth
              startAdornment={<User className="w-5 h-5" />}
              autoComplete="name"
              autoFocus
              placeholder="Enter your full name"
            />

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              disabled={loading || success}
              fullWidth
              startAdornment={<Mail className="w-5 h-5" />}
              autoComplete="email"
              placeholder="Enter your email"
            />

            <div>
              <Select
                label="Business Unit"
                value={formData.businessUnit}
                onChange={handleChange('businessUnit')}
                disabled={loading || success}
                fullWidth
              >
                <option value="">Select Business Unit</option>
                <option value="NBFI">NBFI (New Barbizon Fashion Inc.)</option>
                <option value="EPC">EPC (Everyday Products Corp.)</option>
              </Select>
              {formData.businessUnit && formData.email && (
                <p className="mt-1 text-xs text-gray-600 ml-1">
                  {formData.email.toLowerCase().endsWith('@barbizonfashion.com') && '✓ Auto-detected from email domain'}
                  {(formData.email.toLowerCase().endsWith('@everydayproductscorp.com') || formData.email.toLowerCase().endsWith('@everydayproductscorp.net')) && '✓ Auto-detected from email domain'}
                </p>
              )}
            </div>

            <Select
              label="Role"
              value={formData.role}
              onChange={handleChange('role')}
              disabled={loading || success}
              fullWidth
            >
              <option value="employee">Employee</option>
              <option value="supervisor">Supervisor</option>
              <option value="manager">Manager</option>
              <option value="vp">Vice-President</option>
              <option value="president">President</option>
            </Select>

            <Select
              label="Department"
              value={formData.department}
              onChange={handleChange('department')}
              disabled={loading || success}
              fullWidth
            >
              <option value="">Select Department</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </Select>

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                disabled={loading || success}
                fullWidth
                startAdornment={<Lock className="w-5 h-5" />}
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading || success}
                    className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
                autoComplete="new-password"
                helperText="Must be at least 6 characters"
                placeholder="Enter your password"
              />
            </div>

            <div className="relative">
              <Input
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                disabled={loading || success}
                fullWidth
                startAdornment={<Lock className="w-5 h-5" />}
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading || success}
                    className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
                autoComplete="new-password"
                placeholder="Confirm your password"
              />
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={loading || success}
              loading={loading}
              className="mt-6"
            >
              Create Account
            </Button>

            {/* Sign In Link */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  disabled={loading || success}
                  className="text-primary-600 hover:text-primary-700 font-semibold hover:underline disabled:opacity-50"
                >
                  Sign In
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
