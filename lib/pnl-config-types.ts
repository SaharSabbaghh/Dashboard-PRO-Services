/**
 * P&L Configuration Types
 * Configuration history system - each change is timestamped and applies from that date forward
 */

export interface ServiceConfig {
  unitCost: number; // Actual cost to the company per unit (e.g., government fees, processing costs)
  serviceFee?: number; // Optional service fee (markup) charged to customer
  // Revenue = (unitCost + serviceFee) × volume
  // Gross Profit = serviceFee × volume
}

export interface FixedCosts {
  laborCost: number; // Monthly labor cost
  llm: number; // Monthly LLM cost
  proTransportation: number; // Monthly PRO transportation cost
}

export interface PnLConfigSnapshot {
  effectiveDate: string; // ISO date string - config applies from this date forward
  updatedAt: string; // When this config was created
  updatedBy?: string; // Optional: who made the change
  services: {
    oec: ServiceConfig;
    owwa: ServiceConfig;
    ttl: ServiceConfig;
    ttlSingle: ServiceConfig;    // Tourist Visa to Lebanon – Single Entry
    ttlDouble: ServiceConfig;    // Tourist Visa to Lebanon – Double Entry
    ttlMultiple: ServiceConfig;  // Tourist Visa to Lebanon – Multiple Entry
    tte: ServiceConfig;
    tteSingle: ServiceConfig;    // Tourist Visa to Egypt – Single Entry
    tteMultiple: ServiceConfig;  // Tourist Visa to Egypt – Multiple Entry
    ttj: ServiceConfig;
    schengen: ServiceConfig;
    gcc: ServiceConfig;
    ethiopianPP: ServiceConfig;
    filipinaPP: ServiceConfig;
  };
  fixedCosts: FixedCosts; // Monthly fixed costs
}

export interface PnLConfigHistory {
  configurations: PnLConfigSnapshot[]; // Sorted by effectiveDate (oldest first)
}

/**
 * Get the active configuration for a specific date
 */
export function getConfigForDate(history: PnLConfigHistory, date: string): PnLConfigSnapshot {
  // Find the most recent config that was effective on or before the given date
  const sortedConfigs = [...history.configurations].sort((a, b) => 
    a.effectiveDate.localeCompare(b.effectiveDate)
  );
  
  for (let i = sortedConfigs.length - 1; i >= 0; i--) {
    if (sortedConfigs[i].effectiveDate <= date) {
      return sortedConfigs[i];
    }
  }
  
  // If no config found, return the first one (oldest)
  return sortedConfigs[0] || DEFAULT_CONFIG_SNAPSHOT;
}

/**
 * Default initial configuration
 * unitCost = actual cost to company
 * serviceFee = markup charged to customer
 * Revenue = (unitCost + serviceFee) × volume
 */
export const DEFAULT_CONFIG_SNAPSHOT: PnLConfigSnapshot = {
  effectiveDate: '2024-01-01', // Apply to all historical data before any custom config
  updatedAt: new Date().toISOString(),
  services: {
    oec: { unitCost: 61.5, serviceFee: 0 },      // Customer pays 61.5 AED
    owwa: { unitCost: 92, serviceFee: 0 },       // Customer pays 92 AED
    ttl: { unitCost: 400, serviceFee: 0 },       // Customer pays 400 AED (fallback)
    ttlSingle: { unitCost: 425, serviceFee: 0 }, // Tourist Visa to Lebanon – Single Entry
    ttlDouble: { unitCost: 565, serviceFee: 0 }, // Tourist Visa to Lebanon – Double Entry
    ttlMultiple: { unitCost: 745, serviceFee: 0 }, // Tourist Visa to Lebanon – Multiple Entry
    tte: { unitCost: 400, serviceFee: 0 },       // Customer pays 400 AED (fallback)
    tteSingle: { unitCost: 470, serviceFee: 0 }, // Tourist Visa to Egypt – Single Entry
    tteMultiple: { unitCost: 570, serviceFee: 0 }, // Tourist Visa to Egypt – Multiple Entry
    ttj: { unitCost: 320, serviceFee: 0 },       // Customer pays 320 AED
    schengen: { unitCost: 0, serviceFee: 0 },    // Customer pays 0 AED
    gcc: { unitCost: 220, serviceFee: 0 },       // Customer pays 220 AED
    ethiopianPP: { unitCost: 1330, serviceFee: 0 }, // Customer pays 1330 AED
    filipinaPP: { unitCost: 0, serviceFee: 0 }   // Customer pays 0 AED
  },
  fixedCosts: {
    laborCost: 55000,
    llm: 3650,
    proTransportation: 2070
  }
};

export const DEFAULT_CONFIG_HISTORY: PnLConfigHistory = {
  configurations: [DEFAULT_CONFIG_SNAPSHOT]
};

