import React, { forwardRef } from 'react';

/**
 * Custom Input component to replace MUI TextField
 */
const Input = forwardRef(({ 
  label, 
  error = false, 
  helperText = '', 
  required = false,
  type = 'text',
  fullWidth = false,
  multiline = false,
  rows = 3,
  startAdornment,
  endAdornment,
  className = '',
  ...props 
}, ref) => {
  const baseInputClasses = `px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
    error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
  } ${fullWidth ? 'w-full' : ''} ${props.disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`;

  const InputElement = multiline ? 'textarea' : 'input';

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {startAdornment && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {startAdornment}
          </div>
        )}
        
        <InputElement
          ref={ref}
          type={type}
          rows={multiline ? rows : undefined}
          className={`${baseInputClasses} ${startAdornment ? 'pl-10' : ''} ${endAdornment ? 'pr-10' : ''}`}
          {...props}
        />
        
        {endAdornment && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {endAdornment}
          </div>
        )}
      </div>
      
      {helperText && (
        <p className={`mt-1 text-sm ${error ? 'text-red-500' : 'text-gray-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
