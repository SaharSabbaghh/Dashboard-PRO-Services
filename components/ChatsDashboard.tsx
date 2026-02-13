'use client';

import { useState, useEffect } from 'react';
import { Calendar, AlertTriangle } from 'lucide-react';
import type { ChatAnalysisData, DelayTimeData } from '@/lib/chat-types';

export default function ChatsDashboard() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [data, setData] = useState<ChatAnalysisData | null>(null);
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

  // Fetch data from API based on selected date
  useEffect(() => {
    if (!selectedDate) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch both chat analysis and delay time data for the selected date
        const [chatResponse, delayResponse] = await Promise.all([
          fetch(`/api/chat-analysis?date=${selectedDate}`),
          fetch(`/api/delay-time?date=${selectedDate}`)
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
  }, [selectedDate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Chats Dashboard</h1>
            <p className="text-slate-600 mt-1">Monitor customer frustration and confusion levels</p>
          </div>
          {/* Date selector */}
          <div className="flex items-center gap-3">
            <select
              value={selectedDate || ''}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

  // No date selected state
  if (!selectedDate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Chats Dashboard</h1>
            <p className="text-slate-600 mt-1">Monitor customer frustration and confusion levels</p>
          </div>
          {/* Date selector */}
          <div className="flex items-center gap-3">
            <select
              value={selectedDate || ''}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200">
          <Calendar className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Please Select a Date</h3>
          <p className="text-sm text-slate-500 text-center max-w-sm">
            Use the date picker above to select a date to view chat analysis data.
          </p>
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
          {/* Date selector */}
          <div className="flex items-center gap-3">
            <select
              value={selectedDate || ''}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">Unable to load chat data</p>
            <p className="text-sm text-slate-500">{error || 'No data available for this date'}</p>
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
  const totalConversations = data.overallMetrics.totalConversations;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Chats Dashboard</h1>
          <p className="text-slate-600 mt-1">
            {selectedDate && `Data for ${new Date(selectedDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}`}
          </p>
        </div>
        {/* Date selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedDate || ''}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
        </div>
      </div>

      {/* Top Bar Filters - Removed, date is now in header */}

      {/* Primary Metric Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Frustration Card */}
        <div className="bg-white rounded-xl p-8 border-2 border-slate-200 shadow-sm">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-800 mb-6">Frustrated Clients</h2>
            <div className="text-6xl font-bold mb-2 text-red-600">
              {frustrationPercentage}%
            </div>
            <div className="text-slate-500 text-lg">
              {frustratedCount} of {totalConversations} conversations
            </div>
          </div>
        </div>

        {/* Confusion Card */}
        <div className="bg-white rounded-xl p-8 border-2 border-slate-200 shadow-sm">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-800 mb-6">Confused Clients</h2>
            <div className="text-6xl font-bold mb-2 text-blue-600">
              {confusionPercentage}%
            </div>
            <div className="text-slate-500 text-lg">
              {confusedCount} of {totalConversations} conversations
            </div>
          </div>
        </div>

        {/* Average Delay Time Card */}
        <div className="bg-white rounded-xl p-8 border-2 border-slate-200 shadow-sm">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-800 mb-6">Avg Reply Time</h2>
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
            {delayData && delayData.medianDelayFormatted && (
              <div className="text-sm text-slate-600">
                Median: <span className="font-medium text-slate-800">{delayData.medianDelayFormatted}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conversation Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Conversation Records</h3>
              <p className="text-sm text-slate-600 mt-1">
                {data.conversationResults.length} conversations analyzed
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100">
                All ({data.conversationResults.length})
              </button>
              <button className="px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100">
                Frustrated ({frustratedCount})
              </button>
              <button className="px-3 py-1.5 text-sm rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100">
                Confused ({confusedCount})
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="max-h-[600px] overflow-y-auto">
            <div className="divide-y divide-slate-100">
              {data.conversationResults.map((conversation, index) => (
                <div
                  key={conversation.conversationId}
                  className="p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Status Indicators */}
                    <div className="flex flex-col gap-2 pt-1">
                      {conversation.frustrated && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3" />
                          Frustrated
                        </span>
                      )}
                      {conversation.confused && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          <AlertTriangle className="w-3 h-3" />
                          Confused
                        </span>
                      )}
                      {!conversation.frustrated && !conversation.confused && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          ✓ OK
                        </span>
                      )}
                    </div>

                    {/* Conversation Details */}
                    <div className="flex-1 min-w-0">
                      {/* Conversation ID and Date */}
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="font-mono text-sm font-medium text-slate-700">
                          {conversation.conversationId}
                        </h4>
                        <span className="text-xs text-slate-500">
                          {new Date(conversation.analysisDate).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      {/* Main Issues */}
                      {conversation.mainIssues && conversation.mainIssues.length > 0 && conversation.mainIssues[0] !== '' && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-slate-600 mb-2">Main Issues:</p>
                          <div className="flex flex-wrap gap-2">
                            {conversation.mainIssues.map((issue, idx) => (
                              issue && issue.trim() !== '' && (
                                <span
                                  key={idx}
                                  className="inline-block px-3 py-1 rounded-lg text-sm bg-orange-50 text-orange-800 border border-orange-200"
                                >
                                  {issue}
                                </span>
                              )
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Key Phrases */}
                      {conversation.keyPhrases && conversation.keyPhrases.length > 0 && conversation.keyPhrases[0] !== '' && (
                        <div>
                          <p className="text-xs font-semibold text-slate-600 mb-2">Key Phrases:</p>
                          <div className="space-y-1">
                            {conversation.keyPhrases.map((phrase, idx) => (
                              phrase && phrase.trim() !== '' && (
                                <div
                                  key={idx}
                                  className="text-sm text-slate-700 italic pl-3 border-l-2 border-slate-300"
                                >
                                  "{phrase}"
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No data message */}
                      {(!conversation.mainIssues || conversation.mainIssues.length === 0 || conversation.mainIssues[0] === '') &&
                       (!conversation.keyPhrases || conversation.keyPhrases.length === 0 || conversation.keyPhrases[0] === '') && (
                        <p className="text-sm text-slate-400 italic">No issues or phrases recorded</p>
                      )}
                    </div>
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
