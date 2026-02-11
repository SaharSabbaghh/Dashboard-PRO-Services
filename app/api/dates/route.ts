import { NextResponse } from 'next/server';
import { getAvailableDates, getDailyData, getLatestRun } from '@/lib/unified-storage';

// Force Node.js runtime for blob storage operations
export const runtime = 'nodejs';
// Disable caching for this route - ensures fresh data from blob storage
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    
    const dates = await getAvailableDates();
    
    if (detailed) {
      // Fetch detailed summary for each date
      const datesWithSummary = await Promise.all(
        dates.map(async (date) => {
          const data = await getDailyData(date);
          if (!data) return null;
          const latestRun = await getLatestRun(date);
          return {
            date,
            fileName: data.fileName,
            totalConversations: data.totalConversations,
            processedCount: data.processedCount,
            isProcessing: data.isProcessing,
            prospects: data.summary,
            latestRun,
          };
        })
      );
      const filteredDates = datesWithSummary.filter(Boolean);
      return NextResponse.json({ dates: filteredDates, count: filteredDates.length });
    }
    
    // Return simple array of date strings
    return NextResponse.json({ dates, count: dates.length });
    
  } catch (error) {
    console.error('[API] Dates error:', error);
    return NextResponse.json({ error: 'Failed to fetch dates' }, { status: 500 });
  }
}
