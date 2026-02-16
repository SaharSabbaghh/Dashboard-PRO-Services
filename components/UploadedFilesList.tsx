'use client';

import { useState, useEffect } from 'react';

interface DateInfo {
  date: string;
  fileName?: string;
  totalConversations: number;
  processedCount: number;
  prospects: {
    oec: number;
    owwa: number;
    travelVisa: number;
    filipinaPassportRenewal: number;
    ethiopianPassportRenewal: number;
  };
  lastUpdated?: string;
}

interface UploadedFilesListProps {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  refreshTrigger?: number;
}

export default function UploadedFilesList({ 
  selectedDate, 
  onSelectDate,
  refreshTrigger 
}: UploadedFilesListProps) {
  const [files, setFiles] = useState<DateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/dates?detailed=true');
      if (response.ok) {
        const data = await response.json();
        // Filter out null entries and ensure proper structure
        const validFiles = (data.dates || []).filter((f: DateInfo | null) => f && f.date);
        setFiles(validFiles);
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchFiles();
  }, [refreshTrigger]);
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  
  const getProgressPercent = (processed: number | undefined, total: number | undefined) => {
    if (!total || total === 0) return 0;
    return Math.round(((processed || 0) / total) * 100);
  };
  
  const getPendingCount = (info: DateInfo) => {
    return (info.totalConversations || 0) - (info.processedCount || 0);
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-slate-200 rounded w-1/3"></div>
          <div className="h-16 bg-slate-100 rounded"></div>
          <div className="h-16 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <span className="text-xl">📂</span>
          Uploaded Reports
        </h3>
        <button
          onClick={fetchFiles}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
      
      {files.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-slate-500">No reports uploaded yet</p>
          <p className="text-sm text-slate-400 mt-1">Upload a CSV file to get started</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {files.map((file) => {
            const isSelected = selectedDate === file.date;
            const pending = getPendingCount(file);
            const progressPercent = getProgressPercent(file.processedCount, file.totalConversations);
            const isComplete = pending === 0 && file.totalConversations > 0;
            
            return (
              <div
                key={file.date}
                onClick={() => onSelectDate(file.date)}
                className={`
                  p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-slate-800 flex items-center gap-2">
                      {file.fileName || 'Manual Upload'}
                      {isSelected && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">
                          Selected
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500">
                      {formatDate(file.date)}
                    </div>
                  </div>
                  <div className="text-right">
                    {isComplete ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        ✓ Complete
                      </span>
                    ) : pending > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                        {pending.toLocaleString()} pending
                      </span>
                    ) : null}
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{(file.processedCount || 0).toLocaleString()} / {(file.totalConversations || 0).toLocaleString()} processed</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                
                {/* Prospect Stats */}
                {file.processedCount > 0 && file.prospects && (
                  <div className="flex gap-3 text-xs flex-wrap">
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      OEC: {file.prospects.oec || 0}
                    </span>
                    <span className="text-sky-600 bg-sky-50 px-2 py-0.5 rounded">
                      OWWA: {file.prospects.owwa || 0}
                    </span>
                    <span className="text-violet-600 bg-violet-50 px-2 py-0.5 rounded">
                      Visa: {file.prospects.travelVisa || 0}
                    </span>
                    <span className="text-pink-600 bg-pink-50 px-2 py-0.5 rounded">
                      🇵🇭 PP: {file.prospects.filipinaPassportRenewal || 0}
                    </span>
                    <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      🇪🇹 PP: {file.prospects.ethiopianPassportRenewal || 0}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

