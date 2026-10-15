import React, { useId } from 'react';
import { Trash2, Plus } from 'lucide-react';
import {
  formatNumber,
  sanitizeNumberInput,
  formatAmount
} from '../../utils/formatters';

const inputStyle = (error) =>
  `min-h-[44px] w-full min-w-0 rounded-lg border bg-white px-3 py-2.5 text-base text-gray-900 outline-none transition-colors sm:text-sm ${
    error
      ? 'border-red-400 focus:ring-2 focus:ring-red-100'
      : 'border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100'
  }`;

function ItemField({ label, error, children }) {
  const helpId = useId();

  return (
    <div className="min-w-0">
      <p className="mb-2 text-xs font-semibold text-gray-600 lg:sr-only">
        {label}
      </p>

      {React.isValidElement(children)
        ? React.cloneElement(children, {
            'aria-invalid': Boolean(error),
            'aria-describedby': error ? helpId : undefined
          })
        : children}

      {error && (
        <p id={helpId} className="mt-1.5 text-xs text-red-600">
          {typeof error === 'string' ? error : 'Please check this field.'}
        </p>
      )}
    </div>
  );
}

export default function ItemsTable({
  items = [],
  viewOnly = false,
  onItemChange,
  onAddItem,
  onRemoveItem,
  errors = {},
  allowActual = false,
  showEstimated = true,
  inputRefs,
  showDays = true,
  showTotal = true
}) {
  const idPrefix = useId();

  const changeAmount = (item, event) => {
    const input = event.target;
    const cursor = input.selectionStart ?? input.value.length;
    const safe = sanitizeNumberInput(input.value);
    const formatted = String(formatNumber(safe) ?? '');

    // Preserve cursor position relative to digits, excluding commas.
    const charactersBeforeCursor = input.value
      .slice(0, cursor)
      .replace(/,/g, '').length;

    let nextCursor = 0;
    let characters = 0;

    while (
      nextCursor < formatted.length &&
      characters < charactersBeforeCursor
    ) {
      if (formatted[nextCursor] !== ',') characters++;
      nextCursor++;
    }

    onItemChange(item.id, 'estimatedAmount', safe, nextCursor);

    requestAnimationFrame(() => {
      if (input.isConnected && document.activeElement === input) {
        input.setSelectionRange(nextCursor, nextCursor);
      }
    });
  };

  const getTotal = (item) =>
    allowActual
      ? item.totalActual ?? item.amount ?? 0
      : item.totalAmount ?? item.totalEstimated ?? 0;

  const columnCount =
    1 +
    Number(showDays) +
    Number(showEstimated) +
    Number(showTotal) +
    Number(!viewOnly);

  const canRemove = items.length > 1;

  return (
    <section className="w-full min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Budget Breakdown
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        {!viewOnly && (
          <button
            type="button"
            onClick={onAddItem}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        )}
      </div>

      {errors.items && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-red-50 px-3 py-3 text-sm text-red-700"
        >
          {typeof errors.items === 'string'
            ? errors.items
            : 'Please check the budget items.'}
        </p>
      )}

      <div className="w-full min-w-0 lg:overflow-x-auto lg:rounded-lg lg:border lg:border-gray-200">
        <table className="block w-full lg:table lg:min-w-[760px]">
          <caption className="sr-only">Budget breakdown items</caption>

          <thead className="hidden border-b border-gray-200 bg-gray-50 lg:table-header-group">
            <tr>
              <th
                scope="col"
                className="px-3 py-3 text-left text-xs font-semibold text-gray-600"
              >
                Particular
              </th>

              {showDays && (
                <th
                  scope="col"
                  className="w-28 px-3 py-3 text-left text-xs font-semibold text-gray-600"
                >
                  No. of Days
                </th>
              )}

              {showEstimated && (
                <th
                  scope="col"
                  className="w-44 px-3 py-3 text-left text-xs font-semibold text-gray-600"
                >
                  Estimated Amount
                </th>
              )}

              {showTotal && (
                <th
                  scope="col"
                  className="w-44 px-3 py-3 text-right text-xs font-semibold text-gray-600"
                >
                  Total Amount
                </th>
              )}

              {!viewOnly && (
                <th
                  scope="col"
                  className="w-20 px-3 py-3 text-center text-xs font-semibold text-gray-600"
                >
                  Action
                </th>
              )}
            </tr>
          </thead>

          <tbody className="block space-y-3 lg:table-row-group lg:space-y-0 lg:divide-y lg:divide-gray-100">
            {items.length === 0 && (
              <tr className="block lg:table-row">
                <td
                  colSpan={columnCount}
                  className="block py-8 text-center text-sm italic text-gray-500 lg:table-cell"
                >
                  No budget items added.
                </td>
              </tr>
            )}

            {items.map((item, index) => {
              const descriptionError =
                errors[`item_description_${item.id}`] ||
                errors[`other_item_description_${item.id}`];

              const amountError =
                errors[`item_amount_${item.id}`] ||
                errors[`other_item_amount_${item.id}`];

              const estimatedAmount =
                item.estimatedAmount ?? item.totalEstimated ?? '';

              return (
                <tr
                  key={item.id}
                  className="grid min-w-0 grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:table-row lg:rounded-none lg:border-0 lg:p-0"
                >
                  <td className="block min-w-0 sm:col-span-2 lg:table-cell lg:px-3 lg:py-3 lg:align-top">
                    <ItemField
                      label={`Item ${index + 1} · Particular`}
                      error={descriptionError}
                    >
                      {viewOnly ? (
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-900">
                          {item.description || '—'}
                        </p>
                      ) : (
                        <textarea
                          id={`${idPrefix}-${item.id}-description`}
                          aria-label={`Item ${index + 1} particular`}
                          rows={1}
                          value={item.description || ''}
                          onChange={(event) =>
                            onItemChange(item.id, 'description', event.target.value)
                          }
                          placeholder="Describe the expense"
                          className={`${inputStyle(
                            descriptionError
                          )} h-11 resize-y leading-5`}
                        />
                      )}
                    </ItemField>
                  </td>

                  {showDays && (
                    <td className="block min-w-0 lg:table-cell lg:px-3 lg:py-3 lg:align-top">
                      <ItemField label="No. of Days">
                        {viewOnly ? (
                          <p className="text-sm text-gray-900">
                            {item.noOfDays ?? '—'}
                          </p>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={`Item ${index + 1} number of days`}
                            value={item.noOfDays ?? ''}
                            onChange={(event) =>
                              onItemChange(
                                item.id,
                                'noOfDays',
                                sanitizeNumberInput(event.target.value)
                              )
                            }
                            className={inputStyle(false)}
                          />
                        )}
                      </ItemField>
                    </td>
                  )}

                  {showEstimated && (
                    <td className="block min-w-0 lg:table-cell lg:px-3 lg:py-3 lg:align-top">
                      <ItemField
                        label="Estimated Amount (₱)"
                        error={amountError}
                      >
                        {viewOnly ? (
                          <p className="break-words text-sm tabular-nums text-gray-900">
                            ₱ {formatNumber(estimatedAmount)}
                          </p>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={`Item ${index + 1} estimated amount in pesos`}
                            ref={(element) => {
                              if (inputRefs?.current) {
                                inputRefs.current[
                                  `${item.id}-estimatedAmount`
                                ] = element;
                              }
                            }}
                            value={formatNumber(estimatedAmount)}
                            onChange={(event) =>
                              changeAmount(item, event)
                            }
                            placeholder="0.00"
                            className={`${inputStyle(
                              amountError
                            )} text-right tabular-nums`}
                          />
                        )}
                      </ItemField>
                    </td>
                  )}

                  {showTotal && (
                    <td className="block min-w-0 sm:col-span-2 lg:table-cell lg:px-3 lg:py-3 lg:align-top">
                      <ItemField label="Total Amount">
                        <p className="min-h-[44px] break-words rounded-lg bg-gray-50 px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-gray-900">
                          ₱ {formatAmount(getTotal(item))}
                        </p>
                      </ItemField>
                    </td>
                  )}

                  {!viewOnly && (
                    <td className="flex justify-end border-t border-gray-100 pt-3 sm:col-span-2 lg:table-cell lg:border-0 lg:px-3 lg:py-3 lg:text-center lg:align-top">
                      <button
                        type="button"
                        onClick={() => canRemove && onRemoveItem(item.id)}
                        disabled={!canRemove}
                        aria-label={`Remove item ${index + 1}`}
                        title={!canRemove ? 'At least one item is required' : undefined}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="lg:hidden">Remove Item</span>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}