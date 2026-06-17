import React from "react";
import { Trash2, Plus } from "lucide-react";
import {
  formatNumber,
  sanitizeNumberInput,
  formatLongDate,
  formatAmount,
} from "../../utils/formatters";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { InlineAlert } from "../ui/Alert";

const TruncatedViewField = ({ value }) => (
  <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 whitespace-nowrap overflow-hidden text-ellipsis w-full text-sm text-gray-900 min-h-[35px] flex items-center">
    {value || "-"}
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
  allowActual = false,
  showEstimated = true,
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-900">
          Budget Breakdown
        </h3>
        {!viewOnly && (
        <Button
          variant="secondary"
          size="sm"
          startIcon={<Plus className="w-4 h-4" />}
          onClick={onAddItem}
        >
          Add Item
        </Button>)}
      </div>

      {errors?.items && (
        <div className="mb-3">
          <InlineAlert severity="error">{errors.items}</InlineAlert>
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[300px]">
                Particular
              </th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[80px] whitespace-nowrap">
                No. of Days
              </th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[160px]">
                Estimated Amount
              </th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[160px]">
                Total Amount
              </th>
              {!viewOnly && (
                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 w-[50px]">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-2 py-2">
                  {viewOnly ? (
                    item.description
                  ) : (
                    <Input
                      fullWidth
                      value={item.description}
                      onChange={(e) =>
                        onItemChange(item.id, "description", e.target.value)
                      }
                      error={
                        errors?.[`item_description_${item.id}`] ||
                        errors?.[`other_item_description_${item.id}`]
                      }
                    />
                  )}
                </td>
                <td className="px-2 py-2">
                    {viewOnly ? (
                    item.noOfDays
                  ) : (
                  <Input
                    fullWidth
                    value={item.noOfDays}
                    onChange={(e) => {
                        const val = sanitizeNumberInput(e.target.value);
                        onItemChange(item.id, "noOfDays", val);
                      }}
                  />)}
                </td>
                <td className="px-2 py-2">
                  {viewOnly ? (
                    `₱ ${formatNumber(item.estimatedAmount || item.totalEstimated)}`
                  ) : (
                    <Input
                      fullWidth
                      value={formatNumber(
                        item.estimatedAmount || item.totalEstimated,
                      )}
                      onChange={(e) => {
                        const input = e.target;
                        const cursorPos = input.selectionStart;
                        const oldValue = formatNumber(
                          item.estimatedAmount || item.totalEstimated,
                        );
                        const newValue = e.target.value;
                        const safe = sanitizeNumberInput(newValue);
                        const formatted = formatNumber(safe);
                        let newCursorPos = cursorPos;
                        const oldCommas = (
                          oldValue.slice(0, cursorPos).match(/,/g) || []
                        ).length;
                        const newCommas = (
                          formatted.slice(0, cursorPos).match(/,/g) || []
                        ).length;
                        newCursorPos += newCommas - oldCommas;
                        onItemChange(
                          item.id,
                          "estimatedAmount",
                          safe,
                          newCursorPos,
                        );
                      }}
                      error={
                        errors?.[`item_amount_${item.id}`] ||
                        errors?.[`other_item_amount_${item.id}`]
                      }
                      startAdornment={<span className="text-gray-500">₱</span>}
                    />
                  )}
                </td>

                <td className="px-2 py-2">
                {viewOnly ? (
                    `₱ ${formatAmount(item.totalAmount || item.totalEstimated)}`) : (
                  <TruncatedViewField
                    value={`₱ ${formatAmount(allowActual ? item.totalActual || item.amount : item.totalAmount || item.totalEstimated)}`}
                  />
                  )}
                </td>
                {!viewOnly && (
                  <td className="px-2 py-2">
                    <button
                      onClick={() => onRemoveItem(item.id)}
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
