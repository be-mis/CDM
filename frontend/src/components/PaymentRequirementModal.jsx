import React, { useState, useEffect, useId } from 'react';
import { Save, Loader2, CircleAlert } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from './ui/Modal';

const inputStyle =
  'block min-h-[44px] w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 disabled:bg-gray-50 disabled:opacity-60 sm:text-sm';

export default function PaymentRequirementModal() {
  const { user } = useAuth();
  const id = useId();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    payroll_account: '',
    gcash_number: '',
    gcash_name: ''
  });

  useEffect(() => {
    if (!user) return undefined;

    let active = true;

    const checkPaymentInfo = async () => {
      try {
        const response = await api.get('/auth/profile');
        const profile = response.data?.user;

        if (!active || !profile) return;

        const {
          payroll_account,
          gcash_number,
          gcash_name
        } = profile;

        if (!payroll_account || !gcash_number || !gcash_name) {
          setFormData({
            payroll_account: payroll_account || '',
            gcash_number: gcash_number || '',
            gcash_name: gcash_name || ''
          });
          setOpen(true);
        }
      } catch (err) {
        console.error('Failed to check payment info', err);
      }
    };

    checkPaymentInfo();

    return () => {
      active = false;
    };
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    if (
      !formData.payroll_account.trim() ||
      !formData.gcash_number.trim() ||
      !formData.gcash_name.trim()
    ) {
      setError('All payment details are required to proceed.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await api.put('/auth/profile', formData);

      if (response.data.success || response.status === 200) {
        setOpen(false);
        window.location.reload();
      } else {
        setError(
          response.data.error || 'Failed to update. Please try again.'
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Network error. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    {
      name: 'payroll_account',
      label: 'Payroll Account Number',
      placeholder: 'Enter your bank account number',
      inputMode: 'numeric'
    },
    {
      name: 'gcash_number',
      label: 'GCash Number',
      placeholder: '09XXXXXXXXX',
      inputMode: 'numeric'
    },
    {
      name: 'gcash_name',
      label: 'GCash Name',
      placeholder: 'Name on GCash',
      inputMode: 'text'
    }
  ];

  return (
    <Modal
      open={open}
      onClose={() => {}}
      title={null}
      showCloseButton={false}
      maxWidth="sm"
    >
      <div className="w-full min-w-0">
        <header className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Complete Payment Information
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            Please complete your payment information to continue
            using the system.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-3 text-red-700"
          >
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <p className="text-sm leading-relaxed">{error}</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          aria-busy={loading}
          className="space-y-4"
        >
          {fields.map((field) => (
            <div key={field.name} className="min-w-0">
              <label
                htmlFor={`${id}-${field.name}`}
                className="mb-2 block text-xs font-semibold text-gray-600"
              >
                {field.label}
              </label>

              <input
                id={`${id}-${field.name}`}
                name={field.name}
                type="text"
                inputMode={field.inputMode}
                value={formData[field.name]}
                onChange={handleChange}
                disabled={loading}
                placeholder={field.placeholder}
                required
                className={inputStyle}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading ? 'Saving Details...' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </Modal>
  );
}