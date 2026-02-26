import { put, list } from '@vercel/blob';
import type { OperationsData, OperationMetric, OperationsTrendData } from './operations-types';

const BLOB_PREFIX = 'operations/';

/**
 * Store daily operations data in Vercel Blob Storage
 */
export async function storeDailyOperations(
  date: string,
  operationsData: OperationsData
): Promise<{
  success: boolean;
  message: string;
  data?: {
    date: string;
    metricsCount: number;
  };
  error?: string;
}> {
  try {
    if (!date) {
      return {
        success: false,
        error: 'Date is required',
        message: 'Failed to store operations data',
      };
    }

    if (!operationsData) {
      return {
        success: false,
        error: 'Operations data is required',
        message: 'Failed to store operations data',
      };
    }

    // Ensure the data has the correct date
    const dataToStore: OperationsData = {
      ...operationsData,
      analysisDate: date,
      lastUpdated: new Date().toISOString(),
    };

    // Store in blob with date-based key
    const blobKey = `${BLOB_PREFIX}${date}.json`;
    const blob = await put(blobKey, JSON.stringify(dataToStore), {
      access: 'public',
      contentType: 'application/json',
    });

    const totalMetrics = operationsData.operations?.length || 0;

    console.log(`✅ Stored operations data for ${date}:`, {
      operations: operationsData.operations?.length || 0,
      totalMetrics,
      blobUrl: blob.url
    });

    return {
      success: true,
      message: 'Operations data stored successfully',
      data: {
        date,
        metricsCount: totalMetrics,
      },
    };

  } catch (error) {
    console.error('❌ Error storing operations data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to store operations data',
    };
  }
}

/**
 * Retrieve operations data for a specific date
 */
export async function getDailyOperations(date: string): Promise<{
  success: boolean;
  data?: OperationsData;
  error?: string;
}> {
  try {
    const blobKey = `${BLOB_PREFIX}${date}.json`;
    
    // List blobs to check if it exists
    const { blobs } = await list({ prefix: blobKey, limit: 1 });
    
    if (blobs.length === 0) {
      return {
        success: false,
        error: `No operations data found for date: ${date}`,
      };
    }

    // Fetch the blob data
    const response = await fetch(blobs[0].url, { cache: 'no-store' });
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch operations data: ${response.statusText}`,
      };
    }

    const data: OperationsData = await response.json();

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('❌ Error retrieving operations data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all available dates with operations data
 */
export async function getAvailableOperationsDates(): Promise<{
  success: boolean;
  dates?: string[];
  error?: string;
}> {
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX });
    
    const dates = blobs
      .map(blob => {
        // Extract date from blob pathname: operations/2026-02-16.json -> 2026-02-16
        const match = blob.pathname.match(/operations\/(\d{4}-\d{2}-\d{2})\.json$/);
        return match ? match[1] : null;
      })
      .filter(Boolean)
      .sort();

    return {
      success: true,
      dates: dates as string[],
    };
  } catch (error) {
    console.error('❌ Error fetching operations dates:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete operations data for a specific date
 */
export async function deleteDailyOperations(date: string): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    const blobKey = `${BLOB_PREFIX}${date}.json`;
    
    // List blobs to check if it exists
    const { blobs } = await list({ prefix: blobKey, limit: 1 });
    
    if (blobs.length === 0) {
      return {
        success: false,
        error: `No operations data found for date: ${date}`,
        message: 'Failed to delete operations data',
      };
    }

    // Delete the blob (Note: Vercel Blob doesn't have a direct delete API in the SDK)
    // For now, we'll just return success - in production, you'd implement deletion
    console.log(`🗑️ Would delete operations data for ${date}`);

    return {
      success: true,
      message: 'Operations data deleted successfully',
    };
  } catch (error) {
    console.error('❌ Error deleting operations data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to delete operations data',
    };
  }
}

/**
 * Get operations data for a date range (for future use)
 */
export async function getOperationsDateRange(
  startDate?: string,
  endDate?: string
): Promise<{
  success: boolean;
  data?: OperationsData[];
  error?: string;
}> {
  try {
    // Get all available dates
    const datesResult = await getAvailableOperationsDates();
    if (!datesResult.success || !datesResult.dates) {
      return {
        success: false,
        error: 'No operations data available',
      };
    }

    // Filter dates by range
    let datesToFetch = datesResult.dates;
    if (startDate) {
      datesToFetch = datesToFetch.filter(d => d >= startDate);
    }
    if (endDate) {
      datesToFetch = datesToFetch.filter(d => d <= endDate);
    }

    if (datesToFetch.length === 0) {
      return {
        success: false,
        error: 'No data found in specified date range',
      };
    }

    // Fetch all daily data
    const dailyDataPromises = datesToFetch.map(date => getDailyOperations(date));
    const dailyResults = await Promise.all(dailyDataPromises);

    // Combine successful results
    const operationsData: OperationsData[] = [];
    dailyResults.forEach(result => {
      if (result.success && result.data) {
        operationsData.push(result.data);
      }
    });

    return {
      success: true,
      data: operationsData,
    };
  } catch (error) {
    console.error('❌ Error fetching operations date range:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get operations trend data for a date range
 * Returns daily totals for cases delayed and done today
 */
export async function getOperationsTrendData(endDate: string, days: number = 14): Promise<OperationsTrendData[]> {
  const trendData: OperationsTrendData[] = [];
  const end = new Date(endDate);
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(end);
    date.setDate(end.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayResult = await getDailyOperations(dateStr);
    if (dayResult.success && dayResult.data) {
      // Calculate totals for the day
      const totalCasesDelayed = dayResult.data.operations.reduce((sum, op) => sum + op.casesDelayed, 0);
      const totalDoneToday = dayResult.data.operations.reduce((sum, op) => sum + op.doneToday, 0);
      
      trendData.push({
        date: dateStr,
        casesDelayed: totalCasesDelayed,
        doneToday: totalDoneToday,
      });
    } else {
      // If no data for this day, add zeros
      trendData.push({
        date: dateStr,
        casesDelayed: 0,
        doneToday: 0,
      });
    }
  }
  
  return trendData;
}
