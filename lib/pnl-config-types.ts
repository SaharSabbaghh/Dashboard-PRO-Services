/**
 * P&L Configuration Types
 * Configuration history system - each change is timestamped and applies from that date forward
 */

export interface ServiceConfig {
  unitCost: number; // Base price charged to customer
  serviceFee?: number; // Optional additional fee charged to customer
  // Revenue = unitCost + serviceFee
  // Actual costs are defined separately in SERVICE_COSTS
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
    tte: ServiceConfig;
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
 * unitCost + serviceFee = what customer pays (revenue)
 * Actual costs are defined in SERVICE_COSTS in the P&L API
 */
export const DEFAULT_CONFIG_SNAPSHOT: PnLConfigSnapshot = {
  effectiveDate: '2024-01-01', // Apply to all historical data before any custom config
  updatedAt: new Date().toISOString(),
  services: {
    oec: { unitCost: 61.5, serviceFee: 0 },      // Customer pays 61.5
    owwa: { unitCost: 92, serviceFee: 0 },       // Customer pays 92
    ttl: { unitCost: 500, serviceFee: 0 },       // Customer pays 500
    tte: { unitCost: 420, serviceFee: 0 },       // Customer pays 420
    ttj: { unitCost: 320, serviceFee: 0 },       // Customer pays 320
    schengen: { unitCost: 450, serviceFee: 0 },  // Customer pays 450
    gcc: { unitCost: 220, serviceFee: 0 },       // Customer pays 220
    ethiopianPP: { unitCost: 1350, serviceFee: 0 }, // Customer pays 1350
    filipinaPP: { unitCost: 600, serviceFee: 0 } // Customer pays 600
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

