import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { InlineAlert } from '../components/ui/Alert';
import { Card, CardContent } from '../components/ui/Card';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Basic validation
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
      await axios.post(
        `${process.env.REACT_APP_API_BASE}/auth/forgot-password`,
        { email }
      );

      setSuccess(true);

      // Redirect to login after 5 seconds
      setTimeout(() => {
        navigate('/login');
      }, 5000);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.message || 'Failed to process request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-secondary-500 py-8 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
              Forgot Password
            </h1>
            <p className="text-sm text-gray-600 text-center mb-6">
              Enter your email address and we'll send you a link to reset your password
            </p>

            {error && (
              <InlineAlert severity="error" className="mb-4">
                {error}
              </InlineAlert>
            )}

            {success && (
              <InlineAlert severity="success" className="mb-4">
                If the email exists, a password reset link has been sent.
                <br />
                Redirecting to login in 5 seconds...
              </InlineAlert>
            )}

            {!success && (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  Send Reset Link
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
