import React from 'react';

/**
 * Card component to replace MUI Card
 */
export const Card = ({ children, className = '', hover = false, ...props }) => {
  return (
    <div 
      className={`bg-white border border-blue-200 rounded-lg shadow-sm ${
        hover ? 'transition-shadow hover:shadow-md' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * CardHeader component
 */
export const CardHeader = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
      {children}
    </div>
  );
};

/**
 * CardContent component
 */
export const CardContent = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
};

/**
 * CardActions component
 */
export const CardActions = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2 ${className}`}>
      {children}
    </div>
  );
};
