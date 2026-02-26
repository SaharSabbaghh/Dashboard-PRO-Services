import { NextResponse } from 'next/server';
import { getAvailableNPSDates } from '@/lib/nps-storage';

export async function GET() {
  try {
    // Get available dates directly from blob storage (more efficient)
    const result = await getAvailableNPSDates();
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to fetch NPS dates',
      }, { status: 500 });
    }

    const dates = result.dates || [];
    
    console.log(`[NPS Dates] Found ${dates.length} available dates`);
    if (dates.length > 0) {
      console.log(`[NPS Dates] Sample dates:`, dates.slice(0, 5));
    }

    return NextResponse.json({
      success: true,
      dates,
    });
  } catch (error) {
    console.error('Error fetching NPS dates:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch NPS dates',
    }, { status: 500 });
  }
}

