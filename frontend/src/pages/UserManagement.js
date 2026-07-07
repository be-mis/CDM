import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Plus, Search, Edit2, Trash2, Shield, ShieldCheck,
    ChevronLeft, ChevronRight, Users as UsersIcon,
} from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Loading } from '../components/ui/Loading';

const ROLES = ['employee', 'manager', 'accounting', 'admin'];

// Reusable pagination control (mirrors Approvals.js)
const Pagination = ({ currentPage, totalItems, pageSize, onPageChange, onPageSizeChange }) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    if (totalItems === 0) return null;

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalItems);

    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
            pageNumbers.push(i);
        } else if (pageNumbers[pageNumbers.length - 1] !== '...') {
            pageNumbers.push('...');
        }
    }

    return (
        <div className="flex items-center justify-between flex-wrap gap-3 px-2 py-3">
            <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-gray-600">
                    Showing <span className="font-medium text-gray-900">{start}</span>–
                    <span className="font-medium text-gray-900">{end}</span> of{' '}
                    <span className="font-medium text-gray-900">{totalItems}</span>
                </p>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 whitespace-nowrap">Rows per page</label>
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                {pageNumbers.map((p, idx) =>
                    p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-sm text-gray-400">…</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`min-w-[2rem] px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                p === currentPage
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-50 border border-gray-300'
                            }`}
                        >
                            {p}
                        </button>
                    )
                )}
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

const emptyForm = {
    id: null,
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: '',
    businessUnit: '',
    isApprover: false,
};

const roleBadgeStyles = {
    admin: 'bg-purple-100 text-purple-800',
    accounting: 'bg-blue-100 text-blue-800',
    manager: 'bg-amber-100 text-amber-800',
    employee: 'bg-gray-100 text-gray-700',
};

const UserManagement = () => {
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState('add'); // 'add' or 'edit'
    const [form, setForm] = useState(emptyForm);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/users');
            if (res.data.success) {
                setUsers(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            setNotification({ message: 'Failed to load users', severity: 'error' });
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchDepartments = useCallback(async () => {
        try {
            const res = await api.get('/departments');
            setDepartments(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
        fetchDepartments();
    }, [fetchUsers, fetchDepartments]);

    useEffect(() => {
        if (notification) {
            const t = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(t);
        }
    }, [notification]);

    const filteredUsers = useMemo(() => {
        const q = searchTerm.toLowerCase();
        return users.filter(u => {
            const matchesSearch = !searchTerm ||
                (u.name || '').toLowerCase().includes(q) ||
                (u.email || '').toLowerCase().includes(q) ||
                (u.department || '').toLowerCase().includes(q);
            const matchesRole = roleFilter === 'all' || u.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [users, searchTerm, roleFilter]);

    const paginatedUsers = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredUsers.slice(start, start + pageSize);
    }, [filteredUsers, page, pageSize]);

    useEffect(() => {
        const maxPage = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
        if (page > maxPage) setPage(maxPage);
    }, [filteredUsers.length, page, pageSize]);

    const stats = useMemo(() => ({
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        approvers: users.filter(u => u.isApprover).length,
    }), [users]);

    const handlePageSizeChange = (size) => {
        setPageSize(size);
        setPage(1);
    };

    const openAddForm = () => {
        setForm(emptyForm);
        setFormMode('add');
        setFormError('');
        setFormOpen(true);
    };

    const openEditForm = (u) => {
        setForm({
            id: u.id,
            name: u.name || '',
            email: u.email || '',
            password: '',
            role: u.role || 'employee',
            department: u.department || '',
            businessUnit: u.business_unit || '',
            isApprover: !!u.isApprover,
        });
        setFormMode('edit');
        setFormError('');
        setFormOpen(true);
    };

    const handleFormChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setFormError('');

        if (!form.name.trim() || !form.email.trim()) {
            setFormError('Name and email are required');
            return;
        }
        if (formMode === 'add' && !form.password.trim()) {
            setFormError('Password is required for new users');
            return;
        }
        if (form.isApprover && !form.department) {
            setFormError('Department is required to set this user as an approver');
            return;
        }

        const payload = {
            name: form.name.trim(),
            email: form.email.trim(),
            role: form.role,
            department: form.department || null,
            businessUnit: form.businessUnit || null,
            isApprover: form.isApprover,
        };
        if (form.password.trim()) payload.password = form.password.trim();

        try {
            setSaving(true);
            if (formMode === 'add') {
                await api.post('/users', payload);
                setNotification({ message: 'User created successfully', severity: 'success' });
            } else {
                await api.put(`/users/${form.id}`, payload);
                setNotification({ message: 'User updated successfully', severity: 'success' });
            }
            setFormOpen(false);
            fetchUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            setFormError(error.response?.data?.message || 'Failed to save user');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            setDeleting(true);
            await api.delete(`/users/${deleteTarget.id}`);
            setNotification({ message: 'User deleted successfully', severity: 'success' });
            setDeleteTarget(null);
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            setNotification({ message: error.response?.data?.message || 'Failed to delete user', severity: 'error' });
            setDeleteTarget(null);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div>
            <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management 👥</h1>
                    <p className="text-gray-600">Add, edit, and manage user accounts and permissions</p>
                </div>
                <Button startIcon={<Plus className="w-4 h-4" />} onClick={openAddForm}>
                    Add User
                </Button>
            </div>

            {notification && (
                <div className="mb-6">
                    <Alert severity={notification.severity} onClose={() => setNotification(null)}>
                        {notification.message}
                    </Alert>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <Card className="!bg-blue-50 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-800 text-sm font-semibold mb-2">Total Users</p>
                                <h3 className="text-4xl text-blue-800 font-bold">{stats.total}</h3>
                            </div>
                            <UsersIcon className="w-12 h-12 text-blue-800 opacity-30" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="!bg-purple-50 border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-purple-800 text-sm font-semibold mb-2">Admins</p>
                                <h3 className="text-4xl text-purple-800 font-bold">{stats.admins}</h3>
                            </div>
                            <Shield className="w-12 h-12 text-purple-800 opacity-30" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="!bg-teal-50 border border-teal-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-teal-800 text-sm font-semibold mb-2">Approvers</p>
                                <h3 className="text-4xl text-teal-800 font-bold">{stats.approvers}</h3>
                            </div>
                            <ShieldCheck className="w-12 h-12 text-teal-800 opacity-30" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                {loading ? (
                    <Loading message="Loading users..." />
                ) : (
                    <div className="p-6 space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or department..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm outline-none transition-colors"
                            />
                        </div>

                        {/* Role filter pills */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => { setRoleFilter('all'); setPage(1); }}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                                    roleFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                All Roles
                            </button>
                            {ROLES.map((role) => (
                                <button
                                    key={role}
                                    onClick={() => { setRoleFilter(role); setPage(1); }}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                                        roleFilter === role ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                            <table className="w-full min-w-[800px]">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Approver</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {paginatedUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-10 text-center text-gray-400 text-sm">
                                                {searchTerm || roleFilter !== 'all' ? 'No results found.' : 'No results found.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedUsers.map((u) => (
                                            <tr key={u.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2 max-w-[200px]">
                                                        <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-semibold text-indigo-600 shrink-0">
                                                            {(u.name || u.email)?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900 truncate" title={u.name}>
                                                            {u.name}
                                                            {String(currentUser?.id) === String(u.id) && (
                                                                <span className="ml-1.5 text-xs text-gray-400">(you)</span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-700">{u.email}</td>
                                                <td className="px-4 py-4 text-sm text-gray-700">{u.department || '—'}</td>
                                                <td className="px-4 py-4">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${roleBadgeStyles[u.role] || 'bg-gray-100 text-gray-700'}`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    {u.isApprover ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                            <ShieldCheck className="w-3 h-3" /> Yes
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">No</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => openEditForm(u)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteTarget(u)}
                                                            disabled={String(currentUser?.id) === String(u.id)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                            title={String(currentUser?.id) === String(u.id) ? "You can't delete your own account" : 'Delete'}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            currentPage={page}
                            totalItems={filteredUsers.length}
                            pageSize={pageSize}
                            onPageChange={setPage}
                            onPageSizeChange={handlePageSizeChange}
                        />
                    </div>
                )}
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                open={formOpen}
                onClose={() => setFormOpen(false)}
                title={formMode === 'add' ? 'Add User' : 'Edit User'}
                maxWidth="sm"
                actions={
                    <>
                        <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : formMode === 'add' ? 'Create User' : 'Save Changes'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    {formError && <Alert severity="error">{formError}</Alert>}

                    <Input
                        label="Full Name"
                        fullWidth
                        required
                        value={form.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                    />
                    <Input
                        label="Email"
                        type="email"
                        fullWidth
                        required
                        value={form.email}
                        onChange={(e) => handleFormChange('email', e.target.value)}
                    />
                    <Input
                        label={formMode === 'add' ? 'Password' : 'New Password (leave blank to keep current)'}
                        type="password"
                        fullWidth
                        required={formMode === 'add'}
                        value={form.password}
                        onChange={(e) => handleFormChange('password', e.target.value)}
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                        <select
                            value={form.role}
                            onChange={(e) => handleFormChange('role', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white capitalize"
                        >
                            {ROLES.map((role) => (
                                <option key={role} value={role} className="capitalize">{role}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
                        <select
                            value={form.department}
                            onChange={(e) => handleFormChange('department', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                        >
                            <option value="">— Select Department —</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.name}>{d.name}</option>
                            ))}
                            {form.department && !departments.some(d => d.name === form.department) && (
                                <option value={form.department}>{form.department} (not in list)</option>
                            )}
                        </select>
                    </div>

                    <Input
                        label="Business Unit (optional)"
                        fullWidth
                        value={form.businessUnit}
                        onChange={(e) => handleFormChange('businessUnit', e.target.value)}
                    />

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.isApprover}
                            onChange={(e) => handleFormChange('isApprover', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-gray-700">This user can approve requests</span>
                    </label>
                    {form.isApprover && !form.department && (
                        <p className="text-xs text-amber-600 -mt-2">Select a department above to enable approver access.</p>
                    )}
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Delete User"
                maxWidth="sm"
                className="text-center"
                actions={
                    <>
                        <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                            {deleting ? 'Deleting...' : 'Delete User'}
                        </Button>
                    </>
                }
            >
                <p className="text-gray-700">
                    Are you sure you want to delete <span className="font-semibold">{deleteTarget?.name}</span>{' '}
                    ({deleteTarget?.email})? This action cannot be undone.
                </p>
            </Modal>
        </div>
    );
};

export default UserManagement;