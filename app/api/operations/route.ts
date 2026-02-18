import { NextResponse } from 'next/server';
import { getDailyOperations, getOperationsDateRange } from '@/lib/operations-storage';
import type { OperationsResponse } from '@/lib/operations-types';

// Force Node.js runtime for blob storage operations
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// This API now retrieves data from blob storage instead of using mock data

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    console.log('[Operations] GET request - date:', date, 'startDate:', startDate, 'endDate:', endDate);
    
    // Handle single date query (legacy support)
    if (date && !startDate && !endDate) {
      const result = await getDailyOperations(date);
      
      if (!result.success) {
        const response: OperationsResponse = {
          success: false,
          message: 'Operations data not found',
          error: result.error
        };
        return NextResponse.json(response, { status: 404 });
      }

      const response: OperationsResponse = {
        success: true,
        data: result.data,
        message: 'Operations data retrieved successfully'
      };
      
      return NextResponse.json(response);
    }
    
    // Handle date range query
    if (startDate) {
      const result = await getOperationsDateRange(startDate, endDate || startDate);
      
      if (!result.success) {
        const response: OperationsResponse = {
          success: false,
          message: 'Operations data not found',
          error: result.error
        };
        return NextResponse.json(response, { status: 404 });
      }

      // Return array for date ranges, single item for same start/end date
      const responseData = (startDate === endDate || !endDate) && result.data && result.data.length === 1
        ? result.data[0]  // Single day
        : result.data;    // Multiple days array

      const response = {
        success: true,
        data: responseData,
        message: 'Operations data retrieved successfully'
      };
      
      return NextResponse.json(response);
    }
    
    // No valid parameters
    const response: OperationsResponse = {
      success: false,
      message: 'Invalid parameters',
      error: 'Please provide either "date" or "startDate" parameter'
    };
    return NextResponse.json(response, { status: 400 });
    
  } catch (error) {
    console.error('Error fetching operations data:', error);
    const response: OperationsResponse = {
      success: false,
      message: 'Failed to fetch operations data',
      error: error instanceof Error ? error.message : String(error)
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}

// POST method is now handled by /api/ingest/operations
// This endpoint is read-only for retrieving stored data
