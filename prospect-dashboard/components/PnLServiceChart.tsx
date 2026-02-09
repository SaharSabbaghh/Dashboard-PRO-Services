'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import type { AggregatedPnL } from '@/lib/pnl-types';

interface PnLServiceChartProps {
  data: AggregatedPnL | null;
}

type ViewMode = 'revenue' | 'volume';

// Muted, sophisticated colors matching main dashboard vibe
const SERVICE_COLORS = {
  oec: '#b45309',      // amber-700 (matches main dashboard OEC)
  owwa: '#7c3aed',     // violet-600 (matches main dashboard OWWA)
  ttl: '#2563eb',      // blue-600 (matches main dashboard travel)
  tte: '#6db39f',      // soft sage green
  ttj: '#e5a855',      // warm amber
  schengen: '#8ecae6', // soft sky blue
  gcc: '#e5c07b',      // soft golden
  ethiopianPP: '#a78bfa', // violet-400
  filipinaPP: '#d97706',  // amber-600
};

export default function PnLServiceChart({ data }: PnLServiceChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('revenue');

  if (!data) return null;

  const serviceLabels: Record<string, string> = {
    oec: 'OEC',
    owwa: 'OWWA',
    ttl: 'Lebanon',
    tte: 'Egypt',
    ttj: 'Jordan',
    schengen: 'Schengen',
    gcc: 'GCC',
    ethiopianPP: 'Ethiopian PP',
    filipinaPP: 'Filipina PP',
  };

  // Build chart data
  const chartData = Object.entries(data.services)
    .map(([key, service]) => ({
      key,
      name: serviceLabels[key] || key,
      revenue: service.totalRevenue,
      cost: service.totalCost,
      profit: service.grossProfit,
      volume: service.volume,
      color: SERVICE_COLORS[key as keyof typeof SERVICE_COLORS] || '#64748b',
    }))
    .filter(item => item.revenue > 0 || item.volume > 0);

  // Pie chart data for revenue breakdown
  const pieData = chartData
    .filter(item => item.revenue > 0)
    .map(item => ({
      name: item.name,
      value: item.revenue,
      color: item.color,
    }));

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  const formatFullCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const tooltipStyle = {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    fontSize: '12px',
  };

  const totalRevenue = data.summary.totalRevenue;
  const totalVolume = Object.values(data.services).reduce((sum, s) => sum + s.volume, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue by Service Bar Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">
            {viewMode === 'revenue' ? 'Revenue by Service' : 'Volume by Service'}
          </h3>
          
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('revenue')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'revenue'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setViewMode('volume')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                viewMode === 'volume'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Volume
            </button>
          </div>
        </div>

        <div className="flex items-end justify-start h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
              barCategoryGap="8%"
            >
            <defs>
              {chartData.map((entry) => (
                <linearGradient key={`gradient-${entry.key}`} id={`gradient-${entry.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                </linearGradient>
              ))}
            </defs>
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} 
              angle={-45} 
              textAnchor="end" 
              height={60}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
              dy={5}
            />
            <YAxis 
              tickFormatter={viewMode === 'revenue' ? formatCurrency : (v) => v.toString()}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip 
              formatter={(value: number) => viewMode === 'revenue' ? formatFullCurrency(value) : `${value} orders`}
              contentStyle={tooltipStyle}
              cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
            />
            <Bar 
              dataKey={viewMode === 'revenue' ? 'revenue' : 'volume'} 
              radius={[8, 8, 0, 0]}
            >
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={`url(#gradient-${entry.key})`} />
              ))}
            </Bar>
          </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Distribution Pie Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-base font-semibold text-slate-800 mb-4">Revenue Distribution</h3>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          {pieData.slice(0, 6).map((item) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
              <span className="text-slate-600">{item.name}</span>
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={100}
              paddingAngle={4}
              cornerRadius={8}
              dataKey="value"
              stroke="none"
              animationDuration={400}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [formatFullCurrency(value), 'Revenue']}
              contentStyle={tooltipStyle}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-500">Total Revenue</p>
            <p className="text-lg font-bold text-slate-800">{formatFullCurrency(totalRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Orders</p>
            <p className="text-lg font-bold text-slate-800">{totalVolume.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
