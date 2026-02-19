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
  console.log('[P&L Config] Loading configuration...');
  
  // Only try loading custom config on server side
  if (typeof window === 'undefined') {
    console.log('[P&L Config] Running on server side, checking for custom config...');
    // Try blob storage first
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { blobs } = await list({ prefix: CONFIG_BLOB_PATH, limit: 1 });

        if (blobs.length > 0) {
          const response = await fetch(blobs[0].url, { cache: 'no-store' });
          
          if (response.ok) {
            const data = await response.json() as PnLConfigHistory;
            
            if (data.configurations && Array.isArray(data.configurations)) {
              console.log(`[P&L Config] Successfully loaded ${data.configurations.length} configurations from blob storage`);
              return data;
            }
          }
        }
      } catch (error) {
        console.warn('[P&L Config] Error accessing blob storage:', error);
      }
    }

    // Try local file storage
    try {
      console.log('[P&L Config] Trying local file storage...');
      const fs = await import('fs');
      const path = await import('path');
      
      const configFile = path.join(process.cwd(), 'data', 'pnl-config-history.json');
      console.log('[P&L Config] Looking for config file at:', configFile);
      
      if (fs.existsSync(configFile)) {
        console.log('[P&L Config] Local config file exists, reading...');
        const fileContent = fs.readFileSync(configFile, 'utf-8');
        const data = JSON.parse(fileContent) as PnLConfigHistory;
        
        if (data.configurations && Array.isArray(data.configurations)) {
          console.log(`[P&L Config] Successfully loaded ${data.configurations.length} configurations from local file`);
          return data;
        } else {
          console.warn('[P&L Config] Local config file has invalid structure');
        }
      } else {
        console.log('[P&L Config] No local config file found');
      }
    } catch (error) {
      console.warn('[P&L Config] Error accessing local config file:', error);
    }
  }

  console.log('[P&L Config] Using default configuration');
  
  // Ensure the default config has all required fields
  const safeDefaultHistory = {
    configurations: [{
      ...DEFAULT_CONFIG_HISTORY.configurations[0],
      effectiveDate: DEFAULT_CONFIG_HISTORY.configurations[0].effectiveDate || '2024-01-01',
      updatedAt: DEFAULT_CONFIG_HISTORY.configurations[0].updatedAt || new Date().toISOString(),
    }]
  };
  
  return safeDefaultHistory;
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
  // Try blob storage first, fall back to local storage
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await put(CONFIG_BLOB_PATH, JSON.stringify(history, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
      });
      console.log('[P&L Config] Configuration saved successfully to blob storage');
      return;
    } catch (error) {
      console.error('[P&L Config] Error saving to blob storage:', error);
      // Fall through to local storage
    }
  }

  // Local storage fallback
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const configDir = path.join(process.cwd(), 'data');
    const configFile = path.join(configDir, 'pnl-config-history.json');
    
    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configFile, JSON.stringify(history, null, 2));
    console.log('[P&L Config] Configuration saved successfully to local file');
  } catch (error) {
    console.error('[P&L Config] Error saving configuration locally:', error);
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

