import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  HandCoins, Landmark, ReceiptText, Coins, Eye, Edit2, Trash2, Search,
  XCircle, AlertTriangle, Receipt, Loader2, RefreshCw, Hourglass, CheckCircle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import CashAdvanceForm from '../components/CashAdvanceForm';
import LiquidationForm from '../components/LiquidationForm';
import ReimbursementForm from '../components/ReimbursementForm';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import { Loading } from '../components/ui/Loading';
import Tooltip from '../components/ui/Tooltip';

// Reusable pagination control used under each request table
const Pagination = ({ currentPage, totalItems, pageSize, onPageChange, onPageSizeChange }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems === 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // Build a compact page-number list: first, last, current ± 1, with ellipses
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

const MyRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const TAB_SLUGS = ['cash-advances', 'liquidations', 'reimbursements'];
  const [searchParams, setSearchParams] = useSearchParams();
  const [tabValue, setTabValue] = useState(() => {
    const slug = searchParams.get('tab');
    const idx = TAB_SLUGS.indexOf(slug);
    return idx !== -1 ? idx : 0;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState(false);
  const [cashAdvances, setCashAdvances] = useState([]);
  const [liquidations, setLiquidations] = useState([]);
  const [reimbursements, setReimbursements] = useState([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmType, setConfirmType] = useState(''); // 'cashAdvance' | 'reimbursement' | 'liquidation'
  const [confirmAction, setConfirmAction] = useState(''); // 'cancel' | 'delete'
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [retryCount, setRetryCount] = useState({ cashAdvances: 0, liquidations: 0, reimbursements: 0 });
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState({ cashAdvances: 1, liquidations: 1, reimbursements: 1 });

  // Snackbar handler
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Handler to open view modal (fetch full details)
  const handleView = useCallback(async (request) => {
    try {
      setViewLoading(true);
      const response = await api.get(`/cash-advances/${request.id}`);
      // console.log('Fetched cash advance details for view:', response.data);
      if (response.data && response.data.success) {
        const data = response.data.data;
        const viewData = {
          id: data.id,
          advanceNumber:    data.advance_number || request.refNumber,
          advanceDate:      data.advance_date || request.requestDate,
          requestedBy:      data.requested_by || '',
          department:       data.department || request.department || '',
          businessUnit:     data.business_unit || '',
          purpose:          data.purpose || '',
          projectName:      data.project_name || '',
          dateNeeded:       data.date_needed || '',
          startDate:        data.start_date || '',
          endDate:          data.end_date || '',
          dateCoverage:     data.date_coverage || '',
          requestedAmount:  data.requested_amount,
          approvedAmount:   data.approved_amount,
          paymentMethod:    data.payment_method,
          gcashName:        data.gcash_name || '',
          accountNumber:    data.account_number,
          remarks:          data.remarks,
          status:           data.status,
          // Budget breakdown rows from the cash_advance_breakdown table
          items:            data.items       || [],
          attachments:      data.attachments || [],
          paymentReason:    data.payment_reason || '',
          release_remarks:  data.release_remarks || '',
        };
        setSelectedRequest(viewData);
      } else {
        setSelectedRequest(request);
      }
      setViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching cash advance details for view:', error);
      setSelectedRequest(request);
      setViewModalOpen(true);
    } finally {
      setViewLoading(false);
    }
  }, []);

  // Handler to open view modal for liquidations (fetch full details)
  const handleViewLiquidation = useCallback(async (request) => {
    try {
      setViewLoading(true);
      const response = await api.get(`/liquidations/${request.id}`);
      if (response.data && response.data.success) {
        const data = response.data.data;
        const viewData = {
          id: data.id,
          liquidationNumber: data.liquidation_number || request.refNumber,
          liquidationDate:   data.liquidation_date   || request.submitDate,
          requestedBy:         data.submitted_by         || request.submittedBy,
          department:          data.department_id,        // ✅ fix
          departmentName:      data.department_name,      // ✅ fix
          businessUnit:        data.business_unit || '',
          purpose:             data.purpose || '',
          dateNeeded:          data.date_needed || '',    // ✅ ADD THIS
          dateCoverageFrom: data.date_coverage_from || data.start_date || '',
          dateCoverageTo:   data.date_coverage_to   || data.end_date   || '',
          cashAdvanceId:       data.cash_advance_id,
          cashAdvanceNumber:   data.cash_advance_number,
          totalAdvanceAmount:  data.total_advance_amount,
          totalAmount:         data.total_amount,
          paymentMethod:       data.payment_method,
          gcashName:           data.gcash_name || '',
          checkNumber:         data.check_number,
          accountNumber:       data.account_number,
          remarks:             data.remarks,
          status:              data.status,
          items:               data.items         || [],
          transportation:      data.transportation || [],
          attachments:         data.attachments    || [],
          paymentReason:       data.payment_reason || '',
          release_remarks:     data.release_remarks || '',
        };
        setSelectedRequest(viewData);
      } else {
        setSelectedRequest(request);
      }
      setViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching liquidation details for view:', error);
      setSelectedRequest(request);
      setViewModalOpen(true);
    } finally {
      setViewLoading(false);
    }
  }, []);

  const handleViewReimbursement = useCallback(async (request) => {
    try {
      setViewLoading(true);
      const response = await api.get(`/reimbursements/${request.id}`);
      if (response.data && response.data.success) {
        const data = response.data.data;
        const viewData = {
          id: data.id,
          reimbursementNumber: data.reimbursement_number || request.refNumber,
          reimbursementDate:   data.reimbursement_date   || request.submitDate,
          requestedBy:         data.submitted_by         || request.submittedBy,
          department:          data.department_id,        
          departmentName:      data.department_name,      
          businessUnit:        data.business_unit || '',
          purpose:             data.purpose || '',
          dateNeeded:          data.date_needed || '',    
          dateCoverageFrom:    data.start_date || data.period_covered_from || '',
          dateCoverageTo:      data.end_date   || data.period_covered_to   || '',
          totalAmount:         data.total_amount,
          paymentMethod:       data.payment_method,
          gcashName:           data.gcash_name || '',
          checkNumber:         data.check_number,
          accountNumber:       data.account_number,
          remarks:             data.remarks,
          status:              data.status,
          expenses:            data.expenses    || [],
          itinerary:           data.itinerary   || [],
          attachments:         data.attachments || [],
          paymentReason:       data.payment_reason || '',
          release_remarks:     data.release_remarks || '',
        };
        setSelectedRequest(viewData);
      } else {
        setSelectedRequest(request);
      }
      setViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching reimbursement details for view:', error);
      setSelectedRequest(request);
      setViewModalOpen(true);
    } finally {
      setViewLoading(false);
    }
  }, []);

  const closeConfirmModal = () => {
    setConfirmModalOpen(false);
    setConfirmTarget(null);
    setConfirmType('');
    setConfirmAction('');
    setConfirmLoading(false);
  };

  const performConfirmAction = async () => {
    if (!confirmTarget || !confirmType || !confirmAction) return;
    setConfirmLoading(true);
    try {
      let response;
      if (confirmType === 'cashAdvance') {
        if (confirmAction === 'cancel') response = await api.post(`/cash-advances/${confirmTarget.id}/cancel`);
        else response = await api.delete(`/cash-advances/${confirmTarget.id}`);
      } else if (confirmType === 'reimbursement') {
        if (confirmAction === 'cancel') response = await api.post(`/reimbursements/${confirmTarget.id}/cancel`);
        else response = await api.delete(`/reimbursements/${confirmTarget.id}`);
      } else if (confirmType === 'liquidation') {
        if (confirmAction === 'cancel') response = await api.post(`/liquidations/${confirmTarget.id}/cancel`);
        else response = await api.delete(`/liquidations/${confirmTarget.id}`);
      }

      if (response?.data && response.data.success) {
        const displayName = confirmType === 'cashAdvance' ? 'Cash advance' : confirmType === 'reimbursement' ? 'Reimbursement' : 'Liquidation';
        showSnackbar(
          confirmAction === 'cancel' ? `${displayName} cancelled successfully` : `${displayName} deleted successfully`,
          'success'
        );
        // Dispatch update events so other components can refresh themselves
        try {
          if (confirmType === 'liquidation') {
            // Only fetch if it still exists (cancel, not delete)
            if (confirmAction === 'cancel') {
              const liqResp = await api.get(`/liquidations/${confirmTarget.id}`);
              const liq = liqResp?.data?.data;
              if (liq && liq.cash_advance_id) {
                const caResp = await api.get(`/cash-advances/${liq.cash_advance_id}`);
                const updatedCA = caResp?.data?.data || caResp?.data;
                if (updatedCA) window.dispatchEvent(new CustomEvent('ca:updated', { detail: updatedCA }));
              }
            } else {
              // Deleted — just notify with ID so listeners can remove it
              window.dispatchEvent(new CustomEvent('ca:updated', { detail: { id: confirmTarget.id, deleted: true } }));
            }
          } else if (confirmType === 'cashAdvance') {
            if (confirmAction === 'cancel') {
              const caResp = await api.get(`/cash-advances/${confirmTarget.id}`);
              const updatedCA = caResp?.data?.data || caResp?.data;
              if (updatedCA) window.dispatchEvent(new CustomEvent('ca:updated', { detail: updatedCA }));
            } else {
              // Deleted — no need to fetch
              window.dispatchEvent(new CustomEvent('ca:updated', { detail: { id: confirmTarget.id, deleted: true } }));
            }
          }
        } catch (e) {
          console.warn('Error dispatching ca:updated event', e);
        }

        // Refresh appropriate lists
        if (confirmType === 'cashAdvance') fetchCashAdvances();
        if (confirmType === 'reimbursement') fetchReimbursements();
        if (confirmType === 'liquidation') fetchLiquidations();
        if (confirmType === 'cashAdvance' || confirmType === 'reimbursement') fetchLiquidations();
      } else {
        showSnackbar('Error performing action: ' + (response?.data?.message || 'Unknown'), 'error');
      }
    } catch (error) {
      console.error('Error performing confirm action:', error);
      showSnackbar('Error: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setConfirmLoading(false);
      closeConfirmModal();
      setLoading(false);
    }
  };

  // Handler to navigate to edit form (fetch full details first)
  const handleEdit = async (request) => {
    try {
      setLoading(true);
      const response = await api.get(`/cash-advances/${request.id}`);
      if (response.data && response.data.success) {
        const data = response.data.data;
        const editData = {
          id: data.id,
          advanceNumber:    data.advance_number,
          advanceDate:      data.advance_date,
          requestedBy:      data.requested_by || '',
          department:       data.department || '',
          businessUnit:     data.business_unit || '',
          purpose:          data.purpose || '',
          projectName:      data.project_name || '',
          dateNeeded:       data.date_needed || '',
          startDate:        data.start_date || '',
          endDate:          data.end_date || '',
          dateCoverage:     data.date_coverage || '',
          requestedAmount:  data.requested_amount,
          paymentMethod:    data.payment_method,
          gcashName:        data.gcash_name || '',
          accountNumber:    data.account_number,
          remarks:          data.remarks,
          status:           data.status,
          // Budget breakdown rows from the cash_advance_breakdown table
          items:            data.items       || [],
          attachments:      data.attachments || [],
          paymentReason:    data.payment_reason || '',
          release_remarks:  data.release_remarks || '',
        };

        navigate('/cash-advance', { state: { editData } });
      } else {
        navigate('/cash-advance', { state: { editData: request } });
      }
    } catch (error) {
      console.error('Error fetching cash advance details:', error);
      navigate('/cash-advance', { state: { editData: request } });
    } finally {
      setLoading(false);
    }
  };

  // Handler to close modals
  const handleCloseModal = () => {
    setViewModalOpen(false);
    setSelectedRequest(null);
  };

  const fetchCashAdvances = useCallback(async (isRetry = false) => {
    try {
      setLoading(true);
      const response = await api.get('/cash-advances');
      if (response.data.success) {
        const mappedData = response.data.data.map(item => ({
          id: item.id,
          refNumber: item.advance_number,
          purpose: item.purpose,
          amount: parseFloat(item.requested_amount),
          requestDate: item.advance_date,
          status: formatStatus(item.status),
          rawStatus: item.status,
          approver: item.status === 'pending' ? '-' : item.status === 'draft' ? '-' : (item.approver_name || 'N/A'),
          department: item.department,
          advanceType: item.advance_type,
          remarks: item.remarks || '',
          releaseRemarks: item.release_remarks || '',
          isOverdue: !!item.is_overdue,
          liquidationDeadline: item.liquidation_deadline || null
        }));
        setCashAdvances(mappedData);
        setRetryCount(prev => ({ ...prev, cashAdvances: 0 }));
      }
    } catch (error) {
      console.error('Error fetching cash advances:', error);
      if (!isRetry && retryCount.cashAdvances < 2) {
        setRetryCount(prev => ({ ...prev, cashAdvances: prev.cashAdvances + 1 }));
        showSnackbar(`Retrying cash advances... (${retryCount.cashAdvances + 1}/2)`, 'warning');
        setTimeout(() => fetchCashAdvances(true), 1000);
      } else {
        setCashAdvances([]);
        showSnackbar('Failed to load cash advances. Please refresh the page.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount.cashAdvances]);

  const fetchLiquidations = useCallback(async (isRetry = false) => {
    try {
      setLoading(true);
      const response = await api.get('/liquidations');
      if (response.data.success) {
        const mappedData = response.data.data.map(item => ({
          id: item.id,
          refNumber: item.liquidation_number,
          cashAdvanceRef: item.cash_advance_number,
          totalExpenses: parseFloat(item.total_actual_amount),
          refundAmount: parseFloat(item.refund_amount || 0),
          additionalPayment: parseFloat(item.additional_payment || 0),
          variance: parseFloat(item.variance || 0),
          submitDate: item.liquidation_date,
          status: formatStatus(item.status),
          rawStatus: item.status,
          department: item.department,
          approver: item.status === 'pending' ? '-' : item.status === 'draft' ? '-' : (item.approver_name || 'N/A'),
          paymentMethod: item.payment_method,
          gcashName: item.gcash_name,
          accountNumber: item.account_number,
          remarks: item.remarks || '',
          releaseRemarks: item.release_remarks || ''
        }));
        setLiquidations(mappedData);
        setRetryCount(prev => ({ ...prev, liquidations: 0 }));
      }
    } catch (error) {
      console.error('Error fetching liquidations:', error);
      if (!isRetry && retryCount.liquidations < 2) {
        setRetryCount(prev => ({ ...prev, liquidations: prev.liquidations + 1 }));
        showSnackbar(`Retrying liquidations... (${retryCount.liquidations + 1}/2)`, 'warning');
        setTimeout(() => fetchLiquidations(true), 1000);
      } else {
        setLiquidations([]);
        showSnackbar('Failed to load liquidations. Please refresh the page.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount.liquidations]);

  const fetchReimbursements = useCallback(async (isRetry = false) => {
    try {
      setLoading(true);
      const response = await api.get('/reimbursements');
      if (response.data && response.data.success) {
        const mapped = response.data.data.map(item => ({
          id: item.id,
          refNumber: item.reimbursement_number,
          purpose: item.purpose,
          amount: parseFloat(item.total_amount || 0),
          periodFrom: item.period_covered_from,
          periodTo: item.period_covered_to,
          submitDate: item.reimbursement_date,
          status: formatStatus(item.status),
          rawStatus: item.status,
          approver: item.status === 'pending' ? '-' : item.status === 'draft' ? '-' : (item.approver_name || 'N/A'),
          department:     item.department_id,
          departmentName: item.department_name,
          paymentMethod: item.payment_method,
          gcashName: item.gcash_name,
          accountNumber: item.account_number,
          remarks: item.remarks || '',
          releaseRemarks: item.release_remarks || ''
        }));
        setReimbursements(mapped);
        setRetryCount(prev => ({ ...prev, reimbursements: 0 }));
      }
    } catch (error) {
      console.error('Error fetching reimbursements:', error);
      if (!isRetry && retryCount.reimbursements < 2) {
        setRetryCount(prev => ({ ...prev, reimbursements: prev.reimbursements + 1 }));
        showSnackbar(`Retrying reimbursements... (${retryCount.reimbursements + 1}/2)`, 'warning');
        setTimeout(() => fetchReimbursements(true), 1000);
      } else {
        setReimbursements([]);
        showSnackbar('Failed to load reimbursements. Please refresh the page.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount.reimbursements]);

  // Handler to create a liquidation from an approved cash advance
  const handleCreateLiquidation = async (request) => {
    try {
      setLoading(true);
      const response = await api.get(`/cash-advances/${request.id}`);
      if (response.data && response.data.success) {
        const data = response.data.data;
        const cashAdvance = {
          id: data.id,
          advanceNumber: data.advance_number || data.advanceNumber,
          requestedBy: data.requested_by || data.requestedBy,
          department: data.department,
          totalAdvanceAmount: data.requested_amount || data.requestedAmount || data.amount || 0,
          items: data.items || [],
          activities: data.activities || [],
          advanceType: data.advance_type || data.advanceType || 'cash'
        };
        navigate('/liquidation', { state: { cashAdvance } });
      } else {
        navigate('/liquidation', { state: { cashAdvance: request } });
      }
    } catch (error) {
      console.error('Error fetching cash advance for liquidation:', error);
      navigate('/liquidation', { state: { cashAdvance: request } });
    } finally {
      setLoading(false);
    }
  };

  // Handler to edit a liquidation
  const handleEditLiquidation = async (request) => {
    try {
      setLoading(true);
      const response = await api.get(`/liquidations/${request.id}`);
      if (response.data && response.data.success) {
        const data = response.data.data;
        const editData = {
          id: data.id,
          liquidationNumber: data.liquidation_number,
          liquidationDate: data.liquidation_date,
          cashAdvanceId: data.cash_advance_id,
          cashAdvanceNumber: data.cash_advance_number,
          advanceType: data.advance_type || 'cash',
          submittedBy: data.submitted_by,
          department: data.department,
          departmentName: data.department_name,
          totalAdvanceAmount: data.total_advance_amount,
          totalActualAmount: data.total_actual_amount,
          refundAmount: data.refund_amount,
          additionalPayment: data.additional_payment,
          paymentMethod: data.payment_method,
          paymentReason: data.payment_reason || '',
          checkNumber: data.check_number,
          accountNumber: data.account_number,
          purpose: data.purpose || '',
          remarks: data.remarks,
          status: data.status,
          businessUnit: data.business_unit || '',
          dateOfCA: data.date_of_ca || '',
          startDate: data.start_date || '',
          endDate: data.end_date || '',
          dateCoverage: data.date_coverage || '',
          date_coverage_from: data.date_coverage_from || null,  // ✅ ADD THIS
          date_coverage_to:   data.date_coverage_to   || null,  // ✅ ADD THIS
          // Pass items and transportation as-is — getLiquidationById already returns
          // the correct shape that LiquidationForm's mapIncomingExpense /
          // mapIncomingItinerary expect (particulars/actualAmount/storeName/fromPlace/etc.)
          items: data.items || [],
          transportation: data.transportation || [],
          attachments: data.attachments || []
        };
        navigate('/liquidation', { state: { editData } });
      } else {
        navigate('/liquidation', { state: { editData: request } });
      }
    } catch (error) {
      console.error('Error fetching liquidation details:', error);
      navigate('/liquidation', { state: { editData: request } });
    } finally {
      setLoading(false);
    }
  };

  // Handler to edit a reimbursement
  const handleEditReimbursement = async (request) => {
    try {
      setLoading(true);
      const response = await api.get(`/reimbursements/${request.id}`);
      if (response.data && response.data.success) {
        const data = response.data.data;
        const editData = {
          id: data.id,
          reimbursementNumber: data.reimbursement_number,
          reimbursementDate: data.reimbursement_date,
          requestedBy: data.submitted_by,
          department: data.department_id,
          departmentName: data.department_name,
          businessUnit: data.business_unit || '',
          purpose: data.purpose || '',
          dateNeeded: data.date_needed || '',
          dateCoverageFrom: data.start_date || data.period_covered_from || '',
          dateCoverageTo:   data.end_date   || data.period_covered_to   || '',
          totalAmount: data.total_amount,
          paymentMethod: data.payment_method,
          gcashName: data.gcash_name || '',
          checkNumber: data.check_number,
          accountNumber: data.account_number,
          remarks: data.remarks,
          status: data.status,
          expenses:  data.expenses  || [],
          itinerary: data.itinerary || [],
          attachments: data.attachments || []
        };
        navigate('/reimbursement', { state: { editData } });
      } else {
        navigate('/reimbursement', { state: { editData: request } });
      }
    } catch (error) {
      console.error('Error fetching reimbursement details:', error);
      navigate('/reimbursement', { state: { editData: request } });
    } finally {
      setLoading(false);
    }
  };

  // Handler to delete a liquidation
  const handleDeleteLiquidation = async (request) => {
    const statusLower = (request.status || '').toLowerCase();
    const action = statusLower.includes('pending') ? 'cancel' : 'delete';
    setConfirmTarget(request);
    setConfirmType('liquidation');
    setConfirmAction(action);
    setConfirmModalOpen(true);
  };

  // Handler to delete or cancel a cash advance
  const handleDeleteCashAdvance = async (request) => {
    const statusLower = (request.status || '').toLowerCase();
    const action = statusLower.includes('pending') ? 'cancel' : 'delete';
    setConfirmTarget(request);
    setConfirmType('cashAdvance');
    setConfirmAction(action);
    setConfirmModalOpen(true);
  };

  // Handler to delete or cancel a reimbursement
  const handleDeleteReimbursement = async (request) => {
    const statusLower = (request.status || '').toLowerCase();
    const action = statusLower.includes('pending') ? 'cancel' : 'delete';
    setConfirmTarget(request);
    setConfirmType('reimbursement');
    setConfirmAction(action);
    setConfirmModalOpen(true);
  };

  useEffect(() => {
    fetchCashAdvances();
    fetchLiquidations();
    fetchReimbursements();
  }, []);

  const formatStatus = (status) => {
    const statusMap = {
      'draft': 'Draft',
      'released': 'Released',
      'pending': 'Pending Approval',
      'approved': 'Approved',
      'rejected': 'Rejected',
      'disbursed': 'Disbursed',
      'liquidated': 'Liquidated',
      'cancelled': 'Cancelled'
    };
    return statusMap[status] || status;
  };

  const formatLongDate = (d) => {
    if (!d && d !== 0) return '';
    try {
      const dt = new Date(d);
      if (!isNaN(dt.getTime())) return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) { }
    const s = String(d || '');
    const m = s.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) return new Date(m[1]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return s;
  };

  const tabKeyMap = { 0: 'cashAdvances', 1: 'liquidations', 2: 'reimbursements' };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSearchTerm('');
    setPage(prev => ({ ...prev, [tabKeyMap[newValue]]: 1 }));
    setSearchParams({ tab: TAB_SLUGS[newValue] }, { replace: true });
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage({ cashAdvances: 1, liquidations: 1, reimbursements: 1 });
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setPage({ cashAdvances: 1, liquidations: 1, reimbursements: 1 });
  };

  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('pending')) return 'bg-amber-50 text-amber-700 border border-amber-200';
    if (statusLower.includes('approved')) return 'bg-green-50 text-green-700 border border-green-200';
    if (statusLower.includes('disbursed')) return 'bg-blue-50 text-blue-700 border border-blue-200';
    if (statusLower.includes('released')) return 'bg-teal-50 text-teal-700 border border-teal-200';
    if (statusLower.includes('completed') || statusLower.includes('liquidated')) return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
    if (statusLower.includes('rejected')) return 'bg-red-50 text-red-700 border border-red-200';
    if (statusLower.includes('cancelled')) return 'bg-gray-50 text-gray-600 border border-gray-200';
    return 'bg-gray-50 text-gray-600 border border-gray-200';
  };

  // Lookup of each tab's raw dataset, keyed the same way as tabKeyMap
  const tabDataMap = { cashAdvances, liquidations, reimbursements };

  // Derive available statuses dynamically from the ACTIVE TAB's data only,
  // so the pill bar reflects what's actually in the tab you're viewing
  const availableStatuses = useMemo(() => {
    const activeItems = tabDataMap[tabKeyMap[tabValue]] || [];
    const statusSet = new Set(activeItems.map(item => (item.rawStatus || '').toLowerCase()).filter(Boolean));
    const order = ['pending', 'approved', 'released', 'rejected', 'draft', 'cancelled', 'disbursed', 'liquidated'];
    const sorted = order.filter(s => statusSet.has(s));
    statusSet.forEach(s => { if (!order.includes(s)) sorted.push(s); });
    return sorted;
  }, [cashAdvances, liquidations, reimbursements, tabValue]);

  // Count of pending items per tab (for badge) — scoped to the active tab only
  const pendingCount = useMemo(() => {
    const activeItems = tabDataMap[tabKeyMap[tabValue]] || [];
    return activeItems.filter(i => (i.rawStatus || '').toLowerCase() === 'pending').length;
  }, [cashAdvances, liquidations, reimbursements, tabValue]);

  // Auto-switch to All if no pending items exist
  useEffect(() => {
    if (statusFilter === 'pending' && pendingCount === 0 && availableStatuses.length > 0) {
      setStatusFilter('all');
    }
  }, [pendingCount, availableStatuses, statusFilter]);

  const applyStatusFilter = (items) => {
    if (statusFilter === 'all') return items;
    return items.filter(item => (item.rawStatus || '').toLowerCase() === statusFilter);
  };

  // Filtered lists
  const filteredCashAdvances = useMemo(() => {
    const base = applyStatusFilter(cashAdvances);
    if (!searchTerm) return base;
    return base.filter(item =>
      item.refNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.purpose && item.purpose.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [cashAdvances, searchTerm, statusFilter]);

  const filteredLiquidations = useMemo(() => {
    const base = applyStatusFilter(liquidations);
    if (!searchTerm) return base;
    return base.filter(item =>
      item.refNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.cashAdvanceRef && item.cashAdvanceRef.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [liquidations, searchTerm, statusFilter]);

  const filteredReimbursements = useMemo(() => {
    const base = applyStatusFilter(reimbursements);
    if (!searchTerm) return base;
    return base.filter(item =>
      item.refNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.purpose && item.purpose.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [reimbursements, searchTerm, statusFilter]);

  // Paginated slices for each table, sized by the shared pageSize selector
  const paginatedCashAdvances = useMemo(() => {
    const start = (page.cashAdvances - 1) * pageSize;
    return filteredCashAdvances.slice(start, start + pageSize);
  }, [filteredCashAdvances, page.cashAdvances, pageSize]);

  const paginatedLiquidations = useMemo(() => {
    const start = (page.liquidations - 1) * pageSize;
    return filteredLiquidations.slice(start, start + pageSize);
  }, [filteredLiquidations, page.liquidations, pageSize]);

  const paginatedReimbursements = useMemo(() => {
    const start = (page.reimbursements - 1) * pageSize;
    return filteredReimbursements.slice(start, start + pageSize);
  }, [filteredReimbursements, page.reimbursements, pageSize]);

  // Clamp each tab's page if data shrinks (e.g. after a delete) and the current page no longer exists
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredCashAdvances.length / pageSize));
    if (page.cashAdvances > maxPage) setPage(prev => ({ ...prev, cashAdvances: maxPage }));
  }, [filteredCashAdvances.length, page.cashAdvances, pageSize]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredLiquidations.length / pageSize));
    if (page.liquidations > maxPage) setPage(prev => ({ ...prev, liquidations: maxPage }));
  }, [filteredLiquidations.length, page.liquidations, pageSize]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredReimbursements.length / pageSize));
    if (page.reimbursements > maxPage) setPage(prev => ({ ...prev, reimbursements: maxPage }));
  }, [filteredReimbursements.length, page.reimbursements, pageSize]);

  // Stats reflect only the currently active tab, so switching tabs updates the cards
  const activeTabData = tabDataMap[tabKeyMap[tabValue]] || [];

  const stats = useMemo(() => ({
    pending: activeTabData.filter(item => (item.rawStatus || '').toLowerCase() === 'pending').length,
    approved: activeTabData.filter(item => (item.rawStatus || '').toLowerCase() === 'approved').length,
    rejected: activeTabData.filter(item => (item.rawStatus || '').toLowerCase() === 'rejected').length,
    released: activeTabData.filter(item => (item.rawStatus || '').toLowerCase() === 'released').length,
  }), [activeTabData]);

  const tabs = [
    { label: 'Cash Advances', icon: <HandCoins className="w-4 h-4" /> },
    { label: 'Liquidations', icon: <ReceiptText className="w-4 h-4" /> },
    { label: 'Reimbursements', icon: <Coins className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-6">
      {/* Alert toast notification */}
      <Alert
        open={snackbar.open}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        severity={snackbar.severity}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Requests 📋</h1>
        <p className="text-gray-600">View and manage all your cash advance, liquidation, and reimbursement requests</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-orange-400 to-amber-600 text-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm font-semibold mb-2">Pending</p>
                <h3 className="text-4xl font-bold">{stats.pending}</h3>
              </div>
              <Hourglass className="w-12 h-12 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm font-semibold mb-2">Approved</p>
                <h3 className="text-4xl font-bold">{stats.approved}</h3>
              </div>
              <CheckCircle className="w-12 h-12 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-400 to-red-600 text-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm font-semibold mb-2">Rejected</p>
                <h3 className="text-4xl font-bold">{stats.rejected}</h3>
              </div>
              <XCircle className="w-12 h-12 opacity-30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-sm font-semibold mb-2">Released</p>
                <h3 className="text-4xl font-bold">{stats.released}</h3>
              </div>
              <CheckCircle className="w-12 h-12 opacity-30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main card panel */}
      <Card>
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex px-4 gap-2">
            {tabs.map((tab, index) => (
              <button
                key={index}
                onClick={() => handleTabChange(null, index)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  tabValue === index
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by reference number or purpose..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(prev => ({ ...prev, [tabKeyMap[tabValue]]: 1 }));
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm outline-none transition-colors"
            />
          </div>

          {/* Status Filter Bar */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStatusFilterChange('all')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Requests
            </button>
            {availableStatuses.map((status) => {
              const isActive = statusFilter === status;
              const isPending = status === 'pending';
              const label = status === 'pending' ? 'Pending Approval' : status.charAt(0).toUpperCase() + status.slice(1);
              const colorMap = {
                pending:   isActive ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
                approved:  isActive ? 'bg-green-600 text-white'  : 'bg-green-50 text-green-700 hover:bg-green-100',
                rejected:  isActive ? 'bg-red-600 text-white'    : 'bg-red-50 text-red-700 hover:bg-red-100',
                released:  isActive ? 'bg-teal-600 text-white'   : 'bg-teal-50 text-teal-700 hover:bg-teal-100',
                draft:     isActive ? 'bg-gray-600 text-white'   : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                cancelled: isActive ? 'bg-gray-600 text-white'   : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                disbursed: isActive ? 'bg-blue-600 text-white'   : 'bg-blue-50 text-blue-700 hover:bg-blue-100',
                liquidated:isActive ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
              };
              const colorClass = colorMap[status] || (isActive ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200');
              return (
                <button
                  key={status}
                  onClick={() => handleStatusFilterChange(status)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${colorClass}`}
                >
                  {label}
                  {isPending && pendingCount > 0 && (
                    <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-yellow-500 text-white'
                    }`}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Cash Advances Tab Panel */}
          {tabValue === 0 && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reference No.</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Purpose</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Request Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Approver</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12">
                        <Loading message="Loading cash advances..." />
                      </td>
                    </tr>
                  ) : filteredCashAdvances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500 text-sm">
                        No cash advances found
                      </td>
                    </tr>
                  ) : (
                    paginatedCashAdvances.map((request) => (
                      <tr
                        key={request.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          request.isOverdue ? 'bg-red-50/40 border-l-4 border-red-500' : ''
                        }`}
                      >
                        <td className="px-4 py-4 text-sm font-semibold font-mono text-gray-900">{request.refNumber}</td>
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-[200px] truncate" title={request.purpose}>
                          {request.purpose}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-right text-gray-900">
                          ₱{request.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{formatLongDate(request.requestDate)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(request.status)}`}>
                              {request.status}
                            </span>
                            {request.isOverdue && (
                              <Tooltip title={`Liquidation overdue since ${request.liquidationDeadline ? new Date(request.liquidationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}`}>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full border border-red-200 bg-red-50 text-red-700 animate-pulse">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Needs Liquidation
                                </span>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-[150px] truncate" title={request.approver}>
                          {request.approver}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <Tooltip title="View Details">
                              <button onClick={() => handleView(request)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                            </Tooltip>
                            {['draft', 'cancelled', 'rejected'].includes((request.status || '').toLowerCase()) && (
                              <Tooltip title="Edit">
                                <button onClick={() => handleEdit(request)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                            {request.status === 'Draft' && (
                              <Tooltip title="Delete">
                                <button onClick={() => handleDeleteCashAdvance(request)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                            {request.status === 'Pending Approval' && (
                              <Tooltip title="Cancel Request">
                                <button onClick={() => handleDeleteCashAdvance(request)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                            {request.status.toLowerCase().includes('released') && !liquidations.some(l => l.cashAdvanceRef === request.refNumber) && (
                              <Tooltip title="Create Liquidation">
                                <button onClick={() => handleCreateLiquidation(request)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                                  <Receipt className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Cash Advances Pagination */}
          {tabValue === 0 && (
            <Pagination
              currentPage={page.cashAdvances}
              totalItems={filteredCashAdvances.length}
              pageSize={pageSize}
              onPageChange={(p) => setPage(prev => ({ ...prev, cashAdvances: p }))}
              onPageSizeChange={handlePageSizeChange}
            />
          )}

          {/* Liquidations Tab Panel */}
          {tabValue === 1 && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reference No.</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Advance Ref No.</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Expenses</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Refund/Additional</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Submit Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Approver</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12">
                        <Loading message="Loading liquidations..." />
                      </td>
                    </tr>
                  ) : filteredLiquidations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500 text-sm">
                        No liquidations found
                      </td>
                    </tr>
                  ) : (
                    paginatedLiquidations.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 text-sm font-semibold font-mono text-gray-900">{request.refNumber}</td>
                        <td className="px-4 py-4 text-sm font-mono text-gray-600">{request.cashAdvanceRef}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-right text-gray-900">
                          ₱{request.totalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-right">
                          <span className={request.variance > 0 ? 'text-red-600' : 'text-green-600'}>
                            ₱{(request.variance > 0 ? request.refundAmount : request.additionalPayment).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            <span className="text-xs font-normal text-gray-500 ml-1">
                              {request.variance > 0 ? '(Refund)' : '(Additional)'}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{formatLongDate(request.submitDate)}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-[150px] truncate" title={request.approver}>
                          {request.approver}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <Tooltip title="View Details">
                              <button onClick={() => handleViewLiquidation(request)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                            </Tooltip>
                            {['draft', 'cancelled', 'rejected'].includes((request.status || '').toLowerCase()) && (
                              <Tooltip title="Edit">
                                <button onClick={() => handleEditLiquidation(request)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                            {request.status === 'Draft' && (
                              <Tooltip title="Delete">
                                <button onClick={() => handleDeleteLiquidation(request)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                            {request.status === 'Pending Approval' && (
                              <Tooltip title="Cancel Request">
                                <button onClick={() => handleDeleteLiquidation(request)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Liquidations Pagination */}
          {tabValue === 1 && (
            <Pagination
              currentPage={page.liquidations}
              totalItems={filteredLiquidations.length}
              pageSize={pageSize}
              onPageChange={(p) => setPage(prev => ({ ...prev, liquidations: p }))}
              onPageSizeChange={handlePageSizeChange}
            />
          )}

          {/* Reimbursements Tab Panel */}
          {tabValue === 2 && (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reference No.</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Submit Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Approver</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12">
                        <Loading message="Loading reimbursements..." />
                      </td>
                    </tr>
                  ) : filteredReimbursements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500 text-sm">
                        No reimbursements found
                      </td>
                    </tr>
                  ) : (
                    paginatedReimbursements.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4 text-sm font-semibold font-mono text-gray-900">{request.refNumber}</td>
                        <td className="px-4 py-4 text-sm font-semibold text-right text-gray-900">
                          ₱{request.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">{formatLongDate(request.submitDate)}</td>
                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700 max-w-[150px] truncate" title={request.approver}>
                          {request.approver}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <Tooltip title="View Details">
                              <button onClick={() => handleViewReimbursement(request)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                            </Tooltip>
                            {['draft', 'cancelled', 'rejected'].includes((request.status || '').toLowerCase()) && (
                              <Tooltip title="Edit">
                                <button onClick={() => handleEditReimbursement(request)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                            {request.status === 'Draft' && (
                              <Tooltip title="Delete">
                                <button onClick={() => handleDeleteReimbursement(request)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                            {request.status === 'Pending Approval' && (
                              <Tooltip title="Cancel Request">
                                <button onClick={() => handleDeleteReimbursement(request)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Reimbursements Pagination */}
          {tabValue === 2 && (
            <Pagination
              currentPage={page.reimbursements}
              totalItems={filteredReimbursements.length}
              pageSize={pageSize}
              onPageChange={(p) => setPage(prev => ({ ...prev, reimbursements: p }))}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </CardContent>
      </Card>

      {/* View Details Modal */}
      <Modal
        open={viewModalOpen}
        onClose={handleCloseModal}
        title={
          <div className="flex items-center gap-3">
            <span>Request Details</span>
            {selectedRequest && (
              <span className={`px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 ${getStatusColor(selectedRequest.status)}`}>
                {selectedRequest.status?.toUpperCase()}
              </span>
            )}
          </div>
        }
        maxWidth="xl"
        actions={
          <Button variant="secondary" onClick={handleCloseModal}>Close</Button>
        }
      >
        {viewLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : selectedRequest ? (
          <>
            {tabValue === 0 && <CashAdvanceForm editData={selectedRequest} viewOnly onClose={handleCloseModal} hideCloseButton />}
            {tabValue === 1 && <LiquidationForm editData={selectedRequest} viewOnly onClose={handleCloseModal} hideCloseButton />}
            {tabValue === 2 && <ReimbursementForm editData={selectedRequest} viewOnly onClose={handleCloseModal} hideCloseButton />}
          </>
        ) : (
          <div className="text-sm text-gray-500 py-6 text-center">No details available.</div>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        open={confirmModalOpen}
        onClose={() => { if (!confirmLoading) closeConfirmModal(); }}
        title={confirmAction === 'cancel' ? 'Confirm Cancel' : 'Confirm Delete'}
        maxWidth="sm"
        actions={
          <>
            <Button variant="secondary" onClick={closeConfirmModal} disabled={confirmLoading}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={performConfirmAction}
              disabled={confirmLoading}
              startIcon={confirmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (confirmAction === 'cancel' ? <XCircle className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />)}
            >
              {confirmLoading ? 'Processing...' : (confirmAction === 'cancel' ? 'Confirm Cancel' : 'Confirm Delete')}
            </Button>
          </>
        }
      >
        <p className="text-gray-700 text-sm">
          {confirmAction === 'cancel'
            ? `Are you sure you want to cancel this ${confirmType === 'cashAdvance' ? 'cash advance' : confirmType === 'reimbursement' ? 'reimbursement' : 'liquidation'}?`
            : `Are you sure you want to delete this ${confirmType === 'cashAdvance' ? 'cash advance' : confirmType === 'reimbursement' ? 'reimbursement' : 'liquidation'}?`}
        </p>
      </Modal>
    </div>
  );
};

export default MyRequests;