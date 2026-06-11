import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

/**
 * Custom Alert component to replace MUI Alert/Snackbar
 */
export const Alert = ({ 
  open, 
  onClose, 
  message, 
  severity = 'info', 
  duration = 6000,
  position = 'bottom-center' 
}) => {
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    setIsVisible(open);
  }, [open]);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      setTimeout(onClose, 300); // Wait for animation
    }
  };

  if (!isVisible) return null;

  const severityStyles = {
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: <AlertCircle className="w-5 h-5 text-red-600" />
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-800',
      icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon: <Info className="w-5 h-5 text-blue-600" />
    }
  };

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
  }[position] || 'bottom-4 left-1/2 -translate-x-1/2';

  const style = severityStyles[severity] || severityStyles.info;

  return (
    <div className={`fixed ${positionClasses} z-50 animate-fade-in`}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${style.bg} ${style.text} min-w-[300px] max-w-md`}>
        {style.icon}
        <div className="flex-1 text-sm font-medium">{message}</div>
        <button 
          onClick={handleClose}
          className="text-current opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * Inline Alert (non-floating, to replace MUI Alert in forms)
 */
export const InlineAlert = ({ severity = 'info', children, className = '' }) => {
  const severityStyles = {
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: <AlertCircle className="w-5 h-5 text-red-600" />
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      text: 'text-yellow-800',
      icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon: <Info className="w-5 h-5 text-blue-600" />
    }
  };

  const style = severityStyles[severity] || severityStyles.info;

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${style.bg} ${style.text} ${className}`}>
      {style.icon}
      <div className="flex-1 text-sm">{children}</div>
    </div>
  );
};

export default Alert;
