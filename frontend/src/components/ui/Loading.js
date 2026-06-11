import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Loading Spinner component
 */
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  }[size] || 'w-6 h-6';

  return (
    <Loader2 className={`animate-spin text-primary-600 ${sizeClasses} ${className}`} />
  );
};

/**
 * Loading overlay
 */
export const LoadingOverlay = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
};

/**
 * Inline loading component
 */
export const Loading = ({ message = 'Loading...', className = '' }) => {
  return (
    <div className={`flex items-center justify-center gap-3 py-8 ${className}`}>
      <Spinner />
      <span className="text-gray-600">{message}</span>
    </div>
  );
};
