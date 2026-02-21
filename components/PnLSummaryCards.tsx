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
      {/* Main cards row */}
      <div className={`grid grid-cols-2 gap-4 ${
        viewMode === 'daily' 
          ? 'lg:grid-cols-3' 
          : 'md:grid-cols-4 lg:grid-cols-8'
      }`}>
        {/* Total Revenue */}
        <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Total Revenue</p>
          <p className="text-3xl font-bold mt-2 text-slate-800">
            {formatCurrency(data?.summary.totalRevenue || 0)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {totalVolume} orders{hasServiceFees && ' + service fees'}
          </p>
        </div>

        {/* Total Cost */}
        <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Total Cost</p>
          <p className="text-3xl font-bold mt-2 text-slate-800">
            {formatCurrency(data?.summary.totalCost || 0)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Direct costs
          </p>
        </div>

        {/* Gross Profit */}
        <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-600">
            Gross Profit
          </p>
          <p className={`text-3xl font-bold mt-2 ${
            (data?.summary.totalGrossProfit || 0) >= 0 ? 'text-slate-800' : 'text-red-600'
          }`}>
            {formatCurrency(data?.summary.totalGrossProfit || 0)}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {data?.summary.totalRevenue ? 
              `${((data.summary.totalGrossProfit / data.summary.totalRevenue) * 100).toFixed(1)}% margin` 
              : '—'}
          </p>
        </div>

        {/* Fixed Costs - Only show in monthly view */}
        {viewMode === 'monthly' && (
          <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Fixed Costs</p>
            <p className="text-3xl font-bold mt-2 text-slate-800">
              {formatCurrency(data?.summary.fixedCosts.total || 0)}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Labor, LLM, Transport
            </p>
          </div>
        )}

        {/* Labor Cost - Only show in monthly view */}
        {viewMode === 'monthly' && (
          <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Labor Cost</p>
            <p className="text-3xl font-bold mt-2 text-slate-800">
              {formatCurrency(data?.summary.fixedCosts.laborCost || 0)}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {data?.summary.fixedCosts.total ? 
                `${((data.summary.fixedCosts.laborCost / data.summary.fixedCosts.total) * 100).toFixed(1)}% of fixed` 
                : '—'}
            </p>
          </div>
        )}

        {/* LLM Costs - Only show in monthly view */}
        {viewMode === 'monthly' && (
          <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-600">LLM Costs</p>
            <p className="text-3xl font-bold mt-2 text-slate-800">
              {formatCurrency(data?.summary.fixedCosts.llm || 0)}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {data?.summary.fixedCosts.total ? 
                `${((data.summary.fixedCosts.llm / data.summary.fixedCosts.total) * 100).toFixed(1)}% of fixed` 
                : '—'}
            </p>
          </div>
        )}

        {/* PRO Transportation - Only show in monthly view */}
        {viewMode === 'monthly' && (
          <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-600">PRO Transportation</p>
            <p className="text-3xl font-bold mt-2 text-slate-800">
              {formatCurrency(data?.summary.fixedCosts.proTransportation || 0)}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {data?.summary.fixedCosts.total ? 
                `${((data.summary.fixedCosts.proTransportation / data.summary.fixedCosts.total) * 100).toFixed(1)}% of fixed` 
                : '—'}
            </p>
          </div>
        )}

        {/* Net Profit - Only show in monthly view */}
        {viewMode === 'monthly' && (
          <div className="bg-slate-800 rounded-xl p-5 border-2 border-slate-700 shadow-sm">
            <p className="text-sm font-medium text-slate-300">Net Profit</p>
            <p className={`text-3xl font-bold mt-2 ${
              (data?.summary.netProfit || 0) >= 0 ? 'text-white' : 'text-red-400'
            }`}>
              {formatCurrency(data?.summary.netProfit || 0)}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Gross - Fixed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
