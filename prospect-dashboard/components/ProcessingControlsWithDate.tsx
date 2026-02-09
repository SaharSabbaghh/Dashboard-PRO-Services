'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface RunStats {
  runId: string;
  startedAt: string;
  completedAt?: string;
  totalCost: number;
  successCount: number;
  failureCount: number;
  conversationsProcessed: number;
}

interface DateInfo {
  date: string;
  fileName?: string;
  totalConversations: number;
  processedCount: number;
  isProcessing: boolean;
  latestRun?: RunStats;
}

interface ProcessingControlsWithDateProps {
  selectedDate: string | null;
  onProcessingComplete?: () => void;
}

export default function ProcessingControlsWithDate({ 
  selectedDate,
  onProcessingComplete 
}: ProcessingControlsWithDateProps) {
  const [dateInfo, setDateInfo] = useState<DateInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(false);
  const processingRef = useRef(false);
  const stoppedManuallyRef = useRef(false);
  
  const fetchDateInfo = useCallback(async () => {
    if (!selectedDate) {
      setDateInfo(null);
      return;
    }
    
    try {
      const response = await fetch(`/api/dates/${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        setDateInfo({
          date: data.date,
          fileName: data.fileName,
          totalConversations: data.totalConversations,
          processedCount: data.totalProcessed,
          isProcessing: data.isProcessing,
          latestRun: data.latestRun,
        });
      }
    } catch (error) {
      console.error('Failed to fetch date info:', error);
    }
  }, [selectedDate]);
  
  useEffect(() => {
    stoppedManuallyRef.current = false;
    fetchDateInfo();
  }, [fetchDateInfo]);
  
  // Poll for updates while processing
  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(fetchDateInfo, 1000);
    return () => clearInterval(interval);
  }, [isProcessing, fetchDateInfo]);
  
  const processBatch = useCallback(async () => {
    if (!processingRef.current || !selectedDate || stoppedManuallyRef.current) return;
    
    try {
      const response = await fetch('/api/process/date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, batchSize: 50 }),
      });
      
      const data = await response.json();
      await fetchDateInfo();
      
      if (data.isComplete || !processingRef.current || stoppedManuallyRef.current) {
        processingRef.current = false;
        setIsProcessing(false);
        onProcessingComplete?.();
        return;
      }
      
      // Continue with minimal delay for speed
      setTimeout(processBatch, 200);
      
    } catch (error) {
      console.error('Processing error:', error);
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [selectedDate, fetchDateInfo, onProcessingComplete]);
  
  const startProcessing = () => {
    if (!selectedDate) return;
    stoppedManuallyRef.current = false;
    processingRef.current = true;
    setIsProcessing(true);
    processBatch();
  };
  
  const stopProcessing = async () => {
    stoppedManuallyRef.current = true;
    processingRef.current = false;
    setIsProcessing(false);
    
    // Tell server to stop
    if (selectedDate) {
      try {
        await fetch('/api/process/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: selectedDate }),
        });
        await fetchDateInfo();
      } catch (error) {
        console.error('Stop error:', error);
      }
    }
  };
  
  const resetProcessing = async () => {
    if (!selectedDate) return;
    if (!confirm('Reset all analysis for this date?')) return;
    
    stoppedManuallyRef.current = true;
    processingRef.current = false;
    setIsProcessing(false);
    setLoading(true);
    
    try {
      await fetch('/api/process/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
      });
      await fetch('/api/reset/date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate }),
      });
      await fetchDateInfo();
    } catch (error) {
      console.error('Reset error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!selectedDate) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <p className="text-slate-500 text-sm">Select a report to process</p>
      </div>
    );
  }
  
  const pending = (dateInfo?.totalConversations || 0) - (dateInfo?.processedCount || 0);
  const progressPercent = dateInfo?.totalConversations 
    ? Math.round((dateInfo.processedCount / dateInfo.totalConversations) * 100)
    : 0;
  const latestRun = dateInfo?.latestRun;
  
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
      {/* File Info */}
      <div>
        <div className="font-medium text-slate-800 text-sm">{dateInfo?.fileName || 'Loading...'}</div>
        <div className="text-xs text-slate-500">{selectedDate}</div>
      </div>
      
      {/* Progress */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span>{dateInfo?.processedCount?.toLocaleString() || 0} / {dateInfo?.totalConversations?.toLocaleString() || 0}</span>
          <span className="font-medium">{progressPercent}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${progressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      
      {/* Run Stats */}
      {latestRun && latestRun.completedAt && (
        <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Success</span>
            <span className="font-medium text-green-600">{latestRun.successCount}</span>
          </div>
          {latestRun.failureCount > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Failed</span>
              <span className="font-medium text-red-600">{latestRun.failureCount}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Controls */}
      <div className="flex gap-2">
        {!isProcessing ? (
          <button
            onClick={startProcessing}
            disabled={pending === 0 || loading}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              pending === 0 
                ? 'bg-green-100 text-green-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {pending === 0 ? 'Complete' : 'Start'}
          </button>
        ) : (
          <button
            onClick={stopProcessing}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700"
          >
            Stop
          </button>
        )}
        <button
          onClick={resetProcessing}
          disabled={loading}
          className="py-2 px-3 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          Reset
        </button>
      </div>
      
      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 text-xs text-blue-600">
          <div className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full" />
          Processing 50 parallel...
        </div>
      )}
    </div>
  );
}
