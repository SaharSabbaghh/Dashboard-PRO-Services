'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, TrendingUp, Users, Award } from 'lucide-react';
import type { DelayTimeData } from '@/lib/chat-types';

export default function AgentsDashboard() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [delayData, setDelayData] = useState<DelayTimeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available dates
  useEffect(() => {
    const fetchDates = async () => {
      try {
        const res = await fetch('/api/chat-analysis/dates');
        const result = await res.json();
        if (result.success && result.dates) {
          setAvailableDates(result.dates);
          // Auto-select the most recent date
          if (result.dates.length > 0 && !selectedDate) {
            setSelectedDate(result.dates[result.dates.length - 1]);
          }
        }
      } catch (err) {
        console.error('Error fetching available dates:', err);
      }
    };

    fetchDates();
  }, []);

  // Fetch delay data based on selected date
  useEffect(() => {
    if (!selectedDate) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const delayResponse = await fetch(`/api/delay-time?date=${selectedDate}`);
        const delayResult = await delayResponse.json();
        
        if (delayResult.success && delayResult.data) {
          setDelayData(delayResult.data);
        } else {
          setError('No delay data available for this date');
        }
      } catch (err) {
        setError('Network error occurred');
        console.error('Error fetching delay data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading agent performance data...</p>
        </div>
      </div>
    );
  }

  // No date selected state
  if (!selectedDate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Agent Performance</h1>
            <p className="text-slate-500 mt-2">Monitor agent response times and performance metrics</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
          <Clock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">Please Select a Date</h3>
          <p className="text-slate-500">Choose a date from the selector above to view agent performance data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Selector */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Agent Performance</h1>
          {selectedDate && (
            <p className="text-slate-500 mt-2 text-sm">
              Showing data for {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          )}
        </div>
        
        {/* Date Selector */}
        <div className="relative">
          <select
            value={selectedDate || ''}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="appearance-none bg-white border-2 border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
          >
            <option value="">Select Date</option>
            {availableDates.map((date) => (
              <option key={date} value={date}>
                {new Date(date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </option>
            ))}
          </select>
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      {delayData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total Agents */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-8 h-8 text-slate-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{delayData.agentStats.length}</div>
            <div className="text-sm font-medium text-slate-600">Active Agents</div>
          </div>

          {/* Total Conversations */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-900 mb-1">{delayData.totalConversations}</div>
            <div className="text-sm font-medium text-blue-700">Total Conversations</div>
          </div>

          {/* Average Reply Time */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-900 mb-1">{delayData.overallAvgDelayFormatted}</div>
            <div className="text-sm font-medium text-green-700">Avg Reply Time</div>
          </div>

          {/* Median Reply Time */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <Award className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-purple-900 mb-1">{delayData.medianDelayFormatted}</div>
            <div className="text-sm font-medium text-purple-700">Median Reply Time</div>
          </div>
        </div>
      )}

      {/* Agent Performance Table */}
      {delayData && delayData.agentStats && delayData.agentStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Agent Rankings</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Response time breakdown by agent
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-600">
                  {delayData.agentStats.length} Agents
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="text-left py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Agent Name
                  </th>
                  <th className="text-center py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Avg Response
                  </th>
                  <th className="text-center py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Conversations
                  </th>
                  <th className="text-left py-4 px-6 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {delayData.agentStats
                  .sort((a, b) => a.avgDelaySeconds - b.avgDelaySeconds)
                  .map((agent, index) => {
                    const isTopPerformer = index < 3;
                    const performanceScore = Math.min(100, (delayData.overallAvgDelaySeconds / agent.avgDelaySeconds) * 100);
                    
                    return (
                      <tr key={agent.agentName} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-4 px-6">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                            index === 0 
                              ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900 shadow-lg' 
                              : index === 1 
                              ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-slate-900 shadow-md' 
                              : index === 2
                              ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-orange-900 shadow-md'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm ${
                              isTopPerformer 
                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg' 
                                : 'bg-gradient-to-br from-slate-400 to-slate-500'
                            }`}>
                              {agent.agentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                              {agent.agentName}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
                            <Clock className="w-4 h-4 text-slate-500" />
                            <span className="font-bold text-slate-900 text-sm">{agent.avgDelayFormatted}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="inline-flex items-center justify-center w-12 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm">
                            {agent.conversationCount}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
                              <div 
                                className={`h-3 rounded-full transition-all duration-500 ${
                                  performanceScore >= 100 
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                                    : performanceScore >= 80 
                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                                    : performanceScore >= 60
                                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                    : 'bg-gradient-to-r from-red-500 to-red-600'
                                }`}
                                style={{ width: `${performanceScore}%` }}
                              ></div>
                            </div>
                            <span className={`font-bold text-sm min-w-[60px] text-right ${
                              performanceScore >= 100 
                                ? 'text-green-600' 
                                : performanceScore >= 80 
                                ? 'text-blue-600'
                                : performanceScore >= 60
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}>
                              {performanceScore >= 100 ? 'Excellent' : performanceScore >= 80 ? 'Good' : performanceScore >= 60 ? 'Average' : 'Slow'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

