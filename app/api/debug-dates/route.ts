import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { getAvailableDates, getDailyData } from '@/lib/unified-storage';

const DAILY_PREFIX = 'daily/';

export async function GET() {
  try {
    // Direct blob listing
    const { blobs } = await list({ prefix: DAILY_PREFIX });
    
    const blobPaths = blobs.map(b => ({
      pathname: b.pathname,
      size: b.size,
    }));
    
    // Extract dates manually
    const extractedDates = blobs
      .map(blob => blob.pathname.replace(DAILY_PREFIX, '').replace('.json', ''))
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
    
    // What getAvailableDates returns
    const availableDates = await getAvailableDates();
    
    // Can we get daily data for 2026-02-11?
    const testData = await getDailyData('2026-02-11');
    
    return NextResponse.json({
      blobCount: blobs.length,
      blobPaths,
      extractedDates,
      availableDatesResult: availableDates,
      testDataExists: !!testData,
      testDataPreview: testData ? {
        date: testData.date,
        totalConversations: testData.totalConversations,
        processedCount: testData.processedCount,
      } : null,
    });
  } catch (error) {
    return NextResponse.json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

