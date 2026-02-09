// Types for P&L Complaints data ingestion and processing

// Service keys that map to P&L services
export type PnLServiceKey = 
  | 'oec' 
  | 'owwa' 
  | 'ttl' 
  | 'tte' 
  | 'ttj' 
  | 'schengen' 
  | 'gcc' 
  | 'ethiopianPP' 
  | 'filipinaPP';

// Individual complaint record from CSV/API
export interface PnLComplaint {
  contractId: string;
  housemaidId: string;
  clientId: string;
  complaintType: string;
  creationDate: string; // ISO date string
  // Derived field
  serviceKey?: PnLServiceKey;
}

// Deduplicated sale record (after 3-month rule applied)
export interface PnLComplaintSale {
  id: string;
  serviceKey: PnLServiceKey;
  contractId: string;
  clientId: string;
  housemaidId: string;
  firstSaleDate: string;
  lastSaleDate: string;
  occurrenceCount: number; // Total complaints before dedup
  // Used for tracking which complaints contributed to this sale
  complaintDates: string[];
}

// Service-level aggregated data
export interface PnLServiceSales {
  serviceKey: PnLServiceKey;
  serviceName: string;
  uniqueSales: number;
  uniqueClients: number;
  uniqueContracts: number;
  totalComplaints: number; // Before dedup
  byMonth: Record<string, number>; // "2026-01": 5
  sales: PnLComplaintSale[];
}

// Full storage structure
export interface PnLComplaintsData {
  lastUpdated: string;
  rawComplaintsCount: number;
  services: Record<PnLServiceKey, PnLServiceSales>;
  // Summary across all services
  summary: {
    totalUniqueSales: number;
    totalUniqueClients: number;
    totalUniqueContracts: number;
  };
}

// Mapping from complaint types to service keys
export const COMPLAINT_TYPE_MAP: Record<string, PnLServiceKey> = {
  // OEC
  'overseas employment certificate': 'oec',
  'overseas': 'oec',
  'oec': 'oec',
  
  // OWWA
  'client owwa registration': 'owwa',
  'owwa registration': 'owwa',
  'owwa': 'owwa',
  
  // Travel visas
  'tourist visa to lebanon': 'ttl',
  'travel to lebanon': 'ttl',
  'ttl': 'ttl',
  
  'tourist visa to egypt': 'tte',
  'travel to egypt': 'tte',
  'tte': 'tte',
  
  'tourist visa to jordan': 'ttj',
  'travel to jordan': 'ttj',
  'ttj': 'ttj',
  
  // Passport renewals
  'ethiopian passport renewal': 'ethiopianPP',
  'ethiopian pp': 'ethiopianPP',
  'ethiopian pp renewal': 'ethiopianPP',
  
  'filipina passport renewal': 'filipinaPP',
  'filipina pp': 'filipinaPP',
  'filipina pp renewal': 'filipinaPP',
  
  // GCC
  'gcc travel': 'gcc',
  'gcc': 'gcc',
  
  // Schengen
  'schengen': 'schengen',
  'schengen visa': 'schengen',
};

// Service display names
export const SERVICE_NAMES: Record<PnLServiceKey, string> = {
  oec: 'Overseas Employment Certificate',
  owwa: 'OWWA Registration',
  ttl: 'Travel to Lebanon',
  tte: 'Travel to Egypt',
  ttj: 'Travel to Jordan',
  schengen: 'Schengen Countries',
  gcc: 'GCC',
  ethiopianPP: 'Ethiopian Passport Renewal',
  filipinaPP: 'Filipina Passport Renewal',
};

// All service keys for iteration
export const ALL_SERVICE_KEYS: PnLServiceKey[] = [
  'oec',
  'owwa',
  'ttl',
  'tte',
  'ttj',
  'schengen',
  'gcc',
  'ethiopianPP',
  'filipinaPP',
];

// Get service key from complaint type (returns undefined if not a tracked service)
export function getServiceKeyFromComplaintType(complaintType: string): PnLServiceKey | undefined {
  const normalized = complaintType.toLowerCase().trim();
  return COMPLAINT_TYPE_MAP[normalized];
}

// Generate a unique key for deduplication (service + contract + client + housemaid)
export function getSaleGroupKey(complaint: PnLComplaint): string {
  const serviceKey = complaint.serviceKey || getServiceKeyFromComplaintType(complaint.complaintType);
  return `${serviceKey || 'unknown'}_${complaint.contractId || 'no-contract'}_${complaint.clientId || 'no-client'}_${complaint.housemaidId || 'no-housemaid'}`;
}

// Check if two dates are within 3 months of each other
export function isWithinThreeMonths(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return false;
  }
  
  // Calculate difference in months
  const monthsDiff = Math.abs(
    (d2.getFullYear() - d1.getFullYear()) * 12 + 
    (d2.getMonth() - d1.getMonth())
  );
  
  // If less than 3 full months
  if (monthsDiff < 3) {
    return true;
  }
  
  // If exactly 3 months, compare the day of month
  if (monthsDiff === 3) {
    const laterDate = d1 > d2 ? d1 : d2;
    const earlierDate = d1 > d2 ? d2 : d1;
    
    // Calculate exact 3 months from earlier date
    const threeMonthsLater = new Date(earlierDate);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    
    return laterDate < threeMonthsLater;
  }
  
  return false;
}

// Create empty service sales structure
export function createEmptyServiceSales(serviceKey: PnLServiceKey): PnLServiceSales {
  return {
    serviceKey,
    serviceName: SERVICE_NAMES[serviceKey],
    uniqueSales: 0,
    uniqueClients: 0,
    uniqueContracts: 0,
    totalComplaints: 0,
    byMonth: {},
    sales: [],
  };
}

// Create empty complaints data structure
export function createEmptyComplaintsData(): PnLComplaintsData {
  const services: Record<PnLServiceKey, PnLServiceSales> = {} as Record<PnLServiceKey, PnLServiceSales>;
  
  for (const key of ALL_SERVICE_KEYS) {
    services[key] = createEmptyServiceSales(key);
  }
  
  return {
    lastUpdated: new Date().toISOString(),
    rawComplaintsCount: 0,
    services,
    summary: {
      totalUniqueSales: 0,
      totalUniqueClients: 0,
      totalUniqueContracts: 0,
    },
  };
}

