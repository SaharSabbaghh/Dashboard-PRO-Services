// Shared types used across the application

export interface ProspectDetail {
  id: string;
  conversationId: string;
  chatStartDateTime: string;
  maidId: string;
  clientId: string;
  contractId?: string;
  maidName?: string;
  clientName?: string;
  contractType?: string;
  isOECProspect: boolean;
  isOECProspectConfidence?: number;
  oecConverted?: boolean;
  oecConvertedConfidence?: number;
  isOWWAProspect: boolean;
  isOWWAProspectConfidence?: number;
  owwaConverted?: boolean;
  owwaConvertedConfidence?: number;
  isTravelVisaProspect: boolean;
  isTravelVisaProspectConfidence?: number;
  travelVisaCountries: string[];
  travelVisaConverted?: boolean;
  travelVisaConvertedConfidence?: number;
  isFilipinaPassportRenewalProspect?: boolean;
  isFilipinaPassportRenewalProspectConfidence?: number;
  filipinaPassportRenewalConverted?: boolean;
  isEthiopianPassportRenewalProspect?: boolean;
  isEthiopianPassportRenewalProspectConfidence?: number;
  ethiopianPassportRenewalConverted?: boolean;
}

export interface HouseholdGroup {
  householdId: string;
  contractId: string;
  members: ProspectDetail[];
  hasClient: boolean;
  hasMaid: boolean;
  clientName: string;
  maidNames: string[];
  isProspect: boolean;
  prospectTypes: {
    oec: boolean;
    owwa: boolean;
    travelVisa: boolean;
  };
  conversions: {
    oec: boolean;
    owwa: boolean;
    travelVisa: boolean;
  };
}

export interface ContractTypeBreakdown {
  oec: number;
  owwa: number;
  travelVisa: number;
}

export interface ByContractType {
  CC: ContractTypeBreakdown;
  MV: ContractTypeBreakdown;
}

export interface Conversions {
  oec: number;
  owwa: number;
  travelVisa: number;
  filipinaPassportRenewal: number;
  ethiopianPassportRenewal: number;
  overseas?: number; // Sales tracked via To Dos
}
}

export interface OverseasSalesSummary {
  totalSales: number;
  totalRawTodos: number;
  salesByMonth: Record<string, number>;
  lastUpdated: string | null;
}

export interface Prospects {
  oec: number;
  owwa: number;
  travelVisa: number;
  filipinaPassportRenewal: number;
  ethiopianPassportRenewal: number;
}

export interface LatestRun {
  totalCost: number;
  failureCount: number;
  successCount: number;
}

export interface Results {
  totalProcessed: number;
  totalConversations: number;
  isProcessing: boolean;
  prospects: Prospects;
  conversions?: Conversions;
  countryCounts: Record<string, number>;
  byContractType?: ByContractType;
  lastUpdated?: string;
  date?: string;
  fileName?: string;
  latestRun?: LatestRun;
  prospectDetails?: ProspectDetail[];
  households?: HouseholdGroup[];
}

// Service filter type
export type ServiceFilter = 'oec' | 'owwa' | 'travelVisa';

// Common chart colors
export const CHART_COLORS = {
  // Service colors
  oec: '#b45309',       // amber-700
  owwa: '#7c3aed',      // violet-600
  travelVisa: '#2563eb', // blue-600
  
  // Entity colors (who is asking)
  entity: {
    maid: '#6db39f',      // soft sage green
    client: '#8ecae6',    // soft sky blue
    household: '#e5c07b', // soft golden/tan
  },
  
  // Contract type colors
  contract: {
    cc: '#e5a855',  // warm orange/amber pastel
    mv: '#8ecae6',  // blue pastel
  },
} as const;

// Service labels
export const SERVICE_LABELS: Record<ServiceFilter, string> = {
  oec: 'OEC',
  owwa: 'OWWA',
  travelVisa: 'Travel Visa',
};

