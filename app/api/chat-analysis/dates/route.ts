import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

/**
 * API Endpoint: /api/chat-analysis/dates
 * GET - List all available chat analysis dates
 */
export async function GET() {
  try {
    const { blobs } = await list({
      prefix: 'chat-analysis/daily/',
    });

    // Extract dates from blob filenames and sort
    const dates = blobs
      .map((blob) => {
        const match = blob.pathname.match(/chat-analysis\/daily\/(\d{4}-\d{2}-\d{2})\.json$/);
        return match ? match[1] : null;
      })
      .filter((date): date is string => date !== null)
      .sort(); // Sort chronologically

    return NextResponse.json({
      success: true,
      dates,
      count: dates.length,
    });
  } catch (error) {
    console.error('[Chat Analysis Dates API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch available dates',
        dates: [],
      },
      { status: 500 }
    );
  }
}

