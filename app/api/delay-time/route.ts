import { NextResponse } from 'next/server';
import { processDelayTimeRecords, saveDelayTimeData, getLatestDelayTimeData } from '@/lib/chat-storage';
import type { DelayTimeRequest, DelayTimeResponse } from '@/lib/chat-types';

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

export async function GET() {
  try {
    const delayData = await getLatestDelayTimeData();
    
    if (!delayData) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No delay time data available yet',
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

