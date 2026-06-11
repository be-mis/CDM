import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { formatLongDate } from '../../utils/formatters';
import Button from '../ui/Button';
import Input from '../ui/Input';

const ActivitiesTable = ({
    activities,
    viewOnly,
    onActivityChange,
    onAddActivity,
    onRemoveActivity,
    errors
}) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Activity Details</h3>
                {!viewOnly && (
                    <Button variant="secondary" size="sm" startIcon={<Plus className="w-4 h-4" />} onClick={onAddActivity}>
                        Add Activity
                    </Button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Destination</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[180px]">Start Date</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[180px]">End Date</th>
                            {!viewOnly && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 w-[80px]">Action</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {activities.map((act) => (
                            <tr key={act.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <Input
                                        fullWidth
                                        value={act.destination}
                                        onChange={viewOnly ? undefined : (e) => onActivityChange(act.id, 'destination', e.target.value)}
                                        readOnly={viewOnly}
                                        placeholder="Enter destination"
                                        error={errors?.[`activity_destination_${act.id}`]}
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    {!viewOnly ? (
                                        <Input
                                            type="date"
                                            value={act.startDate}
                                            onChange={(e) => onActivityChange(act.id, 'startDate', e.target.value)}
                                            error={errors?.[`activity_start_${act.id}`]}
                                            className="w-[170px]"
                                        />
                                    ) : (
                                        <Input
                                            fullWidth
                                            value={formatLongDate(act.startDate)}
                                            readOnly
                                        />
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {!viewOnly ? (
                                        <Input
                                            type="date"
                                            value={act.endDate}
                                            onChange={(e) => onActivityChange(act.id, 'endDate', e.target.value)}
                                            error={errors?.[`activity_end_${act.id}`]}
                                            className="w-[170px]"
                                        />
                                    ) : (
                                        <Input
                                            fullWidth
                                            value={formatLongDate(act.endDate)}
                                            readOnly
                                        />
                                    )}
                                </td>
                                {!viewOnly && (
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => onRemoveActivity(act.id)}
                                            disabled={activities.length === 1}
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

export default ActivitiesTable;
