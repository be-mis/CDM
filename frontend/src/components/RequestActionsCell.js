import React from 'react';
import { Eye, Edit, Trash2, Receipt } from 'lucide-react';
import Tooltip from './ui/Tooltip';

/**
 * Reusable action buttons component for request tables
 * Improves maintainability by centralizing action button logic
 */
const RequestActionsCell = ({ 
  request, 
  onView, 
  onEdit, 
  onDelete, 
  onCreateLiquidation,
  showLiquidationButton = false 
}) => {
  const statusLower = (request.status || '').toLowerCase();
  const isDraftOrCancelled = ['draft', 'cancelled'].includes(statusLower);
  const isPendingOrDraft = statusLower.includes('pending') || statusLower === 'draft';
  const isApproved = statusLower.includes('approved');

  return (
    <div className="flex items-center gap-1">
      <Tooltip title="View Details">
        <button 
          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors" 
          onClick={() => onView(request)}
        >
          <Eye className="w-4 h-4" />
        </button>
      </Tooltip>

      {isDraftOrCancelled && (
        <Tooltip title="Edit">
          <button 
            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors" 
            onClick={() => onEdit(request)}
          >
            <Edit className="w-4 h-4" />
          </button>
        </Tooltip>
      )}

      {isPendingOrDraft && (
        <Tooltip title="Delete">
          <button 
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" 
            onClick={() => onDelete(request)}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </Tooltip>
      )}

      {showLiquidationButton && isApproved && (
        <Tooltip title="Create Liquidation">
          <button 
            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" 
            onClick={() => onCreateLiquidation(request)}
          >
            <Receipt className="w-4 h-4" />
          </button>
        </Tooltip>
      )}
    </div>
  );
};

export default RequestActionsCell;
