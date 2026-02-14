/**
 * P&L Configuration Types
 * Configuration history system - each change is timestamped and applies from that date forward
 */

export interface ServiceConfig {
  unitCost: number; // Cost per payment/transaction
  serviceFee?: number; // Optional additional service fee
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
 */
export const DEFAULT_CONFIG_SNAPSHOT: PnLConfigSnapshot = {
  effectiveDate: '2024-01-01', // Apply to all historical data before any custom config
  updatedAt: new Date().toISOString(),
  services: {
    oec: { unitCost: 61.5, serviceFee: 0 },
    owwa: { unitCost: 92, serviceFee: 0 },
    ttl: { unitCost: 400, serviceFee: 0 },
    tte: { unitCost: 370, serviceFee: 0 },
    ttj: { unitCost: 320, serviceFee: 0 },
    schengen: { unitCost: 0, serviceFee: 0 },
    gcc: { unitCost: 220, serviceFee: 0 },
    ethiopianPP: { unitCost: 1330, serviceFee: 0 },
    filipinaPP: { unitCost: 0, serviceFee: 0 }
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

