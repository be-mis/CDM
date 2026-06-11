import React from 'react';

/**
 * Helper function to get status color based on status value
 */
const getStatusColor = (status) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('pending')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (statusLower.includes('approved')) return 'bg-green-100 text-green-700 border-green-200';
  if (statusLower.includes('disbursed')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (statusLower.includes('completed') || statusLower.includes('liquidated')) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  if (statusLower.includes('rejected')) return 'bg-red-100 text-red-700 border-red-200';
  if (statusLower.includes('verification')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (statusLower.includes('cancelled')) return 'bg-gray-100 text-gray-700 border-gray-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

/**
 * Reusable status chip component
 * Consistent status display across all tables
 */
const StatusChip = ({ status }) => {
  return (
    <span 
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold border ${getStatusColor(status)}`}
    >
      {status}
    </span>
  );
};

export default StatusChip;
