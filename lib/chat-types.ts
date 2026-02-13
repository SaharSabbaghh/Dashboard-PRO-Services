// Chat Analysis Types

export interface ChatAnalysisResult {
  conversationId: string;
  frustrated: boolean; // Is the customer frustrated?
  confused: boolean; // Is the customer confused?
  mainIssues: string[];
  keyPhrases: string[];
  analysisDate: string;
  service?: string; // Service type (e.g., "OEC", "travel to leb")
  skill?: string; // Skill/team (e.g., "VBC_RESOLVERS_AGENTS")
}

export interface ChatTrendData {
  date: string;
  frustrationPercentage: number; // Percentage of frustrated conversations
  confusionPercentage: number; // Percentage of confused conversations
}

export interface ChatDriver {
  issue: string;
  impact: number;
  frequency: number;
}

export interface ChatInsight {
  title: string;
  description: string;
  impact: number;
  trending: 'up' | 'down' | 'stable';
}

export interface ChatAnalysisData {
  lastUpdated: string;
  analysisDate: string; // The specific date this analysis is for (YYYY-MM-DD)
  overallMetrics: {
    frustratedCount: number; // Number of frustrated conversations
    frustrationPercentage: number; // Percentage of frustrated conversations
    confusedCount: number; // Number of confused conversations
    confusionPercentage: number; // Percentage of confused conversations
    totalConversations: number;
    analysedConversations: number;
  };
  trends: {
    frustration: {
      current: number; // Current frustration percentage
      previous: number; // Previous frustration percentage
      direction: 'increasing' | 'decreasing' | 'stable';
    };
    confusion: {
      current: number; // Current confusion percentage
      previous: number; // Previous confusion percentage
      direction: 'increasing' | 'decreasing' | 'stable';
    };
  };
  trendData: ChatTrendData[]; // Last 7-14 days of data for trend visualization
  insights: {
    frustration: {
      mainIssue: ChatInsight;
      topDrivers: ChatDriver[];
    };
    confusion: {
      mainIssue: ChatInsight;
      topDrivers: ChatDriver[];
    };
  };
  conversationResults: ChatAnalysisResult[];
}

// API Request/Response types
export interface ChatAnalysisRequest {
  analysisDate: string; // The date this analysis is for (YYYY-MM-DD)
  conversations: {
    conversationId: string;
    chatStartDateTime?: string;
    contractType?: string;
    frustrated: boolean; // Is the customer frustrated?
    confused: boolean; // Is the customer confused?
    mainIssues: string[]; // Issues identified by LLM (1 primary problem)
    keyPhrases: string[]; // Key phrases extracted by LLM
    service?: string; // Service type (e.g., "OEC", "travel to leb")
    skill?: string; // Skill/team (e.g., "VBC_RESOLVERS_AGENTS")
    maidId?: string;
    clientId?: string;
    contractId?: string;
    maidName?: string;
    clientName?: string;
  }[];
}

export interface ChatAnalysisResponse {
  success: boolean;
  message: string;
  data?: {
    analysisId: string;
    processedConversations: number;
    analysisDate: string;
  };
  error?: string;
}

export interface ChatDataResponse {
  success: boolean;
  data?: ChatAnalysisData;
  error?: string;
}

// Delay Time Types
export interface AgentDelayRecord {
  startDate: string;
  agentFullName: string;
  lastSkill: string;
  avgDelayDdHhMmSs: string; // Format: DD:HH:MM:SS
  endedWithConsumerNoReply: string; // "Yes" or "No"
}

export interface AgentDelayStats {
  agentName: string;
  avgDelaySeconds: number;
  avgDelayFormatted: string; // HH:MM:SS format
  conversationCount: number;
  noReplyCount: number;
}

export interface DelayTimeData {
  lastUpdated: string;
  analysisDate: string;
  overallAvgDelaySeconds: number;
  overallAvgDelayFormatted: string; // HH:MM:SS format
  medianDelaySeconds: number;
  medianDelayFormatted: string;
  totalConversations: number;
  agentStats: AgentDelayStats[];
}

export interface DelayTimeRequest {
  analysisDate: string;
  records: AgentDelayRecord[];
}

export interface DelayTimeResponse {
  success: boolean;
  message: string;
  data?: {
    analysisId: string;
    processedRecords: number;
    analysisDate: string;
  };
  error?: string;
}
