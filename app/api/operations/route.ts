import { NextResponse } from 'next/server';
import { getDailyOperations } from '@/lib/operations-storage';
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
    
    console.log('[Operations] GET request - date:', date);
    
    if (!date) {
      const response: OperationsResponse = {
        success: false,
        message: 'Date parameter is required',
        error: 'Please provide a date in YYYY-MM-DD format'
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Retrieve data from blob storage
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
