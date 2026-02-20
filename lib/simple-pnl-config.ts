/**
 * Simple P&L Configuration System
 * Just static prices that can be edited and saved locally
 */

export interface ServicePricing {
  unitCost: number;      // What it costs your company
  serviceFee: number;    // Markup you charge customers
  // Total price = unitCost + serviceFee
}

export interface PnLConfig {
  // Service pricing
  oec: ServicePricing;
  owwa: ServicePricing;
  ttl: ServicePricing;
  ttlSingle: ServicePricing;
  ttlDouble: ServicePricing;
  ttlMultiple: ServicePricing;
  tte: ServicePricing;
  tteSingle: ServicePricing;
  tteDouble: ServicePricing;
  tteMultiple: ServicePricing;
  ttj: ServicePricing;
  schengen: ServicePricing;
  gcc: ServicePricing;
  ethiopianPP: ServicePricing;
  filipinaPP: ServicePricing;
  
  // Fixed monthly costs
  fixedCosts: {
    laborCost: number;
    llm: number;
    proTransportation: number;
  };
  
  // When this config becomes effective (YYYY-MM-DD)
  effectiveDate: string;
  // When this config was created
  createdAt: string;
}

export interface PnLConfigHistory {
  configs: PnLConfig[];
}

// Default configuration with your current prices
export const DEFAULT_PNL_CONFIG: PnLConfig = {
  oec: { unitCost: 61.5, serviceFee: 0 },
  owwa: { unitCost: 92, serviceFee: 0 },
  ttl: { unitCost: 400, serviceFee: 0 },
  ttlSingle: { unitCost: 425, serviceFee: 0 },
  ttlDouble: { unitCost: 565, serviceFee: 0 },
  ttlMultiple: { unitCost: 745, serviceFee: 0 },
  tte: { unitCost: 400, serviceFee: 0 },
  tteSingle: { unitCost: 470, serviceFee: 0 },
  tteDouble: { unitCost: 520, serviceFee: 0 },
  tteMultiple: { unitCost: 570, serviceFee: 0 },
  ttj: { unitCost: 320, serviceFee: 0 },
  schengen: { unitCost: 0, serviceFee: 0 },
  gcc: { unitCost: 220, serviceFee: 0 },
  ethiopianPP: { unitCost: 1330, serviceFee: 0 },
  filipinaPP: { unitCost: 0, serviceFee: 0 },
  
  fixedCosts: {
    laborCost: 55000,
    llm: 3650,
    proTransportation: 2070
  },
  
  effectiveDate: '2024-01-01', // Applies to all historical data before any changes
  createdAt: new Date().toISOString()
};

// Service names for display
export const SERVICE_NAMES = {
  oec: 'OEC',
  owwa: 'OWWA',
  ttl: 'Travel to Lebanon (General)',
  ttlSingle: 'Tourist Visa to Lebanon – Single Entry',
  ttlDouble: 'Tourist Visa to Lebanon – Double Entry',
  ttlMultiple: 'Tourist Visa to Lebanon – Multiple Entry',
  tte: 'Travel to Egypt (General)',
  tteSingle: 'Tourist Visa to Egypt – Single Entry',
  tteMultiple: 'Tourist Visa to Egypt – Multiple Entry',
  ttj: 'Travel to Jordan',
  schengen: 'Schengen Visa',
  gcc: 'GCC Countries',
  ethiopianPP: 'Ethiopian Passport Renewal',
  filipinaPP: 'Filipina Passport Renewal'
};

// Configuration history storage
let configHistory: PnLConfigHistory = {
  configs: [{ ...DEFAULT_PNL_CONFIG }]
};

export function getPnLConfigHistory(): PnLConfigHistory {
  return { configs: [...configHistory.configs] };
}

export function getCurrentPnLConfig(): PnLConfig {
  // Return the most recent config
  const configs = configHistory.configs;
  return { ...configs[configs.length - 1] };
}

export function getPnLConfigForDate(date: string): PnLConfig {
  // Find the config that was effective for the given date
  // Use the most recent config that has effectiveDate <= date
  const configs = [...configHistory.configs].sort((a, b) => 
    a.effectiveDate.localeCompare(b.effectiveDate)
  );
  
  for (let i = configs.length - 1; i >= 0; i--) {
    if (configs[i].effectiveDate <= date) {
      return { ...configs[i] };
    }
  }
  
  // Fallback to first config if no match found
  return { ...configs[0] };
}

export function addPnLConfig(configData: Omit<PnLConfig, 'effectiveDate' | 'createdAt'>): PnLConfig {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const newConfig: PnLConfig = {
    ...configData,
    effectiveDate: today,
    createdAt: new Date().toISOString()
  };
  
  configHistory.configs.push(newConfig);
  
  // Sort by effective date
  configHistory.configs.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  
  console.log(`[P&L Config] Added new config effective from ${today}`);
  return { ...newConfig };
}

export function resetPnLConfig(): PnLConfigHistory {
  configHistory = {
    configs: [{ ...DEFAULT_PNL_CONFIG }]
  };
  return { ...configHistory };
}
