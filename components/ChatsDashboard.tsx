'use client';

import { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, MessageSquare, Frown, HelpCircle, Clock, ChevronDown, Filter, Search } from 'lucide-react';
import type { ChatAnalysisData, DelayTimeData } from '@/lib/chat-types';

export default function ChatsDashboard() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [data, setData] = useState<ChatAnalysisData | null>(null);
  const [delayData, setDelayData] = useState<DelayTimeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'frustrated' | 'confused'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Deduplicate conversations by conversation ID, keeping the one with most data
  const deduplicatedConversations = data.conversationResults.reduce((acc, conv) => {
    const existing = acc.get(conv.conversationId);
    
    if (!existing) {
      acc.set(conv.conversationId, conv);
    } else {
      // Keep the one with more data (issues or phrases)
      const existingHasData = (existing.mainIssues?.length || 0) + (existing.keyPhrases?.length || 0);
      const currentHasData = (conv.mainIssues?.length || 0) + (conv.keyPhrases?.length || 0);
      
      if (currentHasData > existingHasData) {
        acc.set(conv.conversationId, conv);
      }
    }
    
    return acc;
  }, new Map<string, typeof data.conversationResults[0]>());

  // Filter conversations based on selected filter and search
  const filteredConversations = Array.from(deduplicatedConversations.values()).filter(conv => {
    // Only show frustrated or confused conversations (exclude neutral ones)
    const hasIssue = conv.frustrated || conv.confused;
    if (!hasIssue) return false;
    
    // Filter by status
    if (filterStatus === 'frustrated' && !conv.frustrated) return false;
    if (filterStatus === 'confused' && !conv.confused) return false;
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesId = conv.conversationId.toLowerCase().includes(query);
      const matchesIssues = conv.mainIssues?.some(issue => issue && issue.toLowerCase().includes(query));
      const matchesPhrases = conv.keyPhrases?.some(phrase => phrase && phrase.toLowerCase().includes(query));
      return matchesId || matchesIssues || matchesPhrases;
    }
    
    return true;
  });

  // Helper function to check if array has valid content
  const hasValidContent = (arr: string[] | undefined): boolean => {
    return !!(arr && arr.length > 0 && arr.some(item => item && item.trim() !== ''));
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Selector */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Chat Analysis</h1>
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

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Conversations */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <MessageSquare className="w-8 h-8 text-slate-600" />
              </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">{totalConversations}</div>
          <div className="text-sm font-medium text-slate-600">Total Conversations</div>
              </div>
              
        {/* Frustrated Clients */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 border border-red-200">
          <div className="flex items-center justify-between mb-3">
            <Frown className="w-8 h-8 text-red-600" />
            <span className="text-2xl font-bold text-red-600">{frustrationPercentage}%</span>
          </div>
          <div className="text-3xl font-bold text-red-900 mb-1">{frustratedCount}</div>
          <div className="text-sm font-medium text-red-700">Frustrated Clients</div>
        </div>

        {/* Confused Clients */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <HelpCircle className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-blue-600">{confusionPercentage}%</span>
              </div>
          <div className="text-3xl font-bold text-blue-900 mb-1">{confusedCount}</div>
          <div className="text-sm font-medium text-blue-700">Confused Clients</div>
              </div>
              
        {/* Average Reply Time */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-8 h-8 text-green-600" />
          </div>
          {delayData ? (
            <>
              <div className="text-3xl font-bold text-green-900 mb-1">{delayData.overallAvgDelayFormatted}</div>
              <div className="text-sm font-medium text-green-700">Avg Reply Time</div>
              <div className="text-xs text-green-600 mt-2">Median: {delayData.medianDelayFormatted}</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-slate-400 mb-1">—</div>
              <div className="text-sm font-medium text-slate-500">No delay data</div>
            </>
          )}
        </div>
      </div>

      {/* Conversations Section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Header with Filters and Search */}
        <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Problem Conversations</h3>
              <p className="text-sm text-slate-600 mt-1">
                Showing {filteredConversations.length} unique frustrated or confused conversations
              </p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
          </div>
          
              {/* Filter Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    filterStatus === 'all'
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All Issues ({Array.from(deduplicatedConversations.values()).filter(c => c.frustrated || c.confused).length})
                </button>
                <button
                  onClick={() => setFilterStatus('frustrated')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    filterStatus === 'frustrated'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  <Frown className="w-4 h-4 inline mr-1" />
                  Frustrated ({Array.from(deduplicatedConversations.values()).filter(c => c.frustrated).length})
                </button>
                <button
                  onClick={() => setFilterStatus('confused')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    filterStatus === 'confused'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 inline mr-1" />
                  Confused ({Array.from(deduplicatedConversations.values()).filter(c => c.confused).length})
                </button>
              </div>
          </div>
        </div>
      </div>

        {/* Conversations List */}
        <div className="divide-y divide-slate-100 max-h-[700px] overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <MessageSquare className="w-16 h-16 text-slate-300 mb-4" />
              <p className="text-slate-500 text-lg font-medium">No problem conversations found</p>
              <p className="text-slate-400 text-sm">
                {searchQuery ? 'Try adjusting your search query' : 'All conversations are running smoothly! 🎉'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation, index) => (
              <div
                key={conversation.conversationId}
                className="p-6 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex gap-6">
                  {/* Left: Status Badge */}
                  <div className="flex-shrink-0">
                    {conversation.frustrated && conversation.confused ? (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                        <AlertTriangle className="w-6 h-6 text-white" />
                      </div>
                    ) : conversation.frustrated ? (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                        <Frown className="w-6 h-6 text-white" />
          </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                        <HelpCircle className="w-6 h-6 text-white" />
                    </div>
                    )}
                  </div>

                  {/* Right: Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header Row */}
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">
                        {conversation.conversationId}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(conversation.analysisDate).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      
                      {/* Status Pills */}
                      <div className="flex gap-2">
                        {conversation.frustrated && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                            <Frown className="w-3 h-3" />
                            Frustrated
                          </span>
                        )}
                        {conversation.confused && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                            <HelpCircle className="w-3 h-3" />
                            Confused
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Main Issues */}
                    {hasValidContent(conversation.mainIssues) && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Issues</p>
                        <div className="flex flex-wrap gap-2">
                          {conversation.mainIssues!.filter(issue => issue && issue.trim() !== '').map((issue, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 group-hover:shadow-sm transition-shadow"
                            >
                              <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-orange-900 font-medium leading-relaxed">
                                {issue}
                    </span>
                  </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Phrases */}
                    {hasValidContent(conversation.keyPhrases) && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Key Phrases</p>
                        <div className="space-y-2">
                          {conversation.keyPhrases!.filter(phrase => phrase && phrase.trim() !== '').map((phrase, idx) => (
                            <div
                              key={idx}
                              className="flex gap-3 items-start pl-4 border-l-3 border-slate-300 group-hover:border-slate-400 transition-colors"
                            >
                              <span className="text-slate-400 text-lg leading-none">"</span>
                              <p className="text-sm text-slate-700 italic leading-relaxed flex-1">
                                {phrase}
                              </p>
                </div>
              ))}
            </div>
          </div>
                    )}

                    {/* No data message */}
                    {!hasValidContent(conversation.mainIssues) && !hasValidContent(conversation.keyPhrases) && (
                      <p className="text-sm text-slate-400 italic">No issues or phrases recorded for this conversation</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
            </div>

      {/* Agent Performance Breakdown */}
      {delayData && delayData.agentStats && delayData.agentStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Agent Performance</h3>
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
                  .slice(0, 15)
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
          
          {delayData.agentStats.length > 15 && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
              <p className="text-sm text-slate-600 text-center">
                Showing top 15 of {delayData.agentStats.length} agents
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
