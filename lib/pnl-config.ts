/**
 * P&L Configuration
 * 
 * Safe, validated configuration for P&L calculations.
 * Supports local defaults, blob storage persistence, and optional remote loading with timeout/retry.
 */

import { put, list } from '@vercel/blob';
import type { PnLServiceKey } from './pnl-complaints-types';
import { ALL_SERVICE_KEYS } from './pnl-complaints-types';

const CONFIG_BLOB_KEY = 'pnl-config.json';
const CONFIG_VERSIONS_KEY = 'pnl-config-versions.json'; // Store all config versions

// ============================================================================
// Default Configuration (Safe Fallbacks)
// ============================================================================

const DEFAULT_SERVICE_COSTS: Record<PnLServiceKey, number> = {
  oec: 61.5,         // DMW fees
  owwa: 92,          // OWWA fees
  ttl: 400,          // Embassy + transportation (generic)
  ttlSingle: 425,    // Tourist Visa to Lebanon – Single Entry
  ttlDouble: 565,    // Tourist Visa to Lebanon – Double Entry
  ttlMultiple: 745,  // Tourist Visa to Lebanon – Multiple Entry
  tte: 400,          // Embassy + transportation (generic)
  tteSingle: 470,    // Tourist Visa to Egypt – Single Entry
  tteDouble: 520,    // Tourist Visa to Egypt – Double Entry
  tteMultiple: 570,  // Tourist Visa to Egypt – Multiple Entry
  ttj: 220,          // Embassy + facilitator
  schengen: 0,       // Processing fees
  gcc: 220,          // Dubai Police fees
  ethiopianPP: 1330, // Government fees
  filipinaPP: 0,     // Processing fees
};

const DEFAULT_SERVICE_FEES: Record<PnLServiceKey, number> = {
  oec: 0,
  owwa: 0,
  ttl: 0,
  ttlSingle: 0,
  ttlDouble: 0,
  ttlMultiple: 0,
  tte: 0,
  tteSingle: 0,
  tteDouble: 0,
  tteMultiple: 0,
  ttj: 0,
  schengen: 0,
  gcc: 0,
  ethiopianPP: 0,
  filipinaPP: 0,
};

const DEFAULT_MONTHLY_FIXED_COSTS = {
  laborCost: 55000,
  llm: 3650,
  proTransportation: 2070,
};

// ============================================================================
// Configuration Types
// ============================================================================

export interface PnLConfig {
  serviceCosts: Record<PnLServiceKey, number>;
  serviceFees: Record<PnLServiceKey, number>;
  monthlyFixedCosts: {
    laborCost: number;
    llm: number;
    proTransportation: number;
  };
  // Metadata
  effectiveDate?: string; // YYYY-MM-DD - when this config becomes active
  createdAt?: string; // ISO timestamp - when this config was saved
}

export interface PnLConfigLoadResult {
  success: boolean;
  config?: PnLConfig;
  error?: string;
  source?: 'default' | 'remote';
}

// ============================================================================
// Validation & Parsing
// ============================================================================

/**
 * Validate and normalize a number value
 */
function validateNumber(value: unknown, defaultValue: number, min: number = 0): number {
  if (typeof value === 'number' && !isNaN(value) && value >= min) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= min) {
      return parsed;
    }
  }
  return defaultValue;
}

/**
 * Validate service costs object
 */
function validateServiceCosts(
  raw: unknown,
  defaults: Record<PnLServiceKey, number>
): Record<PnLServiceKey, number> {
  const result = { ...defaults };
  
  if (!raw || typeof raw !== 'object') {
    return result;
  }
  
  for (const key of ALL_SERVICE_KEYS) {
    if (key in raw) {
      result[key] = validateNumber((raw as Record<string, unknown>)[key], defaults[key]);
    }
  }
  
  return result;
}

/**
 * Validate service fees object
 */
function validateServiceFees(
  raw: unknown,
  defaults: Record<PnLServiceKey, number>
): Record<PnLServiceKey, number> {
  return validateServiceCosts(raw, defaults); // Same validation logic
}

/**
 * Validate monthly fixed costs object
 */
function validateMonthlyFixedCosts(
  raw: unknown,
  defaults: typeof DEFAULT_MONTHLY_FIXED_COSTS
): typeof DEFAULT_MONTHLY_FIXED_COSTS {
  const result = { ...defaults };
  
  if (!raw || typeof raw !== 'object') {
    return result;
  }
  
  const obj = raw as Record<string, unknown>;
  
  if ('laborCost' in obj) {
    result.laborCost = validateNumber(obj.laborCost, defaults.laborCost);
  }
  if ('llm' in obj) {
    result.llm = validateNumber(obj.llm, defaults.llm);
  }
  if ('proTransportation' in obj) {
    result.proTransportation = validateNumber(obj.proTransportation, defaults.proTransportation);
  }
  
  return result;
}

/**
 * Parse and validate raw config data
 */
function parseConfig(raw: unknown): PnLConfig {
  const serviceCosts = validateServiceCosts(
    raw && typeof raw === 'object' && 'serviceCosts' in raw
      ? (raw as Record<string, unknown>).serviceCosts
      : null,
    DEFAULT_SERVICE_COSTS
  );
  
  const serviceFees = validateServiceFees(
    raw && typeof raw === 'object' && 'serviceFees' in raw
      ? (raw as Record<string, unknown>).serviceFees
      : null,
    DEFAULT_SERVICE_FEES
  );
  
  const monthlyFixedCosts = validateMonthlyFixedCosts(
    raw && typeof raw === 'object' && 'monthlyFixedCosts' in raw
      ? (raw as Record<string, unknown>).monthlyFixedCosts
      : null,
    DEFAULT_MONTHLY_FIXED_COSTS
  );
  
  return {
    serviceCosts,
    serviceFees,
    monthlyFixedCosts,
  };
}

// ============================================================================
// Safe Network Fetch with Timeout & Retries
// ============================================================================

/**
 * Fetch config from remote URL with timeout and retries
 */
async function fetchRemoteConfig(
  url: string,
  timeoutMs: number = 5000,
  maxRetries: number = 2
): Promise<PnLConfigLoadResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let timeoutId: NodeJS.Timeout | null = null;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (timeoutId) clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const config = parseConfig(data);
      
      return {
        success: true,
        config,
        source: 'remote',
      };
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        break;
      }
      
      // Log attempt (but don't throw)
      if (attempt < maxRetries) {
        console.warn(`[PnL Config] Fetch attempt ${attempt + 1} failed, retrying...`, lastError.message);
      }
    }
  }
  
  return {
    success: false,
    error: lastError?.message || 'Failed to fetch remote config',
    source: 'remote',
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get default P&L configuration (synchronous, no network calls)
 */
export function getDefaultPnLConfig(): PnLConfig {
  return {
    serviceCosts: DEFAULT_SERVICE_COSTS,
    serviceFees: DEFAULT_SERVICE_FEES,
    monthlyFixedCosts: DEFAULT_MONTHLY_FIXED_COSTS,
  };
}

/**
 * Parse config from JSON string or object
 */
export function parsePnLConfigFromJSON(raw: string | unknown): PnLConfig {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parseConfig(parsed);
  } catch (error) {
    console.error('[PnL Config] Parse error, using defaults:', error);
    return getDefaultPnLConfig();
  }
}

// ============================================================================
// Blob Storage Persistence
// ============================================================================

/**
 * Save config to blob storage with effective date
 */
export async function savePnLConfig(config: PnLConfig, effectiveDate?: string): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    // Validate config before saving
    const validated = parseConfig(config);
    
    const now = new Date();
    const effectiveDateStr = effectiveDate || now.toISOString().split('T')[0]; // Default to today
    
    const configWithMeta: PnLConfig = {
      ...validated,
      effectiveDate: effectiveDateStr,
      createdAt: now.toISOString(),
    };
    
    // Save as latest config
    await put(CONFIG_BLOB_KEY, JSON.stringify(configWithMeta, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    
    // Also save to versions list
    await saveConfigVersion(configWithMeta);
    
    console.log('[PnL Config] Saved to blob storage with effective date:', effectiveDateStr);
    
    return {
      success: true,
      message: `Config saved successfully (effective from ${effectiveDateStr})`,
    };
  } catch (error) {
    console.error('[PnL Config] Error saving config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to save config',
    };
  }
}

/**
 * Save config version to versions list
 */
async function saveConfigVersion(config: PnLConfig): Promise<void> {
  try {
    // Load existing versions
    let versions: PnLConfig[] = [];
    try {
      const { blobs } = await list({ prefix: CONFIG_VERSIONS_KEY, limit: 1 });
      if (blobs.length > 0) {
        const response = await fetch(blobs[0].url, { cache: 'no-store' });
        if (response.ok) {
          versions = await response.json();
        }
      }
    } catch {
      // No existing versions, start fresh
    }
    
    // Add new version
    versions.push(config);
    
    // Sort by effective date (newest first)
    versions.sort((a, b) => {
      const dateA = a.effectiveDate || '';
      const dateB = b.effectiveDate || '';
      return dateB.localeCompare(dateA);
    });
    
    // Keep only last 100 versions
    if (versions.length > 100) {
      versions = versions.slice(0, 100);
    }
    
    // Save versions
    await put(CONFIG_VERSIONS_KEY, JSON.stringify(versions, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
  } catch (error) {
    console.error('[PnL Config] Error saving config version:', error);
    // Don't throw - versioning is optional
  }
}

/**
 * Load config from blob storage
 */
export async function loadPnLConfigFromBlob(): Promise<{
  success: boolean;
  config?: PnLConfig;
  error?: string;
}> {
  try {
    const { blobs } = await list({ prefix: CONFIG_BLOB_KEY, limit: 1 });
    
    if (blobs.length === 0) {
      return {
        success: false,
        error: 'No config found in blob storage',
      };
    }
    
    const response = await fetch(blobs[0].url, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch config: ${response.statusText}`,
      };
    }
    
    const data = await response.json();
    const config = parseConfig(data);
    
    console.log('[PnL Config] Loaded from blob storage');
    
    return {
      success: true,
      config,
    };
  } catch (error) {
    console.error('[PnL Config] Error loading config from blob:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get config that was active on a specific date
 * Returns the most recent config with effectiveDate <= targetDate
 */
export async function getConfigForDate(targetDate: string): Promise<PnLConfig> {
  try {
    // Load all config versions
    let versions: PnLConfig[] = [];
    try {
      const { blobs } = await list({ prefix: CONFIG_VERSIONS_KEY, limit: 1 });
      if (blobs.length > 0) {
        const response = await fetch(blobs[0].url, { cache: 'no-store' });
        if (response.ok) {
          versions = await response.json();
        }
      }
    } catch {
      // No versions, try latest config
    }
    
    // If no versions, try latest config
    if (versions.length === 0) {
      const latestResult = await loadPnLConfigFromBlob();
      if (latestResult.success && latestResult.config) {
        versions = [latestResult.config];
      }
    }
    
    // Find config active on target date
    // Sort by effective date (newest first), then find first where effectiveDate <= targetDate
    const sortedVersions = [...versions].sort((a, b) => {
      const dateA = a.effectiveDate || '';
      const dateB = b.effectiveDate || '';
      return dateB.localeCompare(dateA);
    });
    
    for (const version of sortedVersions) {
      const effectiveDate = version.effectiveDate || '';
      if (!effectiveDate || effectiveDate <= targetDate) {
        console.log(`[PnL Config] Using config effective from ${effectiveDate} for date ${targetDate}`);
        return parseConfig(version);
      }
    }
    
    // Fall back to defaults if no config found
    console.log(`[PnL Config] No config found for date ${targetDate}, using defaults`);
    return getDefaultPnLConfig();
  } catch (error) {
    console.error('[PnL Config] Error getting config for date:', error);
    return getDefaultPnLConfig();
  }
}

/**
 * Get all config versions
 */
export async function getAllConfigVersions(): Promise<PnLConfig[]> {
  try {
    const { blobs } = await list({ prefix: CONFIG_VERSIONS_KEY, limit: 1 });
    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url, { cache: 'no-store' });
      if (response.ok) {
        const versions = await response.json();
        return versions.map((v: unknown) => parseConfig(v));
      }
    }
    return [];
  } catch (error) {
    console.error('[PnL Config] Error loading config versions:', error);
    return [];
  }
}

/**
 * Load P&L configuration with priority: blob storage > remote URL > defaults
 * 
 * @param remoteUrl Optional remote URL to fetch config from (if blob storage fails)
 * @param targetDate Optional date to get config active on that date (YYYY-MM-DD)
 * @returns Always returns a valid config (falls back to defaults on error)
 */
export async function loadPnLConfig(remoteUrl?: string, targetDate?: string): Promise<PnLConfig> {
  // If target date provided, get config for that specific date
  if (targetDate) {
    return getConfigForDate(targetDate);
  }
  
  // Try blob storage first (latest config)
  const blobResult = await loadPnLConfigFromBlob();
  if (blobResult.success && blobResult.config) {
    return blobResult.config;
  }
  
  // If no remote URL provided, use defaults
  if (!remoteUrl) {
    console.log('[PnL Config] Using defaults (no blob storage, no remote URL)');
    return getDefaultPnLConfig();
  }
  
  // Try to fetch from remote
  const result = await fetchRemoteConfig(remoteUrl);
  
  if (result.success && result.config) {
    console.log('[PnL Config] Loaded from remote:', remoteUrl);
    return result.config;
  }
  
  // Fall back to defaults on any error
  console.warn('[PnL Config] Using defaults (all sources failed):', result.error);
  return getDefaultPnLConfig();
}

