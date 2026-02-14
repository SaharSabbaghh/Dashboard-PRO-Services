/**
 * P&L Configuration Storage
 * Manages configuration history in Vercel Blob
 */

import { put, head } from '@vercel/blob';
import type { PnLConfigHistory, PnLConfigSnapshot } from './pnl-config-types';
import { DEFAULT_CONFIG_HISTORY, getConfigForDate as getConfigForDateHelper } from './pnl-config-types';

const CONFIG_BLOB_PATH = 'pnl-config-history.json';

/**
 * Get the configuration history from blob storage
 */
export async function getPnLConfigHistory(): Promise<PnLConfigHistory> {
  try {
    // Check if config exists
    try {
      await head(CONFIG_BLOB_PATH);
    } catch {
      // Config doesn't exist, return default
      return DEFAULT_CONFIG_HISTORY;
    }

    // Fetch config from blob
    const response = await fetch(`https://${process.env.BLOB_READ_WRITE_TOKEN?.split('_')[1]}.public.blob.vercel-storage.com/${CONFIG_BLOB_PATH}`);
    
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

