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
  
  // When this config was last updated
  lastUpdated: string;
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
  
  lastUpdated: new Date().toISOString()
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

// Simple local storage functions
let currentConfig: PnLConfig = { ...DEFAULT_PNL_CONFIG };

export function getPnLConfig(): PnLConfig {
  return { ...currentConfig };
}

export function updatePnLConfig(newConfig: Partial<PnLConfig>): PnLConfig {
  currentConfig = {
    ...currentConfig,
    ...newConfig,
    lastUpdated: new Date().toISOString()
  };
  return { ...currentConfig };
}

export function resetPnLConfig(): PnLConfig {
  currentConfig = { ...DEFAULT_PNL_CONFIG };
  return { ...currentConfig };
}
