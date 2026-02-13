import { NextResponse } from 'next/server';
import { processDelayTimeRecords, saveDelayTimeData, getLatestDelayTimeData } from '@/lib/chat-storage';
import type { DelayTimeRequest, DelayTimeResponse } from '@/lib/chat-types';
import { list } from '@vercel/blob';

/**
 * API Endpoint: /api/delay-time
 * POST: Ingest daily agent delay time data
 * GET: Retrieve latest delay time data
 */

export async function POST(request: Request) {
  try {
    const body: DelayTimeRequest = await request.json();
    
    // Validate request
    if (!body.analysisDate || !body.records || !Array.isArray(body.records)) {
      return NextResponse.json<DelayTimeResponse>({
        success: false,
        message: 'Invalid request format',
        error: 'analysisDate and records array are required',
      }, { status: 400 });
    }

    // Process and aggregate the delay time records
    const delayTimeData = processDelayTimeRecords(body.records, body.analysisDate);
    
    // Save to blob storage
    await saveDelayTimeData(delayTimeData);
    
    return NextResponse.json<DelayTimeResponse>({
      success: true,
      message: 'Delay time data ingested successfully',
      data: {
        analysisId: `delay-${body.analysisDate}`,
        processedRecords: body.records.length,
        analysisDate: body.analysisDate,
      },
    });
  } catch (error) {
    console.error('Error processing delay time data:', error);
    return NextResponse.json<DelayTimeResponse>({
      success: false,
      message: 'Failed to process delay time data',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    let delayData;
    
    if (date) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid date format. Use YYYY-MM-DD' 
          },
          { status: 400 }
        );
      }
      
      // Fetch specific date
      try {
        const blobUrl = `${process.env.BLOB_READ_WRITE_TOKEN ? 'https://blob.vercel-storage.com' : ''}/delay-time/daily/${date}.json`;
        const response = await fetch(blobUrl);
        
        if (response.ok) {
          delayData = await response.json();
        }
      } catch (error) {
        console.error(`Error fetching delay time data for ${date}:`, error);
        delayData = null;
      }
    } else {
      delayData = await getLatestDelayTimeData();
    }
    
    if (!delayData) {
      return NextResponse.json({
        success: true,
        data: null,
        message: date ? `No delay time data available for ${date}` : 'No delay time data available yet',
      });
    }
    
    return NextResponse.json({
      success: true,
      data: delayData,
    });
  } catch (error) {
    console.error('Error fetching delay time data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch delay time data',
    }, { status: 500 });
  }
}

