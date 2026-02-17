export interface ProspectMetric {
  product: string;
  count: number; // Just the daily prospect count
}

export interface OperationMetric {
  serviceType: string;
  pendingUs: number;
  pendingClient: number;
  pendingProVisit: number;
  pendingGov: number;
  doneToday: number;
  casesDelayed: number;
  delayedNotes?: string; // Optional notes about delays
}

export interface SalesMetric {
  product: string;
  dailySales: number; // Just the daily sales count
}

export interface OperationsData {
  lastUpdated: string;
  analysisDate: string; // YYYY-MM-DD format
  operations: OperationMetric[];
}

// API Request/Response types
export interface OperationsRequest {
  analysisDate: string;
  operations: OperationMetric[];
}

export interface OperationsResponse {
  success: boolean;
  data?: OperationsData;
  message: string;
  error?: string;
}

// Service mapping for consistency with other dashboards
export const OPERATIONS_SERVICE_MAPPING: Record<string, string> = {
  'OEC': 'oec',
  'OWWA': 'owwa',
  'Visa to Lebanon': 'ttl',
  'Travel to Lebanon': 'ttl',
  'Visa to Egypt': 'tte',
  'Travel to Egypt': 'tte',
  'Travel to Jordan': 'ttj',
  'Schengen': 'schengen',
  'GCC': 'gcc',
  'Ethiopian Passport Renewal': 'ethiopianPP',
  'Ethiopian passport renewal': 'ethiopianPP',
  'Filipina Passport Renewal': 'filipinaPP',
  'Filipina passport renewal': 'filipinaPP',
  'Golden Visa': 'goldenVisa',
  'Family Visa': 'familyVisa',
  'Contract verification': 'contractVerification',
  'Schengen visa': 'schengen'
};

export const SERVICE_COLORS: Record<string, string> = {
  'oec': '#3b82f6', // blue-500
  'owwa': '#10b981', // emerald-500
  'ttl': '#f59e0b', // amber-500
  'tte': '#ef4444', // red-500
  'ttj': '#8b5cf6', // violet-500
  'schengen': '#06b6d4', // cyan-500
  'gcc': '#84cc16', // lime-500
  'ethiopianPP': '#f97316', // orange-500
  'filipinaPP': '#ec4899', // pink-500
  'goldenVisa': '#fbbf24', // amber-400
  'familyVisa': '#a78bfa', // violet-400
  'contractVerification': '#6b7280' // gray-500
};
