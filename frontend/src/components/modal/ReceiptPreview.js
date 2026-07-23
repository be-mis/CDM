import React, { useEffect, useCallback, useState } from 'react';
import { X, Download, ExternalLink, FileText, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

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
 * @param {object|null} receipt   - { fileName, filePath, fileType, url } or null to close.
 *                                  `url`, if provided, is used as-is (e.g. a blob:/data:/absolute
 *                                  URL already resolved by the caller). Otherwise the URL is built
 *                                  from `filePath` against the API host.
 * @param {function}    onClose   - called when the modal should close
 */

const getFileUrl = (receipt) => {
  if (receipt.url) return receipt.url;

  const filePath = receipt.filePath || receipt.file_path || '';
  if (!filePath) return '';

  // Already-absolute / local-preview URLs pass through unchanged
  if (filePath.startsWith('http') || filePath.startsWith('blob:') || filePath.startsWith('data:')) {
    return filePath;
  }

  return `${(process.env.REACT_APP_API_URL || '').replace(/\/api$/, '')}${filePath}`;
};

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
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.25;

  const [zoom, setZoom] = useState(1);

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

  // Reset zoom whenever a new receipt is opened (or the modal closes)
  useEffect(() => {
    setZoom(1);
  }, [receipt]);

  const zoomIn    = () => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)));
  const zoomOut   = () => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)));
  const zoomReset = () => setZoom(1);

  const fileUrl   = receipt ? getFileUrl(receipt) : '';
  const name      = receipt ? (receipt.fileName || receipt.name || 'Receipt') : '';
  const fileType  = receipt ? (receipt.fileType || receipt.file_type || '') : '';
  const showImage = receipt ? isImage(fileType, name) : false;
  const showPdf   = receipt ? (!showImage && isPdf(fileType, name)) : false;

  // PDFs: fetch the bytes ourselves and load the iframe from a local blob: URL
  // instead of pointing it straight at the server. Framing a *remote* URL is
  // subject to the response's X-Frame-Options / CSP frame-ancestors headers;
  // a blob: URL is local data with no such restriction, so this works even if
  // those headers can't be relaxed on the server side.
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [pdfStatus, setPdfStatus]   = useState('idle'); // idle | loading | ready | error

  useEffect(() => {
    if (!showPdf || !fileUrl) {
      setPdfBlobUrl(null);
      setPdfStatus('idle');
      return;
    }

    let cancelled = false;
    let objectUrl = null;
    setPdfStatus('loading');
    setPdfBlobUrl(null);

    fetch(fileUrl, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch PDF (${res.status})`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = window.URL.createObjectURL(blob);
        setPdfBlobUrl(objectUrl);
        setPdfStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setPdfStatus('error');
      });

    return () => {
      cancelled = true;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [showPdf, fileUrl]);

  if (!receipt) return null;

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
            {showImage && (
              <div className="flex items-center gap-0.5 mr-1.5 pr-1.5 border-r border-gray-200">
                <button
                  type="button"
                  onClick={zoomOut}
                  disabled={zoom <= MIN_ZOOM}
                  title="Zoom out"
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={zoomReset}
                  className="min-w-[2.75rem] text-center text-xs font-medium text-gray-500 hover:text-gray-900 px-1"
                  title="Reset zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  disabled={zoom >= MAX_ZOOM}
                  title="Zoom in"
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                {zoom !== 1 && (
                  <button
                    type="button"
                    onClick={zoomReset}
                    title="Reset zoom"
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                    aria-label="Reset zoom"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
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
        <div className={`h-[75vh] overflow-auto bg-gray-100 flex ${zoom > 1 ? 'items-start justify-start' : 'items-center justify-center'}`}>
          {showImage && (
            <img
              src={fileUrl}
              alt={name}
              draggable={false}
              style={{ transform: `scale(${zoom})`, transformOrigin: zoom > 1 ? 'top left' : 'center' }}
              className="max-w-full max-h-full object-contain p-4 select-none transition-transform duration-150"
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

          {showPdf && pdfStatus === 'loading' && (
            <div className="flex flex-col items-center gap-3 p-8 text-gray-500">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-sm">Loading preview…</p>
            </div>
          )}

          {showPdf && pdfStatus === 'ready' && pdfBlobUrl && (
            <iframe
              src={pdfBlobUrl}
              title={name}
              className="w-full h-full min-h-[60vh] border-0"
            />
          )}

          {showPdf && pdfStatus === 'error' && (
            <div className="flex flex-col items-center gap-4 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-200 flex items-center justify-center">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">{name}</p>
                <p className="text-xs text-gray-400 mb-4">Preview couldn't be loaded.</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in new tab
                </a>
                <a
                  href={fileUrl}
                  download={name}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download File
                </a>
              </div>
            </div>
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