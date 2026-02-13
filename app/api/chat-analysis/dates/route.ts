import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * API Endpoint: /api/chat-analysis/dates
 * GET - List all available chat analysis dates
 */
export async function GET() {
  try {
    // Check if we have blob token (production)
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    
    if (hasBlobToken) {
      // Production: Use blob storage
      const { blobs } = await list({
        prefix: 'chat-analysis/',
      });

      console.log('[Chat Analysis Dates] Found blobs:', blobs.map(b => b.pathname));

      // Extract dates from blob filenames in daily folder
      const dates = blobs
        .filter((blob) => blob.pathname.includes('/daily/'))
        .map((blob) => {
          const match = blob.pathname.match(/chat-analysis\/daily\/(\d{4}-\d{2}-\d{2})\.json$/);
          return match ? match[1] : null;
        })
        .filter((date): date is string => date !== null)
        .sort();

      return NextResponse.json({
        success: true,
        dates,
        count: dates.length,
        environment: 'production',
      });
    } else {
      // Development: Return empty or mock data
      console.log('[Chat Analysis Dates] Running in development mode without blob storage');
      
      // Check if there's a local data folder (optional)
      const localDataPath = join(process.cwd(), 'data', 'chat-analysis');
      let dates: string[] = [];
      
      if (existsSync(localDataPath)) {
        try {
          const files = readdirSync(localDataPath);
          dates = files
            .filter(f => f.endsWith('.json'))
            .map(f => f.replace('.json', ''))
            .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
            .sort();
        } catch (err) {
          console.error('[Chat Analysis Dates] Error reading local data:', err);
        }
      }

      return NextResponse.json({
        success: true,
        dates,
        count: dates.length,
        environment: 'development',
        message: 'Running in development mode. Deploy to Vercel to use blob storage, or add BLOB_READ_WRITE_TOKEN to .env.local',
      });
    }
  } catch (error) {
    console.error('[Chat Analysis Dates API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch available dates',
        dates: [],
        errorDetails: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
