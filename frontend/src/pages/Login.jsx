import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, CircleAlert } from 'lucide-react';

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
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    if (!formData.email.trim() || !formData.password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await login(
        formData.email.trim(),
        formData.password
      );

      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(
          result.error ||
            'Login failed. Please check your credentials and try again.'
        );
      }
    } catch {
      setError(
        'Login failed. Please check your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClassName = `block w-full rounded-xl border bg-white/50 px-3.5 py-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-500 focus:bg-white/70 disabled:cursor-not-allowed disabled:bg-white/30 disabled:opacity-60 ${
    error
      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200/60'
      : 'border-white/80 focus:border-purple-400 focus:ring-2 focus:ring-purple-200/60'
  }`;


  return (
    <main className="relative isolate flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-500 to-secondary-500 px-4 py-10 sm:px-6">

      {/* Glass card */}
      <section
        aria-labelledby="login-title"
        className="w-full max-w-xl rounded-3xl border border-white/70 bg-white/60 px-6 py-8 shadow-xl shadow-purple-950/10 backdrop-blur-xl sm:p-10"
      >
        <header className="mb-8 text-center">
          <img
            src="/BElogo.png"
            alt="Barbizon Everyday"
            className="mx-auto mb-5 h-24 w-24 object-contain"
          />

          <h1
            id="login-title"
            className="text-3xl font-semibold tracking-tight text-gray-900"
          >
            Cash Disbursement Module
          </h1>

          <p className="mt-5 text-sm text-gray-600">
            Sign in to your account
          </p>
        </header>

        {error && (
          <div
            id="login-error"
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-red-700"
          >
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0"
            />

            <p className="text-sm font-medium leading-relaxed">
              {error}
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          aria-busy={loading}
          aria-describedby={error ? 'login-error' : undefined}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="email-address"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              Email Address
            </label>

            <input
              id="email-address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              disabled={loading}
              autoComplete="email"
              placeholder="Enter your email"
              required
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'login-error' : undefined}
              className={inputClassName}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-bold text-gray-700"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                disabled={loading}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error' : undefined}
                className={`${inputClassName} pr-12`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={loading}
                aria-label={
                  showPassword ? 'Hide password' : 'Show password'
                }
                aria-controls="password"
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-gray-500 transition-colors hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500 disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="rounded text-sm font-medium text-purple-700 hover:text-purple-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-700/15 transition-colors hover:bg-purple-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <Loader2
                aria-hidden="true"
                className="h-4 w-4 animate-spin"
              />
            )}
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          <p className="pt-2 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="rounded font-semibold text-purple-700 hover:text-purple-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
            >
              Sign Up
            </button>
          </p>
        </form>
      </section>
    </main>
  );
}