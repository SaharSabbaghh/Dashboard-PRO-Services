import { NextResponse } from 'next/server';
import { getAggregatedResultsByDate, getProspectDetailsByDate, getProspectsGroupedByHousehold } from '@/lib/unified-storage';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }
    
    console.log('[API] Fetching date:', date);
    const aggregated = await getAggregatedResultsByDate(date);
    console.log('[API] Aggregated result:', JSON.stringify(aggregated).slice(0, 500));
    const prospects = await getProspectDetailsByDate(date);
    const households = await getProspectsGroupedByHousehold(date);
    
    return NextResponse.json({
      ...aggregated,
      prospects: {
        ...aggregated.prospects,
        details: prospects,
      },
      households,
    });
    
  } catch (error) {
    console.error('[API] Date data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch date data' },
      { status: 500 }
    );
  }
}
