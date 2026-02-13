import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

/**
 * GET /api/delay-time/dates
 * Returns all available dates for delay time data
 */
export async function GET() {
  try {
    const { blobs } = await list({
      prefix: 'delay-time/daily/',
    });

    // Extract dates from blob names (format: delay-time/daily/YYYY-MM-DD.json)
    const dates = blobs
      .map(blob => {
        const match = blob.pathname.match(/delay-time\/daily\/(\d{4}-\d{2}-\d{2})\.json/);
        return match ? match[1] : null;
      })
      .filter((date): date is string => date !== null)
      .sort();

    console.log(`[Delay Time Dates API] Found ${dates.length} dates:`, dates);

    return NextResponse.json({
      success: true,
      dates,
      count: dates.length,
    });
  } catch (error) {
    console.error('Error fetching delay time dates:', error);
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

