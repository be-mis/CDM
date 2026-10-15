import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  CircleAlert,
  CheckCircle
} from 'lucide-react';

const API_BASE_URL = '/api';
const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const maskEmail = (email) => {
  const [local, domain] = String(email || '').split('@');

  if (!local || !domain) return email;

  return `${local.slice(0, 2)}${'*'.repeat(
    Math.max(local.length - 2, 3)
  )}@${domain}`;
};

const formatTime = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const inputClassName = (hasError) =>
  `block w-full rounded-xl border bg-white/50 px-3.5 py-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-500 focus:bg-white/70 disabled:cursor-not-allowed disabled:bg-white/30 disabled:opacity-60 ${
    hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200/60'
      : 'border-white/80 focus:border-purple-400 focus:ring-2 focus:ring-purple-200/60'
  }`;

const primaryButtonClassName =
  'flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-700/15 transition-colors hover:bg-purple-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const linkClassName =
  'rounded text-sm font-medium text-purple-700 hover:text-purple-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function ErrorMessage({ id, message }) {
  if (!message) return null;

  return (
    <div
      id={id}
      role="alert"
      className="mb-5 flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-red-700"
    >
      <CircleAlert
        aria-hidden="true"
        className="mt-0.5 h-5 w-5 shrink-0"
      />

      <p className="text-sm font-medium leading-relaxed">
        {message}
      </p>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  disabled,
  error,
  hint,
  placeholder
}) {
  const describedBy = [
    error ? `${id}-error` : '',
    hint ? `${id}-hint` : ''
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-gray-700"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          disabled={disabled}
          autoComplete="new-password"
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`${inputClassName(Boolean(error))} pr-12`}
        />

        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          aria-controls={id}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-gray-500 transition-colors hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500 disabled:opacity-50"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}

      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-gray-600">
          {hint}
        </p>
      )}
    </div>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState('email');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');

  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [resendLoading, setResendLoading] = useState(false);

  const [expiresIn, setExpiresIn] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(
    RESEND_COOLDOWN_SECONDS
  );

  const busy = resetLoading || resendLoading;

  useEffect(() => {
    if (step !== 'reset') return undefined;

    const timer = setInterval(() => {
      setExpiresIn((prev) => Math.max(prev - 1, 0));
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (step !== 'success') return undefined;

    const timeout = setTimeout(() => navigate('/login'), 3000);

    return () => clearTimeout(timeout);
  }, [step, navigate]);

  const handleSendOtp = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError('');
    setEmailError('');

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError('Please enter your email address.');
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);

      await axios.post(
        `${API_BASE_URL}/auth/forgot-password/send-otp`,
        { email: trimmedEmail }
      );

      setEmail(trimmedEmail);
      setOtp('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setResetError('');
      setFieldErrors({});
      setExpiresIn(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setStep('reset');
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to process request. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (busy) return;

    setResetError('');

    const errors = {};

    if (otp.length !== OTP_LENGTH) {
      errors.otp = `Please enter the ${OTP_LENGTH}-digit code.`;
    } else if (expiresIn <= 0) {
      errors.otp = 'This code has expired. Please request a new one.';
    }

    if (!password) {
      errors.password = 'Please enter a new password.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) return;

    try {
      setResetLoading(true);

      await axios.post(
        `${API_BASE_URL}/auth/forgot-password/verify-otp`,
        {
          email,
          otp,
          password
        }
      );

      setPassword('');
      setConfirmPassword('');
      setOtp('');
      setStep('success');
    } catch (err) {
      setResetError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Unable to reset your password. Check your code and try again.'
      );
    } finally {
      setResetLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || busy) return;

    try {
      setResendLoading(true);
      setResetError('');

      await axios.post(
        `${API_BASE_URL}/auth/forgot-password/send-otp`,
        { email }
      );

      setOtp('');
      setFieldErrors((prev) => ({ ...prev, otp: '' }));
      setExpiresIn(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setResetError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to resend code. Please try again.'
      );
    } finally {
      setResendLoading(false);
    }
  };

  const handleChangeEmail = () => {
    if (busy) return;

    setStep('email');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setResetError('');
    setError('');
    setEmailError('');
    setFieldErrors({});
  };

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-500 to-secondary-500 px-4 py-10 sm:px-6">
      <section
        aria-labelledby="forgot-password-title"
        className="w-full max-w-xl rounded-3xl border border-white/70 bg-white/60 px-6 py-8 shadow-xl shadow-purple-950/10 backdrop-blur-xl sm:p-10"
      >
        <header className="mb-7 text-center">
          <img
            src="/BElogo.png"
            alt="Barbizon Everyday"
            className="mx-auto mb-5 h-24 w-24 object-contain"
          />

          <h1
            id="forgot-password-title"
            className="text-3xl font-semibold tracking-tight text-gray-900"
          >
            Cash Disbursement Module
          </h1>

          <h2 className="mt-5 text-lg font-semibold text-gray-900">
            {step === 'success'
              ? 'Password Reset'
              : step === 'reset'
                ? 'Create New Password'
                : 'Forgot Password'}
          </h2>

          <p className="mt-2 break-words text-sm leading-relaxed text-gray-600">
            {step === 'email' &&
              'Enter your registered email address to receive a verification code.'}

            {step === 'reset' && (
              <>
                Enter the {OTP_LENGTH}-digit code sent to{' '}
                <span className="font-medium text-gray-800">
                  {maskEmail(email)}
                </span>{' '}
                and choose a new password.
              </>
            )}

            {step === 'success' &&
              'Your password has been reset successfully.'}
          </p>
        </header>

        {/* Email request */}
        {step === 'email' && (
          <>
            <ErrorMessage
              id="email-request-error"
              message={error || emailError}
            />

            <form
              onSubmit={handleSendOtp}
              noValidate
              aria-busy={loading}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="reset-email"
                  className="mb-2 block text-sm font-bold text-gray-700"
                >
                  Email Address
                </label>

                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError('');
                    setEmailError('');
                  }}
                  disabled={loading}
                  autoComplete="email"
                  autoFocus
                  placeholder="Enter your registered email"
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={
                    error || emailError
                      ? 'email-request-error'
                      : undefined
                  }
                  className={inputClassName(Boolean(emailError))}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={primaryButtonClassName}
              >
                {loading && (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                )}
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  disabled={loading}
                  className={`${linkClassName} inline-flex items-center gap-2`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </button>
              </div>
            </form>
          </>
        )}

        {/* OTP and new password */}
        {step === 'reset' && (
          <>
            <ErrorMessage id="reset-error" message={resetError} />

            <form
              onSubmit={handleResetPassword}
              noValidate
              aria-busy={busy}
              aria-describedby={resetError ? 'reset-error' : undefined}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="reset-otp"
                  className="mb-2 block text-sm font-bold text-gray-700"
                >
                  Verification Code
                </label>

                <input
                  id="reset-otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(event) => {
                    setOtp(
                      event.target.value
                        .replace(/\D/g, '')
                        .slice(0, OTP_LENGTH)
                    );
                    setResetError('');
                    setFieldErrors((prev) => ({ ...prev, otp: '' }));
                  }}
                  disabled={busy}
                  maxLength={OTP_LENGTH}
                  autoFocus
                  placeholder="000000"
                  aria-invalid={Boolean(fieldErrors.otp)}
                  aria-describedby={
                    fieldErrors.otp
                      ? 'reset-otp-error otp-expiry'
                      : 'otp-expiry'
                  }
                  className={`${inputClassName(
                    Boolean(fieldErrors.otp)
                  )} text-center tracking-[0.4em]`}
                />

                {fieldErrors.otp && (
                  <p
                    id="reset-otp-error"
                    className="mt-1.5 text-xs text-red-600"
                  >
                    {fieldErrors.otp}
                  </p>
                )}

                <p
                  id="otp-expiry"
                  className={`mt-2 text-xs ${
                    expiresIn > 0 ? 'text-gray-600' : 'text-red-600'
                  }`}
                >
                  {expiresIn > 0
                    ? `Code expires in ${formatTime(expiresIn)}`
                    : 'Code expired. Please request a new one.'}
                </p>
              </div>

              <PasswordField
                id="new-password"
                label="New Password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setResetError('');
                  setFieldErrors((prev) => ({
                    ...prev,
                    password: '',
                    confirmPassword: ''
                  }));
                }}
                visible={showPassword}
                onToggle={() => setShowPassword((prev) => !prev)}
                disabled={busy}
                error={fieldErrors.password}
                hint="Must be at least 6 characters."
                placeholder="Enter your new password"
              />

              <PasswordField
                id="confirm-password"
                label="Confirm Password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setResetError('');
                  setFieldErrors((prev) => ({
                    ...prev,
                    confirmPassword: ''
                  }));
                }}
                visible={showConfirmPassword}
                onToggle={() =>
                  setShowConfirmPassword((prev) => !prev)
                }
                disabled={busy}
                error={fieldErrors.confirmPassword}
                placeholder="Confirm your new password"
              />

              <button
                type="submit"
                disabled={
                  busy ||
                  otp.length !== OTP_LENGTH ||
                  expiresIn <= 0
                }
                className={primaryButtonClassName}
              >
                {resetLoading && (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                )}
                {resetLoading ? 'Resetting Password...' : 'Reset Password'}
              </button>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded text-sm font-medium text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change email
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={busy || resendCooldown > 0}
                  className={linkClassName}
                >
                  {resendLoading
                    ? 'Sending...'
                    : resendCooldown > 0
                      ? `Resend code (${resendCooldown}s)`
                      : 'Resend code'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="space-y-6">
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl bg-green-50 px-4 py-4 text-green-700"
            >
              <CheckCircle
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0"
              />

              <div className="text-sm">
                <p className="font-semibold">
                  Password reset successful!
                </p>
                <p className="mt-1">Redirecting to login...</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              className={primaryButtonClassName}
            >
              Back to Login
            </button>
          </div>
        )}
      </section>
    </main>
  );
}