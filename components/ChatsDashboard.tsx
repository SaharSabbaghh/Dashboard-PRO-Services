'use client';

import { useState, useEffect } from 'react';
import { Calendar, AlertTriangle, MessageSquare, Frown, HelpCircle, Clock, Search } from 'lucide-react';
import type { ChatAnalysisData } from '@/lib/chat-types';

export default function ChatsDashboard() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [data, setData] = useState<ChatAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'frustrated' | 'confused' | 'both'>('frustrated');
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
        
        const chatResponse = await fetch(`/api/chat-analysis?date=${selectedDate}`);
        const chatResult = await chatResponse.json();
        
        if (chatResult.success && chatResult.data) {
          setData(chatResult.data);
        } else {
          setError(chatResult.error || 'Failed to fetch data');
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
      } else if (currentHasData === existingHasData) {
        // If data is equal, keep the one with both flags set if available
        const existingBothFlags = existing.frustrated && existing.confused;
        const currentBothFlags = conv.frustrated && conv.confused;
        if (currentBothFlags && !existingBothFlags) {
          acc.set(conv.conversationId, conv);
        }
      }
    }
    
    return acc;
  }, new Map<string, typeof data.conversationResults[0]>());

  // Calculate counts from deduplicated data
  const deduplicatedArray = Array.from(deduplicatedConversations.values());
  const totalConversations = deduplicatedArray.length;
  
  // Count conversations by status (can have both flags)
  const totalFrustrated = deduplicatedArray.filter(c => c.frustrated).length;
  const totalConfused = deduplicatedArray.filter(c => c.confused).length;
  const bothFrustratedAndConfused = deduplicatedArray.filter(c => c.frustrated && c.confused).length;
  const onlyFrustrated = deduplicatedArray.filter(c => c.frustrated && !c.confused).length;
  const onlyConfused = deduplicatedArray.filter(c => c.confused && !c.frustrated).length;
  
  // Calculate percentages
  const frustrationPercentage = totalConversations > 0 ? Math.round((totalFrustrated / totalConversations) * 100) : 0;
  const confusionPercentage = totalConversations > 0 ? Math.round((totalConfused / totalConversations) * 100) : 0;

  // Filter conversations based on selected filter and search
  const filteredConversations = deduplicatedArray.filter(conv => {
    // Only show frustrated or confused conversations (exclude neutral ones)
    const hasIssue = conv.frustrated || conv.confused;
    if (!hasIssue) return false;
    
    // Filter by status
    if (filterStatus === 'frustrated' && !(conv.frustrated && !conv.confused)) return false;
    if (filterStatus === 'confused' && !(conv.confused && !conv.frustrated)) return false;
    if (filterStatus === 'both' && !(conv.frustrated && conv.confused)) return false;
    
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Conversations */}
        <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="w-6 h-6 text-slate-600" />
              </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">{totalConversations}</div>
          <div className="text-sm font-medium text-slate-600">Total Conversations</div>
              </div>
              
        {/* Frustrated Clients */}
        <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Frown className="w-6 h-6 text-red-600" />
            <span className="text-xl font-bold text-red-600">{frustrationPercentage}%</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">{totalFrustrated}</div>
          <div className="text-sm font-medium text-slate-600">Frustrated Clients</div>
          {bothFrustratedAndConfused > 0 && (
            <div className="text-xs text-slate-500 mt-2">({bothFrustratedAndConfused} also confused)</div>
          )}
        </div>

        {/* Confused Clients */}
        <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <HelpCircle className="w-6 h-6 text-blue-600" />
            <span className="text-xl font-bold text-blue-600">{confusionPercentage}%</span>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">{totalConfused}</div>
          <div className="text-sm font-medium text-slate-600">Confused Clients</div>
          {bothFrustratedAndConfused > 0 && (
            <div className="text-xs text-slate-500 mt-2">({bothFrustratedAndConfused} also frustrated)</div>
          )}
        </div>
      </div>

      {/* Conversations Section */}
      <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-sm">
        {/* Header with Filters and Search */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Problem Conversations</h3>
              <p className="text-sm text-slate-600 mt-1">
                {filteredConversations.length} conversations
              </p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                />
          </div>
          
              {/* Filter Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('frustrated')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    filterStatus === 'frustrated'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Frustrated ({onlyFrustrated})
                </button>
                <button
                  onClick={() => setFilterStatus('confused')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    filterStatus === 'confused'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Confused ({onlyConfused})
                </button>
                <button
                  onClick={() => setFilterStatus('both')}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    filterStatus === 'both'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  Both ({bothFrustratedAndConfused})
                </button>
            </div>
          </div>
        </div>
      </div>

        {/* Conversations List */}
        <div className="divide-y divide-slate-100 max-h-[700px] overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">No conversations found</p>
              <p className="text-slate-400 text-sm">
                {searchQuery ? 'Try adjusting your search' : 'All clear! 🎉'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation, index) => (
              <div
                key={conversation.conversationId}
                className="p-5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex gap-4">
                  {/* Left: Status Badge */}
                  <div className="flex-shrink-0">
                    {conversation.frustrated && conversation.confused ? (
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center border border-orange-200">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                      </div>
                    ) : conversation.frustrated ? (
                      <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center border border-red-200">
                        <Frown className="w-5 h-5 text-red-600" />
          </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center border border-blue-200">
                        <HelpCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    )}
                  </div>

                  {/* Right: Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header Row */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-slate-900">
                        {conversation.conversationId}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(conversation.analysisDate).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      
                      {/* Status Pills */}
                      <div className="flex gap-2 flex-wrap">
                        {conversation.frustrated && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                            Frustrated
                          </span>
                        )}
                        {conversation.confused && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                            Confused
                          </span>
                        )}
                        
                        {/* Service Tag */}
                        {conversation.service && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                            {conversation.service}
                          </span>
                        )}
                        
                        {/* Skill Tag */}
                        {conversation.skill && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-slate-600">
                            {conversation.skill}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Main Issues */}
                    {hasValidContent(conversation.mainIssues) && (
                      <div className="mb-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Issues</p>
                        <div className="flex flex-wrap gap-2">
                          {conversation.mainIssues!.filter(issue => issue && issue.trim() !== '').map((issue, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200"
                            >
                              <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-slate-700">
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
                              className="flex gap-2 items-start pl-3 border-l-2 border-slate-200"
                            >
                              <span className="text-slate-400 text-sm">"</span>
                              <p className="text-sm text-slate-600 italic">
                                {phrase}
                              </p>
                </div>
              ))}
            </div>
          </div>
                    )}

                    {/* No data message */}
                    {!hasValidContent(conversation.mainIssues) && !hasValidContent(conversation.keyPhrases) && (
                      <p className="text-sm text-slate-400 italic">No details recorded</p>
                    )}
                  </div>
                </div>
            </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
