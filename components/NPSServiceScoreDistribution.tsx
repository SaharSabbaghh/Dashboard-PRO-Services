'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import type { NPSServiceMetrics } from '@/lib/nps-types';

interface NPSServiceScoreDistributionProps {
  services: NPSServiceMetrics[];
  isLoading?: boolean;
}

// Color coding: Detractors (0-6) = red, Passives (7-8) = yellow, Promoters (9-10) = green
const getBarColor = (score: number) => {
  if (score >= 9) return '#10b981'; // Green for promoters
  if (score >= 7) return '#f59e0b'; // Yellow/Orange for passives
  return '#ef4444'; // Red for detractors
};

export default function NPSServiceScoreDistribution({ services, isLoading }: NPSServiceScoreDistributionProps) {
  const [chartData, setChartData] = useState<Array<{ score: number; [serviceName: string]: number | string }>>([]);

  useEffect(() => {
    if (!services || services.length === 0) {
      setChartData([]);
      return;
    }

    // Prepare chart data - one row per score (0-10), with columns for each service
    const data = [];
    for (let score = 0; score <= 10; score++) {
      const row: { score: number; [serviceName: string]: number | string } = {
        score,
        label: score.toString(),
      };
      
      // Add count for each service at this score
      services.forEach(service => {
        row[service.service] = service.metrics.scoreDistribution[score] || 0;
      });
      
      data.push(row);
    }

    setChartData(data);
  }, [services]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48 mb-4"></div>
        <div className="h-64 bg-slate-100 rounded"></div>
      </div>
    );
  }

  if (!services || services.length === 0 || chartData.length === 0) {
    return null;
  }

  // Generate colors for each service (cycle through a palette)
  const serviceColors = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#f97316', // orange
    '#ec4899', // pink
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-6">Service Score Distributions (0-10)</h3>
      <ResponsiveContainer width="100%" height={400}>
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
            formatter={(value: any) => {
              const numValue = Number(value) || 0;
              return [`${numValue}`, 'Responses'];
            }}
          />
          <Legend />
          {services.map((service, index) => (
            <Bar 
              key={service.service} 
              dataKey={service.service} 
              fill={serviceColors[index % serviceColors.length]}
              radius={[8, 8, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 flex items-center justify-center gap-4 text-xs flex-wrap">
        {services.map((service, index) => (
          <div key={service.service} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded" 
              style={{ backgroundColor: serviceColors[index % serviceColors.length] }}
            ></div>
            <span className="text-slate-600">{service.service}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

