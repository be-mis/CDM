import React, { useState } from 'react';
import { ExternalLink, Download, FileText, Trash2 } from 'lucide-react';
import api from '../api';
import Modal from './ui/Modal';
import Tooltip from './ui/Tooltip';

// Reusable attachment viewer with preview support for images and PDFs
const isImage = (type, name) => {
  if (!type && !name) return false;
  const t = (type || '').toLowerCase();
  const n = (name || '').toLowerCase();
  return t.startsWith('image/') || n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.gif') || n.endsWith('.webp');
};

const isPdf = (type, name) => {
  if (!type && !name) return false;
  const t = (type || '').toLowerCase();
  const n = (name || '').toLowerCase();
  return t === 'application/pdf' || n.endsWith('.pdf');
};

const getUrlFromAtt = (att) => {
  // prefer an explicit preview (object URL) if provided
  const preview = att.preview || att.preview_url || att.previewUrl;
  if (preview) return preview;

  let p = att.file_path || att.path || att.url || att.filePath || att.fileUrl || att.location || '';
  if (!p) return '';
  // If it's an absolute URL or a blob/data URL from a local preview, return as-is
  if (p.startsWith('http') || p.startsWith('blob:') || p.startsWith('data:')) return p;

  // normalize backslashes and repeated slashes
  p = String(p).replace(/\\/g, '/').replace(/\/\/+/, '/');

  // If the stored path contains a '/uploads/...' segment somewhere (possibly duplicated),
  // trim everything before that so we always build URLs starting at '/uploads/...'
  const m = p.match(/(\/uploads\/.*)$/i);
  const webPath = m ? m[1].replace(/\\/g, '/') : (p.startsWith('/') ? p : '/' + p);

  // Determine API base host (remove trailing /api if present)
  const apiBaseRaw = api?.defaults?.baseURL || process.env.REACT_APP_API_URL || '';
  const apiBase = apiBaseRaw ? apiBaseRaw.replace(/\/api\/?$/i, '') : '';

  if (apiBase) return `${apiBase}${webPath}`;
  return `${window.location.origin}${webPath}`;
};

const AttachmentViewer = ({ attachments = [], onRemove }) => {
  const [preview, setPreview] = useState(null);
  const canRemove = typeof onRemove === 'function';

  const triggerDownload = async (url, name) => {
    try {
      // For local blob/data URLs, download directly
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = name || '';
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }

      // For remote URLs, fetch blob to force download (avoids opening in tab for images/pdfs)
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      // Fallback: open in new tab
      console.warn('Download fetch failed, opening in new tab', e);
      window.open(url, '_blank');
    }
  };

  if (!Array.isArray(attachments) || attachments.length === 0) {
    return <div className="text-gray-500 text-sm">No attachments</div>;
  }

  return (
    <div>
      <ul className="space-y-2">
        {attachments.map((att, index) => {
          const name = att.file_name || att.filename || att.name || att.originalname || att.fileName || 'attachment';
          const type = att.file_type || att.mimetype || att.type || '';
          const url = getUrlFromAtt(att);
          const img = isImage(type, name);
          const pdf = isPdf(type, name);

          const handlePrimaryClick = () => {
            if (!url) return;
            if (img) {
              setPreview({ url, name, type });
            } else if (pdf) {
              window.open(url, '_blank');
            } else {
              // For other docs, trigger download for better UX
              triggerDownload(url, name);
            }
          };

          return (
            <li
              key={att.id || index}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {/* Left thumbnail or icon */}
              <div className="w-20 h-20 flex items-center justify-center flex-shrink-0">
                {img ? (
                  <img 
                    src={url} 
                    alt={name} 
                    className="max-w-[72px] max-h-[72px] object-cover rounded-md"
                  />
                ) : pdf ? (
                  <FileText className="w-10 h-10 text-red-500" />
                ) : (
                  <FileText className="w-9 h-9 text-gray-500" />
                )}
              </div>

              {/* File name */}
              <div className="flex-1 min-w-0">
                <button
                  onClick={handlePrimaryClick}
                  className={`text-sm font-semibold text-gray-900 hover:text-primary-600 truncate block ${url ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {name}
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {url && (
                  <>
                    {!img && (
                      <Tooltip title="Download">
                        <button 
                          onClick={() => triggerDownload(url, name)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    )}
                    {img && (
                      <Tooltip title="Preview">
                        <button 
                          onClick={() => setPreview({ url, name, type })}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    )}
                    {canRemove && (
                      <Tooltip title="Remove">
                        <button 
                          onClick={() => onRemove(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Preview Modal */}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.name}
        maxWidth="lg"
      >
        {preview && (
          <div className="min-h-[200px]">
            {isImage(preview.type, preview.name) ? (
              <div className="w-full h-[70vh] flex items-center justify-center bg-gray-100">
                <img 
                  src={preview.url} 
                  alt={preview.name} 
                  className="w-full h-full object-contain"
                />
              </div>
            ) : isPdf(preview.type, preview.name) ? (
              <iframe 
                src={preview.url} 
                title={preview.name} 
                className="w-full h-[70vh] border-none"
              />
            ) : (
              <a 
                href={preview.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Open attachment
              </a>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AttachmentViewer;
