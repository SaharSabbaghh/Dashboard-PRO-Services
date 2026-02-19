/**
 * P&L Configuration Storage
 * Manages configuration history in Vercel Blob
 */

import { put, list } from '@vercel/blob';
import type { PnLConfigHistory, PnLConfigSnapshot } from './pnl-config-types';
import { DEFAULT_CONFIG_HISTORY, getConfigForDate as getConfigForDateHelper } from './pnl-config-types';

const CONFIG_BLOB_PATH = 'pnl-config-history.json';

/**
 * Get the configuration history from blob storage
 */
export async function getPnLConfigHistory(): Promise<PnLConfigHistory> {
  // Always return default config first, then try to load from blob if available
  console.log('[P&L Config] Loading default configuration');
  
  // Check if we're in a server environment and have blob access
  if (typeof window === 'undefined' && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({ prefix: CONFIG_BLOB_PATH, limit: 1 });

      if (blobs.length === 0) {
        console.log('[P&L Config] No custom config found, using default configuration');
        return DEFAULT_CONFIG_HISTORY;
      }

      const response = await fetch(blobs[0].url, { cache: 'no-store' });
      
      if (!response.ok) {
        console.warn(`[P&L Config] Failed to fetch custom config: ${response.status} ${response.statusText}`);
        console.log('[P&L Config] Using default configuration');
        return DEFAULT_CONFIG_HISTORY;
      }

      const data = await response.json() as PnLConfigHistory;
      
      // Validate the data structure
      if (!data.configurations || !Array.isArray(data.configurations)) {
        console.warn('[P&L Config] Invalid custom config structure, using default');
        return DEFAULT_CONFIG_HISTORY;
      }
      
      console.log(`[P&L Config] Successfully loaded ${data.configurations.length} custom configurations`);
      return data;
    } catch (error) {
      console.warn('[P&L Config] Error accessing blob storage:', error);
      console.log('[P&L Config] Using default configuration');
      return DEFAULT_CONFIG_HISTORY;
    }
  } else {
    console.log('[P&L Config] Blob storage not available, using default configuration');
    return DEFAULT_CONFIG_HISTORY;
  }
}

/**
 * Get the active configuration for a specific date
 */
export function getConfigForDate(history: PnLConfigHistory, date: string): PnLConfigSnapshot {
  return getConfigForDateHelper(history, date);
}

/**
 * Save configuration history to blob storage
 */
export async function savePnLConfigHistory(history: PnLConfigHistory): Promise<void> {
  // Only try to save if we have blob storage access
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn('[P&L Config] BLOB_READ_WRITE_TOKEN not available, cannot save configuration changes');
    throw new Error('Blob storage not configured. Configuration changes cannot be saved.');
  }

  try {
    await put(CONFIG_BLOB_PATH, JSON.stringify(history, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });
    console.log('[P&L Config] Configuration saved successfully');
  } catch (error) {
    console.error('[P&L Config] Error saving configuration:', error);
    throw new Error('Failed to save P&L configuration to blob storage');
  }
}

/**
 * Add a new configuration snapshot (applies from today forward)
 */
export async function addConfigSnapshot(snapshot: Omit<PnLConfigSnapshot, 'effectiveDate' | 'updatedAt'>): Promise<PnLConfigHistory> {
  const history = await getPnLConfigHistory();
  
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const newSnapshot: PnLConfigSnapshot = {
    ...snapshot,
    effectiveDate: today,
    updatedAt: new Date().toISOString(),
  };
  
  // Add new snapshot to history
  history.configurations.push(newSnapshot);
  
  // Sort by effective date
  history.configurations.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  
  await savePnLConfigHistory(history);
  
  return history;
}

