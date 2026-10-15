import React, { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import AttachmentViewer from '../modal/AttachmentViewer';

export default function AttachmentsSection({
  attachments = [],
  viewOnly = false,
  onAttach,
  onRemove
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    if (event.target.files?.length) {
      onAttach(event);
      event.target.value = '';
    }
  };

  return (
    <section className="w-full min-w-0">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Supporting Documents
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Images, PDF, or Word documents
          </p>
        </div>

        {!viewOnly && (
          <>
            <input
              ref={fileInputRef}
              aria-label="Choose supporting documents"
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              type="file"
              multiple
              onChange={handleFileChange}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 sm:w-auto"
            >
              <Paperclip className="h-4 w-4" />
              Attach Files
            </button>
          </>
        )}
      </div>

      {attachments.length > 0 ? (
        <div className="w-full min-w-0 max-w-full overflow-x-auto">
          <AttachmentViewer
            attachments={attachments.map((attachment) => ({
              id: attachment.id,
              file_name: attachment.fileName || attachment.name,
              file_path: attachment.filePath || attachment.preview,
              file_type: attachment.fileType || attachment.type,
              preview: attachment.preview || null
            }))}
            onRemove={viewOnly ? undefined : onRemove}
          />
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          No supporting documents attached.
        </p>
      )}
    </section>
  );
}