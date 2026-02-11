import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { getAvailableDates, getDailyData } from '@/lib/unified-storage';

export async function GET() {
  try {
    // List all blobs (no prefix filter) to see everything
    const { blobs } = await list();
    
    const blobInfo = blobs.map(blob => ({
      pathname: blob.pathname,
      url: blob.url,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    }));
    
    // Also try to list with 'daily/' prefix specifically
    const { blobs: dailyBlobs } = await list({ prefix: 'daily/' });
    
    // Test what getAvailableDates returns
    const availableDates = await getAvailableDates();
    
    // Try to get daily data for 2026-02-11
    const dailyData = await getDailyData('2026-02-11');
    
    return NextResponse.json({
      totalBlobs: blobs.length,
      allBlobs: blobInfo,
      dailyBlobsCount: dailyBlobs.length,
      dailyBlobs: dailyBlobs.map(b => b.pathname),
      availableDates,
      dailyDataExists: !!dailyData,
      dailyDataPreview: dailyData ? {
        date: dailyData.date,
        fileName: dailyData.fileName,
        totalConversations: dailyData.totalConversations,
        processedCount: dailyData.processedCount,
        resultsCount: dailyData.results?.length,
      } : null,
    });
  } catch (error) {
    return NextResponse.json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

