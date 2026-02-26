'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { NPSAggregatedData } from '@/lib/nps-types';

interface NPSChartProps {
  data: NPSAggregatedData | null;
  isLoading?: boolean;
}

export default function NPSChart({ data, isLoading }: NPSChartProps) {
  const [chartData, setChartData] = useState<Array<{ name: string; Promoters: number; Detractors: number }>>([]);

  useEffect(() => {
    if (!data) {
      setChartData([]);
      return;
    }

    // Prepare chart data
    const chartDataPoints = [
      {
        name: 'Overall',
        Promoters: data.overall.promoters,
        Detractors: data.overall.detractors,
      },
    ];

    setChartData(chartDataPoints);
  }, [data]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48 mb-4"></div>
        <div className="h-64 bg-slate-100 rounded"></div>
      </div>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Promoters vs Detractors</h3>
        <p className="text-sm text-slate-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-6">Promoters vs Detractors</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="name" 
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 12 }}
          />
          <YAxis 
            stroke="#64748b"
            tick={{ fill: '#64748b', fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
          <Bar dataKey="Promoters" fill="#10b981" radius={[8, 8, 0, 0]} />
          <Bar dataKey="Detractors" fill="#ef4444" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

