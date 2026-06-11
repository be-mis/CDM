import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import { InlineAlert } from './ui/Alert';

const PaymentRequirementModal = () => {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        payroll_account: '',
        gcash_number: '',
        gcash_name: ''
    });

    useEffect(() => {
        // Check if user needs to update payment info
        if (user) {
            checkPaymentInfo();
        }
    }, [user]);

    const checkPaymentInfo = async () => {
        try {
            const response = await api.get('/auth/profile');
            if (response.data?.user) {
                const { payroll_account, gcash_number, gcash_name } = response.data.user;

                // If any required field is missing, open modal
                if (!payroll_account || !gcash_number || !gcash_name) {
                    setFormData({
                        payroll_account: payroll_account || '',
                        gcash_number: gcash_number || '',
                        gcash_name: gcash_name || ''
                    });
                    setOpen(true);
                }
            }
        } catch (err) {
            console.error("Failed to check payment info", err);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.payroll_account || !formData.gcash_number || !formData.gcash_name) {
            setError('All payment details are required to proceed.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await api.put('/auth/profile', formData);
            if (response.data.success || response.status === 200) {
                // Success - Close Modal
                setOpen(false);
                // Optionally trigger a user reload or update context
                window.location.reload(); // Hard reload to ensure all states are fresh
            } else {
                setError(response.data.error || 'Failed to update. Please try again.');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={open}
            onClose={() => {}} // Prevent closing
            title={null}
            showCloseButton={false}
            maxWidth="sm"
        >
            <div className="mb-4">
                <h2 className="text-2xl font-bold text-primary-600 mb-2">Action Required</h2>
                <p className="text-sm text-gray-600">
                    Please complete your payment information to continue using the system.
                </p>
            </div>

            {error && (
                <InlineAlert severity="error" className="mb-6">
                    {error}
                </InlineAlert>
            )}

            <form id="payment-setup-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Bank Account Details */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Bank Account Details</h3>
                    <Input
                        fullWidth
                        required
                        label="Payroll Account Number"
                        name="payroll_account"
                        value={formData.payroll_account}
                        onChange={handleChange}
                        placeholder="Enter your bank account number"
                    />
                </div>

                {/* GCash Details */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">GCash Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            fullWidth
                            required
                            label="GCash Number"
                            name="gcash_number"
                            value={formData.gcash_number}
                            onChange={handleChange}
                            placeholder="09XXXXXXXXX"
                        />
                        <Input
                            fullWidth
                            required
                            label="GCash Name"
                            name="gcash_name"
                            value={formData.gcash_name}
                            onChange={handleChange}
                            placeholder="Name on GCash"
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    disabled={loading}
                    loading={loading}
                    startIcon={!loading && <Save className="w-5 h-5" />}
                >
                    {loading ? 'Saving Details...' : 'Save & Continue'}
                </Button>
            </form>
        </Modal>
    );
};

export default PaymentRequirementModal;
