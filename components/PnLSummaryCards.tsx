'use client';

import type { AggregatedPnL } from '@/lib/pnl-types';

interface PnLSummaryCardsProps {
  data: AggregatedPnL | null;
  isLoading?: boolean;
}

export default function PnLSummaryCards({ data, isLoading }: PnLSummaryCardsProps) {
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200 shadow-sm">
          <p className="text-sm font-medium text-blue-700">Total Revenue</p>
          <p className="text-3xl font-bold mt-2 text-blue-900">
            {formatCurrency(data?.summary.totalRevenue || 0)}
          </p>
          <p className="text-xs text-blue-600 mt-2">
            {totalVolume} orders{hasServiceFees && ' + service fees'}
          </p>
        </div>

        {/* Total Cost */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-200 shadow-sm">
          <p className="text-sm font-medium text-orange-700">Total Cost</p>
          <p className="text-3xl font-bold mt-2 text-orange-900">
            {formatCurrency(data?.summary.totalCost || 0)}
          </p>
          <p className="text-xs text-orange-600 mt-2">
            Direct costs
          </p>
        </div>

        {/* Gross Profit */}
        <div className={`bg-gradient-to-br rounded-xl p-5 border shadow-sm ${
          (data?.summary.totalGrossProfit || 0) >= 0 
            ? 'from-green-50 to-green-100 border-green-200' 
            : 'from-red-50 to-red-100 border-red-200'
        }`}>
          <p className={`text-sm font-medium ${
            (data?.summary.totalGrossProfit || 0) >= 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            Gross Profit
          </p>
          <p className={`text-3xl font-bold mt-2 ${
            (data?.summary.totalGrossProfit || 0) >= 0 ? 'text-green-900' : 'text-red-900'
          }`}>
            {formatCurrency(data?.summary.totalGrossProfit || 0)}
          </p>
          <p className={`text-xs mt-2 ${
            (data?.summary.totalGrossProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {data?.summary.totalRevenue ? 
              `${((data.summary.totalGrossProfit / data.summary.totalRevenue) * 100).toFixed(1)}% margin` 
              : '—'}
          </p>
        </div>

        {/* Fixed Costs */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200 shadow-sm">
          <p className="text-sm font-medium text-purple-700">Fixed Costs</p>
          <p className="text-3xl font-bold mt-2 text-purple-900">
            {formatCurrency(data?.summary.fixedCosts.total || 0)}
          </p>
          <p className="text-xs text-purple-600 mt-2">
            Labor, LLM, Transport
          </p>
        </div>

        {/* Net Profit - Dark accent card */}
        <div className={`bg-gradient-to-br rounded-xl p-5 border shadow-lg text-white ${
          (data?.summary.netProfit || 0) >= 0
            ? 'from-slate-700 to-slate-900 border-slate-600'
            : 'from-red-700 to-red-900 border-red-600'
        }`}>
          <p className="text-sm font-medium text-slate-300">Net Profit</p>
          <p className="text-3xl font-bold mt-2 text-white">
            {formatCurrency(data?.summary.netProfit || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Gross - Fixed
          </p>
        </div>
      </div>

      {/* Fixed Costs Breakdown row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600">Labor Cost</p>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {formatCurrency(data?.summary.fixedCosts.laborCost || 0)}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
              {data?.summary.fixedCosts.total ? 
                ((data.summary.fixedCosts.laborCost / data.summary.fixedCosts.total) * 100).toFixed(1) : '0'}%
            </span>
            <span className="text-xs text-slate-500">of fixed costs</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600">LLM Costs</p>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {formatCurrency(data?.summary.fixedCosts.llm || 0)}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
              {data?.summary.fixedCosts.total ? 
                ((data.summary.fixedCosts.llm / data.summary.fixedCosts.total) * 100).toFixed(1) : '0'}%
            </span>
            <span className="text-xs text-slate-500">of fixed costs</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-600">PRO Transportation</p>
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-800">
            {formatCurrency(data?.summary.fixedCosts.proTransportation || 0)}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700">
              {data?.summary.fixedCosts.total ? 
                ((data.summary.fixedCosts.proTransportation / data.summary.fixedCosts.total) * 100).toFixed(1) : '0'}%
            </span>
            <span className="text-xs text-slate-500">of fixed costs</span>
          </div>
        </div>
      </div>
    </div>
  );
}
