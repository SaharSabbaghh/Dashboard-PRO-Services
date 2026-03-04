'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, BarChart3, Calendar } from 'lucide-react';
import type { ChatTrendData } from '@/lib/chat-types';

interface ChatTrendChartProps {
  data: ChatTrendData[];
  isLoading?: boolean;
}

export default function ChatTrendChart({ data, isLoading }: ChatTrendChartProps) {
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
    frustration: item.frustrationPercentage,
    confusion: item.confusionPercentage,
  }));

  // Calculate trend direction
  const calculateTrend = (values: number[]) => {
    if (values.length < 2) return 'stable';
    const first = values[0];
    const last = values[values.length - 1];
    const diff = last - first;
    const threshold = 2; // 2% change threshold
    
    if (diff > threshold) return 'increasing';
    if (diff < -threshold) return 'decreasing';
    return 'stable';
  };

  const frustrationTrend = calculateTrend(data.map(d => d.frustrationPercentage));
  const confusionTrend = calculateTrend(data.map(d => d.confusionPercentage));

  // Helper to format date for display
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // ── Compute Average / Peak / Best-Worst insights ──
  const frustrationValues = data.map(d => d.frustrationPercentage);
  const confusionValues = data.map(d => d.confusionPercentage);

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

  const frustrationAvg = avg(frustrationValues);
  const confusionAvg = avg(confusionValues);

  const frustrationMax = Math.max(...frustrationValues);
  const frustrationMin = Math.min(...frustrationValues);
  const confusionMax = Math.max(...confusionValues);
  const confusionMin = Math.min(...confusionValues);

  const frustrationPeakDay = data.find(d => d.frustrationPercentage === frustrationMax)!;
  const frustrationBestDay = data.find(d => d.frustrationPercentage === frustrationMin)!;
  const confusionPeakDay = data.find(d => d.confusionPercentage === confusionMax)!;
  const confusionBestDay = data.find(d => d.confusionPercentage === confusionMin)!;

  // Dynamic Y-axis: scale to the max value with padding (round up to nearest 5)
  const overallMax = Math.max(frustrationMax, confusionMax);
  const yAxisMax = Math.min(100, Math.ceil(overallMax / 5) * 5 + 5);

  // Biggest single-day spike
  let biggestFrustrationSpike = { change: 0, date: '' };
  let biggestConfusionSpike = { change: 0, date: '' };
  for (let i = 1; i < data.length; i++) {
    const fChange = data[i].frustrationPercentage - data[i - 1].frustrationPercentage;
    if (Math.abs(fChange) > Math.abs(biggestFrustrationSpike.change)) {
      biggestFrustrationSpike = { change: fChange, date: data[i].date };
    }
    const cChange = data[i].confusionPercentage - data[i - 1].confusionPercentage;
    if (Math.abs(cChange) > Math.abs(biggestConfusionSpike.change)) {
      biggestConfusionSpike = { change: cChange, date: data[i].date };
    }
  }

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

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-slate-900">Trend Analysis</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              {getTrendIcon(frustrationTrend)}
              <span className={`font-medium ${getTrendColor(frustrationTrend)}`}>
                Frustration {frustrationTrend}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {getTrendIcon(confusionTrend)}
              <span className={`font-medium ${getTrendColor(confusionTrend)}`}>
                Confusion {confusionTrend}
              </span>
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Changes in frustration and confusion levels over the last {data.length} days
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
            label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
            domain={[0, yAxisMax]}
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
              if (value === undefined || value === null) return ['0.0%', ''];
              return [`${value.toFixed(1)}%`, ''];
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          {/* Average reference lines */}
          <ReferenceLine
            y={frustrationAvg}
            stroke="#ef4444"
            strokeDasharray="6 4"
            strokeOpacity={0.45}
            label={{ value: `Avg ${frustrationAvg.toFixed(1)}%`, position: 'right', fill: '#ef4444', fontSize: 11 }}
          />
          <ReferenceLine
            y={confusionAvg}
            stroke="#3b82f6"
            strokeDasharray="6 4"
            strokeOpacity={0.45}
            label={{ value: `Avg ${confusionAvg.toFixed(1)}%`, position: 'left', fill: '#3b82f6', fontSize: 11 }}
          />
          <Line 
            type="monotone" 
            dataKey="frustration" 
            stroke="#ef4444" 
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 4 }}
            activeDot={{ r: 6 }}
            name="Frustration %"
          />
          <Line 
            type="monotone" 
            dataKey="confusion" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
            name="Confusion %"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* ── Summary Stats ── */}
      <div className="mt-6 grid grid-cols-2 gap-4 pt-6 border-t border-slate-200">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Frustration</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-600">
              {data.length > 0 ? data[data.length - 1].frustrationPercentage.toFixed(1) : '0.0'}%
            </span>
            {data.length > 1 && (
              <span className={`text-sm ${getTrendColor(frustrationTrend)}`}>
                {frustrationTrend === 'increasing' ? '↑' : frustrationTrend === 'decreasing' ? '↓' : '→'}
                {Math.abs(data[data.length - 1].frustrationPercentage - data[0].frustrationPercentage).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Current vs. {data.length} days ago</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Confusion</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">
              {data.length > 0 ? data[data.length - 1].confusionPercentage.toFixed(1) : '0.0'}%
            </span>
            {data.length > 1 && (
              <span className={`text-sm ${getTrendColor(confusionTrend)}`}>
                {confusionTrend === 'increasing' ? '↑' : confusionTrend === 'decreasing' ? '↓' : '→'}
                {Math.abs(data[data.length - 1].confusionPercentage - data[0].confusionPercentage).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Current vs. {data.length} days ago</p>
        </div>
      </div>

      {/* ── Average / Peak / Best-Worst Insights ── */}
      {data.length >= 2 && (
        <div className="mt-6 pt-6 border-t border-slate-200 space-y-5">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            Period Insights
            <span className="text-xs font-normal text-slate-400">({data.length} days)</span>
          </h4>

          {/* Average row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 rounded-lg px-4 py-3 border border-red-100">
              <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider mb-1">Avg Frustration</p>
              <span className="text-xl font-bold text-red-600">{frustrationAvg.toFixed(1)}%</span>
            </div>
            <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
              <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-1">Avg Confusion</p>
              <span className="text-xl font-bold text-blue-600">{confusionAvg.toFixed(1)}%</span>
            </div>
          </div>

          {/* Peak (worst) & Best days */}
          <div className="grid grid-cols-2 gap-4">
            {/* Frustration Peak & Best */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-red-50/60 rounded-lg px-3 py-2 border border-red-100">
                <ArrowUp className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Peak Day</p>
                  <p className="text-sm font-bold text-red-700 truncate">
                    {frustrationMax.toFixed(1)}%
                    <span className="text-xs font-medium text-red-400 ml-1.5">
                      {formatDate(frustrationPeakDay.date)}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-green-50/60 rounded-lg px-3 py-2 border border-green-100">
                <ArrowDown className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">Best Day</p>
                  <p className="text-sm font-bold text-green-700 truncate">
                    {frustrationMin.toFixed(1)}%
                    <span className="text-xs font-medium text-green-400 ml-1.5">
                      {formatDate(frustrationBestDay.date)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Confusion Peak & Best */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-blue-50/60 rounded-lg px-3 py-2 border border-blue-100">
                <ArrowUp className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Peak Day</p>
                  <p className="text-sm font-bold text-blue-700 truncate">
                    {confusionMax.toFixed(1)}%
                    <span className="text-xs font-medium text-blue-400 ml-1.5">
                      {formatDate(confusionPeakDay.date)}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-green-50/60 rounded-lg px-3 py-2 border border-green-100">
                <ArrowDown className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider">Best Day</p>
                  <p className="text-sm font-bold text-green-700 truncate">
                    {confusionMin.toFixed(1)}%
                    <span className="text-xs font-medium text-green-400 ml-1.5">
                      {formatDate(confusionBestDay.date)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Biggest single-day change */}
          {(biggestFrustrationSpike.date || biggestConfusionSpike.date) && (
            <div className="grid grid-cols-2 gap-4">
              {biggestFrustrationSpike.date && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Biggest Daily Change</p>
                    <p className="text-sm font-bold text-slate-700 truncate">
                      <span className={biggestFrustrationSpike.change > 0 ? 'text-red-600' : 'text-green-600'}>
                        {biggestFrustrationSpike.change > 0 ? '+' : ''}{biggestFrustrationSpike.change.toFixed(1)}%
                      </span>
                      <span className="text-xs font-medium text-slate-400 ml-1.5">
                        {formatDate(biggestFrustrationSpike.date)}
                      </span>
                    </p>
                  </div>
                </div>
              )}
              {biggestConfusionSpike.date && (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Biggest Daily Change</p>
                    <p className="text-sm font-bold text-slate-700 truncate">
                      <span className={biggestConfusionSpike.change > 0 ? 'text-blue-600' : 'text-green-600'}>
                        {biggestConfusionSpike.change > 0 ? '+' : ''}{biggestConfusionSpike.change.toFixed(1)}%
                      </span>
                      <span className="text-xs font-medium text-slate-400 ml-1.5">
                        {formatDate(biggestConfusionSpike.date)}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Range spread */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center bg-slate-50/60 rounded-lg px-3 py-2 border border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Frustration Range</p>
              <p className="text-sm font-bold text-slate-700">
                {frustrationMin.toFixed(1)}% – {frustrationMax.toFixed(1)}%
                <span className="text-xs font-medium text-slate-400 ml-1">
                  (Δ {(frustrationMax - frustrationMin).toFixed(1)}%)
                </span>
              </p>
            </div>
            <div className="text-center bg-slate-50/60 rounded-lg px-3 py-2 border border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Confusion Range</p>
              <p className="text-sm font-bold text-slate-700">
                {confusionMin.toFixed(1)}% – {confusionMax.toFixed(1)}%
                <span className="text-xs font-medium text-slate-400 ml-1">
                  (Δ {(confusionMax - confusionMin).toFixed(1)}%)
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

