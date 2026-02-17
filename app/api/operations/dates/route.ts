import { NextResponse } from 'next/server';
import { getAvailableOperationsDates } from '@/lib/operations-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    console.log('[Operations Dates] Fetching available dates from blob storage');
    
    const result = await getAvailableOperationsDates();
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch operations dates',
        error: result.error
      }, { status: 500 });
    }
    
    console.log('[Operations Dates] Found dates:', result.dates);
    
    return NextResponse.json({
      success: true,
      dates: result.dates || [],
      message: 'Available operations dates retrieved successfully'
    });
    
  } catch (error) {
    console.error('Error fetching operations dates:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch operations dates',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
