import React from 'react';
import { ChevronDown, Trash2, Plus } from 'lucide-react';
import { formatLongDate, formatNumber, sanitizeNumberInput } from '../../utils/formatters';
import Button from '../ui/Button';
import Input from '../ui/Input';

const ActivityLiquidationCard = ({
    activity,
    transportation = [],
    otherExpenses = [],
    viewOnly = false,
    onTransportationChange,
    onTransportationAdd,
    onTransportationRemove,
    onOtherExpenseChange,
    onOtherExpenseAdd,
    onOtherExpenseRemove,
    expanded = true,
    onExpandChange
}) => {
    // Format date coverage for display
    const getDateCoverage = () => {
        if (!activity.startDate && !activity.endDate) return 'No dates';
        const start = formatLongDate(activity.startDate);
        const end = formatLongDate(activity.endDate);
        if (start === end) return start;
        return `${start} - ${end}`;
    };

    const dateCovered = getDateCoverage();

    return (
        <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
            {/* Accordion Header */}
            <button
                onClick={onExpandChange}
                className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <h4 className="text-base font-semibold text-gray-900">
                        {activity.destination || 'No Destination'}
                    </h4>
                    <span className="text-sm text-gray-600">
                        {dateCovered}
                    </span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Accordion Content */}
            {expanded && (
                <div className="p-6">
                    {/* Transportation Section */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h5 className="text-sm font-semibold text-gray-900">Transportation</h5>
                            {!viewOnly && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    startIcon={<Plus className="w-4 h-4" />}
                                    onClick={() => onTransportationAdd(activity.id)}
                                >
                                    Add
                                </Button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border border-gray-200 rounded-lg">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">From</th>
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">To</th>
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[150px]">Mode of Transport</th>
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[140px]">Amount</th>
                                        {!viewOnly && <th className="px-2 py-2 w-[50px]">Action</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {transportation.length === 0 ? (
                                        <tr>
                                            <td colSpan={viewOnly ? 4 : 5} className="py-4 text-center text-gray-500 text-sm">
                                                No transportation entries
                                            </td>
                                        </tr>
                                    ) : (
                                        transportation.map((t) => (
                                            <tr key={t.id} className="hover:bg-gray-50">
                                                <td className="px-2 py-2">
                                                    <Input
                                                        fullWidth
                                                        value={t.fromLocation || ''}
                                                        onChange={viewOnly ? undefined : (e) => onTransportationChange(t.id, 'fromLocation', e.target.value)}
                                                        readOnly={viewOnly}
                                                        placeholder="From location"
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <Input
                                                        fullWidth
                                                        value={t.toLocation || ''}
                                                        onChange={viewOnly ? undefined : (e) => onTransportationChange(t.id, 'toLocation', e.target.value)}
                                                        readOnly={viewOnly}
                                                        placeholder="To location"
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <Input
                                                        fullWidth
                                                        value={t.modeOfTransport || ''}
                                                        onChange={viewOnly ? undefined : (e) => onTransportationChange(t.id, 'modeOfTransport', e.target.value)}
                                                        readOnly={viewOnly}
                                                        placeholder="Bus, Taxi, etc."
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <Input
                                                        fullWidth
                                                        value={viewOnly ? (t.amount || 0).toLocaleString() : formatNumber(t.amount || 0)}
                                                        onChange={viewOnly ? undefined : (e) => {
                                                            const safe = sanitizeNumberInput(e.target.value);
                                                            onTransportationChange(t.id, 'amount', safe);
                                                        }}
                                                        startAdornment={<span className="text-gray-500">₱</span>}
                                                        readOnly={viewOnly}
                                                    />
                                                </td>
                                                {!viewOnly && (
                                                    <td className="px-2 py-2">
                                                        <button
                                                            onClick={() => onTransportationRemove(t.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Other Expenses Section */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h5 className="text-sm font-semibold text-gray-900">Other Expenses</h5>
                            {!viewOnly && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    startIcon={<Plus className="w-4 h-4" />}
                                    onClick={() => onOtherExpenseAdd(activity.id)}
                                >
                                    Add
                                </Button>
                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border border-gray-200 rounded-lg">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Description</th>
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[90px]">No. of Days</th>
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[130px]">Amount</th>
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[110px]">Receipt #</th>
                                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[130px]">Vendor</th>
                                        {!viewOnly && <th className="px-2 py-2 w-[50px]">Action</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {otherExpenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={viewOnly ? 5 : 6} className="py-4 text-center text-gray-500 text-sm">
                                                No other expenses
                                            </td>
                                        </tr>
                                    ) : (
                                        otherExpenses.map((e) => (
                                            <tr key={e.id} className="hover:bg-gray-50">
                                                <td className="px-2 py-2">
                                                    <Input
                                                        fullWidth
                                                        value={e.description || e.particulars || ''}
                                                        onChange={viewOnly ? undefined : (ev) => onOtherExpenseChange(e.id, 'description', ev.target.value)}
                                                        readOnly={viewOnly}
                                                        placeholder="Description"
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <Input
                                                        fullWidth
                                                        type="number"
                                                        value={e.noOfDays || ''}
                                                        onChange={viewOnly ? undefined : (ev) => onOtherExpenseChange(e.id, 'noOfDays', parseInt(ev.target.value) || 0)}
                                                        readOnly={viewOnly}
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <Input
                                                        fullWidth
                                                        value={viewOnly ? (e.amount || 0).toLocaleString() : formatNumber(e.amount || 0)}
                                                        onChange={viewOnly ? undefined : (ev) => {
                                                            const safe = sanitizeNumberInput(ev.target.value);
                                                            onOtherExpenseChange(e.id, 'amount', safe);
                                                        }}
                                                        startAdornment={<span className="text-gray-500">₱</span>}
                                                        readOnly={viewOnly}
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <Input
                                                        fullWidth
                                                        value={e.receiptNumber || ''}
                                                        onChange={viewOnly ? undefined : (ev) => onOtherExpenseChange(e.id, 'receiptNumber', ev.target.value)}
                                                        readOnly={viewOnly}
                                                    />
                                                </td>
                                                <td className="px-2 py-2">
                                                    <Input
                                                        fullWidth
                                                        value={e.vendor || ''}
                                                        onChange={viewOnly ? undefined : (ev) => onOtherExpenseChange(e.id, 'vendor', ev.target.value)}
                                                        readOnly={viewOnly}
                                                    />
                                                </td>
                                                {!viewOnly && (
                                                    <td className="px-2 py-2">
                                                        <button
                                                            onClick={() => onOtherExpenseRemove(e.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityLiquidationCard;
