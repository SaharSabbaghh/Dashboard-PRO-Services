'use client';

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, Minus, AlertTriangle, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, CartesianGrid, Legend } from 'recharts';
import type { ChatAnalysisData, DelayTimeData } from '@/lib/chat-types';

const getScoreClassification = (score: number) => {
  if (score <= 30) return { label: 'Low', color: 'text-green-600', bgColor: 'bg-green-100', borderColor: 'border-green-200' };
  if (score <= 50) return { label: 'Moderate', color: 'text-yellow-600', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-200' };
  if (score <= 70) return { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100', borderColor: 'border-orange-200' };
  return { label: 'Critical', color: 'text-red-600', bgColor: 'bg-red-100', borderColor: 'border-red-200' };
};

const getRiskLevel = (score: number) => {
  if (score <= 30) return { label: 'Low', color: 'bg-green-500' };
  if (score <= 50) return { label: 'Medium', color: 'bg-yellow-500' };
  if (score <= 70) return { label: 'High', color: 'bg-orange-500' };
  return { label: 'Critical', color: 'bg-red-500' };
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'increasing':
      return <TrendingUp className="w-5 h-5 text-red-500" />;
    case 'decreasing':
      return <TrendingDown className="w-5 h-5 text-green-500" />;
    default:
      return <Minus className="w-5 h-5 text-slate-500" />;
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

// Classification and utility functions

export default function ChatsDashboard() {
  const [dateRange, setDateRange] = useState('Last 7 days');
  const [data, setData] = useState<ChatAnalysisData | null>(null);
  const [delayData, setDelayData] = useState<DelayTimeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch both chat analysis and delay time data
        const [chatResponse, delayResponse] = await Promise.all([
          fetch('/api/chat-analysis'),
          fetch('/api/delay-time')
        ]);
        
        const chatResult = await chatResponse.json();
        const delayResult = await delayResponse.json();
        
        if (chatResult.success && chatResult.data) {
          setData(chatResult.data);
        } else {
          setError(chatResult.error || 'Failed to fetch data');
        }
        
        if (delayResult.success && delayResult.data) {
          setDelayData(delayResult.data);
        }
      } catch (err) {
        setError('Network error occurred');
        console.error('Error fetching chat data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Chats Dashboard</h1>
            <p className="text-slate-600 mt-1">Monitor customer frustration and confusion levels</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading chat analysis data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Chats Dashboard</h1>
            <p className="text-slate-600 mt-1">Monitor customer frustration and confusion levels</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">Unable to load chat data</p>
            <p className="text-sm text-slate-500">{error || 'No data available'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Extract data for easier access
  const frustratedCount = data.overallMetrics.frustratedCount;
  const frustrationPercentage = data.overallMetrics.frustrationPercentage;
  const confusedCount = data.overallMetrics.confusedCount;
  const confusionPercentage = data.overallMetrics.confusionPercentage;
  const frustrationTrend = data.trends.frustration.direction;
  const confusionTrend = data.trends.confusion.direction;
  const previousFrustration = data.trends.frustration.previous;
  const previousConfusion = data.trends.confusion.previous;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Chats Dashboard</h1>
          <p className="text-slate-600 mt-1">Monitor customer frustration and confusion levels</p>
        </div>
      </div>

      {/* Top Bar Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-200">
        <div className="max-w-xs">
          {/* Date Range */}
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
            <div className="relative">
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option>Last 7 days</option>
                <option>Last 14 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>Custom range</option>
              </select>
              <Calendar className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Primary Metric Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Frustration Level Card */}
        <div className="bg-white rounded-xl p-8 border-2 border-slate-200 shadow-sm">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-800 mb-6">Frustrated Clients</h2>
            
            {/* Percentage Display */}
            <div className="mb-6">
              <div className="text-6xl font-bold mb-2 text-red-600">
                {frustrationPercentage}%
              </div>
              <div className="text-slate-500 text-lg">
                {frustratedCount} of {data.overallMetrics.totalConversations} conversations
              </div>
            </div>

            {/* Trend Indicator */}
            <div className="flex items-center justify-center gap-2">
              {getTrendIcon(frustrationTrend)}
              <span className={`font-medium capitalize ${getTrendColor(frustrationTrend)}`}>
                {frustrationTrend}
              </span>
              <span className="text-slate-500">
                ({frustrationTrend === 'increasing' ? '+' : frustrationTrend === 'decreasing' ? '-' : ''}
                {Math.abs(frustrationPercentage - previousFrustration)}% from previous period)
              </span>
            </div>
          </div>
        </div>

        {/* Confusion Level Card */}
        <div className="bg-white rounded-xl p-8 border-2 border-slate-200 shadow-sm">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-800 mb-6">Confused Clients</h2>
            
            {/* Percentage Display */}
            <div className="mb-6">
              <div className="text-6xl font-bold mb-2 text-blue-600">
                {confusionPercentage}%
              </div>
              <div className="text-slate-500 text-lg">
                {confusedCount} of {data.overallMetrics.totalConversations} conversations
              </div>
            </div>

            {/* Trend Indicator */}
            <div className="flex items-center justify-center gap-2">
              {getTrendIcon(confusionTrend)}
              <span className={`font-medium capitalize ${getTrendColor(confusionTrend)}`}>
                {confusionTrend}
              </span>
              <span className="text-slate-500">
                ({confusionTrend === 'increasing' ? '+' : confusionTrend === 'decreasing' ? '-' : ''}
                {Math.abs(confusionPercentage - previousConfusion)}% from previous period)
              </span>
            </div>
          </div>
        </div>

        {/* Average Delay Time Card */}
        <div className="bg-white rounded-xl p-8 border-2 border-slate-200 shadow-sm">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-800 mb-6">Avg Reply Time</h2>
            
            {/* Delay Display */}
            <div className="mb-6">
              {delayData ? (
                <>
                  <div className="text-6xl font-bold mb-2 text-green-600">
                    {delayData.overallAvgDelayFormatted}
                  </div>
                  <div className="text-slate-500 text-lg">
                    {delayData.agentStats.length} agents, {delayData.totalConversations} records
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-bold mb-2 text-slate-400">
                    No Data
                  </div>
                  <div className="text-slate-500 text-sm">
                    No delay time data available
                  </div>
                </>
              )}
            </div>

            {/* Trend/Info Indicator */}
            {delayData && delayData.medianDelayFormatted && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-slate-600">Median:</span>
                <span className="font-medium text-slate-800">
                  {delayData.medianDelayFormatted}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trend Visualization */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Frustration & Confusion Trends</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="frustrationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="confusionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              
              {/* Threshold zones */}
              <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="5 5" strokeOpacity={0.6} />
              <ReferenceLine y={50} stroke="#eab308" strokeDasharray="5 5" strokeOpacity={0.6} />
              <ReferenceLine y={70} stroke="#f97316" strokeDasharray="5 5" strokeOpacity={0.6} />
              
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
                formatter={(value, name) => [`${value}%`, name === 'frustrationPercentage' ? 'Frustrated %' : 'Confused %']}
              />
              
              {/* Frustration Line */}
              <Line 
                type="monotone" 
                dataKey="frustrationPercentage" 
                stroke="#ef4444" 
                strokeWidth={3}
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2, fill: '#fff' }}
                name="frustrationPercentage"
              />
              
              {/* Confusion Line */}
              <Line 
                type="monotone" 
                dataKey="confusionPercentage" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                name="confusionPercentage"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center gap-8 mt-4">
          {/* Metric Lines */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-500"></div>
              <span className="text-slate-600 font-medium">Frustration</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-500"></div>
              <span className="text-slate-600 font-medium">Confusion</span>
            </div>
          </div>
          
          {/* Threshold Legend */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-green-500 opacity-60"></div>
              <span className="text-slate-600">Low (0-30)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-yellow-500 opacity-60"></div>
              <span className="text-slate-600">Moderate (31-50)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-orange-500 opacity-60"></div>
              <span className="text-slate-600">High (51-70)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-red-500 opacity-60"></div>
              <span className="text-slate-600">Critical (71-100)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Frustration Insights */}
        <div className="space-y-6">
          {/* Main Frustration Issue */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold text-slate-800">Main Frustration Issue</h3>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">{data.insights.frustration.mainIssue.title}</h4>
              <p className="text-red-700 text-sm">
                {data.insights.frustration.mainIssue.description}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                  Impact: {data.insights.frustration.mainIssue.impact}%
                </span>
                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                  Trending {data.insights.frustration.mainIssue.trending === 'up' ? 'Up' : data.insights.frustration.mainIssue.trending === 'down' ? 'Down' : 'Stable'}
                </span>
              </div>
            </div>
          </div>

          {/* Top Frustration Drivers */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Frustration Drivers</h3>
            <div className="space-y-3">
              {data.insights.frustration.topDrivers.map((driver, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-xs font-medium text-red-600">
                      {index + 1}
                    </div>
                    <span className="text-slate-800 font-medium">{driver.issue}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${driver.impact}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-slate-600 w-8">
                      {driver.impact}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Confusion Insights */}
        <div className="space-y-6">
          {/* Main Confusion Issue */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-slate-800">Main Confusion Issue</h3>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">{data.insights.confusion.mainIssue.title}</h4>
              <p className="text-blue-700 text-sm">
                {data.insights.confusion.mainIssue.description}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  Impact: {data.insights.confusion.mainIssue.impact}%
                </span>
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  Trending {data.insights.confusion.mainIssue.trending === 'up' ? 'Up' : data.insights.confusion.mainIssue.trending === 'down' ? 'Down' : 'Stable'}
                </span>
              </div>
            </div>
          </div>

          {/* Top Confusion Drivers */}
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Confusion Drivers</h3>
            <div className="space-y-3">
              {data.insights.confusion.topDrivers.map((driver, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                      {index + 1}
                    </div>
                    <span className="text-slate-800 font-medium">{driver.issue}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${driver.impact}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-slate-600 w-8">
                      {driver.impact}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Agent Delay Time Breakdown */}
      {delayData && delayData.agentStats && delayData.agentStats.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Agent Response Times</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Agent Name</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Avg Delay</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Conversations</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Performance</th>
                </tr>
              </thead>
              <tbody>
                {delayData.agentStats
                  .sort((a, b) => a.avgDelaySeconds - b.avgDelaySeconds)
                  .slice(0, 10)
                  .map((agent, index) => (
                  <tr key={agent.agentName} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          index === 0 ? 'bg-green-500' : 
                          index <= 2 ? 'bg-blue-500' : 
                          'bg-slate-400'
                        }`}></div>
                        <span className="font-medium text-slate-800">{agent.agentName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold text-slate-700">{agent.avgDelayFormatted}</span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">
                      {agent.conversationCount}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-32 bg-slate-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              index === 0 ? 'bg-green-500' : 
                              index <= 2 ? 'bg-blue-500' : 
                              'bg-slate-400'
                            }`}
                            style={{ 
                              width: `${Math.min(100, (delayData.overallAvgDelaySeconds / agent.avgDelaySeconds) * 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {delayData.agentStats.length > 10 && (
            <p className="text-sm text-slate-500 mt-4 text-center">
              Showing top 10 agents. Total: {delayData.agentStats.length} agents
            </p>
          )}
        </div>
      )}

    </div>
  );
}
