import { put, list, del } from '@vercel/blob';
import type { 
  ChatAnalysisData, 
  ChatAnalysisResult, 
  ChatTrendData, 
  ChatDriver, 
  ChatInsight,
  DelayTimeData,
  AgentDelayRecord,
  AgentDelayStats
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
  }>,
  analysisDate: string
): Promise<ChatAnalysisData> {
  if (conversations.length === 0) {
    return createEmptyChatAnalysisData(analysisDate);
  }

  // Calculate frustration as count and percentage
  const frustratedCount = conversations.filter(conv => conv.frustrated).length;
  const frustrationPercentage = conversations.length > 0 
    ? Math.round((frustratedCount / conversations.length) * 100)
    : 0;
  
  // Calculate confusion as count and percentage
  const confusedCount = conversations.filter(conv => conv.confused).length;
  const confusionPercentage = conversations.length > 0 
    ? Math.round((confusedCount / conversations.length) * 100)
    : 0;

  // Convert conversations to ChatAnalysisResult format for storage
  const results: ChatAnalysisResult[] = conversations.map(conv => ({
    conversationId: conv.conversationId,
    frustrated: conv.frustrated,
    confused: conv.confused,
    mainIssues: conv.mainIssues,
    keyPhrases: conv.keyPhrases,
    analysisDate: conv.chatStartDateTime || new Date().toISOString(),
    service: conv.service,
    skill: conv.skill,
  }));

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
      frustratedCount,
      frustrationPercentage,
      confusedCount,
      confusionPercentage,
      totalConversations: results.length,
      analysedConversations: results.length,
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
 * Process and aggregate delay time records
 */
export function processDelayTimeRecords(
  records: AgentDelayRecord[],
  analysisDate: string
): DelayTimeData {
  if (records.length === 0) {
    return {
      lastUpdated: new Date().toISOString(),
      analysisDate,
      overallAvgDelaySeconds: 0,
      overallAvgDelayFormatted: '00:00:00',
      medianDelaySeconds: 0,
      medianDelayFormatted: '00:00:00',
      totalConversations: 0,
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

  // Calculate overall metrics
  const overallAvgDelaySeconds = Math.round(
    allDelays.reduce((sum, d) => sum + d, 0) / allDelays.length
  );
  const medianDelaySeconds = Math.round(calculateMedian(allDelays));

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
        conversationCount: data.delays.length,
        noReplyCount: data.noReplyCount,
      };
    })
    .sort((a, b) => b.avgDelaySeconds - a.avgDelaySeconds); // Sort by slowest first

  return {
    lastUpdated: new Date().toISOString(),
    analysisDate,
    overallAvgDelaySeconds,
    overallAvgDelayFormatted: formatSecondsToTime(overallAvgDelaySeconds),
    medianDelaySeconds,
    medianDelayFormatted: formatSecondsToTime(medianDelaySeconds),
    totalConversations: records.length,
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
