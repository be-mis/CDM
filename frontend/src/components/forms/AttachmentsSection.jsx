import React, { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import Button from '../ui/Button';
import AttachmentViewer from '../modal/AttachmentViewer';

const AttachmentsSection = ({
    attachments,
    viewOnly,
    onAttach,
    onRemove
}) => {
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            onAttach(e);
            // Reset so the same file can be re-selected if needed
            e.target.value = '';
        }
    };

    return (
        <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Supporting Documents</h3>
            <div className="mb-4">
                {!viewOnly && (
                    <>
                        <input
                            ref={fileInputRef}
                            accept="image/*,.pdf,.doc,.docx"
                            className="hidden"
                            type="file"
                            multiple
                            onChange={handleFileChange}
                        />
                        <Button
                            variant="secondary"
                            startIcon={<Paperclip className="w-4 h-4" />}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Attach Files
                        </Button>
                    </>
                )}
            </div>
            {attachments.length > 0 && (
                <div className="mb-4">
                    <AttachmentViewer
                        attachments={attachments.map(att => ({
                            id: att.id,
                            file_name: att.fileName || att.name,
                            file_path: att.filePath || att.preview,
                            file_type: att.fileType || att.type,
                            preview: att.preview || null,
                        }))}
                        onRemove={viewOnly ? undefined : onRemove}
                    />
                </div>
            )}
        </div>
    );
};

export default AttachmentsSection;