import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, ArrowLeft, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { InlineAlert } from '../components/ui/Alert';
import { Card, CardContent } from '../components/ui/Card';

const API_BASE_URL = process.env.REACT_APP_API_BASE || 'http://localhost:5000/api';

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 10 * 60; // 10 minutes
const RESEND_COOLDOWN_SECONDS = 60;

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

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email' | 'reset' | 'success'

  // Step 1 - email
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 2 - otp + new password
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [expiresIn, setExpiresIn] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const timerRef = useRef(null);

  // Countdown timer for OTP expiry + resend cooldown while on the reset step
  useEffect(() => {
    if (step !== 'reset') return undefined;

    timerRef.current = setInterval(() => {
      setExpiresIn(prev => (prev > 0 ? prev - 1 : 0));
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [step]);

  // Step 1: request an OTP for the given email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password/send-otp`, { email });

      setOtp('');
      setPassword('');
      setConfirmPassword('');
      setResetError('');
      setExpiresIn(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setStep('reset');
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to process request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: verify OTP and set the new password in one call
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');

    if (!otp || otp.length !== OTP_LENGTH) {
      setResetError(`Please enter the ${OTP_LENGTH}-digit code`);
      return;
    }

    if (expiresIn <= 0) {
      setResetError('This code has expired. Please request a new one.');
      return;
    }

    if (!password || !confirmPassword) {
      setResetError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setResetError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setResetError('Passwords do not match');
      return;
    }

    setResetLoading(true);

    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password/verify-otp`, {
        email,
        otp,
        password
      });

      setStep('success');

      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Reset password error:', err);
      setResetError(err.response?.data?.error || err.response?.data?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    try {
      setResendLoading(true);
      setResetError('');

      await axios.post(`${API_BASE_URL}/auth/forgot-password/send-otp`, { email });

      setOtp('');
      setExpiresIn(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      console.error('Resend OTP error:', err);
      setResetError(err.response?.data?.error || err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setStep('email');
    setOtp('');
    setResetError('');
  };

  const handleOtpChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(digitsOnly);
    if (resetError) setResetError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-secondary-500 py-8 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
              {step === 'success' ? 'Password Reset' : 'Forgot Password'}
            </h1>
            <p className="text-sm text-gray-600 text-center mb-6">
              {step === 'email' && "Enter your email address and we'll send you a verification code"}
              {step === 'reset' && `Enter the ${OTP_LENGTH}-digit code sent to ${maskEmail(email)} and choose a new password`}
              {step === 'success' && 'Your password has been reset successfully.'}
            </p>

            {/* ---------------- STEP 1: EMAIL ---------------- */}
            {step === 'email' && (
              <>
                {error && (
                  <InlineAlert severity="error" className="mb-4">
                    {error}
                  </InlineAlert>
                )}

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <Input
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    fullWidth
                    required
                    autoFocus
                    startAdornment={<Mail className="w-5 h-5" />}
                    placeholder="Enter your email"
                  />

                  <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    disabled={loading}
                    loading={loading}
                    className="mt-6"
                  >
                    Send Verification Code
                  </Button>

                  <div className="text-center pt-4">
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium hover:underline"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Login
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* ---------------- STEP 2: OTP + NEW PASSWORD ---------------- */}
            {step === 'reset' && (
              <>
                {resetError && (
                  <InlineAlert severity="error" className="mb-4">
                    {resetError}
                  </InlineAlert>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <Input
                    label="Verification Code"
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={handleOtpChange}
                    disabled={resetLoading}
                    fullWidth
                    required
                    autoFocus
                    startAdornment={<KeyRound className="w-5 h-5" />}
                    placeholder={`Enter ${OTP_LENGTH}-digit code`}
                    maxLength={OTP_LENGTH}
                  />

                  <p className="text-xs text-gray-500 ml-1 -mt-2">
                    {expiresIn > 0
                      ? `Code expires in ${formatTime(expiresIn)}`
                      : 'Code expired — please request a new one'}
                  </p>

                  <div className="relative">
                    <Input
                      label="New Password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={resetLoading}
                      fullWidth
                      required
                      startAdornment={<Lock className="w-5 h-5" />}
                      endAdornment={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={resetLoading}
                          className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      }
                      placeholder="Enter new password"
                    />
                  </div>

                  <div className="relative">
                    <Input
                      label="Confirm Password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={resetLoading}
                      fullWidth
                      required
                      startAdornment={<Lock className="w-5 h-5" />}
                      endAdornment={
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          disabled={resetLoading}
                          className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      }
                      placeholder="Confirm new password"
                    />
                  </div>

                  <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    disabled={resetLoading || otp.length !== OTP_LENGTH}
                    loading={resetLoading}
                    className="mt-6"
                  >
                    Reset Password
                  </Button>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={handleChangeEmail}
                      disabled={resetLoading}
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

            {/* ---------------- STEP 3: SUCCESS ---------------- */}
            {step === 'success' && (
              <InlineAlert severity="success" className="mb-4">
                Password reset successful!
                <br />
                Redirecting to login...
              </InlineAlert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;