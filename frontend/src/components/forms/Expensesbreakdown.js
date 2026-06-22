import React, { useCallback, useState } from 'react';
import { Plus, Trash2, Paperclip, RefreshCw, X, Camera } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import Autocomplete from '../ui/Autocomplete';
import CurrencyInput from '../ui/Currencyinput';
import { InlineAlert } from '../ui/Alert';
import { formatLongDate } from '../../utils/formatters';
import { scanReceipt } from '../../utils/receiptOcrService';
import ReceiptPreviewModal from '../modal/Receiptpreviewmodal';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const vatTypeOptions = [
  { value: 'VAT',    label: 'VAT'    },
  { value: 'NonVAT', label: 'NonVAT' },
];

const isMobileDevice = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export const blankExpense = (id = 1) => ({
  id,
  particulars:    '',
  actualAmount:   0,
  receiptNumber:  '',
  tin:            '',
  vendor:         '',
  address:        '',
  vatType:        '',
  vatable:        0,
  vatAmount:      0,
  zeroRatedSales: 0,
  vatExemptSales: 0,
  expenseDate:    '',
  attachment:     null,
});

const nextId = (arr) =>
  arr.length === 0 ? 1 : Math.max(...arr.map((x) => x.id)) + 1;

// ---------------------------------------------------------------------------
// ExpensesBreakdown
// ---------------------------------------------------------------------------
/**
 * Props
 * ─────
 * @param {array}    expenses          - Controlled array of expense objects.
 * @param {function} onExpensesChange  - Called with the full updated array whenever
 *                                       expenses change (add, remove, field edit,
 *                                       attachment change).
 * @param {boolean}  [viewOnly=false]
 * @param {object}   [errors={}]       - { expenses?: string, total?: string }
 * @param {function} [onSnackbar]      - (message, severity) => void — forwarded
 *                                       snackbar calls so the parent can surface them.
 */
const ExpensesBreakdown = ({
  expenses,
  onExpensesChange,
  viewOnly = false,
  errors = {},
  onSnackbar,
  minDate,
  maxDate, 
}) => {
  const [ocrLoading, setOcrLoading] = useState({});
  const [previewReceipt, setPreviewReceipt] = useState(null);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const notify = useCallback(
    (message, severity = 'success') => onSnackbar?.(message, severity),
    [onSnackbar],
  );

  const updateExpense = useCallback(
    (id, field, value) =>
      onExpensesChange(
        expenses.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)),
      ),
    [expenses, onExpensesChange],
  );

  // ---------------------------------------------------------------------------
  // Add / remove rows
  // ---------------------------------------------------------------------------
  const handleAdd = useCallback(() => {
    onExpensesChange([...expenses, blankExpense(nextId(expenses))]);
  }, [expenses, onExpensesChange]);

  const handleRemove = useCallback(
    (id) => {
      if (expenses.length <= 1) {
        notify('At least one expense is required', 'warning');
        return;
      }
      onExpensesChange(expenses.filter((exp) => exp.id !== id));
    },
    [expenses, onExpensesChange, notify],
  );

  // ---------------------------------------------------------------------------
  // Field change
  // ---------------------------------------------------------------------------
  const handleChange = useCallback(
    (id, field, value) => updateExpense(id, field, value),
    [updateExpense],
  );

  // Replace processReceiptFile with this:
  const processReceiptFile = useCallback(
    async (itemId, file) => {
      if (!file) return;

      try { file.preview = URL.createObjectURL(file); } catch { file.preview = null; }

      // Attach file immediately
      onExpensesChange(
        expenses.map((it) => (it.id === itemId ? { ...it, attachment: file } : it)),
      );

      const isOcrSupported =
        file.type.startsWith('image/') || file.type === 'application/pdf';

      if (!isOcrSupported) {
        notify('File attached successfully', 'success');
        return;
      }

      notify('File attached. Scanning receipt...', 'info');
      setOcrLoading((prev) => ({ ...prev, [itemId]: true }));

      try {
        const { rawText, extracted } = await scanReceipt(file);

        console.log('=== OCR RAW TEXT ===\n',      rawText);
        console.log('=== EXTRACTED FIELDS ===\n', extracted);

        onExpensesChange((latestExpenses) =>
          latestExpenses.map((item) => {
            if (item.id !== itemId) return item;
            return {
              ...item,
              receiptNumber:  extracted.receiptNumber  ?? item.receiptNumber,
              tin:            extracted.tin            ?? item.tin,
              vendor:         extracted.vendor         ?? item.vendor,
              address:        extracted.address        ?? item.address,
              vatType:        extracted.vatType        ?? item.vatType,
              vatable:        extracted.vatable        ?? item.vatable,
              vatAmount:      extracted.vatAmount      ?? item.vatAmount,
              zeroRatedSales: extracted.zeroRatedSales ?? item.zeroRatedSales,
              vatExemptSales: extracted.vatExemptSales ?? item.vatExemptSales,
              actualAmount:   extracted.totalAmount    ?? item.actualAmount,
            };
          }),
        );

        const anyFound = Object.values(extracted).some(
          (v) => v !== '' && v !== 0 && v !== null && v !== undefined,
        );

        notify(
          anyFound
            ? 'Receipt scanned! Please verify the filled fields.'
            : 'Scan complete — fields not detected. Please fill in manually.',
          anyFound ? 'success' : 'warning',
        );
      } catch (err) {
        console.error('OCR error:', err);
        notify('OCR scan failed. Please fill in manually.', 'warning');
      } finally {
        setOcrLoading((prev) => ({ ...prev, [itemId]: false }));
      }
    },
    [expenses, onExpensesChange, notify],
  );

  const handleRowFileChange = useCallback(
    async (itemId, event) => {
      const file = event.target.files[0];
      if (!file) return;
      event.target.value = '';
      await processReceiptFile(itemId, file);
    },
    [processReceiptFile],
  );

  const handleRemoveAttachment = useCallback(
    (itemId) => {
      onExpensesChange(
        expenses.map((item) => {
          if (item.id !== itemId) return item;
          try { if (item.attachment?.preview) URL.revokeObjectURL(item.attachment.preview); } catch { }
          return {
            ...item,
            attachment:     null,
            // cleared fields
            receiptNumber:  '',
            tin:            '',
            vendor:         '',
            address:        '',
            vatType:        '',
            vatable:        0,
            vatAmount:      0,
            zeroRatedSales: 0,
            vatExemptSales: 0,
            actualAmount:   0,
            // preserved fields
            // expenseDate and particulars are kept via ...item spread above
          };
        }),
      );
    },
    [expenses, onExpensesChange],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Expenses Breakdown</h3>
        {!viewOnly && (
          <Button
            variant="secondary"
            size="sm"
            startIcon={<Plus className="w-4 h-4" />}
            onClick={handleAdd}
          >
            Add Expense
          </Button>
        )}
      </div>

      {errors.expenses && (
        <div className="mb-4">
          <InlineAlert severity="error">{errors.expenses}</InlineAlert>
        </div>
      )}
      {errors.total && (
        <div className="mb-4">
          <InlineAlert severity="error">{errors.total}</InlineAlert>
        </div>
      )}
{viewOnly ? (
      <div className="space-y-3 overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Expense Date </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Particulars </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Actual Amount</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Receipt #</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">TIN</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Vendor</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Address</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">VAT Type</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Vatable</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">VAT Amount</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Zero Rated Sales</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">VAT Exempt Sales</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Actual Amount</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Receipt</th>  
            </tr>
          </thead>
          <tbody>
            {expenses.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">{formatLongDate(item.expenseDate)}</td>
                <td className="px-3 py-2">{item.particulars}</td>
                <td className="px-3 py-2">{item.actualAmount}</td>
                <td className="px-3 py-2">{item.receiptNumber}</td>
                <td className="px-3 py-2">{item.tin}</td>
                <td className="px-3 py-2">{item.vendor}</td>
                <td className="px-3 py-2">{item.address}</td>
                <td className="px-3 py-2">{item.vatType}</td>
                <td className="px-3 py-2">{item.vatable}</td>
                <td className="px-3 py-2">{item.vatAmount}</td>
                <td className="px-3 py-2">{item.zeroRatedSales}</td>
                <td className="px-3 py-2">{item.vatExemptSales}</td>
                <td className="px-3 py-2">{item.actualAmount}</td>
                <td className="px-3 py-2">
                  {item.attachment ? (
                    <button
                      type="button"
                      onClick={() => setPreviewReceipt(item.attachment)}
                      className="text-indigo-500 hover:text-indigo-700 hover:underline transition-colors"
                    >
                      {item.attachment.fileName || item.attachment.name || 'View Receipt'}
                    </button>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
) : (
      <div className="space-y-3">
        {expenses.map((item, index) => (
          <div
            key={item.id}
            className="border-2 border-sky-300 rounded-xl overflow-hidden bg-white shadow-sm"
          >
            {/* Row header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Expense #{index + 1}
              </span>
              {!viewOnly && (
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  disabled={expenses.length === 1 || !!ocrLoading[item.id]}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Primary fields */}
            <div className="px-4 pt-5 pb-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">

              {/* Expense Date */}
              <div className="md:col-span-2 relative">
                <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500 z-10">
                  Expense Date
                </span>
                {!viewOnly ? (
                  <Input
                    fullWidth
                    type="date"
                    value={item.expenseDate}
                    min={minDate || undefined}
                    max={maxDate || undefined}
                    onChange={(e) => handleChange(item.id, 'expenseDate', e.target.value)}
                  />
                ) : (
                  <Input fullWidth value={formatLongDate(item.expenseDate)} readOnly />
                )}
              </div>

              {/* Particulars */}
              <div className="md:col-span-5 relative">
                <span className={`absolute -top-2 left-3 bg-white px-1 text-xs z-10 ${errors[`expense_particulars_${item.id}`] ? 'text-red-500' : 'text-gray-500'}`}>
                  Particular{errors[`expense_particulars_${item.id}`] ? ' *' : ''}
                </span>
                <Input
                  fullWidth
                  value={item.particulars}
                  onChange={
                    viewOnly
                      ? undefined
                      : (e) => handleChange(item.id, 'particulars', e.target.value)
                  }
                  readOnly={viewOnly}
                  placeholder="Enter Particulars"
                  error={errors[`expense_particulars_${item.id}`]}
                />
              </div>

              {/* Actual Amount */}
              <div className="md:col-span-3 relative">
                <span className={`absolute -top-2 left-3 bg-white px-1 text-xs z-10 ${errors[`expense_amount_${item.id}`] ? 'text-red-500' : 'text-gray-500'}`}>
                  Actual Amount{errors[`expense_amount_${item.id}`] ? ' *' : ''}
                </span>
                <CurrencyInput
                  itemId={item.id}
                  field="actualAmount"
                  value={item.actualAmount}
                  readOnly={viewOnly}
                  onChange={(raw) => handleChange(item.id, 'actualAmount', raw)}
                  error={errors[`expense_amount_${item.id}`]}
                />
              </div>

              {/* Receipt attachment */}
              <div className="md:col-span-2 relative">
                <span className={`absolute -top-2 left-3 bg-white px-1 text-xs z-10 ${errors[`expense_receipt_${item.id}`] ? 'text-red-500' : 'text-gray-500'}`}>
                  Receipt{errors[`expense_receipt_${item.id}`] ? ' *' : ''}
                </span>

                {!viewOnly ? (
                  !item.attachment ? (
                    <>
                      <input
                        accept={isMobileDevice() ? 'image/*' : 'image/*,.pdf,.doc,.docx'}
                        capture={isMobileDevice() ? 'environment' : undefined}
                        className="hidden"
                        id={`row-file-upload-${item.id}`}
                        type="file"
                        onChange={(e) => handleRowFileChange(item.id, e)}
                        disabled={!!ocrLoading[item.id]}
                      />
                      <label
                        htmlFor={`row-file-upload-${item.id}`}
                        className={`inline-flex items-center w-full justify-center px-3 py-2 text-xs font-medium rounded-lg bg-white border hover:bg-gray-50 cursor-pointer transition-colors min-h-[38px] ${ocrLoading[item.id] ? 'opacity-50 cursor-not-allowed' : ''} ${errors[`expense_receipt_${item.id}`] ? 'border-red-400 text-red-500 hover:border-red-500' : 'text-gray-500 border-gray-200 hover:border-gray-300'}`}
                      >
                        {isMobileDevice() ? (
                          <>
                            <Camera className="w-3.5 h-3.5 mr-1.5" />
                            Scan Receipt
                          </>
                        ) : (
                          <>
                            <Paperclip className="w-3.5 h-3.5 mr-1.5" />
                            Attach File
                          </>
                        )}
                      </label>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-white border border-gray-200 min-h-[38px]">
                      <Paperclip className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span
                        className="text-xs text-gray-700 truncate flex-1 min-w-0"
                        title={item.attachment.fileName || item.attachment.name}
                      >
                        {item.attachment.fileName || item.attachment.name}
                      </span>
                      {ocrLoading[item.id] ? (
                        <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(item.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-900 min-h-[38px] flex items-center">
                    {item.attachment ? (
                      <button
                        type="button"
                        onClick={() => item.attachment.filePath && setPreviewReceipt(item.attachment)}
                        className="text-xs text-primary-600 hover:underline truncate w-full text-left"
                        title={item.attachment.fileName || item.attachment.name}
                      >
                        {item.attachment.fileName || item.attachment.name}
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Receipt Details sub-panel */}
            <div className="mx-4 mb-5 rounded-lg border border-gray-100 bg-gray-50/60 px-4 pt-5 pb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-5">
                Receipt Details
                {ocrLoading[item.id] && (
                  <span className="ml-2 inline-flex items-center gap-1 text-blue-500 normal-case font-normal">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Scanning…
                  </span>
                )}
              </p>

              {/* Row 1: Receipt #, TIN, Vendor, VAT Type */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                <div className="relative col-span-2 md:col-span-1">
                  <span className="absolute -top-2 left-3 bg-gray-50 px-1 text-xs text-gray-500 z-10">
                    Receipt #
                  </span>
                  <Input
                    fullWidth
                    value={item.receiptNumber}
                    onChange={
                      viewOnly
                        ? undefined
                        : (e) => handleChange(item.id, 'receiptNumber', e.target.value)
                    }
                    readOnly={viewOnly || !!ocrLoading[item.id]}
                    placeholder="OR Number"
                  />
                </div>

                <div className="relative col-span-2 md:col-span-1">
                  <span className="absolute -top-2 left-3 bg-gray-50 px-1 text-xs text-gray-500 z-10">
                    TIN
                  </span>
                  <Input
                    fullWidth
                    value={item.tin}
                    onChange={
                      viewOnly ? undefined : (e) => handleChange(item.id, 'tin', e.target.value)
                    }
                    readOnly={viewOnly || !!ocrLoading[item.id]}
                    placeholder="000-000-000"
                  />
                </div>

                <div className="relative col-span-2 md:col-span-1">
                  <span className="absolute -top-2 left-3 bg-gray-50 px-1 text-xs text-gray-500 z-10">
                    Vendor Name
                  </span>
                  <Input
                    fullWidth
                    value={item.vendor}
                    onChange={
                      viewOnly
                        ? undefined
                        : (e) => handleChange(item.id, 'vendor', e.target.value)
                    }
                    readOnly={viewOnly || !!ocrLoading[item.id]}
                    placeholder="Vendor name"
                  />
                </div>

                <div className="relative">
                  <span className="absolute -top-2 left-3 bg-gray-50 px-1 text-xs text-gray-500 z-30">
                    VAT Type
                  </span>
                  {!viewOnly ? (
                    <Autocomplete
                      options={vatTypeOptions}
                      value={vatTypeOptions.find((o) => o.value === item.vatType) || null}
                      getOptionLabel={(option) => option?.label || ''}
                      onChange={(newValue) =>
                        handleChange(item.id, 'vatType', newValue?.value || '')
                      }
                      placeholder="Search VAT type..."
                      className="w-full z-20"
                    />
                  ) : (
                    <Input fullWidth value={item.vatType || '—'} readOnly={viewOnly || !!ocrLoading[item.id]} />
                  )}
                </div>
              </div>

              {/* Row 2: Address */}
              <div className="relative mb-5">
                <span className="absolute -top-2 left-3 bg-gray-50 px-1 text-xs text-gray-500 z-10">
                  Address
                </span>
                <Input
                  fullWidth
                  value={item.address}
                  onChange={
                    viewOnly
                      ? undefined
                      : (e) => handleChange(item.id, 'address', e.target.value)
                  }
                  readOnly={viewOnly || !!ocrLoading[item.id]}
                  placeholder="Enter Address"
                />
              </div>

              {/* Row 3: VAT breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { field: 'vatable',        label: 'Vatable Sales'    },
                  { field: 'vatAmount',       label: 'VAT Amount'       },
                  { field: 'zeroRatedSales',  label: 'Zero Rated Sales' },
                  { field: 'vatExemptSales',  label: 'VAT Exempt Sales' },
                ].map(({ field, label }) => (
                  <div key={field} className="relative">
                    <span className="absolute -top-2 left-3 bg-gray-50 px-1 text-xs text-gray-500 z-10">
                      {label}
                    </span>
                    <CurrencyInput
                      itemId={item.id}
                      field={field}
                      value={item[field]}
                      readOnly={viewOnly || !!ocrLoading[item.id]}
                      onChange={(raw) => handleChange(item.id, field, raw)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
)}
      <ReceiptPreviewModal
        receipt={previewReceipt}
        onClose={() => setPreviewReceipt(null)}
      />
    </div>
  );
};

export default ExpensesBreakdown;