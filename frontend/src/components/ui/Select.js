import React from 'react';

/**
 * Custom Select component to replace MUI Select
 */
const Select = ({ 
  label, 
  error = false, 
  helperText = '', 
  required = false,
  fullWidth = false,
  children,
  className = '',
  value,
  onChange,
  ...props 
}) => {
  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <select
        value={value}
        onChange={onChange}
        className={`px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
          error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
        } ${fullWidth ? 'w-full' : ''} ${props.disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        {...props}
      >
        {children}
      </select>
      
      {helperText && (
        <p className={`mt-1 text-sm ${error ? 'text-red-500' : 'text-gray-500'}`}>
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Select;
