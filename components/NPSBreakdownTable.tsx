'use client';

import { useState } from 'react';
import type { NPSAggregatedData } from '@/lib/nps-types';
import { ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface NPSBreakdownTableProps {
  data: NPSAggregatedData | null;
  isLoading?: boolean;
}

type SortField = 'service' | 'npsScore' | 'total' | 'promoters' | 'detractors' | 'passives';
type SortDirection = 'asc' | 'desc';

export default function NPSBreakdownTable({ data, isLoading }: NPSBreakdownTableProps) {
  const [sortField, setSortField] = useState<SortField>('npsScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedService, setExpandedService] = useState<string | null>(null);

  const getNPSColor = (score: number) => {
    if (score >= 50) return 'text-green-600 bg-green-50';
    if (score >= 0) return 'text-blue-600 bg-blue-50';
    return 'text-red-600 bg-red-50';
  };

  const getNPSBadgeColor = (score: number) => {
    if (score >= 50) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 0) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-blue-600" />
      : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-48"></div>
          <div className="h-4 bg-slate-200 rounded w-full"></div>
          <div className="h-4 bg-slate-200 rounded w-full"></div>
          <div className="h-4 bg-slate-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!data || !data.services || data.services.length === 0) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
        <p className="text-sm text-slate-500">No NPS data available</p>
      </div>
    );
  }

  // Prepare services data with overall included at the end
  const servicesData = [
    ...data.services.map(s => ({
      service: s.service,
      metrics: s.metrics,
      isOverall: false,
    })),
    {
      service: 'Overall',
      metrics: data.overall,
      isOverall: true,
    },
  ];

  // Sort services (but keep Overall at the end)
  const sortedServices = [...servicesData].sort((a, b) => {
    // Always keep Overall at the end
    if (a.isOverall && !b.isOverall) return 1;
    if (!a.isOverall && b.isOverall) return -1;
    
    let aVal: number | string;
    let bVal: number | string;

    switch (sortField) {
      case 'service':
        aVal = a.service;
        bVal = b.service;
        break;
      case 'npsScore':
        aVal = a.metrics.npsScore;
        bVal = b.metrics.npsScore;
        break;
      case 'total':
        aVal = a.metrics.total;
        bVal = b.metrics.total;
        break;
      case 'promoters':
        aVal = a.metrics.promoters;
        bVal = b.metrics.promoters;
        break;
      case 'detractors':
        aVal = a.metrics.detractors;
        bVal = b.metrics.detractors;
        break;
      case 'passives':
        aVal = a.metrics.passives;
        bVal = b.metrics.passives;
        break;
      default:
        return 0;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }

    return sortDirection === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Detailed NPS Breakdown</h3>
            <p className="text-sm text-slate-600 mt-1">
              Comprehensive metrics by service with score distribution
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b-2 border-slate-200">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('service')}
                  className="flex items-center gap-2 hover:text-slate-900 transition-colors"
                >
                  Service
                  {getSortIcon('service')}
                </button>
              </th>
              <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('npsScore')}
                  className="flex items-center gap-2 hover:text-slate-900 transition-colors mx-auto"
                >
                  NPS Score
                  {getSortIcon('npsScore')}
                </button>
              </th>
              <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('total')}
                  className="flex items-center gap-2 hover:text-slate-900 transition-colors mx-auto"
                >
                  Total Responses
                  {getSortIcon('total')}
                </button>
              </th>
              <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('promoters')}
                  className="flex items-center gap-2 hover:text-slate-900 transition-colors mx-auto"
                >
                  Promoters
                  {getSortIcon('promoters')}
                </button>
              </th>
              <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('passives')}
                  className="flex items-center gap-2 hover:text-slate-900 transition-colors mx-auto"
                >
                  Passives
                  {getSortIcon('passives')}
                </button>
              </th>
              <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('detractors')}
                  className="flex items-center gap-2 hover:text-slate-900 transition-colors mx-auto"
                >
                  Detractors
                  {getSortIcon('detractors')}
                </button>
              </th>
              <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Score Distribution
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedServices.map((item) => {
              const isExpanded = expandedService === item.service;
              const metrics = item.metrics;
              
              return (
                <>
                  <tr
                    key={item.service}
                    className={`hover:bg-slate-50 transition-colors ${
                      item.isOverall ? 'bg-blue-50 font-semibold' : ''
                    }`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${item.isOverall ? 'text-blue-900' : 'text-slate-900'}`}>
                          {item.isOverall ? '📊 ' : ''}{item.service}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-sm font-bold border ${getNPSBadgeColor(metrics.npsScore)}`}>
                        {metrics.npsScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="text-sm font-medium text-slate-900">
                        {metrics.total.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-semibold text-green-600">
                            {metrics.promoters.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {metrics.promoterPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          <Minus className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-semibold text-slate-600">
                            {metrics.passives.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {metrics.passivePercentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1">
                          <TrendingDown className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-semibold text-red-600">
                            {metrics.detractors.toLocaleString()}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {metrics.detractorPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => setExpandedService(isExpanded ? null : item.service)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        {isExpanded ? 'Hide' : 'Show'} Details
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Score Distribution Row */}
                  {isExpanded && (
                    <tr className="bg-slate-50">
                      <td colSpan={7} className="py-4 px-6">
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-slate-700 mb-3">
                            Score Distribution (0-10) for {item.service}
                          </h4>
                          <div className="grid grid-cols-11 gap-2">
                            {Array.from({ length: 11 }, (_, i) => {
                              const score = i;
                              const count = metrics.scoreDistribution[score] || 0;
                              const percentage = metrics.total > 0 
                                ? (count / metrics.total) * 100 
                                : 0;
                              const isPromoter = score >= 9;
                              const isDetractor = score <= 6;
                              const isPassive = score >= 7 && score <= 8;
                              
                              return (
                                <div
                                  key={score}
                                  className="flex flex-col items-center p-2 bg-white rounded-lg border border-slate-200"
                                >
                                  <div className={`text-xs font-semibold mb-1 ${
                                    isPromoter ? 'text-green-600' :
                                    isDetractor ? 'text-red-600' :
                                    'text-slate-600'
                                  }`}>
                                    {score}
                                  </div>
                                  <div className="text-sm font-bold text-slate-900 mb-1">
                                    {count}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {percentage.toFixed(1)}%
                                  </div>
                                  {/* Visual bar */}
                                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        isPromoter ? 'bg-green-500' :
                                        isDetractor ? 'bg-red-500' :
                                        'bg-slate-400'
                                      }`}
                                      style={{ width: `${Math.max(percentage, 1)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {/* Summary Stats */}
                          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-200">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Average Score</p>
                              <p className="text-lg font-bold text-slate-900">
                                {metrics.total > 0
                                  ? (
                                      Object.entries(metrics.scoreDistribution).reduce(
                                        (sum, [score, count]) => sum + (parseInt(score) * count),
                                        0
                                      ) / metrics.total
                                    ).toFixed(2)
                                  : '0.00'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Top Score (10)</p>
                              <p className="text-lg font-bold text-green-600">
                                {metrics.scoreDistribution[10] || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Low Score (0)</p>
                              <p className="text-lg font-bold text-red-600">
                                {metrics.scoreDistribution[0] || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Promoter Ratio</p>
                              <p className="text-lg font-bold text-green-600">
                                {metrics.total > 0
                                  ? (metrics.promoters / metrics.total).toFixed(2)
                                  : '0.00'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

