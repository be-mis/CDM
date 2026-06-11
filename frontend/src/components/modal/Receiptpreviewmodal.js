import React, { useEffect, useCallback } from 'react';
import { X, Download, ExternalLink, FileText } from 'lucide-react';

/**
 * ReceiptPreviewModal
 *
 * Inline preview modal for receipt files attached to expense / itinerary rows.
 * - Images  → rendered directly with <img>
 * - PDFs    → rendered in an <iframe>
 * - Other   → download / open-in-tab fallback
 *
 * Props
 * ─────
 * @param {object|null} receipt   - { fileName, filePath, fileType } or null to close
 * @param {function}    onClose   - called when the modal should close
 */

const getFileUrl = (filePath) =>
  `${(process.env.REACT_APP_API_URL || '').replace(/\/api$/, '')}${filePath}`;

const isImage = (fileType, fileName) => {
  if (fileType && fileType.startsWith('image/')) return true;
  if (!fileName) return false;
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(fileName);
};

const isPdf = (fileType, fileName) => {
  if (fileType === 'application/pdf') return true;
  if (!fileName) return false;
  return /\.pdf$/i.test(fileName);
};

const ReceiptPreviewModal = ({ receipt, onClose }) => {
  const handleKeyDown = useCallback(
    (e) => { if (e.key === 'Escape') onClose(); },
    [onClose],
  );

  useEffect(() => {
    if (!receipt) return;
    document.addEventListener('keydown', handleKeyDown);
    // Prevent background scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [receipt, handleKeyDown]);

  if (!receipt) return null;

  const fileUrl  = getFileUrl(receipt.filePath);
  const name     = receipt.fileName || receipt.name || 'Receipt';
  const fileType = receipt.fileType || receipt.file_type || '';
  const showImage = isImage(fileType, name);
  const showPdf   = !showImage && isPdf(fileType, name);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 flex flex-col bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm font-medium text-gray-800 truncate" title={name}>
              {name}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-3">
            <a
              href={fileUrl}
              download={name}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors"
              title="Download"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center min-h-0">
          {showImage && (
            <img
              src={fileUrl}
              alt={name}
              className="max-w-full max-h-full object-contain p-4"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextSibling.style.display = 'flex';
              }}
            />
          )}
          {showImage && (
            <div className="hidden flex-col items-center gap-3 p-8 text-gray-500">
              <FileText className="w-12 h-12 text-gray-300" />
              <p className="text-sm">Could not load image.</p>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
              </a>
            </div>
          )}

          {showPdf && (
            <iframe
              src={fileUrl}
              title={name}
              className="w-full h-full min-h-[60vh] border-0"
            />
          )}

          {!showImage && !showPdf && (
            <div className="flex flex-col items-center gap-4 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">{name}</p>
                <p className="text-xs text-gray-400 mb-4">Preview not available for this file type.</p>
              </div>
              <a
                href={fileUrl}
                download={name}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptPreviewModal;