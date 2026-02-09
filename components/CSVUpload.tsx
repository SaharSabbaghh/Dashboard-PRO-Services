'use client';

import { useState, useRef } from 'react';

interface UploadResult {
  success: boolean;
  fileName: string;
  date: string;
  totalRows: number;
  uniqueEntities: number;
  newEntities: number;
  duplicates: number;
  conversationsMerged: number;
  totalConversations: number;
  pendingAnalysis: number;
}

interface CSVUploadProps {
  onUploadComplete?: (result: UploadResult) => void;
}

export default function CSVUpload({ onUploadComplete }: CSVUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });
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
      formData.append('reportDate', selectedDate);
      
      const response = await fetch('/api/upload', {
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
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <span className="text-2xl">📤</span>
          Upload Daily Report
        </h3>
      </div>
      
      {/* Date Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Report Date
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        <p className="mt-1 text-xs text-slate-500">
          Data will be saved under: {formatDate(selectedDate)}
        </p>
      </div>
      
      {/* Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
          ${dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
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
            <div className="animate-spin h-10 w-10 border-3 border-blue-500 border-t-transparent rounded-full"></div>
            <p className="text-slate-600 font-medium">Uploading and parsing CSV...</p>
            <p className="text-slate-400 text-sm">This may take a moment for large files</p>
          </div>
        ) : (
          <>
            <div className="text-5xl mb-3">📁</div>
            <p className="text-slate-700 font-medium text-lg">
              Drop your CSV file here
            </p>
            <p className="text-slate-500 text-sm mt-1">
              or click to browse
            </p>
            <p className="text-slate-400 text-xs mt-3">
              Supports: Daily Report CSV files
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
      
      {/* Success Result */}
      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700 font-medium mb-3">
            <span>✅</span>
            <span>Upload Successful!</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white p-3 rounded-lg border border-green-100">
              <div className="text-slate-500 text-xs">File</div>
              <div className="font-medium text-slate-800 truncate" title={result.fileName}>
                {result.fileName}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-green-100">
              <div className="text-slate-500 text-xs">Date</div>
              <div className="font-medium text-slate-800">
                {formatDate(result.date)}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-green-100">
              <div className="text-slate-500 text-xs">Total Rows</div>
              <div className="font-medium text-slate-600 text-lg">
                {result.totalRows.toLocaleString()}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-green-100">
              <div className="text-slate-500 text-xs">Unique Clients/Maids</div>
              <div className="font-medium text-green-600 text-lg">
                {result.newEntities.toLocaleString()}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-green-100">
              <div className="text-slate-500 text-xs">Conversations Merged</div>
              <div className="font-medium text-blue-600 text-lg">
                {result.conversationsMerged.toLocaleString()}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-green-100">
              <div className="text-slate-500 text-xs">Duplicates Skipped</div>
              <div className="font-medium text-amber-600 text-lg">
                {result.duplicates.toLocaleString()}
              </div>
            </div>
          </div>
          
          {result.pendingAnalysis > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 text-blue-700">
                <span>💡</span>
                <span className="font-medium">
                  {result.pendingAnalysis.toLocaleString()} conversations ready for analysis
                </span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                Start processing to analyze prospects
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Help Text */}
      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
        <p className="text-xs text-slate-500">
          <strong>Tip:</strong> Upload your daily report CSV. The data will be saved under the selected date.
          Duplicate conversations (same ID) are automatically detected and skipped.
          After uploading, start processing to analyze the conversations for prospects.
        </p>
      </div>
    </div>
  );
}

