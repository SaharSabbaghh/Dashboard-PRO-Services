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
      return DEFAULT_CONFIG_HISTORY;
    }

    const response = await fetch(blobs[0].url, { cache: 'no-store' });
    
    if (!response.ok) {
      return DEFAULT_CONFIG_HISTORY;
    }

    const data = await response.json() as PnLConfigHistory;
    return data;
  } catch (error) {
    console.error('Error fetching P&L config:', error);
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

