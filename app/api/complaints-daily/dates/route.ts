import { NextResponse } from 'next/server';
import { getAvailableDailyComplaintsDates } from '@/lib/daily-complaints-storage';

/**
 * GET /api/complaints-daily/dates
 * Get all available dates with complaints data
 */
export async function GET() {
  try {
    const result = await getAvailableDailyComplaintsDates();
    
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error('Error in complaints-daily dates GET:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

