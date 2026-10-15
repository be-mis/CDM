import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  ArrowLeft,
  ChevronDown
} from 'lucide-react';

const API_BASE_URL = '/api';
const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 60;

const SIGNUP_STEPS = [
  {
    title: 'What is your name?',
    description: 'Enter your full name.',
    fields: ['name']
  },
  {
    title: 'Your company email',
    description: 'We will send a verification code to this address.',
    fields: ['email']
  },
  {
    title: 'Your business unit',
    description: 'Confirm the company you belong to.',
    fields: ['businessUnit']
  },
  {
    title: 'Your role',
    description: 'Select your position in the organization.',
    fields: ['role']
  },
  {
    title: 'Your department',
    description: 'Select the department you belong to.',
    fields: ['department']
  },
  {
    title: 'Secure your account',
    description: 'Create a password to protect your account.',
    fields: ['password', 'confirmPassword']
  }
];

const ALLOWED_EMAIL_DOMAINS = [
  'barbizonfashion.com',
  'everydayproductscorp.com',
  'everydayproductscorp.net'
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const titleCase = (value) =>
  String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const maskEmail = (email) => {
  const [local, domain] = String(email || '').split('@');

  if (!local || !domain) return email;

  return `${local.slice(0, 2)}${'*'.repeat(
    Math.max(local.length - 2, 3)
  )}@${domain}`;
};

const formatTime = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const getBusinessUnit = (email) => {
  const domain = email.trim().toLowerCase().split('@')[1];

  if (domain === 'barbizonfashion.com') return 'NBFI';

  if (
    domain === 'everydayproductscorp.com' ||
    domain === 'everydayproductscorp.net'
  ) {
    return 'EPC';
  }

  return '';
};

const validateEmail = (email) => {
  if (!email) return 'Email address is required.';

  if (!EMAIL_REGEX.test(email)) {
    return 'Please enter a valid email address.';
  }

  const domain = email.toLowerCase().split('@')[1];

  if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
    return 'Use your company email address (@barbizonfashion.com, @everydayproductscorp.com, or @everydayproductscorp.net).';
  }

  return '';
};

const controlClassName = (hasError) =>
  `block w-full rounded-xl border bg-white/50 px-3.5 py-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-500 focus:bg-white/70 disabled:cursor-not-allowed disabled:bg-white/30 disabled:opacity-60 ${
    hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
      : 'border-white/80 focus:border-purple-400 focus:ring-2 focus:ring-purple-200/60'
  }`;

const primaryButtonClassName =
  'flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-700/15 transition-colors hover:bg-purple-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const linkClassName =
  'rounded text-sm font-medium text-purple-700 hover:text-purple-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-gray-700"
      >
        {label}
      </label>

      {children}

      {(error || hint) && (
        <p
          id={`${id}-help`}
          className={`mt-1.5 text-xs ${
            error ? 'text-red-600' : 'text-gray-600'
          }`}
        >
          {error || hint}
        </p>
      )}
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
  placeholder,
  autoFocus = false
}) {
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          disabled={disabled}
          autoComplete="new-password"
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${id}-help` : undefined}
          className={`${controlClassName(Boolean(error))} pr-12`}
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
    </Field>
  );
}

function MinimalSelect({ id, value, onChange, disabled = false, error, hint, autoFocus = false, children }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);

  // Reuse your existing <option> children.
  const options = React.Children.toArray(children)
    .filter(React.isValidElement)
    .map((child) => ({
      value: child.props.value,
      label: child.props.children,
      disabled: Boolean(child.props.disabled)
    }));

  const selectedOption = options.find(
    (option) => option.value === value
  );

  const placeholder =
    options.find((option) => option.value === '')?.label ||
    'Select an option';

  const availableIndexes = options
    .map((option, index) =>
      !option.disabled && option.value !== '' ? index : -1
    )
    .filter((index) => index !== -1);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);

    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (open && activeIndex >= 0) {
      optionRefs.current[activeIndex]?.scrollIntoView({
        block: 'nearest'
      });
    }
  }, [open, activeIndex]);

  const openDropdown = (preferLast = false) => {
    if (disabled) return;

    const selectedIndex = options.findIndex(
      (option) =>
        option.value === value &&
        !option.disabled &&
        option.value !== ''
    );

    const fallbackIndex = preferLast
      ? availableIndexes[availableIndexes.length - 1]
      : availableIndexes[0];

    setActiveIndex(
      selectedIndex >= 0 ? selectedIndex : fallbackIndex ?? -1
    );
    setOpen(true);
  };

  const selectOption = (index) => {
    const option = options[index];

    if (!option || option.disabled || option.value === '') return;

    // Compatible with your existing handleChange(field).
    onChange({
      target: {
        name: id,
        value: option.value
      }
    });

    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();

        if (!open) {
          openDropdown(event.key === 'ArrowUp');
          return;
        }

        if (!availableIndexes.length) return;

        const position = availableIndexes.indexOf(activeIndex);
        const direction = event.key === 'ArrowDown' ? 1 : -1;

        const nextPosition =
          position < 0
            ? direction === 1
              ? 0
              : availableIndexes.length - 1
            : (position + direction + availableIndexes.length) %
              availableIndexes.length;

        setActiveIndex(availableIndexes[nextPosition]);
        break;
      }

      case 'Home':
      case 'End':
        if (open) {
          event.preventDefault();

          setActiveIndex(
            event.key === 'Home'
              ? availableIndexes[0] ?? -1
              : availableIndexes[availableIndexes.length - 1] ?? -1
          );
        }
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();

        if (open) {
          selectOption(activeIndex);
        } else {
          openDropdown();
        }
        break;

      case 'Escape':
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
        break;

      case 'Tab':
        setOpen(false);
        break;

      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${open ? 'z-30' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      {/* Dropdown field */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={
          open && activeIndex >= 0
            ? `${id}-option-${activeIndex}`
            : undefined
        }
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-help` : undefined}
        disabled={disabled}
        autoFocus={autoFocus}
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            openDropdown();
          }
        }}
        onKeyDown={handleKeyDown}
        className={`${controlClassName(
          Boolean(error)
        )} relative min-h-[46px] pr-11 text-left`}
      >
        <span
          className={`block truncate ${
            value ? 'text-gray-900' : 'text-gray-500'
          }`}
        >
          {value ? selectedOption?.label || placeholder : placeholder}
        </span>

        <ChevronDown
          aria-hidden="true"
          className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Custom options list */}
      {open && !disabled && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          aria-label={
            document.getElementById(id)?.labels?.[0]?.textContent ||
            'Options'
          }
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/80 bg-white/95 p-1.5 shadow-lg shadow-purple-950/10 backdrop-blur-xl"
        >
          {availableIndexes.length === 0 ? (
            <li
              role="option"
              aria-disabled="true"
              aria-selected="false"
              className="px-3 py-3 text-sm text-gray-500"
            >
              No options available.
            </li>
          ) : (
            availableIndexes.map((index) => {
              const option = options[index];
              const selected = option.value === value;
              const active = index === activeIndex;

              return (
                <li
                  key={option.value}
                  id={`${id}-option-${index}`}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(index)}
                  className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    selected
                      ? 'bg-purple-100 font-semibold text-purple-800'
                      : active
                        ? 'bg-purple-50 text-purple-800'
                        : 'text-gray-700 hover:bg-purple-50'
                  }`}
                >
                  <span>{option.label}</span>

                  {selected && (
                    <CheckCircle
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-purple-700"
                    />
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

export default function SignUp() {
  const navigate = useNavigate();

  const [step, setStep] = useState('form');
  const [cardIndex, setCardIndex] = useState(0);

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
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentsError, setDepartmentsError] = useState('');
  const [departmentRetry, setDepartmentRetry] = useState(0);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [expiresIn, setExpiresIn] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(
    RESEND_COOLDOWN_SECONDS
  );

  const currentCard = SIGNUP_STEPS[cardIndex];
  const isLastCard = cardIndex === SIGNUP_STEPS.length - 1;
  const otpBusy = otpLoading || resendLoading;

  const detectedBusinessUnit = getBusinessUnit(formData.email);
  const businessUnitHint =
    detectedBusinessUnit &&
    detectedBusinessUnit === formData.businessUnit
      ? 'Auto-detected from your email address.'
      : undefined;

  // Auto-detect business unit.
  useEffect(() => {
    const businessUnit = getBusinessUnit(formData.email);

    if (businessUnit) {
      setFormData((prev) => ({ ...prev, businessUnit }));
      setFieldErrors((prev) => ({ ...prev, businessUnit: '' }));
    }
  }, [formData.email]);

  // Load departments.
  useEffect(() => {
    let mounted = true;

    const fetchDepartments = async () => {
      setDepartmentsLoading(true);
      setDepartmentsError('');

      try {
        const response = await axios.get(`${API_BASE_URL}/departments`);

        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.departments;

        if (!Array.isArray(data)) {
          throw new Error('Invalid department response');
        }

        if (mounted) {
          setDepartments(data);

          if (data.length === 0) {
            setDepartmentsError(
              'No departments are available. Please contact MIS.'
            );
          }
        }
      } catch {
        if (mounted) {
          setDepartmentsError(
            'Unable to load departments. Please try again.'
          );
        }
      } finally {
        if (mounted) setDepartmentsLoading(false);
      }
    };

    fetchDepartments();

    return () => {
      mounted = false;
    };
  }, [departmentRetry]);

  // OTP countdown.
  useEffect(() => {
    if (step !== 'otp' || success) return undefined;

    const timer = setInterval(() => {
      setExpiresIn((prev) => Math.max(prev - 1, 0));
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, success]);

  // Redirect after registration.
  useEffect(() => {
    if (!success) return undefined;

    const timeout = setTimeout(() => navigate('/login'), 2000);
    return () => clearTimeout(timeout);
  }, [success, navigate]);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value
    }));

    setError('');
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleEmailBlur = () => {
    const email = formData.email.trim();

    setFormData((prev) => ({ ...prev, email }));
    setFieldErrors((prev) => ({
      ...prev,
      email: validateEmail(email)
    }));
  };

  const getValidationErrors = () => {
    const errors = {};
    const name = formData.name.trim();

    if (!name) {
      errors.name = 'Full name is required.';
    } else if (name.length < 3) {
      errors.name = 'Name must be at least 3 characters long.';
    }

    const emailError = validateEmail(formData.email.trim());
    if (emailError) errors.email = emailError;

    if (!formData.businessUnit) {
      errors.businessUnit = 'Business unit is required.';
    }

    if (!formData.role) {
      errors.role = 'Role is required.';
    }

    if (!formData.department) {
      errors.department = 'Department is required.';
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    return errors;
  };

  const handlePreviousCard = () => {
    if (loading) return;

    setError('');
    setCardIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    if (
      cardIndex === 4 &&
      (departmentsLoading || departmentsError)
    ) {
      return;
    }

    const errors = getValidationErrors();

    const currentErrors = Object.fromEntries(
      currentCard.fields
        .filter((field) => errors[field])
        .map((field) => [field, errors[field]])
    );

    setFieldErrors(currentErrors);
    setError('');

    if (Object.keys(currentErrors).length > 0) return;

    if (!isLastCard) {
      if (cardIndex === 0) {
        setFormData((prev) => ({
          ...prev,
          name: titleCase(prev.name)
        }));
      }

      if (cardIndex === 1) {
        setFormData((prev) => ({
          ...prev,
          email: prev.email.trim()
        }));
      }

      setCardIndex((prev) => prev + 1);
      return;
    }

    // Validate all cards before requesting the OTP.
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);

      const invalidCardIndex = SIGNUP_STEPS.findIndex((card) =>
        card.fields.some((field) => errors[field])
      );

      if (invalidCardIndex >= 0) setCardIndex(invalidCardIndex);
      return;
    }

    const name = titleCase(formData.name);
    const email = formData.email.trim();

    setFormData((prev) => ({ ...prev, name, email }));

    try {
      setLoading(true);

      await axios.post(`${API_BASE_URL}/auth/send-otp`, {
        name,
        email,
        purpose: 'signup'
      });

      setOtp('');
      setOtpError('');
      setExpiresIn(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setStep('otp');
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to send verification code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();

    if (otpBusy) return;

    setOtpError('');

    if (otp.length !== OTP_LENGTH) {
      setOtpError(`Please enter the ${OTP_LENGTH}-digit code.`);
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
    } catch (err) {
      setOtpError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Invalid or expired code. Please try again.'
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || otpBusy) return;

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
      setOtpError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to resend code. Please try again.'
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-500 to-secondary-500 px-4 py-10 sm:px-6">
      <section
        aria-labelledby="signup-title"
        className="w-full max-w-xl rounded-3xl border border-white/70 bg-white/60 px-6 py-8 shadow-xl shadow-purple-950/10 backdrop-blur-xl sm:p-10"
      >
        <header className="mb-7 text-center">
          <img
            src="/BElogo.png"
            alt="Barbizon Everyday"
            className="mx-auto mb-4 h-16 w-16 object-contain"
          />

          <h1
            id="signup-title"
            className="text-3xl font-semibold tracking-tight text-gray-900"
          >
            Cash Disbursement Module
          </h1>

          <h2
            id="signup-subtitle"
            className="mt-5 text-lg font-semibold text-gray-900"
          >
            {success
              ? 'Account Created'
              : step === 'form'
                ? 'Create Account'
                : 'Verify Your Email'}
          </h2>
        </header>

        {/* Success */}
        {success && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50/90 px-4 py-4 text-sm text-green-700"
          >
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 shrink-0" />

              <div>
                <p className="font-medium">
                  Account created successfully!
                </p>
                <p className="mt-1">Redirecting to sign in...</p>
              </div>
            </div>
          </div>
        )}

        {/* Registration cards */}
        {step === 'form' && !success && (
          <>
            {/* Dash progress */}
            <div className="mb-7">
              <p className="mb-3 text-center text-xs font-medium text-gray-600">
                Step {cardIndex + 1} of {SIGNUP_STEPS.length}
              </p>

              <ol
                aria-label="Registration progress"
                className="flex gap-2"
              >
                {SIGNUP_STEPS.map((signupStep, index) => (
                  <li
                    key={signupStep.title}
                    aria-current={
                      index === cardIndex ? 'step' : undefined
                    }
                    className="flex-1"
                  >
                    <span className="sr-only">
                      {signupStep.title}
                      {index < cardIndex
                        ? ': completed'
                        : index === cardIndex
                          ? ': current step'
                          : ': upcoming'}
                    </span>

                    <div
                      aria-hidden="true"
                      className={`h-1.5 rounded-full transition-colors duration-300 motion-reduce:transition-none ${
                        index <= cardIndex
                          ? 'bg-purple-700'
                          : 'bg-purple-200/60'
                      }`}
                    />
                  </li>
                ))}
              </ol>
            </div>

            <div className="mb-6" aria-live="polite">
              <h3 className="text-xl font-semibold tracking-tight text-gray-900">
                {currentCard.title}
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {currentCard.description}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              noValidate
              aria-busy={loading}
              className="space-y-6"
            >
              <div
                key={cardIndex}
                className="min-h-[210px] space-y-5"
              >
                {/* Full name */}
                {cardIndex === 0 && (
                  <Field
                    id="name"
                    label="Full Name"
                    error={fieldErrors.name}
                  >
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange('name')}
                      onBlur={() =>
                        setFormData((prev) => ({
                          ...prev,
                          name: titleCase(prev.name)
                        }))
                      }
                      disabled={loading}
                      autoComplete="name"
                      autoFocus
                      placeholder="Enter your full name"
                      aria-invalid={Boolean(fieldErrors.name)}
                      aria-describedby={
                        fieldErrors.name ? 'name-help' : undefined
                      }
                      className={controlClassName(
                        Boolean(fieldErrors.name)
                      )}
                    />
                  </Field>
                )}

                {/* Email */}
                {cardIndex === 1 && (
                  <Field
                    id="email"
                    label="Email Address"
                    error={fieldErrors.email}
                  >
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange('email')}
                      onBlur={handleEmailBlur}
                      disabled={loading}
                      autoComplete="email"
                      autoFocus
                      placeholder="Enter your company email"
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={
                        fieldErrors.email ? 'email-help' : undefined
                      }
                      className={controlClassName(
                        Boolean(fieldErrors.email)
                      )}
                    />
                  </Field>
                )}

                {/* Business unit */}
                {cardIndex === 2 && (
                  <Field
                    id="businessUnit"
                    label="Business Unit"
                    error={fieldErrors.businessUnit}
                    hint={businessUnitHint}
                  >
                    <MinimalSelect
                      id="businessUnit"
                      value={formData.businessUnit}
                      onChange={handleChange('businessUnit')}
                      disabled={loading}
                      error={fieldErrors.businessUnit}
                      hint={businessUnitHint}
                      autoFocus
                    >
                      <option value="" disabled>
                        Select Business Unit
                      </option>
                      <option value="NBFI">
                        NBFI (New Barbizon Fashion Inc.)
                      </option>
                      <option value="EPC">
                        EPC (Everyday Products Corp.)
                      </option>
                    </MinimalSelect>
                  </Field>
                )}

                {/* Role */}
                {cardIndex === 3 && (
                  <Field id="role" label="Role" error={fieldErrors.role}>
                    <MinimalSelect
                      id="role"
                      value={formData.role}
                      onChange={handleChange('role')}
                      disabled={loading}
                      error={fieldErrors.role}
                      autoFocus
                    >
                      <option value="employee">Employee</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="manager">Manager</option>
                      <option value="vp">Vice-President</option>
                      <option value="president">President</option>
                    </MinimalSelect>
                  </Field>
                )}

                {/* Department */}
                {cardIndex === 4 && (
                  <>
                    <Field
                      id="department"
                      label="Department"
                      error={fieldErrors.department}
                    >
                      <MinimalSelect
                        id="department"
                        value={formData.department}
                        onChange={handleChange('department')}
                        disabled={loading || departmentsLoading}
                        error={fieldErrors.department}
                        autoFocus
                      >
                        <option value="" disabled>
                          {departmentsLoading
                            ? 'Loading departments...'
                            : 'Select Department'}
                        </option>

                        {departments.map((department) => (
                          <option key={department.id} value={department.name}>
                            {department.name}
                          </option>
                        ))}
                      </MinimalSelect>
                    </Field>

                    {departmentsError && (
                      <div role="alert" className="text-sm text-red-600">
                        <p>{departmentsError}</p>

                        <button
                          type="button"
                          onClick={() => setDepartmentRetry((prev) => prev + 1)}
                          className={`${linkClassName} mt-2`}
                        >
                          Try again
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Password */}
                {cardIndex === 5 && (
                  <>
                    <PasswordField
                      id="password"
                      label="Password"
                      value={formData.password}
                      onChange={handleChange('password')}
                      visible={showPassword}
                      onToggle={() =>
                        setShowPassword((prev) => !prev)
                      }
                      disabled={loading}
                      error={fieldErrors.password}
                      hint="Must be at least 6 characters."
                      placeholder="Enter your password"
                      autoFocus
                    />

                    <PasswordField
                      id="confirmPassword"
                      label="Confirm Password"
                      value={formData.confirmPassword}
                      onChange={handleChange('confirmPassword')}
                      visible={showConfirmPassword}
                      onToggle={() =>
                        setShowConfirmPassword((prev) => !prev)
                      }
                      disabled={loading}
                      error={fieldErrors.confirmPassword}
                      placeholder="Confirm your password"
                    />
                  </>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-3">
                {cardIndex > 0 && (
                  <button
                    type="button"
                    onClick={handlePreviousCard}
                    disabled={loading}
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-white/80 bg-white/50 px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                )}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    (cardIndex === 4 &&
                      (departmentsLoading || Boolean(departmentsError)))
                  }
                  className={`${primaryButtonClassName} flex-1`}
                >
                  {loading && (
                    <Loader2
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin"
                    />
                  )}

                  {loading
                    ? 'Sending Code...'
                    : isLastCard
                      ? 'Send Verification Code'
                      : 'Next'}
                </button>
              </div>

              <p className="pt-2 text-center text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  disabled={loading}
                  className={`${linkClassName} font-semibold`}
                >
                  Sign In
                </button>
              </p>
            </form>
          </>
        )}

        {/* Email verification */}
        {step === 'otp' && !success && (
          <>
            <p className="mb-6 break-words text-center text-sm leading-relaxed text-gray-600">
              Enter the {OTP_LENGTH}-digit code sent to{' '}
              <span className="font-medium text-gray-800">
                {maskEmail(formData.email)}
              </span>
              .
            </p>

            {otpError && (
              <div
                id="otp-error"
                role="alert"
                className="mb-5 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700"
              >
                {otpError}
              </div>
            )}

            <form
              onSubmit={handleVerifyOtp}
              aria-busy={otpBusy}
              className="space-y-5"
            >
              <Field id="otp" label="Verification Code">
                <input
                  id="otp"
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
                    setOtpError('');
                  }}
                  disabled={otpBusy}
                  maxLength={OTP_LENGTH}
                  autoFocus
                  placeholder="000000"
                  aria-invalid={Boolean(otpError)}
                  aria-describedby={
                    otpError ? 'otp-expiry otp-error' : 'otp-expiry'
                  }
                  className={`${controlClassName(
                    Boolean(otpError)
                  )} text-center tracking-[0.4em]`}
                />
              </Field>

              <p
                id="otp-expiry"
                className={`text-center text-xs ${
                  expiresIn > 0 ? 'text-gray-600' : 'text-red-600'
                }`}
              >
                {expiresIn > 0
                  ? `Code expires in ${formatTime(expiresIn)}`
                  : 'Code expired. Please request a new one.'}
              </p>

              <button
                type="submit"
                disabled={
                  otpBusy ||
                  otp.length !== OTP_LENGTH ||
                  expiresIn <= 0
                }
                className={primaryButtonClassName}
              >
                {otpLoading && (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                )}

                {otpLoading
                  ? 'Verifying...'
                  : 'Verify & Create Account'}
              </button>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setCardIndex(1);
                    setOtp('');
                    setOtpError('');
                    setError('');
                  }}
                  disabled={otpBusy}
                  className="inline-flex items-center gap-1 rounded text-sm font-medium text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change email
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpBusy || resendCooldown > 0}
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
      </section>
    </main>
  );
}