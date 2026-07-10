import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Lock, Mail, User, CheckCircle, KeyRound, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { InlineAlert } from '../components/ui/Alert';

const API_BASE_URL = process.env.REACT_APP_API_BASE || 'http://localhost:5000/api';

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 10 * 60; // 10 minutes
const RESEND_COOLDOWN_SECONDS = 60;

// Masks an email for display, e.g. "john.doe@example.com" -> "jo***@example.com"
const maskEmail = (email) => {
  const [local, domain] = String(email || '').split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 3))}@${domain}`;
};

const formatTime = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default function SignUp() {
  const navigate = useNavigate();
  const [step, setStep] = useState('form'); // 'form' | 'otp'
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);

  // OTP step state
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [expiresIn, setExpiresIn] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const timerRef = useRef(null);

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

  // Countdown timer for OTP expiry + resend cooldown while on the OTP step
  useEffect(() => {
    if (step !== 'otp') return undefined;

    timerRef.current = setInterval(() => {
      setExpiresIn(prev => (prev > 0 ? prev - 1 : 0));
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [step]);

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
    setFieldErrors(prev => (prev[field] ? { ...prev, [field]: '' } : prev));
  };

  // Helper to title-case full name
  const titleCase = (s) => String(s || '').trim().split(/\s+/).filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  const ALLOWED_EMAIL_DOMAINS = [
    'barbizonfashion.com',
    'everydayproductscorp.net',
    'everydayproductscorp.com'
  ];

  const isAllowedEmailDomain = (email) => {
    const domain = String(email || '').toLowerCase().split('@')[1];
    return ALLOWED_EMAIL_DOMAINS.includes(domain);
  };

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Returns an error message for the given email, or '' if it's valid.
  const validateEmailValue = (email) => {
    if (!email) return 'Email address is required';
    if (!EMAIL_REGEX.test(email)) return 'Please enter a valid email address';
    if (!isAllowedEmailDomain(email)) {
      return 'Email must be a company address (@barbizonfashion.com, @everydayproductscorp.com, or @everydayproductscorp.net)';
    }
    return '';
  };

  // Validates just the email field on blur, so the person sees the problem
  // immediately instead of only after hitting Continue.
  const handleEmailBlur = () => {
    const message = validateEmailValue(formData.email);
    setFieldErrors(prev => ({ ...prev, email: message }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name) {
      errors.name = 'Full name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Name must be at least 3 characters long';
    }

    const emailError = validateEmailValue(formData.email);
    if (emailError) errors.email = emailError;

    if (!formData.businessUnit) {
      errors.businessUnit = 'Business unit is required';
    }

    if (!formData.department) {
      errors.department = 'Department is required';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 1: validate the form, then request an OTP be sent to the entered email
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

      await axios.post(`${API_BASE_URL}/auth/send-otp`, {
        name: capitalizedName,
        email: formData.email,
        purpose: 'signup'
      });

      setOtp('');
      setOtpError('');
      setExpiresIn(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setStep('otp');
    } catch (err) {
      console.error('Send OTP error:', err);
      setError(
        err.response?.data?.error || err.response?.data?.message ||
        'Failed to send verification code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 2: verify the OTP and create the account in a single call
  const handleVerifyOtp = async (event) => {
    event.preventDefault();
    setOtpError('');

    if (!otp || otp.length !== OTP_LENGTH) {
      setOtpError(`Please enter the ${OTP_LENGTH}-digit code`);
      return;
    }

    if (expiresIn <= 0) {
      setOtpError('This code has expired. Please request a new one.');
      return;
    }

    try {
      setOtpLoading(true);

      await axios.post(`${API_BASE_URL}/auth/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        businessUnit: formData.businessUnit,
        department: formData.department,
        otp
      });

      setSuccess(true);

      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);
      setOtpError(
        err.response?.data?.error || err.response?.data?.message ||
        'Invalid or expired code. Please try again.'
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    try {
      setResendLoading(true);
      setOtpError('');

      await axios.post(`${API_BASE_URL}/auth/send-otp`, {
        name: formData.name,
        email: formData.email,
        purpose: 'signup'
      });

      setOtp('');
      setExpiresIn(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      console.error('Resend OTP error:', err);
      setOtpError(
        err.response?.data?.error || err.response?.data?.message ||
        'Failed to resend code. Please try again.'
      );
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToForm = () => {
    setStep('form');
    setOtp('');
    setOtpError('');
  };

  const handleOtpChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(digitsOnly);
    if (otpError) setOtpError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-secondary-500 py-8 px-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white bg-opacity-95 backdrop-blur-lg rounded-2xl shadow-2xl p-8">
          {/* Logo and Header */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg">
              {step === 'form' ? (
                <User className="w-10 h-10 text-white" />
              ) : (
                <KeyRound className="w-10 h-10 text-white" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {step === 'form' ? 'Create Account' : 'Verify Your Email'}
            </h1>
            <p className="text-gray-600 text-sm">
              {step === 'form'
                ? 'Create your account now!'
                : `Enter the ${OTP_LENGTH}-digit code we sent to ${maskEmail(formData.email)}`}
            </p>
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

          {/* ---------------- STEP 1: SIGNUP FORM ---------------- */}
          {step === 'form' && !success && (
            <>
              {error && (
                <InlineAlert severity="error" className="mb-6">
                  {error}
                </InlineAlert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Full Name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange('name')}
                  onBlur={() => setFormData(prev => ({ ...prev, name: titleCase(prev.name) }))}
                  disabled={loading}
                  fullWidth
                  error={!!fieldErrors.name}
                  helperText={fieldErrors.name}
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
                  onBlur={handleEmailBlur}
                  disabled={loading}
                  fullWidth
                  error={!!fieldErrors.email}
                  helperText={fieldErrors.email}
                  startAdornment={<Mail className="w-5 h-5" />}
                  autoComplete="email"
                  placeholder="Enter your email"
                />

                <div>
                  <Select
                    label="Business Unit"
                    value={formData.businessUnit}
                    onChange={handleChange('businessUnit')}
                    disabled={loading}
                    fullWidth
                    error={!!fieldErrors.businessUnit}
                    helperText={fieldErrors.businessUnit}
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
                  disabled={loading}
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
                  disabled={loading}
                  fullWidth
                  error={!!fieldErrors.department}
                  helperText={fieldErrors.department}
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
                    disabled={loading}
                    fullWidth
                    error={!!fieldErrors.password}
                    helperText={fieldErrors.password || 'Must be at least 6 characters'}
                    startAdornment={<Lock className="w-5 h-5" />}
                    endAdornment={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    }
                    autoComplete="new-password"
                    placeholder="Enter your password"
                  />
                </div>

                <div className="relative">
                  <Input
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange('confirmPassword')}
                    disabled={loading}
                    fullWidth
                    error={!!fieldErrors.confirmPassword}
                    helperText={fieldErrors.confirmPassword}
                    startAdornment={<Lock className="w-5 h-5" />}
                    endAdornment={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={loading}
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
                  disabled={loading}
                  loading={loading}
                  className="mt-6"
                >
                  Continue
                </Button>

                {/* Sign In Link */}
                <div className="text-center pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      disabled={loading}
                      className="text-primary-600 hover:text-primary-700 font-semibold hover:underline disabled:opacity-50"
                    >
                      Sign In
                    </button>
                  </p>
                </div>
              </form>
            </>
          )}

          {/* ---------------- STEP 2: OTP VERIFICATION ---------------- */}
          {step === 'otp' && !success && (
            <>
              {otpError && (
                <InlineAlert severity="error" className="mb-6">
                  {otpError}
                </InlineAlert>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <Input
                  label="Verification Code"
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={handleOtpChange}
                  disabled={otpLoading}
                  fullWidth
                  autoFocus
                  startAdornment={<KeyRound className="w-5 h-5" />}
                  placeholder={`Enter ${OTP_LENGTH}-digit code`}
                  maxLength={OTP_LENGTH}
                />

                <p className="text-xs text-gray-500 ml-1">
                  {expiresIn > 0
                    ? `Code expires in ${formatTime(expiresIn)}`
                    : 'Code expired — please request a new one'}
                </p>

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  disabled={otpLoading || otp.length !== OTP_LENGTH}
                  loading={otpLoading}
                  className="mt-2"
                >
                  Verify & Create Account
                </Button>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleBackToForm}
                    disabled={otpLoading}
                    className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Change email
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendLoading || resendCooldown > 0}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    {resendCooldown > 0
                      ? `Resend code (${resendCooldown}s)`
                      : resendLoading ? 'Sending...' : 'Resend code'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}