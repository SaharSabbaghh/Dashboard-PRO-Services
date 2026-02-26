'use client';

import type { NPSMetrics } from '@/lib/nps-types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface NPSSummaryCardProps {
  metrics: NPSMetrics | null;
  isLoading?: boolean;
}

export default function NPSSummaryCard({ metrics, isLoading }: NPSSummaryCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6 animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-32 mb-4"></div>
        <div className="h-16 bg-slate-200 rounded w-40 mb-4"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-slate-200 rounded"></div>
          <div className="h-20 bg-slate-200 rounded"></div>
          <div className="h-20 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-6">
        <p className="text-sm text-slate-500">No NPS data available</p>
      </div>
    );
  }

  const getNPSColor = (score: number) => {
    if (score >= 50) return 'text-green-600';
    if (score >= 0) return 'text-blue-600';
    return 'text-red-600';
  };

  const getNPSBgColor = (score: number) => {
    if (score >= 50) return 'bg-green-50 border-green-200';
    if (score >= 0) return 'bg-blue-50 border-blue-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className={`bg-white rounded-xl border-2 shadow-sm p-6 ${getNPSBgColor(metrics.npsScore)}`}>
      <div className="mb-6">
        <p className="text-sm font-medium text-slate-600 mb-2">Net Promoter Score</p>
        <div className="flex items-baseline gap-2">
          <p className={`text-5xl font-bold ${getNPSColor(metrics.npsScore)}`}>
            {metrics.npsScore.toFixed(1)}
          </p>
          <span className="text-lg text-slate-500">/ 100</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {metrics.total} total responses
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Promoters */}
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <p className="text-xs font-medium text-slate-600">Promoters</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{metrics.promoters}</p>
          <p className="text-xs text-slate-500 mt-1">
            {metrics.promoterPercentage.toFixed(1)}%
          </p>
        </div>

        {/* Passives */}
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Minus className="w-4 h-4 text-slate-500" />
            <p className="text-xs font-medium text-slate-600">Passives</p>
          </div>
          <p className="text-2xl font-bold text-slate-600">{metrics.passives}</p>
          <p className="text-xs text-slate-500 mt-1">
            {metrics.passivePercentage.toFixed(1)}%
          </p>
        </div>

        {/* Detractors */}
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <p className="text-xs font-medium text-slate-600">Detractors</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{metrics.detractors}</p>
          <p className="text-xs text-slate-500 mt-1">
            {metrics.detractorPercentage.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}

