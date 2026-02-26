/**
 * NPS (Net Promoter Score) Types
 */

export interface NPSScoreEntry {
  nps_score: number;
  services: Record<string, number>;
}

export interface NPSDayData {
  date: string;
  scores: NPSScoreEntry[];
}

export interface NPSRawData {
  [dateKey: string]: NPSDayData;
}

export interface NPSMetrics {
  total: number;
  promoters: number; // Scores 9-10
  detractors: number; // Scores 0-6
  passives: number; // Scores 7-8
  npsScore: number; // Calculated: ((promoters / total) - (detractors / total)) * 100
  promoterPercentage: number;
  detractorPercentage: number;
  passivePercentage: number;
  scoreDistribution: Record<number, number>; // Count for each score 0-10
}

export interface NPSServiceMetrics {
  service: string;
  metrics: NPSMetrics;
}

export interface NPSAggregatedData {
  overall: NPSMetrics;
  services: NPSServiceMetrics[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface NPSResponse {
  success: boolean;
  data?: NPSAggregatedData;
  error?: string;
}

export interface NPSDatesResponse {
  success: boolean;
  dates?: string[];
  error?: string;
}

