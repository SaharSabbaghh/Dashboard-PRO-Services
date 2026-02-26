import { NextResponse } from 'next/server';
import { getOperationsTrendData } from '@/lib/operations-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/operations/trends
 * Query params: 
 *   - endDate: YYYY-MM-DD (optional, defaults to today)
 *   - days: number (optional, defaults to 14)
 * 
 * Returns trend data for cases delayed vs done over time
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const endDateParam = searchParams.get('endDate');
    const daysParam = searchParams.get('days');
    
    // Default to today if no endDate provided
    const endDate = endDateParam || new Date().toISOString().split('T')[0];
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      }, { status: 400 });
    }
    
    // Parse days parameter (default to 14)
    const days = daysParam ? parseInt(daysParam, 10) : 14;
    
    if (isNaN(days) || days < 1 || days > 90) {
      return NextResponse.json({
        success: false,
        error: 'Days must be a number between 1 and 90'
      }, { status: 400 });
    }
    
    // Fetch trend data
    const trendData = await getOperationsTrendData(endDate, days);
    
    return NextResponse.json({
      success: true,
      data: trendData,
      count: trendData.length,
      endDate,
      days
    });
    
  } catch (error) {
    console.error('[Operations Trends API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

