'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import type { OperationsTrendData } from '@/lib/operations-types';

interface OperationsTrendChartProps {
  data: OperationsTrendData[];
  isLoading?: boolean;
}

export default function OperationsTrendChart({ data, isLoading }: OperationsTrendChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading trend data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-slate-600 font-medium">No trend data available</p>
            <p className="text-slate-400 text-sm mt-1">Select a date range to view trends</p>
          </div>
        </div>
      </div>
    );
  }

  // Format data for chart (format dates for display)
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    fullDate: item.date,
    casesDelayed: item.casesDelayed,
    doneToday: item.doneToday,
  }));

  // Calculate trend direction
  const calculateTrend = (values: number[]) => {
    if (values.length < 2) return 'stable';
    const first = values[0];
    const last = values[values.length - 1];
    const diff = last - first;
    const threshold = 5; // 5 case change threshold
    
    if (diff > threshold) return 'increasing';
    if (diff < -threshold) return 'decreasing';
    return 'stable';
  };

  const delayedTrend = calculateTrend(data.map(d => d.casesDelayed));
  const doneTrend = calculateTrend(data.map(d => d.doneToday));

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-red-600" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-green-600" />;
      default:
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-red-600';
      case 'decreasing':
        return 'text-green-600';
      default:
        return 'text-slate-600';
    }
  };

  // For delayed cases, increasing is bad, decreasing is good
  // For done cases, increasing is good, decreasing is bad
  const getDelayedTrendLabel = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'increasing (worsening)';
      case 'decreasing':
        return 'decreasing (improving)';
      default:
        return 'stable';
    }
  };

  const getDoneTrendLabel = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'increasing (improving)';
      case 'decreasing':
        return 'decreasing (worsening)';
      default:
        return 'stable';
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-slate-900">Trend Analysis</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className={`font-medium ${getTrendColor(delayedTrend)}`}>
                Cases Delayed {getDelayedTrendLabel(delayedTrend)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className={`font-medium ${getTrendColor(doneTrend)}`}>
                Cases Done {getDoneTrendLabel(doneTrend)}
              </span>
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Changes in cases delayed and completed over the last {data.length} days
        </p>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="date" 
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            label={{ value: 'Number of Cases', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
            labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
            formatter={(value: number | undefined) => {
              if (value === undefined || value === null) return ['0', ''];
              return [value.toString(), ''];
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <Line 
            type="monotone" 
            dataKey="casesDelayed" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 4 }}
            activeDot={{ r: 6 }}
            name="Cases Delayed"
          />
          <Line 
            type="monotone" 
            dataKey="doneToday" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
            name="Cases Done"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 pt-6 border-t border-slate-200">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Cases Delayed</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-600">
              {data.length > 0 ? data[data.length - 1].casesDelayed : 0}
            </span>
            {data.length > 1 && (
              <span className={`text-sm ${getTrendColor(delayedTrend)}`}>
                {delayedTrend === 'increasing' ? '↑' : delayedTrend === 'decreasing' ? '↓' : '→'}
                {Math.abs(data[data.length - 1].casesDelayed - data[0].casesDelayed)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Current vs. {data.length} days ago</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Cases Done</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-green-600">
              {data.length > 0 ? data[data.length - 1].doneToday : 0}
            </span>
            {data.length > 1 && (
              <span className={`text-sm ${getTrendColor(doneTrend)}`}>
                {doneTrend === 'increasing' ? '↑' : doneTrend === 'decreasing' ? '↓' : '→'}
                {Math.abs(data[data.length - 1].doneToday - data[0].doneToday)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Current vs. {data.length} days ago</p>
        </div>
      </div>
    </div>
  );
}

