import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { getAvailableDates, getDailyData } from '@/lib/unified-storage';
import { getPnLComplaintsDataAsync } from '@/lib/pnl-complaints-processor';

// Force Node.js runtime for blob storage operations
export const runtime = 'nodejs';

const DAILY_PREFIX = 'daily/';

export async function GET() {
  try {
    // Check environment
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    
    // Direct blob listing - ALL blobs
    const { blobs: allBlobs } = await list();
    
    // Direct blob listing - daily prefix
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
    
    // Check P&L complaints data
    const pnlData = await getPnLComplaintsDataAsync();
    
    return NextResponse.json({
      hasBlobToken,
      allBlobsCount: allBlobs.length,
      allBlobPaths: allBlobs.map(b => b.pathname),
      dailyBlobCount: blobs.length,
      dailyBlobPaths: blobPaths,
      extractedDates,
      availableDatesResult: availableDates,
      testDataExists: !!testData,
      testDataPreview: testData ? {
        date: testData.date,
        totalConversations: testData.totalConversations,
        processedCount: testData.processedCount,
      } : null,
      pnlDataExists: !!pnlData,
      pnlDataPreview: pnlData ? {
        lastUpdated: pnlData.lastUpdated,
        totalUniqueSales: pnlData.summary?.totalUniqueSales,
        rawComplaintsCount: pnlData.rawComplaintsCount,
      } : null,
    });
  } catch (error) {
    return NextResponse.json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

