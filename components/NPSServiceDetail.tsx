'use client';

import type { NPSServiceMetrics } from '@/lib/nps-types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface NPSServiceDetailProps {
  serviceMetrics: NPSServiceMetrics[];
  isLoading?: boolean;
}

export default function NPSServiceDetail({ serviceMetrics, isLoading }: NPSServiceDetailProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-32 mb-4"></div>
            <div className="grid grid-cols-4 gap-4">
              <div className="h-16 bg-slate-200 rounded"></div>
              <div className="h-16 bg-slate-200 rounded"></div>
              <div className="h-16 bg-slate-200 rounded"></div>
              <div className="h-16 bg-slate-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!serviceMetrics || serviceMetrics.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <p className="text-sm text-slate-500">No service data available</p>
      </div>
    );
  }

  const getNPSColor = (score: number) => {
    if (score >= 50) return 'text-green-600';
    if (score >= 0) return 'text-blue-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      {serviceMetrics.map((item) => (
        <div key={item.service} className="bg-white rounded-xl border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">{item.service}</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* NPS Score */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <p className="text-xs font-medium text-slate-600 mb-2">NPS Score</p>
              <p className={`text-3xl font-bold ${getNPSColor(item.metrics.npsScore)}`}>
                {item.metrics.npsScore.toFixed(1)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {item.metrics.total} responses
              </p>
            </div>

            {/* Promoters */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <p className="text-xs font-medium text-slate-600">Promoters</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{item.metrics.promoters}</p>
              <p className="text-xs text-slate-500 mt-1">
                {item.metrics.promoterPercentage.toFixed(1)}%
              </p>
            </div>

            {/* Passives */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Minus className="w-4 h-4 text-slate-500" />
                <p className="text-xs font-medium text-slate-600">Passives</p>
              </div>
              <p className="text-2xl font-bold text-slate-600">{item.metrics.passives}</p>
              <p className="text-xs text-slate-500 mt-1">
                {item.metrics.passivePercentage.toFixed(1)}%
              </p>
            </div>

            {/* Detractors */}
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <p className="text-xs font-medium text-slate-600">Detractors</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{item.metrics.detractors}</p>
              <p className="text-xs text-slate-500 mt-1">
                {item.metrics.detractorPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

