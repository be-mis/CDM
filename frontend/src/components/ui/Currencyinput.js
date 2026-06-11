import React from 'react';
import Input from './Input';
import { formatNumber, sanitizeNumberInput } from '../../utils/formatters';

const CurrencyInput = ({
  value,
  onChange,
  readOnly = false,
  fullWidth = true,
  className,
  placeholder,
  name,
  id,
  itemId,
  field,
  ...rest
}) => {
  const handleChange = readOnly
    ? undefined
    : (e) => {
        const input = e.target;
        const cursorPos = input.selectionStart;
        const oldFormatted = formatNumber(value);
        const sanitized = sanitizeNumberInput(e.target.value);
        const newFormatted = formatNumber(sanitized);

        // Adjust cursor for commas added/removed by formatting
        const oldCommas = (oldFormatted.slice(0, cursorPos).match(/,/g) || []).length;
        const newCommas = (newFormatted.slice(0, cursorPos).match(/,/g) || []).length;
        const adjustedCursor = cursorPos + (newCommas - oldCommas);

        onChange?.(sanitized, adjustedCursor);

        // Re-position caret after React re-render
        setTimeout(() => {
          input.setSelectionRange(adjustedCursor, adjustedCursor);
        }, 0);
      };

    const dataAttrs = {};
  if (itemId !== undefined) dataAttrs['data-item-id'] = itemId;
  if (field  !== undefined) dataAttrs['data-field']   = field;

  return (
    <Input
      fullWidth={fullWidth}
      type="text"
      inputMode="decimal"
      name={name}
      id={id}
      className={className}
      placeholder={placeholder}
      value={formatNumber(value)}
      onChange={handleChange}
      readOnly={readOnly}
      startAdornment={<span className="text-gray-500">₱</span>}
      {...dataAttrs}
      {...rest}
    />
  );
};

export default CurrencyInput;