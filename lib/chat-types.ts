// Chat Analysis Types

export interface ChatAnalysisResult {
  conversationId: string;
  frustrationScore: number;
  confusionScore: number;
  mainIssues: string[];
  keyPhrases: string[];
  analysisDate: string;
}

export interface ChatTrendData {
  date: string;
  frustration: number;
  confusion: number;
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
    frustrationScore: number;
    confusionScore: number;
    totalConversations: number;
    analysedConversations: number;
  };
  trends: {
    frustration: {
      current: number;
      previous: number;
      direction: 'increasing' | 'decreasing' | 'stable';
    };
    confusion: {
      current: number;
      previous: number;
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
    chatStartDateTime: string;
    frustrationScore: number; // 0-100 score from LLM analysis
    confusionScore: number; // 0-100 score from LLM analysis
    mainIssues: string[]; // Issues identified by LLM
    keyPhrases: string[]; // Key phrases extracted by LLM
    maidId?: string;
    clientId?: string;
    contractId?: string;
    maidName?: string;
    clientName?: string;
    contractType?: string;
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
