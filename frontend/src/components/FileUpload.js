import React from 'react';
import api from '../api';
import Button from './ui/Button';

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function FileUpload(){
  const [preview, setPreview] = React.useState(null);
  const [error, setError] = React.useState(null);

  const onFile = async (e) => {
    const f = e.target.files[0];
    if (!f) return;

    if (f.size > MAX_FILE_SIZE_BYTES) {
      setError(`${f.name} exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`);
      setPreview(null);
      e.target.value = '';
      return;
    }

    setError(null);
    const fd = new FormData();
    fd.append('file', f);
    const r = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    setPreview(r.data);
  };

  return (
    <div className="space-y-4">
      <input 
        id="file" 
        type="file" 
        onChange={onFile}
        className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
      />
      <p className="text-xs text-gray-500">
        Maximum size per attachment: {MAX_FILE_SIZE_MB}MB
      </p>
      {error && (
        <p className="text-xs text-red-600">
          {error}
        </p>
      )}
      {preview && (
        <pre className="whitespace-pre-wrap max-h-[300px] overflow-auto p-4 bg-gray-50 rounded-lg text-xs border border-gray-200">
          {JSON.stringify(preview, null, 2)}
        </pre>
      )}
    </div>
  );
}