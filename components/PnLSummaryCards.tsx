'use client';

import type { AggregatedPnL } from '@/lib/pnl-types';

interface PnLSummaryCardsProps {
  data: AggregatedPnL | null;
  isLoading?: boolean;
  viewMode?: 'daily' | 'monthly';
}

export default function PnLSummaryCards({ data, isLoading, viewMode = 'monthly' }: PnLSummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate total volume
  const totalVolume = data 
    ? Object.values(data.services).reduce((sum, s) => sum + s.volume, 0) 
    : 0;
  
  // Check if any service has per-order service fees
  const hasServiceFees = data
    ? Object.values(data.services).some(s => s.serviceFees > 0)
    : false;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-slate-50 rounded-xl border border-slate-200 p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
              <div className="h-10 bg-slate-200 rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main metrics row - always shown */}
      <div className={`grid grid-cols-2 gap-4 ${
        viewMode === 'daily' 
          ? 'md:grid-cols-3' 
          : 'md:grid-cols-4'
      }`}>
        {/* Total Revenue */}
        <div className="bg-white rounded-xl p-4 md:p-5 border-2 border-slate-200 shadow-sm flex flex-col">
          <p className="text-xs md:text-sm font-medium text-slate-600 mb-auto">Total Revenue</p>
          <div className="mt-auto">
            <p className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">
              {formatCurrency(data?.summary.totalRevenue || 0)}
            </p>
            <p className="text-xs text-slate-500 mt-1.5">
              {totalVolume} orders{hasServiceFees && ' + fees'}
            </p>
          </div>
        </div>

        {/* Total Cost */}
        <div className="bg-white rounded-xl p-4 md:p-5 border-2 border-slate-200 shadow-sm flex flex-col">
          <p className="text-xs md:text-sm font-medium text-slate-600 mb-auto">Total Cost</p>
          <div className="mt-auto">
            <p className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">
              {formatCurrency(data?.summary.totalCost || 0)}
            </p>
            <p className="text-xs text-slate-500 mt-1.5">
              Direct costs
            </p>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white rounded-xl p-4 md:p-5 border-2 border-slate-200 shadow-sm flex flex-col">
          <p className="text-xs md:text-sm font-medium text-slate-600 mb-auto">
            Gross Profit
          </p>
          <div className="mt-auto">
            <p className={`text-2xl md:text-3xl font-bold leading-tight ${
              (data?.summary.totalGrossProfit || 0) >= 0 ? 'text-slate-800' : 'text-red-600'
            }`}>
              {formatCurrency(data?.summary.totalGrossProfit || 0)}
            </p>
            <p className="text-xs text-slate-500 mt-1.5">
              {data?.summary.totalRevenue ? 
                `${((data.summary.totalGrossProfit / data.summary.totalRevenue) * 100).toFixed(1)}% margin` 
                : '—'}
            </p>
          </div>
        </div>

        {/* Net Profit - Only show in monthly view */}
        {viewMode === 'monthly' && (
          <div className="bg-slate-800 rounded-xl p-4 md:p-5 border-2 border-slate-700 shadow-sm flex flex-col">
            <p className="text-xs md:text-sm font-medium text-slate-300 mb-auto">Net Profit</p>
            <div className="mt-auto">
              <p className={`text-2xl md:text-3xl font-bold leading-tight ${
                (data?.summary.netProfit || 0) >= 0 ? 'text-white' : 'text-red-400'
              }`}>
                {formatCurrency(data?.summary.netProfit || 0)}
              </p>
              <p className="text-xs text-slate-400 mt-1.5">
                Gross - Fixed
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Costs Row - Only show in monthly view */}
      {viewMode === 'monthly' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Fixed Costs Total */}
          <div className="bg-white rounded-xl p-4 md:p-5 border-2 border-slate-200 shadow-sm flex flex-col">
            <p className="text-xs md:text-sm font-medium text-slate-600 mb-auto">Fixed Costs</p>
            <div className="mt-auto">
              <p className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">
                {formatCurrency(data?.summary.fixedCosts.total || 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                Labor, LLM, Transport
              </p>
            </div>
          </div>

          {/* Labor Cost */}
          <div className="bg-white rounded-xl p-4 md:p-5 border-2 border-slate-200 shadow-sm flex flex-col">
            <p className="text-xs md:text-sm font-medium text-slate-600 mb-auto">Labor Cost</p>
            <div className="mt-auto">
              <p className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">
                {formatCurrency(data?.summary.fixedCosts.laborCost || 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                {data?.summary.fixedCosts.total ? 
                  `${((data.summary.fixedCosts.laborCost / data.summary.fixedCosts.total) * 100).toFixed(1)}% of fixed` 
                  : '—'}
              </p>
            </div>
          </div>

          {/* LLM Costs */}
          <div className="bg-white rounded-xl p-4 md:p-5 border-2 border-slate-200 shadow-sm flex flex-col">
            <p className="text-xs md:text-sm font-medium text-slate-600 mb-auto">LLM Costs</p>
            <div className="mt-auto">
              <p className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">
                {formatCurrency(data?.summary.fixedCosts.llm || 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                {data?.summary.fixedCosts.total ? 
                  `${((data.summary.fixedCosts.llm / data.summary.fixedCosts.total) * 100).toFixed(1)}% of fixed` 
                  : '—'}
              </p>
            </div>
          </div>

          {/* PRO Transportation */}
          <div className="bg-white rounded-xl p-4 md:p-5 border-2 border-slate-200 shadow-sm flex flex-col">
            <p className="text-xs md:text-sm font-medium text-slate-600 mb-auto">PRO Transportation</p>
            <div className="mt-auto">
              <p className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">
                {formatCurrency(data?.summary.fixedCosts.proTransportation || 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1.5">
                {data?.summary.fixedCosts.total ? 
                  `${((data.summary.fixedCosts.proTransportation / data.summary.fixedCosts.total) * 100).toFixed(1)}% of fixed` 
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
