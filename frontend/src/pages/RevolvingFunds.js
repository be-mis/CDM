import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  Wallet, Banknote, Search, ChevronRight, ChevronLeft,
  HandCoins, Coins, TrendingDown, TrendingUp, PlusCircle,
} from 'lucide-react';
import { formatLongDate } from '../utils/formatters';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Loading } from '../components/ui/Loading';

// ─── helpers ────────────────────────────────────────────────────────────────

const formatPeso = (amount) =>
  `₱${parseFloat(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Consistent card styling per fund code, cycling through if more funds are added
const FUND_STYLES = {
  ARF: { bg: '!bg-blue-50 border-blue-200', text: 'text-blue-800', icon: Banknote },
  ORF: { bg: '!bg-purple-50 border-purple-200', text: 'text-purple-800', icon: Wallet },
};
const DEFAULT_FUND_STYLE = { bg: '!bg-gray-50 border-gray-200', text: 'text-gray-700', icon: Wallet };

// Pill colors for the Fund column in the transaction history table, aligned
// to each fund's card color above.
const FUND_PILL_STYLES = {
  ARF: 'bg-blue-100 text-blue-800',
  ORF: 'bg-purple-100 text-purple-800',
};
const DEFAULT_PILL_STYLE = 'bg-gray-100 text-gray-700';

const TYPE_LABELS = {
  cash_advance: 'Cash Advance',
  reimbursement: 'Reimbursement',
  replenish: 'Replenishment',
};

// Static icon map instead of a function that re-creates elements on every
// call — same elements are reused across renders since they take no props.
const TYPE_ICONS = {
  cash_advance: <HandCoins className="w-4 h-4 text-indigo-500" />,
  reimbursement: <Coins className="w-4 h-4 text-cyan-500" />,
  replenish: <PlusCircle className="w-4 h-4 text-green-500" />,
};
const getTypeIcon = (type) => TYPE_ICONS[type] || null;

// Replenishments add money to a fund; every other transaction type deducts.
const isReplenishment = (type) => type === 'replenish';

// Replenish rows store their amount in `replenish_amount`; every other
// transaction type (cash advance, reimbursement) stores it in `deducted_amount`.
const getHistoryAmount = (h) =>
  isReplenishment(h.transaction_type) ? h.replenish_amount : h.deducted_amount;

// Debounce hook — delays updating the returned value until `value` has
// stopped changing for `delay` ms. Used for the transaction search box so
// we don't re-filter (and re-render) on every single keystroke.
const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

// Reusable pagination control (matches the one used in Approvals.js).
// Memoized: with page-size and search/filter changes elsewhere on the page,
// this avoids re-rendering the (potentially many) page-number buttons unless
// its own props actually change.
const Pagination = memo(({ currentPage, totalItems, pageSize, onPageChange, onPageSizeChange }) => {
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
            <option value={20}>20</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
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
              type="button"
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
          type="button"
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
});
Pagination.displayName = 'Pagination';

// Single fund summary card. Memoized so the whole fund grid doesn't
// re-render just because unrelated state (search text, modal form, etc.)
// changed elsewhere on the page.
const FundCard = memo(({ fund, onReplenish }) => {
  const style = FUND_STYLES[fund.funding_code] || DEFAULT_FUND_STYLE;
  const Icon = style.icon;
  return (
    <Card className={`${style.bg} border shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={`${style.text} text-sm font-semibold mb-1 truncate`}>
              {fund.funding_description}
            </p>
            <p className={`${style.text} text-xs opacity-70 mb-2 truncate`}>
              {fund.funding_code} • Dept {fund.department}
            </p>
            <span className={`text-2xl sm:text-4xl font-bold ${style.text} break-words`}>
              {formatPeso(fund.Amount)}
            </span>
          </div>
          <Icon className={`w-9 h-9 sm:w-12 sm:h-12 ${style.text} opacity-30 shrink-0`} />
        </div>
        <div className="mt-4 pt-4 border-t border-black/5 flex flex-wrap gap-2">
          <Button
            variant="primary"
            size="sm"
            startIcon={<PlusCircle className="w-4 h-4" />}
            onClick={() => onReplenish(fund)}
          >
            Replenish
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
FundCard.displayName = 'FundCard';

// Single transaction history row. Memoized so paging/filtering only
// re-renders the rows that actually changed identity.
const HistoryRow = memo(({ h }) => (
  <tr className="hover:bg-gray-50 transition-colors">
    <td className="px-4 py-3 text-sm text-gray-500">{formatLongDate(h.created_at)}</td>
    <td className="px-4 py-3">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
        FUND_PILL_STYLES[h.funding_code] || DEFAULT_PILL_STYLE
      }`}>
        {h.funding_code || '—'}
      </span>
    </td>
    <td className="px-4 py-3">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
        {getTypeIcon(h.transaction_type)}{TYPE_LABELS[h.transaction_type] || h.transaction_type}
      </span>
    </td>
    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{h.transaction_number}</td>
    <td className={`px-4 py-3 text-sm font-semibold flex items-center gap-1 ${
      isReplenishment(h.transaction_type) ? 'text-green-600' : 'text-red-600'
    }`}>
      {isReplenishment(h.transaction_type) ? (
        <TrendingUp className="w-3.5 h-3.5" />
      ) : (
        <TrendingDown className="w-3.5 h-3.5" />
      )}
      {isReplenishment(h.transaction_type) ? '+' : '−'}{formatPeso(getHistoryAmount(h))}
    </td>
    <td className="px-4 py-3 text-sm text-gray-500">{formatPeso(h.balance_before)}</td>
    <td className="px-4 py-3 text-sm text-gray-700">{formatPeso(h.balance_after)}</td>
    <td className="px-4 py-3">
      {h.remarks ? (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
          h.remarks === 'Settled'
            ? 'bg-green-100 text-green-800'
            : 'bg-amber-100 text-amber-800'
        }`}>
          {h.remarks}
        </span>
      ) : (
        <span className="text-gray-300 text-xs">—</span>
      )}
    </td>
  </tr>
));
HistoryRow.displayName = 'HistoryRow';

// Mobile card version of a transaction row — shown below the `sm:` breakpoint
// instead of a horizontally-scrolling table row, so the key details (date,
// type, amount, running balance) are readable without side-scrolling.
const HistoryCard = memo(({ h }) => (
  <div className="p-3 rounded-lg border border-gray-200 bg-white">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
            FUND_PILL_STYLES[h.funding_code] || DEFAULT_PILL_STYLE
          }`}>
            {h.funding_code || '—'}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 whitespace-nowrap">
            {getTypeIcon(h.transaction_type)}{TYPE_LABELS[h.transaction_type] || h.transaction_type}
          </span>
        </div>
        <p className="text-sm font-semibold text-gray-900 mt-1.5 truncate">{h.transaction_number}</p>
        <p className="text-xs text-gray-500 mt-0.5">{formatLongDate(h.created_at)}</p>
      </div>
      <div className={`shrink-0 text-sm font-semibold flex items-center gap-1 ${
        isReplenishment(h.transaction_type) ? 'text-green-600' : 'text-red-600'
      }`}>
        {isReplenishment(h.transaction_type) ? (
          <TrendingUp className="w-3.5 h-3.5" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5" />
        )}
        {isReplenishment(h.transaction_type) ? '+' : '−'}{formatPeso(getHistoryAmount(h))}
      </div>
    </div>

    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
      <span className="text-gray-500">
        {formatPeso(h.balance_before)} <span className="mx-1">→</span> {formatPeso(h.balance_after)}
      </span>
      {h.remarks ? (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold ${
          h.remarks === 'Settled'
            ? 'bg-green-100 text-green-800'
            : 'bg-amber-100 text-amber-800'
        }`}>
          {h.remarks}
        </span>
      ) : (
        <span className="text-gray-300">—</span>
      )}
    </div>
  </div>
));
HistoryCard.displayName = 'HistoryCard';

// Replenish modal, fully self-contained with its own form state. Splitting
// this out is the single biggest runtime win in this file: before, every
// keystroke in the Amount / Reference No. fields set state on the parent
// RevolvingFunds component, which re-rendered the entire page — including
// the fund grid and up to 100 transaction-history rows — on each keystroke.
// Now a keystroke only re-renders this small modal.
const ReplenishModal = memo(({ fund, open, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset the form whenever a new fund is targeted / the modal re-opens.
  useEffect(() => {
    if (open) {
      setAmount('');
      setReference('');
      setError('');
    }
  }, [open, fund?.id]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    onClose();
  }, [submitting, onClose]);

  const handleSubmit = useCallback(async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (!reference.trim()) {
      setError('Reference number is required.');
      return;
    }
    if (!fund) return;

    try {
      setSubmitting(true);
      setError('');
      const res = await api.post(`/revolving-funds/${fund.id}/replenish`, {
        amount: parsedAmount,
        transaction_number: reference.trim(),
      });

      if (res.data.success) {
        onSuccess(res.data.data.fund, parsedAmount);
      } else {
        setError(res.data.message || 'Failed to replenish fund.');
      }
    } catch (err) {
      console.error('Error replenishing fund:', err);
      setError(err.response?.data?.message || 'Failed to replenish fund.');
    } finally {
      setSubmitting(false);
    }
  }, [amount, reference, fund, onSuccess]);

  const parsedAmount = parseFloat(amount);
  const newBalance = fund && amount && !isNaN(parsedAmount)
    ? parseFloat(fund.Amount || 0) + parsedAmount
    : null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-3">
          <span>Replenish Fund</span>
          {fund && (
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
              {fund.funding_code}
            </span>
          )}
        </div>
      }
      maxWidth="sm"
      actions={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            startIcon={<PlusCircle className="w-4 h-4" />}
            onClick={handleSubmit}
            disabled={submitting || !amount || !reference.trim()}
          >
            {submitting ? 'Replenishing…' : 'Replenish Fund'}
          </Button>
        </>
      }
    >
      {fund && (
        <div className="space-y-4">
          <div className="px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 flex items-center justify-between">
            <span className="font-semibold">Current Balance: {formatPeso(fund.Amount)}</span>
          </div>

          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Add</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              fullWidth
              startAdornment={<span className="text-gray-400">₱</span>}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference No. <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. DV-2026-0001"
              fullWidth
              required
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {newBalance !== null && (
            <p className="text-sm text-gray-500">
              New balance will be{' '}
              <span className="font-semibold text-gray-800">{formatPeso(newBalance)}</span>
            </p>
          )}
        </div>
      )}
    </Modal>
  );
});
ReplenishModal.displayName = 'ReplenishModal';

// ─── main component ──────────────────────────────────────────────────────────

const RevolvingFunds = () => {
  const { user } = useAuth();
  const displayName = user?.name || user?.username || user?.email || 'Accounting';

  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [funds, setFunds] = useState([]);

  const [replenishFundTarget, setReplenishFundTarget] = useState(null);
  const [replenishOpen, setReplenishOpen] = useState(false);

  // Combined transaction history across all funds (Section 2)
  const [allHistory, setAllHistory] = useState([]);
  const [allHistoryLoading, setAllHistoryLoading] = useState(true);
  const [allHistorySearchInput, setAllHistorySearchInput] = useState('');
  // Debounced so typing in the search box doesn't re-filter the (possibly
  // large) history list on every keystroke — only 300ms after typing stops.
  const allHistorySearch = useDebouncedValue(allHistorySearchInput, 300);
  const [allHistoryFundFilter, setAllHistoryFundFilter] = useState('All');
  const [allHistoryPage, setAllHistoryPage] = useState(1);
  const [allHistoryPageSize, setAllHistoryPageSize] = useState(20);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchFunds = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/revolving-funds');
      if (res.data.success) {
        setFunds(res.data.data);
      } else {
        setFunds(res.data); // fallback if endpoint returns a bare array
      }
    } catch (error) {
      console.error('Error fetching revolving funds:', error);
      setNotification({ message: 'Failed to load revolving funds.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFunds(); }, [fetchFunds]);

  const fetchAllHistory = useCallback(async () => {
    try {
      setAllHistoryLoading(true);
      const res = await api.get('/revolving-funds/history');
      setAllHistory(res.data.success ? res.data.data : res.data);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      setNotification({ message: 'Failed to load transaction history.', severity: 'error' });
      setAllHistory([]);
    } finally {
      setAllHistoryLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllHistory(); }, [fetchAllHistory]);

  // Stable references so FundCard / ReplenishModal (both memoized) don't
  // re-render just because RevolvingFunds re-rendered for an unrelated reason.
  const openReplenish = useCallback((fund) => {
    setReplenishFundTarget(fund);
    setReplenishOpen(true);
  }, []);

  const closeReplenish = useCallback(() => {
    setReplenishOpen(false);
  }, []);

  const handleReplenishSuccess = useCallback((updatedFund, amount) => {
    setFunds((prev) => prev.map((f) => (f.id === updatedFund.id ? updatedFund : f)));
    setNotification({
      message: `${updatedFund.funding_code} replenished by ${formatPeso(amount)}.`,
      severity: 'success',
    });
    setReplenishOpen(false);
    fetchAllHistory();
  }, [fetchAllHistory]);

  // ── combined transaction history (Section 2) ─────────────────────────────
  const fundFilterOptions = useMemo(() => {
    const codes = Array.from(new Set(funds.map((f) => f.funding_code).filter(Boolean)));
    return ['All', ...codes];
  }, [funds]);

  const filteredAllHistory = useMemo(() => {
    let rows = allHistory;
    if (allHistoryFundFilter !== 'All') {
      rows = rows.filter((h) => h.funding_code === allHistoryFundFilter);
    }
    if (allHistorySearch) {
      const q = allHistorySearch.toLowerCase();
      rows = rows.filter((h) =>
        (h.transaction_number || '').toLowerCase().includes(q) ||
        (TYPE_LABELS[h.transaction_type] || '').toLowerCase().includes(q) ||
        (h.funding_code || '').toLowerCase().includes(q) ||
        (h.funding_description || '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [allHistory, allHistoryFundFilter, allHistorySearch]);

  // Keep the current page in range whenever the filtered result set shrinks
  // (e.g. after a search or fund filter change) or the page size changes.
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredAllHistory.length / allHistoryPageSize));
    if (allHistoryPage > totalPages) setAllHistoryPage(totalPages);
  }, [filteredAllHistory.length, allHistoryPageSize, allHistoryPage]);

  const paginatedAllHistory = useMemo(() => {
    const start = (allHistoryPage - 1) * allHistoryPageSize;
    return filteredAllHistory.slice(start, start + allHistoryPageSize);
  }, [filteredAllHistory, allHistoryPage, allHistoryPageSize]);

  const handlePageSizeChange = useCallback((size) => {
    setAllHistoryPageSize(size);
    setAllHistoryPage(1);
  }, []);

  const handleSearchChange = useCallback((e) => {
    setAllHistorySearchInput(e.target.value);
    setAllHistoryPage(1);
  }, []);

  const handleFundFilterChange = useCallback((code) => {
    setAllHistoryFundFilter(code);
    setAllHistoryPage(1);
  }, []);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Revolving Funds</h1>
        <p className="text-sm sm:text-base text-gray-500">
          Welcome back, <span className="font-medium text-gray-700">{displayName}</span> — monitor fund balances and disbursement history.
        </p>
      </div>

      {notification && (
        <Alert severity={notification.severity} onClose={() => setNotification(null)}>
          {notification.message}
        </Alert>
      )}

      {/* ── Section 1: Summary Cards ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 tracking-wider mb-3">Fund Balances</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {loading ? (
            <Card>
              <CardContent className="p-6">
                <Loading message="Loading fund balances…" />
              </CardContent>
            </Card>
          ) : (
            funds.map((fund) => (
              <FundCard key={fund.id} fund={fund} onReplenish={openReplenish} />
            ))
          )}

        </div>
      </div>

      {/* ── Section 2: Transaction History (all funds) ── */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Transaction History</h3>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search by reference number, type, or fund…"
                fullWidth
                startAdornment={<Search className="w-4 h-4 text-gray-400" />}
                value={allHistorySearchInput}
                onChange={handleSearchChange}
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {fundFilterOptions.map((code) => (
                <button
                  type="button"
                  key={code}
                  onClick={() => handleFundFilterChange(code)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    allHistoryFundFilter === code
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          {allHistoryLoading ? (
            <Loading message="Loading transaction history…" />
          ) : filteredAllHistory.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">No transactions found.</p>
          ) : (
            <>
              {/* Mobile: stacked cards (below sm:) */}
              <div className="space-y-2 sm:hidden">
                {paginatedAllHistory.map((h) => (
                  <HistoryCard key={h.id} h={h} />
                ))}
              </div>

              {/* Desktop/tablet: table (sm: and up) */}
              <div className="hidden sm:block overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Date', 'Fund', 'Type', 'Reference No.', 'Amount', 'Balance Before', 'Balance After', 'Remarks'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedAllHistory.map((h) => (
                      <HistoryRow key={h.id} h={h} />
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={allHistoryPage}
                totalItems={filteredAllHistory.length}
                pageSize={allHistoryPageSize}
                onPageChange={setAllHistoryPage}
                onPageSizeChange={handlePageSizeChange}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          REPLENISH FUND MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <ReplenishModal
        fund={replenishFundTarget}
        open={replenishOpen}
        onClose={closeReplenish}
        onSuccess={handleReplenishSuccess}
      />

    </div>
  );
};

export default RevolvingFunds;