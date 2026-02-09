'use client';

import { useState, useRef } from 'react';

interface UploadResult {
  success: boolean;
  fileName: string;
  totalTodos: number;
  overseasTodos: number;
  totalDedupedSales: number;
  salesByMonth: Record<string, number>;
  warning?: string;
}

interface TodoUploadProps {
  onUploadComplete?: (result: UploadResult) => void;
}

export default function TodoUpload({ onUploadComplete }: TodoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleUpload = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }
    
    setUploading(true);
    setError(null);
    setResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/todos/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }
      
      const data = await response.json();
      setResult(data);
      onUploadComplete?.(data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <span className="text-2xl">✅</span>
          Upload Complaints Data (OEC Sales)
        </h3>
      </div>
      
      {/* Info Box */}
      <div className="mb-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
        <p className="text-sm text-teal-800">
          <strong>How it works:</strong> Upload your To-Do/Complaint CSV file. The system will automatically:
        </p>
        <ul className="text-sm text-teal-700 mt-2 space-y-1 ml-4 list-disc">
          <li>Filter for &quot;Overseas Employment Certificate&quot; complaints (indicating OEC sales)</li>
          <li>Group by Contract ID, Client ID, and Housemaid ID</li>
          <li>Deduplicate: If multiple entries within 3 months → count as 1 sale</li>
          <li>New entry after 3 months → counts as a new sale</li>
        </ul>
      </div>
      
      {/* Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
          ${dragActive 
            ? 'border-teal-500 bg-teal-50' 
            : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'
          }
          ${uploading ? 'opacity-50 cursor-wait' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />
        
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin h-10 w-10 border-3 border-teal-500 border-t-transparent rounded-full"></div>
            <p className="text-slate-600 font-medium">Processing To-Dos...</p>
            <p className="text-slate-400 text-sm">Filtering Overseas sales and applying deduplication</p>
          </div>
        ) : (
          <>
            <div className="text-5xl mb-3">📋</div>
            <p className="text-slate-700 font-medium text-lg">
              Drop your Complaints CSV file here
            </p>
            <p className="text-slate-500 text-sm mt-1">
              or click to browse
            </p>
            <p className="text-slate-400 text-xs mt-3">
              Required columns: COMPLAINT_TYPE, CONTRACT_ID, CLIENT_ID, HOUSEMAID_ID, CREATION_DATE
            </p>
          </>
        )}
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <span>❌</span>
            <span className="font-medium">Upload Failed</span>
          </div>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      )}
      
      {/* Warning (no overseas todos found) */}
      {result?.warning && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 text-amber-700">
            <span>⚠️</span>
            <span className="font-medium">{result.warning}</span>
          </div>
          <p className="mt-1 text-sm text-amber-600">
            The file contained {result.totalTodos} rows, but none had COMPLAINT_TYPE = &quot;Overseas Employment Certificate&quot;.
          </p>
        </div>
      )}
      
      {/* Success Result */}
      {result && !result.warning && (
        <div className="mt-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <div className="flex items-center gap-2 text-teal-700 font-medium mb-3">
            <span>✅</span>
            <span>To-Do Data Processed Successfully!</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-white p-3 rounded-lg border border-teal-100">
              <div className="text-slate-500 text-xs">File</div>
              <div className="font-medium text-slate-800 truncate" title={result.fileName}>
                {result.fileName}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-teal-100">
              <div className="text-slate-500 text-xs">Total To-Dos</div>
              <div className="font-medium text-slate-600 text-lg">
                {result.totalTodos.toLocaleString()}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-teal-100">
              <div className="text-slate-500 text-xs">OEC Entries Found</div>
              <div className="font-medium text-blue-600 text-lg">
                {result.overseasTodos.toLocaleString()}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-teal-100 col-span-2 md:col-span-3">
              <div className="text-slate-500 text-xs">Deduplicated Sales (after 3-month rule)</div>
              <div className="font-bold text-teal-600 text-2xl">
                {result.totalDedupedSales.toLocaleString()}
              </div>
            </div>
          </div>
          
          {/* Sales by Month */}
          {Object.keys(result.salesByMonth).length > 0 && (
            <div className="mt-4">
              <div className="text-slate-600 text-sm font-medium mb-2">Sales by Month:</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(result.salesByMonth)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([month, count]) => (
                    <div key={month} className="bg-white px-3 py-1.5 rounded-md border border-teal-100 text-sm">
                      <span className="text-slate-500">{month}: </span>
                      <span className="font-medium text-teal-700">{count}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

