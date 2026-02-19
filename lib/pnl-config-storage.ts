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
  try {
    const { blobs } = await list({ prefix: CONFIG_BLOB_PATH, limit: 1 });

    if (blobs.length === 0) {
      console.log('[P&L Config] No existing config found, using default configuration');
      return DEFAULT_CONFIG_HISTORY;
    }

    const response = await fetch(blobs[0].url, { cache: 'no-store' });
    
    if (!response.ok) {
      console.error(`[P&L Config] Failed to fetch config blob: ${response.status} ${response.statusText}`);
      if (response.status === 403) {
        console.error('[P&L Config] Access Forbidden (403). Ensure BLOB_READ_WRITE_TOKEN is set and valid, and blob is public.');
      }
      return DEFAULT_CONFIG_HISTORY;
    }

    const data = await response.json() as PnLConfigHistory;
    
    // Validate the data structure
    if (!data.configurations || !Array.isArray(data.configurations)) {
      console.error('[P&L Config] Invalid config structure, using default');
      return DEFAULT_CONFIG_HISTORY;
    }
    
    console.log(`[P&L Config] Successfully loaded ${data.configurations.length} configurations from blob`);
    return data;
  } catch (error) {
    console.error('[P&L Config] Error fetching P&L config:', error);
    console.log('[P&L Config] Falling back to default configuration');
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
  try {
    await put(CONFIG_BLOB_PATH, JSON.stringify(history, null, 2), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });
  } catch (error) {
    console.error('Error saving P&L config:', error);
    throw new Error('Failed to save P&L configuration');
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

