'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { NPSAggregatedData } from '@/lib/nps-types';

interface NPSChartProps {
  data: NPSAggregatedData | null;
  isLoading?: boolean;
}

const COLORS = {
  promoters: '#10b981', // Green
  detractors: '#ef4444', // Red
  passives: '#f59e0b', // Amber/Orange
};

export default function NPSChart({ data, isLoading }: NPSChartProps) {
  const [chartData, setChartData] = useState<Array<{ name: string; value: number; color: string }>>([]);

  useEffect(() => {
    if (!data) {
      setChartData([]);
      return;
    }

    // Prepare pie chart data
    const chartDataPoints = [
      {
        name: 'Promoters',
        value: data.overall.promoters,
        color: COLORS.promoters,
      },
      {
        name: 'Passives',
        value: data.overall.passives,
        color: COLORS.passives,
      },
      {
        name: 'Detractors',
        value: data.overall.detractors,
        color: COLORS.detractors,
      },
    ].filter(item => item.value > 0); // Only show segments with data

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

  const total = data.overall.total;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-6">Promoters vs Detractors</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={({ name, value, percent }) => {
              const percentage = percent !== undefined ? (percent * 100).toFixed(1) : '0';
              return `${name}\n${value} (${percentage}%)`;
            }}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value: any) => {
              const numValue = Number(value) || 0;
              const percentage = total > 0 ? ((numValue / total) * 100).toFixed(1) : '0';
              return [`${numValue} (${percentage}%)`, ''];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

