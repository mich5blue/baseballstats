import React, { useState, useRef } from 'react';
import { importExcel, importImage } from '../api/client.js';

export default function ImportUpload({ type = 'excel', onSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const accept = type === 'excel'
    ? '.xlsx,.xls,.csv'
    : 'image/jpeg,image/png,image/webp,image/gif';

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const fn = type === 'excel' ? importExcel : importImage;
      const result = await fn(formData);
      onSuccess(result, file.name);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleInput = (e) => {
    handleFile(e.target.files[0]);
    e.target.value = '';
  };

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer
        ${dragging ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50 hover:bg-surface/50'}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={handleInput} className="hidden" />

      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-muted text-sm">Processing file...</p>
        </div>
      ) : (
        <>
          <div className="text-5xl mb-4">{type === 'excel' ? '📊' : '📸'}</div>
          <p className="text-white font-semibold mb-1">
            {type === 'excel' ? 'Drop your Excel/CSV file here' : 'Drop your screenshot here'}
          </p>
          <p className="text-muted text-sm mb-4">
            {type === 'excel' ? 'Supports .xlsx, .xls, .csv' : 'Supports JPG, PNG, WebP, GIF'}
          </p>
          <button
            type="button"
            className="btn-secondary text-sm px-5 py-2"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          >
            Browse Files
          </button>
        </>
      )}

      {error && (
        <p className="mt-4 text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
}
