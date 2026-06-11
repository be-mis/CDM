import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { formatNumber, sanitizeNumberInput, formatLongDate, formatAmount } from '../../utils/formatters';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { InlineAlert } from '../ui/Alert';

const TruncatedViewField = ({ value }) => (
    <div
        className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 whitespace-nowrap overflow-hidden text-ellipsis w-full text-sm text-gray-900 min-h-[35px] flex items-center"
        title={value || ''}
    >
        {value || '-'}
    </div>
);

const ItemsTable = ({
    items,
    advanceType,
    viewOnly,
    onItemChange, // (id, field, value, cursorPos)
    onAddItem,
    onRemoveItem,
    errors,
    title = "Budget Breakdown",
    allowActual = false,
    showReceiptFields = false,
    showDate = false,
    showDays = false,
    showTotal = false,
    showEstimated = true,
    estimatedLabel = "Estimated Amount"
}) => {
    const visibleDays = showDays || (advanceType === 'travel' && !title.includes("Others"));
    const visibleTotal = showTotal || (advanceType === 'travel' && !title.includes("Others"));

    return (
        <div>
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                {!viewOnly && !title.includes("Per Diem") && (
                    <Button
                        variant="secondary"
                        size="sm"
                        startIcon={<Plus className="w-4 h-4" />}
                        onClick={onAddItem}
                    >
                        Add Item
                    </Button>
                )}
            </div>

            {errors?.items && (
                <div className="mb-3">
                    <InlineAlert severity="error">{errors.items}</InlineAlert>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                        <tr>
                            {showDate && <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[75px]">Date</th>}
                            {advanceType === 'travel' && !title.includes("Others") && <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Destination</th>}
                            <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[300px]">Description</th>
                            {visibleDays && <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[80px] whitespace-nowrap">No. of Days</th>}

                            {showEstimated && <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[160px]">{estimatedLabel}</th>}
                            {allowActual && <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[160px]">Amount</th>}

                            {visibleTotal && (
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[160px]">Total {allowActual ? 'Actual' : 'Amount'}</th>
                            )}

                            {showReceiptFields && (
                                <>
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[250px]">TIN</th>
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[250px]">Vendor</th>
                                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[250px]">Address</th>
                                </>
                            )}
                            {!viewOnly && <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[50px]">Action</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="py-4 text-center">
                                    <span className="text-gray-500 italic text-sm">
                                        No items added. {!viewOnly ? 'Click "Add Item" to include expenses like fuel, parking, tolls, or other miscellaneous costs.' : ''}
                                    </span>
                                </td>
                            </tr>
                        ) : items.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                {showDate && (
                                    <td className="px-2 py-2">
                                        {!viewOnly ? (
                                            <Input
                                                fullWidth
                                                type="date"
                                                value={item.expenseDate || ''}
                                                onChange={(e) => onItemChange(item.id, 'expenseDate', e.target.value)}
                                                error={errors?.[`item_expenseDate_${item.id}`]}
                                            />
                                        ) : (
                                            <TruncatedViewField value={formatLongDate(item.expenseDate || item.date)} />
                                        )}
                                    </td>
                                )}
                                {advanceType === 'travel' && !title.includes("Others") && (
                                    <td className="px-2 py-2">
                                        {viewOnly ? (
                                            <TruncatedViewField value={item.destination || ''} />
                                        ) : (
                                            <Input fullWidth value={item.destination || ''} readOnly />
                                        )}
                                    </td>
                                )}
                                <td className="px-2 py-2">
                                    {viewOnly ? (
                                        <TruncatedViewField value={item.description} />
                                    ) : (
                                        <Input
                                            fullWidth
                                            value={item.description}
                                            onChange={(e) => onItemChange(item.id, 'description', e.target.value)}
                                            error={errors?.[`item_description_${item.id}`] || errors?.[`other_item_description_${item.id}`]}
                                        />
                                    )}
                                </td>
                                {visibleDays && (
                                    <td className="px-2 py-2">
                                        <Input
                                            fullWidth
                                            value={item.noOfDays}
                                            onChange={viewOnly ? undefined : (e) => {
                                                const val = sanitizeNumberInput(e.target.value);
                                                onItemChange(item.id, 'noOfDays', val);
                                            }}
                                            readOnly={viewOnly || (item._auto && advanceType === 'travel')}
                                        />
                                    </td>
                                )}
                                {showEstimated && (
                                    <td className="px-2 py-2">
                                        {viewOnly || allowActual ? (
                                            <TruncatedViewField value={`₱ ${formatAmount(item.estimatedAmount || item.totalEstimated)}`} />
                                        ) : (
                                            <Input
                                                fullWidth
                                                value={formatNumber(item.estimatedAmount || item.totalEstimated)}
                                                onChange={(e) => {
                                                    const input = e.target;
                                                    const cursorPos = input.selectionStart;
                                                    const oldValue = formatNumber(item.estimatedAmount || item.totalEstimated);
                                                    const newValue = e.target.value;
                                                    const safe = sanitizeNumberInput(newValue);
                                                    const formatted = formatNumber(safe);
                                                    let newCursorPos = cursorPos;
                                                    const oldCommas = (oldValue.slice(0, cursorPos).match(/,/g) || []).length;
                                                    const newCommas = (formatted.slice(0, cursorPos).match(/,/g) || []).length;
                                                    newCursorPos += (newCommas - oldCommas);
                                                    onItemChange(item.id, 'estimatedAmount', safe, newCursorPos);
                                                }}
                                                error={errors?.[`item_amount_${item.id}`] || errors?.[`other_item_amount_${item.id}`]}
                                                startAdornment={<span className="text-gray-500">₱</span>}
                                            />
                                        )}
                                    </td>
                                )}
                                {allowActual && (
                                    <td className="px-2 py-2">
                                        {viewOnly ? (
                                            <TruncatedViewField value={`₱ ${formatAmount(item.amount)}`} />
                                        ) : (
                                            <Input
                                                fullWidth
                                                value={formatNumber(item.amount)}
                                                onChange={(e) => {
                                                    const input = e.target;
                                                    const cursorPos = input.selectionStart;
                                                    const oldValue = formatNumber(item.actualAmount);
                                                    const newValue = e.target.value;
                                                    const safe = sanitizeNumberInput(newValue);
                                                    const formatted = formatNumber(safe);
                                                    let newCursorPos = cursorPos;
                                                    const oldCommas = (oldValue.slice(0, cursorPos).match(/,/g) || []).length;
                                                    const newCommas = (formatted.slice(0, cursorPos).match(/,/g) || []).length;
                                                    newCursorPos += (newCommas - oldCommas);
                                                    onItemChange(item.id, 'amount', safe, newCursorPos);
                                                }}
                                                startAdornment={<span className="text-gray-500">₱</span>}
                                                error={errors?.[`item_amount_${item.id}`]}
                                            />
                                        )}
                                    </td>
                                )}

                                {visibleTotal && (
                                    <td className="px-2 py-2">
                                        <TruncatedViewField value={`₱ ${formatAmount(allowActual ? (item.totalActual || item.amount) : (item.totalAmount || item.totalEstimated))}`} />
                                    </td>
                                )}

                                {showReceiptFields && (
                                    <>
                                        <td className="px-2 py-2">
                                            {viewOnly ? (
                                                <TruncatedViewField value={item.tin} />
                                            ) : (
                                                <Input
                                                    fullWidth
                                                    value={item.tin || ''}
                                                    onChange={(e) => onItemChange(item.id, 'tin', e.target.value)}
                                                    error={errors?.[`item_tin_${item.id}`]}
                                                />
                                            )}
                                        </td>
                                        <td className="px-2 py-2">
                                            {viewOnly ? (
                                                <TruncatedViewField value={item.vendor} />
                                            ) : (
                                                <Input
                                                    fullWidth
                                                    value={item.vendor || ''}
                                                    onChange={(e) => onItemChange(item.id, 'vendor', e.target.value)}
                                                    error={errors?.[`item_vendor_${item.id}`]}
                                                />
                                            )}
                                        </td>
                                        <td className="px-2 py-2">
                                            {viewOnly ? (
                                                <TruncatedViewField value={item.address} />
                                            ) : (
                                                <Input
                                                    fullWidth
                                                    value={item.address || ''}
                                                    onChange={(e) => onItemChange(item.id, 'address', e.target.value)}
                                                    error={errors?.[`item_address_${item.id}`]}
                                                />
                                            )}
                                        </td>
                                    </>
                                )}
                                {!viewOnly && !title.includes("Per Diem") && (
                                    <td className="px-2 py-2">
                                        <button
                                            onClick={() => onRemoveItem(item.id)}
                                            disabled={items.length === 1 && !title.includes("Others")}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ItemsTable;
