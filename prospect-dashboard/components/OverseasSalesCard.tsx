'use client';

import { useState, useEffect, useCallback } from 'react';
import type { OverseasSale } from '@/lib/todo-types';

interface OverseasSalesData {
  summary: {
    totalSales: number;
    totalRawTodos: number;
    salesByMonth: Record<string, number>;
    lastUpdated: string | null;
  };
  sales: OverseasSale[];
  salesByMonth: Record<string, number>;
}

interface OverseasSalesCardProps {
  refreshTrigger?: number;
}

export default function OverseasSalesCard({ refreshTrigger = 0 }: OverseasSalesCardProps) {
  const [data, setData] = useState<OverseasSalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/todos');
      
      if (!response.ok) {
        throw new Error('Failed to fetch overseas sales data');
      }
      
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full"></div>
          <span className="text-slate-600">Loading overseas sales data...</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
        <div className="flex items-center gap-2 text-red-600">
          <span>❌</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }
  
  const totalSales = data?.summary?.totalSales || 0;
  const totalRawTodos = data?.summary?.totalRawTodos || 0;
  const deduplicationRate = totalRawTodos > 0 
    ? Math.round((1 - totalSales / totalRawTodos) * 100)
    : 0;
  
  // Get last 6 months for chart
  const salesByMonth = data?.salesByMonth || {};
  const sortedMonths = Object.keys(salesByMonth).sort().slice(-6);
  const maxMonthlySales = Math.max(...Object.values(salesByMonth), 1);
  
  return (
    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl shadow-sm border border-teal-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-teal-200 bg-white/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <span className="text-2xl">🌏</span>
            OEC Sales (via Complaints)
          </h3>
          <button
            onClick={() => fetchData()}
            className="text-teal-600 hover:text-teal-800 text-sm font-medium"
          >
            ↻ Refresh
          </button>
        </div>
        {data?.summary?.lastUpdated && (
          <p className="text-xs text-slate-500 mt-1">
            Last updated: {formatDate(data.summary.lastUpdated)}
          </p>
        )}
      </div>
      
      {/* Main Stats */}
      <div className="p-6">
        {totalSales === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-slate-600 font-medium">No OEC Sales Data Yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Upload a Complaints CSV file to track OEC sales
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {/* Total Sales */}
              <div className="bg-white rounded-lg p-4 border border-teal-100 shadow-sm">
                <div className="text-slate-500 text-xs uppercase tracking-wide">Total Sales</div>
                <div className="text-3xl font-bold text-teal-600 mt-1">
                  {totalSales.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  After 3-month deduplication
                </div>
              </div>
              
              {/* Raw Entries */}
              <div className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm">
                <div className="text-slate-500 text-xs uppercase tracking-wide">OEC Entries</div>
                <div className="text-3xl font-bold text-slate-600 mt-1">
                  {totalRawTodos.toLocaleString()}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Total complaint entries
                </div>
              </div>
              
              {/* Deduplication Rate */}
              <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                <div className="text-slate-500 text-xs uppercase tracking-wide">Duplicates Removed</div>
                <div className="text-3xl font-bold text-blue-600 mt-1">
                  {deduplicationRate}%
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {totalRawTodos - totalSales} duplicate entries
                </div>
              </div>
            </div>
            
            {/* Sales by Month Chart */}
            {sortedMonths.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-teal-100">
                <div className="text-slate-600 text-sm font-medium mb-3">Sales by Month</div>
                <div className="flex items-end gap-2 h-32">
                  {sortedMonths.map((month) => {
                    const sales = salesByMonth[month] || 0;
                    const heightPercent = (sales / maxMonthlySales) * 100;
                    return (
                      <div key={month} className="flex-1 flex flex-col items-center gap-1">
                        <div className="text-xs font-medium text-teal-700">{sales}</div>
                        <div 
                          className="w-full bg-gradient-to-t from-teal-500 to-cyan-400 rounded-t-md transition-all"
                          style={{ height: `${Math.max(heightPercent, 5)}%` }}
                        />
                        <div className="text-xs text-slate-500 text-center">
                          {formatMonth(month)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Toggle Details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mt-4 w-full py-2 text-sm text-teal-600 hover:text-teal-800 font-medium"
            >
              {showDetails ? '▲ Hide Details' : '▼ Show Sales Details'}
            </button>
            
            {/* Details Table */}
            {showDetails && data?.sales && data.sales.length > 0 && (
              <div className="mt-4 bg-white rounded-lg border border-teal-100 overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-teal-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-slate-600 font-medium">Contract ID</th>
                      <th className="text-left px-3 py-2 text-slate-600 font-medium">Client ID</th>
                      <th className="text-left px-3 py-2 text-slate-600 font-medium">Maid ID</th>
                      <th className="text-center px-3 py-2 text-slate-600 font-medium">Sales</th>
                      <th className="text-left px-3 py-2 text-slate-600 font-medium">First Sale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sales.slice(0, 50).map((sale, idx) => (
                      <tr key={sale.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-3 py-2 text-slate-700">{sale.contractId || '-'}</td>
                        <td className="px-3 py-2 text-slate-700">{sale.clientId || '-'}</td>
                        <td className="px-3 py-2 text-slate-700">{sale.housemaidId || '-'}</td>
                        <td className="px-3 py-2 text-center font-medium text-teal-600">
                          {sale.deduplicatedCount}
                          {sale.occurrenceCount > sale.deduplicatedCount && (
                            <span className="text-xs text-slate-400 ml-1">
                              ({sale.occurrenceCount} raw)
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-500 text-xs">
                          {sale.firstSaleDate ? new Date(sale.firstSaleDate).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.sales.length > 50 && (
                  <div className="px-3 py-2 bg-teal-50 text-center text-xs text-slate-500">
                    Showing 50 of {data.sales.length} sales records
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

