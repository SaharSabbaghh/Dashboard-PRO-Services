import { put, list } from '@vercel/blob';
import type { NPSRawData } from './nps-types';

const NPS_BLOB_PATH = 'nps_data.json';

/**
 * Store NPS data in Vercel Blob Storage
 */
export async function storeNPSData(npsData: NPSRawData): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // Fallback to filesystem in development
      const fs = await import('fs');
      const path = await import('path');
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const filePath = path.join(dataDir, NPS_BLOB_PATH);
      fs.writeFileSync(filePath, JSON.stringify(npsData, null, 2), 'utf-8');
      return {
        success: true,
        message: 'NPS data saved to filesystem (development mode)',
      };
    }

    // Store in blob storage
    await put(NPS_BLOB_PATH, JSON.stringify(npsData, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return {
      success: true,
      message: 'NPS data saved to blob storage',
    };
  } catch (error) {
    console.error('[NPS Storage] Error storing data:', error);
    return {
      success: false,
      message: 'Failed to store NPS data',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Retrieve NPS data from Vercel Blob Storage or filesystem
 */
export async function getNPSData(): Promise<{
  success: boolean;
  data?: NPSRawData;
  error?: string;
}> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // Fallback to filesystem in development
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'data', NPS_BLOB_PATH);
      
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'NPS data file not found',
        };
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(fileContent) as NPSRawData;
      
      return {
        success: true,
        data,
      };
    }

    // Read from blob storage
    const { blobs } = await list({ prefix: NPS_BLOB_PATH });
    const exactMatch = blobs.find(b => b.pathname === NPS_BLOB_PATH);
    
    if (!exactMatch) {
      return {
        success: false,
        error: 'NPS data not found in blob storage',
      };
    }

    const response = await fetch(exactMatch.url, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Failed to fetch NPS data from blob storage',
      };
    }

    const data = await response.json() as NPSRawData;
    
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('[NPS Storage] Error retrieving data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

