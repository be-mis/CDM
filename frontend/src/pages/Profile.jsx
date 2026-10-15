import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { Loading } from '../components/ui/Loading';

const Profile = () => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        payroll_account: '',
        gcash_number: '',
        gcash_name: ''
    });
    const [originalData, setOriginalData] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setFetching(true);
        try {
            const response = await api.get('/auth/profile');
            const data = response.data;
            const profileData = {
                payroll_account: data.user.payroll_account || '',
                gcash_number: data.user.gcash_number || '',
                gcash_name: data.user.gcash_name || ''
            };
            setFormData(profileData);
            setOriginalData(profileData);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to fetch profile');
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleEdit = () => {
        setIsEditing(true);
        setMessage(null);
        setError(null);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData(originalData);
        setMessage(null);
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.payroll_account || !formData.gcash_number || !formData.gcash_name) {
            setError('Bank account details and GCash details are required.');
            return;
        }

        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            const response = await api.put('/auth/profile', formData);
            if (response.data.success || response.status === 200) {
                setMessage('Profile details updated successfully');
                setOriginalData(formData);
                setIsEditing(false);
                // Auto-dismiss success message after 3 seconds
                setTimeout(() => setMessage(null), 3000);
            } else {
                setError(response.data.error || 'Failed to update profile');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return <Loading message="Loading profile..." />;
    }

    return (
        <div className="max-w-full mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h1>
                    <p className="text-gray-600">Manage your account payment details</p>
                </div>
            </div>

            {/* Success/Error Messages */}
            {(message || error) && (
                <div className="mb-6">
                    <Alert severity={error ? 'error' : 'success'} onClose={() => { setMessage(null); setError(null); }}>
                        {message || error}
                    </Alert>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Personal Information Section */}
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Input
                            fullWidth
                            label="Full Name"
                            value={user?.name || ''}
                            readOnly
                            className="bg-gray-50"
                        />
                        <Input
                            fullWidth
                            label="Email Address"
                            value={user?.email || ''}
                            readOnly
                            className="bg-gray-50"
                        />
                        <Input
                            fullWidth
                            label="Department"
                            value={user?.department || ''}
                            readOnly
                            className="bg-gray-50"
                        />
                    </div>
                </div>

                <div className="my-8 border-t border-gray-200"></div>

                {/* Payment Information Section */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Payment Information</h2>
                        {!isEditing && (
                            <Button
                                variant="secondary"
                                onClick={handleEdit}
                            >
                                Edit Details
                            </Button>
                        )}
                    </div>

                    {/* Bank Account Details */}
                    <div className="mb-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Bank Account Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                fullWidth
                                label="Payroll Account Number"
                                name="payroll_account"
                                value={formData.payroll_account}
                                onChange={handleChange}
                                placeholder="Enter your bank account number"
                                readOnly={!isEditing}
                                className={!isEditing ? 'bg-gray-50' : ''}
                            />
                        </div>
                    </div>

                    {/* GCash Details */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">GCash Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                fullWidth
                                label="GCash Number"
                                name="gcash_number"
                                value={formData.gcash_number}
                                onChange={handleChange}
                                placeholder="09XXXXXXXXX"
                                readOnly={!isEditing}
                                className={!isEditing ? 'bg-gray-50' : ''}
                            />
                            <Input
                                fullWidth
                                label="GCash Name"
                                name="gcash_name"
                                value={formData.gcash_name}
                                onChange={handleChange}
                                placeholder="Name registered on GCash"
                                readOnly={!isEditing}
                                className={!isEditing ? 'bg-gray-50' : ''}
                            />
                        </div>
                    </div>
                </div>

                {/* Action Buttons (only when editing) */}
                {isEditing && (
                    <div className="mt-8 flex justify-end gap-4">
                        <Button
                            variant="secondary"
                            size="lg"
                            onClick={handleCancel}
                            disabled={loading}
                            className="px-8"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            disabled={loading}
                            loading={loading}
                            startIcon={!loading && <Save className="w-5 h-5" />}
                            className="px-10"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default Profile;
