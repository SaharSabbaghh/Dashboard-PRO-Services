'use client';

import { useState, useEffect, useCallback } from 'react';

interface CostData {
  total: {
    cost: number;
    calls: number;
    inputTokens: number;
    outputTokens: number;
  };
  today: {
    cost: number;
    calls: number;
  };
  byModel: Record<string, {
    cost: number;
    calls: number;
    inputTokens: number;
    outputTokens: number;
  }>;
  byType: {
    realtime: { cost: number; calls: number };
    batch: { cost: number; calls: number };
  };
}

export default function CostTracker() {
  const [data, setData] = useState<CostData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchCosts = useCallback(async () => {
    try {
      const res = await fetch('/api/costs');
      const costData = await res.json();
      setData(costData);
    } catch (error) {
      console.error('Failed to fetch costs:', error);
    }
  }, []);

  useEffect(() => {
    fetchCosts();
    const interval = setInterval(fetchCosts, 10000);
    return () => clearInterval(interval);
  }, [fetchCosts]);

  const formatCost = (cost: number) => {
    if (cost < 0.01) return `$${cost.toFixed(6)}`;
    if (cost < 1) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
    return tokens.toString();
  };

  if (!data) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 text-sm">$</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">API Costs</p>
            <p className="text-xs text-slate-400">{data.total.calls} calls total</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-slate-800">{formatCost(data.total.cost)}</p>
          <p className="text-xs text-slate-400">Today: {formatCost(data.today.cost)}</p>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
          {/* By Type */}
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase mb-2">By Type</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Real-time</p>
                <p className="text-sm font-medium text-slate-700">{formatCost(data.byType.realtime.cost)}</p>
                <p className="text-xs text-slate-400">{data.byType.realtime.calls} calls</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500">Batch</p>
                <p className="text-sm font-medium text-slate-700">{formatCost(data.byType.batch.cost)}</p>
                <p className="text-xs text-slate-400">{data.byType.batch.calls} calls</p>
              </div>
            </div>
          </div>

          {/* By Model */}
          {Object.keys(data.byModel).length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase mb-2">By Model</p>
              <div className="space-y-2">
                {Object.entries(data.byModel).map(([model, stats]) => (
                  <div key={model} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-mono text-xs">{model}</span>
                    <div className="text-right">
                      <span className="text-slate-700 font-medium">{formatCost(stats.cost)}</span>
                      <span className="text-slate-400 text-xs ml-2">
                        ({formatTokens(stats.inputTokens)} in / {formatTokens(stats.outputTokens)} out)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tokens Summary */}
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs font-medium text-slate-500 uppercase mb-1">Total Tokens</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Input: {formatTokens(data.total.inputTokens)}</span>
              <span className="text-slate-600">Output: {formatTokens(data.total.outputTokens)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

