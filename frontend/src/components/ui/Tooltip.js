import React, { useState } from 'react';

/**
 * Custom Tooltip component to replace MUI Tooltip
 */
const Tooltip = ({ children, title, placement = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!title) return children;

  const placementClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[placement] || 'bottom-full left-1/2 -translate-x-1/2 mb-2';

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      
      {isVisible && (
        <div className={`absolute ${placementClasses} z-50 pointer-events-none`}>
          <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
            {title}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
