import React, { useCallback } from 'react';
import { Plus, Trash2, Paperclip, X } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { formatLongDate } from '../../utils/formatters';
import ReceiptPreviewModal from '../modal/Receiptpreviewmodal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const nextId = (arr) =>
  arr.length === 0 ? 1 : Math.max(...arr.map((x) => x.id)) + 1;

export const blankItinerary = (id = 1) => ({
  id,
  dateCovered:          '',
  storeName:            '',
  fromPlace:            '',
  toPlace:              '',
  modeOfTransportation: '',
  amount:               0,
  receipt:              null,
});

// ---------------------------------------------------------------------------
// ItinerarySheet
// ---------------------------------------------------------------------------
/**
 * Props
 * ─────
 * @param {array}    itineraryItems         - Controlled array of itinerary objects.
 * @param {function} onItineraryItemsChange - Called with the full updated array
 *                                            whenever items change.
 * @param {boolean}  [viewOnly=false]
 */
const ItinerarySheet = ({
  itineraryItems,
  onItineraryItemsChange,
  viewOnly = false,
  minDate,
  maxDate,
}) => {
  const [previewReceipt, setPreviewReceipt] = React.useState(null);
  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const updateItem = useCallback(
    (id, field, value) =>
      onItineraryItemsChange(
        itineraryItems.map((it) => (it.id === id ? { ...it, [field]: value } : it)),
      ),
    [itineraryItems, onItineraryItemsChange],
  );

  // ---------------------------------------------------------------------------
  // Add / remove rows
  // ---------------------------------------------------------------------------
  const handleAdd = useCallback(() => {
    onItineraryItemsChange([...itineraryItems, blankItinerary(nextId(itineraryItems))]);
  }, [itineraryItems, onItineraryItemsChange]);

  const handleRemove = useCallback(
    (id) => onItineraryItemsChange(itineraryItems.filter((it) => it.id !== id)),
    [itineraryItems, onItineraryItemsChange],
  );

  // ---------------------------------------------------------------------------
  // Receipt attachment
  // ---------------------------------------------------------------------------
  const handleReceiptChange = useCallback(
    (id, e) => {
      const file = e.target.files[0];
      if (!file) return;
      e.target.value = '';
      try { file.preview = URL.createObjectURL(file); } catch { file.preview = null; }
      updateItem(id, 'receipt', file);
    },
    [updateItem],
  );

  const handleRemoveReceipt = useCallback(
    (id, currentReceipt) => {
      try { if (currentReceipt?.preview) URL.revokeObjectURL(currentReceipt.preview); } catch { }
      updateItem(id, 'receipt', null);
    },
    [updateItem],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Itinerary Sheet</h3>
          <span className="text-xs text-gray-500">Optional</span>
        </div>
        {!viewOnly && (
          <Button
            variant="secondary"
            size="sm"
            startIcon={<Plus className="w-4 h-4" />}
            onClick={handleAdd}
          >
            Add Activity
          </Button>
        )}
      </div>
{viewOnly ? (

      <div className="space-y-3">
        <table className="w-full text-sm border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Date Covered</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Store Name</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">From</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">To</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Mode of Transportation</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Amount</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {itineraryItems.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">{formatLongDate(item.dateCovered)}</td>
                <td className="px-3 py-2">{item.storeName}</td>
                <td className="px-3 py-2">{item.fromPlace}</td>
                <td className="px-3 py-2">{item.toPlace}</td>
                <td className="px-3 py-2">{item.modeOfTransportation}</td>
                <td className="px-3 py-2">{item.amount ? `₱${item.amount.toFixed(2)}` : ''}</td>
                <td className="px-3 py-2">
                  {item.receipt ? (
                    <button
                      type="button"
                      onClick={() => setPreviewReceipt(item.receipt)}
                      className="text-indigo-500 hover:text-indigo-700 hover:underline transition-colors"
                    >
                      {item.receipt.fileName || item.receipt.name || 'View Receipt'}
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
        {itineraryItems.map((item, index) => (
          <div
            key={item.id}
            className="border-2 border-indigo-300 rounded-xl overflow-hidden bg-white shadow-sm"
          >
            {/* Row header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Activity #{index + 1}
              </span>
              {!viewOnly && (
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="px-4 pt-5 pb-5 space-y-4">
              {/* Date, Store Name, Amount, Receipt */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">

                {/* Date */}
                <div className="md:col-span-2 relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500 z-10">
                    Date
                  </span>
                  {!viewOnly ? (
                    <Input
                      fullWidth
                      type="date"
                      value={item.dateCovered || ''}
                      onChange={(e) => updateItem(item.id, 'dateCovered', e.target.value)}
                      min={minDate || undefined}
                      max={maxDate || undefined}
                    />
                  ) : (
                    <Input fullWidth value={formatLongDate(item.dateCovered)} readOnly />
                  )}
                </div>

                {/* Store Name */}
                <div className="md:col-span-5 relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500 z-10">
                    Store Name
                  </span>
                  <Input
                    fullWidth
                    value={item.storeName || ''}
                    onChange={
                      viewOnly
                        ? undefined
                        : (e) => updateItem(item.id, 'storeName', e.target.value)
                    }
                    readOnly={viewOnly}
                    placeholder="Store / Merchant"
                  />
                </div>

                {/* Amount */}
                <div className="md:col-span-3 relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500 z-10">
                    Amount
                  </span>
                  <Input
                    fullWidth
                    type="number"
                    step="0.01"
                    value={item.amount || ''}
                    onChange={
                      viewOnly
                        ? undefined
                        : (e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)
                    }
                    readOnly={viewOnly}
                    startAdornment={<span className="text-gray-500">₱</span>}
                  />
                </div>

                {/* Receipt */}
                <div className="md:col-span-2 relative">
                  <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-500 z-10">
                    Receipt
                  </span>

                  {!viewOnly ? (
                    !item.receipt ? (
                      <>
                        <input
                          accept="image/*,.pdf,.doc,.docx"
                          className="hidden"
                          id={`itinerary-file-upload-${item.id}`}
                          type="file"
                          onChange={(e) => handleReceiptChange(item.id, e)}
                        />
                        <label
                          htmlFor={`itinerary-file-upload-${item.id}`}
                          className="inline-flex items-center w-full justify-center px-3 py-2 text-xs font-medium rounded-lg text-gray-500 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-colors min-h-[38px]"
                        >
                          <Paperclip className="w-3.5 h-3.5 mr-1.5" />
                          Attach File
                        </label>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-white border border-gray-200 min-h-[38px]">
                        <Paperclip className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span
                          className="text-xs text-gray-700 truncate flex-1 min-w-0"
                          title={item.receipt.fileName || item.receipt.name || item.receipt}
                        >
                          {item.receipt.fileName || item.receipt.name || item.receipt}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveReceipt(item.id, item.receipt)}
                          className="text-gray-400 hover:text-red-600 transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-900 min-h-[38px] flex items-center">
                      {item.receipt ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (item.receipt?.filePath) setPreviewReceipt(item.receipt);
                          }}
                          className="text-xs text-primary-600 hover:underline truncate w-full text-left"
                          title={item.receipt?.fileName || item.receipt?.name || item.receipt}
                        >
                          {item.receipt?.fileName || item.receipt?.name || item.receipt}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Travel Details sub-panel */}
              <div className="rounded-lg border border-gray-100 bg-gray-50/60 px-4 pt-5 pb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-5">
                  Travel Details
                </p>
                <div className="grid grid-cols-1 md:grid-cols-9 gap-4">
                  {[
                    { field: 'fromPlace',             label: 'From',                   span: 3, placeholder: 'Origin'                 },
                    { field: 'toPlace',               label: 'To',                     span: 3, placeholder: 'Destination'            },
                    { field: 'modeOfTransportation',  label: 'Mode of Transportation', span: 3, placeholder: 'e.g., Car, Bus, Flight' },
                  ].map(({ field, label, span, placeholder }) => (
                    <div key={field} className={`md:col-span-${span} relative`}>
                      <span className="absolute -top-2 left-3 bg-gray-50 px-1 text-xs text-gray-500 z-10">
                        {label}
                      </span>
                      <Input
                        fullWidth
                        value={item[field] || ''}
                        onChange={
                          viewOnly
                            ? undefined
                            : (e) => updateItem(item.id, field, e.target.value)
                        }
                        readOnly={viewOnly}
                        placeholder={placeholder}
                      />
                    </div>
                  ))}
                </div>
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

      {itineraryItems.length === 0 && (
        <p className="text-sm text-gray-500 py-6 text-center italic">
          No itinerary entries. Click "Add Activity" to add travel details.
        </p>
      )}
    </div>
  );
};

export default ItinerarySheet;