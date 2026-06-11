import React from 'react';
import api from '../api';
import Button from './ui/Button';

export default function FileUpload(){
  const [preview, setPreview] = React.useState(null);

  const onFile = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
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
      {preview && (
        <pre className="whitespace-pre-wrap max-h-[300px] overflow-auto p-4 bg-gray-50 rounded-lg text-xs border border-gray-200">
          {JSON.stringify(preview, null, 2)}
        </pre>
      )}
    </div>
  );
}
