import { put, list, del } from '@vercel/blob';
import type { 
  ChatAnalysisData, 
  ChatAnalysisResult, 
  ChatTrendData, 
  ChatDriver, 
  ChatInsight,
  DelayTimeData,
  AgentDelayRecord,
  AgentDelayStats,
  AgentResponseTimeRecord
} from './chat-types';

const CHAT_BLOB_PREFIX = 'chat-analysis';
const DELAY_BLOB_PREFIX = 'delay-time';

/**
 * Save daily chat analysis data to blob storage
 */
export async function saveDailyChatAnalysisData(data: ChatAnalysisData): Promise<void> {
  // Save with date-specific filename
  const dateBlobName = `${CHAT_BLOB_PREFIX}/daily/${data.analysisDate}.json`;
  
  // Delete existing blob if it exists, then save new one
  try {
    const { blobs } = await list({ prefix: dateBlobName });
    if (blobs.length > 0) {
      await del(blobs[0].url);
    }
  } catch (error) {
    // Ignore errors if blob doesn't exist
  }
  
  await put(dateBlobName, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
  });
  
  // Also save as latest for dashboard
  const latestBlobName = `${CHAT_BLOB_PREFIX}/latest.json`;
  
  try {
    const { blobs } = await list({ prefix: latestBlobName });
    if (blobs.length > 0) {
      await del(blobs[0].url);
    }
  } catch (error) {
    // Ignore errors if blob doesn't exist
  }
  
  await put(latestBlobName, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
  });
}

/**
 * Get the latest chat analysis data from blob storage
 */
export async function getLatestChatAnalysisData(): Promise<ChatAnalysisData | null> {
  try {
    // List blobs to find the latest.json file
    const { blobs } = await list({
      prefix: 'chat-analysis/latest.json',
    });
    
    if (blobs.length === 0) {
      console.log('[Chat Storage] No latest chat analysis data found');
      return null;
    }
    
    const response = await fetch(blobs[0].url);
    
    if (!response.ok) {
      console.error('[Chat Storage] Failed to fetch latest data:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data as ChatAnalysisData;
  } catch (error) {
    console.error('[Chat Storage] Error fetching latest chat analysis data:', error);
    return null;
  }
}

/**
 * Get daily chat analysis data for a specific date
 */
export async function getDailyChatAnalysisData(date: string): Promise<ChatAnalysisData | null> {
  try {
    // List blobs to find the exact URL
    const { blobs } = await list({
      prefix: `chat-analysis/daily/${date}.json`,
    });
    
    if (blobs.length === 0) {
      console.log(`[Chat Storage] No data found for date: ${date}`);
      return null;
    }
    
    // Fetch from the blob URL
    const response = await fetch(blobs[0].url);
    
    if (!response.ok) {
      console.error(`[Chat Storage] Failed to fetch data for ${date}:`, response.status);
      return null;
    }
    
    const data = await response.json();
    return data as ChatAnalysisData;
  } catch (error) {
    console.error(`[Chat Storage] Error fetching chat analysis data for ${date}:`, error);
    return null;
  }
}

/**
 * Get historical trend data for the dashboard (last 14 days)
 */
export async function getChatTrendData(endDate: string, days: number = 14): Promise<ChatTrendData[]> {
  const trendData: ChatTrendData[] = [];
  const end = new Date(endDate);
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(end);
    date.setDate(end.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayData = await getDailyChatAnalysisData(dateStr);
    if (dayData) {
      trendData.push({
        date: dateStr,
        frustrationPercentage: dayData.overallMetrics.frustrationPercentage,
        confusionPercentage: dayData.overallMetrics.confusionPercentage,
      });
    }
  }
  
  return trendData;
}

/**
 * Process and aggregate individual conversation scores into daily dashboard data
 */
export async function aggregateDailyChatAnalysisResults(
  conversations: Array<{
    conversationId: string;
    frustrated: boolean; // Is customer frustrated?
    confused: boolean; // Is customer confused?
    mainIssues: string[];
    keyPhrases: string[];
    chatStartDateTime?: string;
    service?: string;
    skill?: string;
    clientId?: string;
    maidId?: string;
  }>,
  analysisDate: string
): Promise<ChatAnalysisData> {
  if (conversations.length === 0) {
    return createEmptyChatAnalysisData(analysisDate);
  }

  // Get unique people (clients OR maids) from conversations
  const personMap = new Map<string, {
    personId: string;
    personType: 'client' | 'maid' | 'unknown';
    frustrated: boolean;
    confused: boolean;
    conversationIds: string[];
  }>();

  // First, deduplicate conversations by conversationId to handle duplicate entries
  const conversationMap = new Map<string, typeof conversations[0]>();
  conversations.forEach(conv => {
    const existing = conversationMap.get(conv.conversationId);
    if (!existing) {
      conversationMap.set(conv.conversationId, conv);
    } else {
      // Keep the one with more data (issues or phrases) or both frustrated/confused flags
      const existingDataScore = (existing.mainIssues?.length || 0) + (existing.keyPhrases?.length || 0);
      const currentDataScore = (conv.mainIssues?.length || 0) + (conv.keyPhrases?.length || 0);
      
      if (currentDataScore > existingDataScore || 
          (currentDataScore === existingDataScore && conv.frustrated && conv.confused && !(existing.frustrated && existing.confused))) {
        conversationMap.set(conv.conversationId, conv);
      }
    }
  });
  
  const deduplicatedConversations = Array.from(conversationMap.values());
  
  // Log deduplication results
  if (conversations.length !== deduplicatedConversations.length) {
    console.log(`[Chat Storage] Deduplication: ${conversations.length} → ${deduplicatedConversations.length} conversations (removed ${conversations.length - deduplicatedConversations.length} duplicates)`);
  }
  
  // Group deduplicated conversations by person (client or maid), aggregating their frustration/confusion status
  deduplicatedConversations.forEach(conv => {
    // Determine the person key and type
    let personKey: string;
    let personType: 'client' | 'maid' | 'unknown';
    
    if (conv.clientId) {
      personKey = `client_${conv.clientId}`;
      personType = 'client';
    } else if (conv.maidId) {
      personKey = `maid_${conv.maidId}`;
      personType = 'maid';
    } else {
      // Fallback to conversationId (without 'unknown_' prefix for better deduplication)
      personKey = conv.conversationId;
      personType = 'unknown';
    }
    
    if (!personMap.has(personKey)) {
      personMap.set(personKey, {
        personId: personKey,
        personType,
        frustrated: conv.frustrated,
        confused: conv.confused,
        conversationIds: [conv.conversationId]
      });
    } else {
      const existing = personMap.get(personKey)!;
      // If any conversation for this person is frustrated/confused, mark person as such
      existing.frustrated = existing.frustrated || conv.frustrated;
      existing.confused = existing.confused || conv.confused;
      existing.conversationIds.push(conv.conversationId);
    }
  });

  const uniquePeople = Array.from(personMap.values());
  const totalPeople = uniquePeople.length;
  
  // Log person identification results
  const clientCount = uniquePeople.filter(p => p.personType === 'client').length;
  const maidCount = uniquePeople.filter(p => p.personType === 'maid').length;
  const unknownCount = uniquePeople.filter(p => p.personType === 'unknown').length;
  console.log(`[Chat Storage] Person identification: ${clientCount} clients, ${maidCount} maids, ${unknownCount} unknown (${totalPeople} total people)`);
  
  // Log people with multiple conversations
  const multipleConversations = uniquePeople.filter(p => p.conversationIds.length > 1);
  if (multipleConversations.length > 0) {
    console.log(`[Chat Storage] ${multipleConversations.length} people have multiple conversations`);
  }

  // Calculate frustration as count and percentage based on unique people
  const frustratedPeopleCount = uniquePeople.filter(person => person.frustrated).length;
  const frustrationPercentage = totalPeople > 0 
    ? Math.round((frustratedPeopleCount / totalPeople) * 100)
    : 0;
  
  // Calculate confusion as count and percentage based on unique people
  const confusedPeopleCount = uniquePeople.filter(person => person.confused).length;
  const confusionPercentage = totalPeople > 0 
    ? Math.round((confusedPeopleCount / totalPeople) * 100)
    : 0;

  // Convert deduplicated conversations to ChatAnalysisResult format for storage
  const results: ChatAnalysisResult[] = deduplicatedConversations.map(conv => ({
    conversationId: conv.conversationId,
    frustrated: conv.frustrated,
    confused: conv.confused,
    mainIssues: conv.mainIssues,
    keyPhrases: conv.keyPhrases,
    analysisDate: conv.chatStartDateTime || new Date().toISOString(),
    service: conv.service,
    skill: conv.skill,
  }));
  
  // Log first result to verify service/skill are preserved
  if (results.length > 0) {
    console.log('[Chat Storage] Sample result after mapping:', {
      conversationId: results[0].conversationId,
      service: results[0].service,
      skill: results[0].skill,
    });
  }

  // Get historical trend data for the last 14 days
  const trendData = await getChatTrendData(analysisDate, 14);

  // Calculate previous day scores for trend comparison
  const previousDay = new Date(analysisDate);
  previousDay.setDate(previousDay.getDate() - 1);
  const previousDayData = await getDailyChatAnalysisData(previousDay.toISOString().split('T')[0]);
  
  const previousFrustration = previousDayData?.overallMetrics.frustrationPercentage || frustrationPercentage;
  const previousConfusion = previousDayData?.overallMetrics.confusionPercentage || confusionPercentage;

  // Analyze drivers from all conversations
  const frustrationDrivers = analyzeFrustrationDrivers(results);
  const confusionDrivers = analyzeConfusionDrivers(results);

  return {
    lastUpdated: new Date().toISOString(),
    analysisDate,
    overallMetrics: {
      frustratedCount: frustratedPeopleCount,
      frustrationPercentage,
      confusedCount: confusedPeopleCount,
      confusionPercentage,
      totalConversations: totalPeople, // Now represents total unique people (clients + maids)
      analysedConversations: totalPeople, // Now represents analyzed unique people
    },
    trends: {
      frustration: {
        current: frustrationPercentage,
        previous: previousFrustration,
        direction: frustrationPercentage > previousFrustration ? 'increasing' : 
                  frustrationPercentage < previousFrustration ? 'decreasing' : 'stable',
      },
      confusion: {
        current: confusionPercentage,
        previous: previousConfusion,
        direction: confusionPercentage > previousConfusion ? 'increasing' : 
                  confusionPercentage < previousConfusion ? 'decreasing' : 'stable',
      },
    },
    trendData,
    insights: {
      frustration: {
        mainIssue: identifyMainFrustrationIssue(frustrationDrivers),
        topDrivers: frustrationDrivers.slice(0, 4),
      },
      confusion: {
        mainIssue: identifyMainConfusionIssue(confusionDrivers),
        topDrivers: confusionDrivers.slice(0, 4),
      },
    },
    conversationResults: results,
  };
}

/**
 * Create empty chat analysis data structure
 */
function createEmptyChatAnalysisData(analysisDate: string): ChatAnalysisData {
  return {
    lastUpdated: new Date().toISOString(),
    analysisDate,
    overallMetrics: {
      frustratedCount: 0,
      frustrationPercentage: 0,
      confusedCount: 0,
      confusionPercentage: 0,
      totalConversations: 0,
      analysedConversations: 0,
    },
    trends: {
      frustration: {
        current: 0,
        previous: 0,
        direction: 'stable',
      },
      confusion: {
        current: 0,
        previous: 0,
        direction: 'stable',
      },
    },
    trendData: [],
    insights: {
      frustration: {
        mainIssue: {
          title: 'No Data Available',
          description: 'No conversation data has been analyzed yet.',
          impact: 0,
          trending: 'stable',
        },
        topDrivers: [],
      },
      confusion: {
        mainIssue: {
          title: 'No Data Available',
          description: 'No conversation data has been analyzed yet.',
          impact: 0,
          trending: 'stable',
        },
        topDrivers: [],
      },
    },
    conversationResults: [],
  };
}


/**
 * Analyze frustration drivers from conversation results
 */
function analyzeFrustrationDrivers(results: ChatAnalysisResult[]): ChatDriver[] {
  const issueMap = new Map<string, { count: number, frustratedCount: number }>();
  
  // Only analyze frustrated conversations
  const frustratedResults = results.filter(r => r.frustrated);
  
  if (frustratedResults.length === 0) return [];
  
  frustratedResults.forEach(result => {
    result.mainIssues.forEach(issue => {
      const current = issueMap.get(issue) || { count: 0, frustratedCount: 0 };
      issueMap.set(issue, {
        count: current.count + 1,
        frustratedCount: current.frustratedCount + 1,
      });
    });
  });
  
  return Array.from(issueMap.entries())
    .map(([issue, data]) => ({
      issue,
      impact: Math.round((data.count / frustratedResults.length) * 100),
      frequency: data.count,
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

/**
 * Analyze confusion drivers from conversation results
 */
function analyzeConfusionDrivers(results: ChatAnalysisResult[]): ChatDriver[] {
  const issueMap = new Map<string, { count: number, confusedCount: number }>();
  
  // Only analyze confused conversations
  const confusedResults = results.filter(r => r.confused);
  
  if (confusedResults.length === 0) return [];
  
  confusedResults.forEach(result => {
    result.mainIssues.forEach(issue => {
      const current = issueMap.get(issue) || { count: 0, confusedCount: 0 };
      issueMap.set(issue, {
        count: current.count + 1,
        confusedCount: current.confusedCount + 1,
      });
    });
  });
  
  return Array.from(issueMap.entries())
    .map(([issue, data]) => ({
      issue,
      impact: Math.round((data.count / confusedResults.length) * 100),
      frequency: data.count,
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

/**
 * Identify the main frustration issue
 */
function identifyMainFrustrationIssue(drivers: ChatDriver[]): ChatInsight {
  if (drivers.length === 0) {
    return {
      title: 'No Issues Identified',
      description: 'No frustration patterns have been detected in the analyzed conversations.',
      impact: 0,
      trending: 'stable',
    };
  }
  
  const topDriver = drivers[0];
  return {
    title: topDriver.issue,
    description: `This issue appears in ${topDriver.frequency} conversations and has a ${topDriver.impact}% impact on overall frustration levels.`,
    impact: topDriver.impact,
    trending: 'up', // This would be calculated from historical data in a real implementation
  };
}

/**
 * Identify the main confusion issue
 */
function identifyMainConfusionIssue(drivers: ChatDriver[]): ChatInsight {
  if (drivers.length === 0) {
    return {
      title: 'No Issues Identified',
      description: 'No confusion patterns have been detected in the analyzed conversations.',
      impact: 0,
      trending: 'stable',
    };
  }
  
  const topDriver = drivers[0];
  return {
    title: topDriver.issue,
    description: `This issue appears in ${topDriver.frequency} conversations and has a ${topDriver.impact}% impact on overall confusion levels.`,
    impact: topDriver.impact,
    trending: 'up', // This would be calculated from historical data in a real implementation
  };
}

/**
 * Clear all chat analysis data from blob storage
 */
export async function clearChatAnalysisData(): Promise<void> {
  try {
    const { blobs } = await list({ prefix: CHAT_BLOB_PREFIX });
    
    for (const blob of blobs) {
      await del(blob.url);
    }
  } catch (error) {
    console.error('Error clearing chat analysis data:', error);
    throw error;
  }
}

// ============================================================
// DELAY TIME FUNCTIONS
// ============================================================

/**
 * Parse delay time from DD:HH:MM:SS format to seconds
 */
function parseDelayToSeconds(delayStr: string): number {
  const parts = delayStr.split(':').map(Number);
  
  if (parts.length === 4) {
    const [days, hours, minutes, seconds] = parts;
    return (days * 86400) + (hours * 3600) + (minutes * 60) + seconds;
  }
  
  return 0;
}

/**
 * Parse response time from HH:MM:SS format to seconds
 */
function parseResponseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return (hours * 3600) + (minutes * 60) + seconds;
  }
  
  return 0;
}

/**
 * Format seconds to HH:MM:SS
 */
function formatSecondsToTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate median from array of numbers
 */
function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  
  return sorted[mid];
}

/**
 * Process and aggregate delay time records (legacy format)
 */
export function processDelayTimeRecords(
  records: AgentDelayRecord[],
  analysisDate: string
): DelayTimeData {
  if (records.length === 0) {
    return {
      lastUpdated: new Date().toISOString(),
      analysisDate,
      agentStats: [],
    };
  }

  // Group by agent
  const agentMap = new Map<string, { delays: number[], noReplyCount: number }>();
  const allDelays: number[] = [];

  records.forEach(record => {
    const delaySeconds = parseDelayToSeconds(record.avgDelayDdHhMmSs);
    allDelays.push(delaySeconds);

    if (!agentMap.has(record.agentFullName)) {
      agentMap.set(record.agentFullName, { delays: [], noReplyCount: 0 });
    }

    const agentData = agentMap.get(record.agentFullName)!;
    agentData.delays.push(delaySeconds);
    
    if (record.endedWithConsumerNoReply.toLowerCase() === 'yes') {
      agentData.noReplyCount++;
    }
  });

  // Calculate per-agent stats
  const agentStats: AgentDelayStats[] = Array.from(agentMap.entries())
    .map(([agentName, data]) => {
      const avgDelaySeconds = Math.round(
        data.delays.reduce((sum, d) => sum + d, 0) / data.delays.length
      );
      
      return {
        agentName,
        avgDelaySeconds,
        avgDelayFormatted: formatSecondsToTime(avgDelaySeconds),
      };
    })
    .sort((a, b) => b.avgDelaySeconds - a.avgDelaySeconds); // Sort by slowest first

  return {
    lastUpdated: new Date().toISOString(),
    analysisDate,
    agentStats,
  };
}

/**
 * Process per-agent response time records (new format)
 * Filters out "Total" entries as they represent daily average
 */
export function processAgentResponseTimeRecords(
  records: AgentResponseTimeRecord[],
  analysisDate: string
): DelayTimeData {
  if (records.length === 0) {
    return {
      lastUpdated: new Date().toISOString(),
      analysisDate,
      agentStats: [],
    };
  }

  // Filter out "Total" entries and process per-agent data
  const agentStats: AgentDelayStats[] = records
    .filter(record => record.AGENT_FULL_NAME !== 'Total')
    .map(record => {
      const delaySeconds = parseResponseTimeToSeconds(record.AVG_ADJUSTED_RESPONSE_TIME);
      
      return {
        agentName: record.AGENT_FULL_NAME,
        avgDelaySeconds: delaySeconds,
        avgDelayFormatted: record.AVG_ADJUSTED_RESPONSE_TIME, // Already in HH:MM:SS format
      };
    })
    .sort((a, b) => a.avgDelaySeconds - b.avgDelaySeconds); // Sort by fastest first

  return {
    lastUpdated: new Date().toISOString(),
    analysisDate,
    agentStats,
  };
}

/**
 * Save delay time data to blob storage
 */
export async function saveDelayTimeData(data: DelayTimeData): Promise<void> {
  // Save with date-specific filename
  const dateBlobName = `${DELAY_BLOB_PREFIX}/daily/${data.analysisDate}.json`;
  
  // Delete existing blob if it exists, then save new one
  try {
    const { blobs } = await list({ prefix: dateBlobName });
    if (blobs.length > 0) {
      await del(blobs[0].url);
    }
  } catch (error) {
    // Ignore errors if blob doesn't exist
  }
  
  await put(dateBlobName, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
  });
  
  // Also save as latest for dashboard
  const latestBlobName = `${DELAY_BLOB_PREFIX}/latest.json`;
  
  try {
    const { blobs } = await list({ prefix: latestBlobName });
    if (blobs.length > 0) {
      await del(blobs[0].url);
    }
  } catch (error) {
    // Ignore errors if blob doesn't exist
  }
  
  await put(latestBlobName, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
  });
}

/**
 * Get the latest delay time data from blob storage
 */
export async function getLatestDelayTimeData(): Promise<DelayTimeData | null> {
  try {
    // List blobs to find the latest.json file
    const { blobs } = await list({
      prefix: 'delay-time/latest.json',
    });
    
    if (blobs.length === 0) {
      console.log('[Chat Storage] No latest delay time data found');
      return null;
    }
    
    const response = await fetch(blobs[0].url);
    
    if (!response.ok) {
      console.error('[Chat Storage] Failed to fetch latest delay time:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data as DelayTimeData;
  } catch (error) {
    console.error('[Chat Storage] Error fetching latest delay time data:', error);
    return null;
  }
}

/**
 * Get delay time data for a specific date
 */
export async function getDailyDelayTimeData(date: string): Promise<DelayTimeData | null> {
  try {
    // List blobs to find the exact URL
    const { blobs } = await list({
      prefix: `delay-time/daily/${date}.json`,
    });
    
    if (blobs.length === 0) {
      console.log(`[Chat Storage] No delay time data found for date: ${date}`);
      return null;
    }
    
    const response = await fetch(blobs[0].url);
    
    if (!response.ok) {
      console.error(`[Chat Storage] Failed to fetch delay time data for ${date}:`, response.status);
      return null;
    }
    
    const data = await response.json();
    return data as DelayTimeData;
  } catch (error) {
    console.error(`[Chat Storage] Error fetching delay time data for ${date}:`, error);
    return null;
  }
}
