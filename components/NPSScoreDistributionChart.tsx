'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { NPSMetrics } from '@/lib/nps-types';

interface NPSScoreDistributionChartProps {
  metrics: NPSMetrics | null;
  isLoading?: boolean;
}

export default function NPSScoreDistributionChart({ metrics, isLoading }: NPSScoreDistributionChartProps) {
  const [chartData, setChartData] = useState<Array<{ score: number; count: number; label: string }>>([]);

  useEffect(() => {
    if (!metrics || !metrics.scoreDistribution) {
      setChartData([]);
      return;
    }

    // Prepare chart data for scores 0-10
    const data = [];
    for (let score = 0; score <= 10; score++) {
      const count = metrics.scoreDistribution[score] || 0;
      data.push({
        score,
        count,
        label: score.toString(),
      });
    }

    setChartData(data);
  }, [metrics]);

  // Color coding: Detractors (0-6) = red, Passives (7-8) = yellow, Promoters (9-10) = green
  const getBarColor = (score: number) => {
    if (score >= 9) return '#10b981'; // Green for promoters
    if (score >= 7) return '#f59e0b'; // Yellow/Orange for passives
    return '#ef4444'; // Red for detractors
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48 mb-4"></div>
        <div className="h-64 bg-slate-100 rounded"></div>
      </div>
    );
  }

  if (!metrics || chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">NPS Score Distribution</h3>
        <p className="text-sm text-slate-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-6">NPS Score Distribution (0-10)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="label" 
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 12 }}
            label={{ value: 'NPS Score', position: 'insideBottom', offset: -5, style: { fill: '#64748b' } }}
          />
          <YAxis 
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 12 }}
            label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { fill: '#64748b' } }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value: number) => [value, 'Responses']}
            labelFormatter={(label) => `Score: ${label}`}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span className="text-slate-600">Detractors (0-6)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500"></div>
          <span className="text-slate-600">Passives (7-8)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span className="text-slate-600">Promoters (9-10)</span>
        </div>
      </div>
    </div>
  );
}

