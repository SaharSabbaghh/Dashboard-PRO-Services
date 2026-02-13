import { NextResponse } from 'next/server';
import { processDelayTimeRecords, saveDelayTimeData, getLatestDelayTimeData } from '@/lib/chat-storage';
import type { DelayTimeRequest, DelayTimeResponse } from '@/lib/chat-types';

/**
 * API Endpoint: /api/delay-time
 * 
 * POST - Submit agent delay time records
 * GET - Retrieve latest delay time data for dashboard
 * 
 * Authentication:
 *   Header: Authorization: Bearer <your-api-key>
 */

// Verify API key from Authorization header
function verifyApiKey(request: Request): boolean {
  const validKey = process.env.INGEST_API_KEY;
  if (!validKey) {
    console.warn('[Delay Time] Warning: INGEST_API_KEY not set, rejecting all requests for security');
    return false;
  }
  
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return false;
  }
  
  // Support both "Bearer <token>" and plain "<token>" formats
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;
  
  return token === validKey;
}

/**
 * POST - Submit agent delay time records
 * 
 * Expected body:
 * {
 *   "analysisDate": "2026-02-13",
 *   "records": [
 *     {
 *       "START_DATE": "2026-02-12 04:19:48.000",
 *       "AGENT_FULL_NAME": "Omar Abou Zaid",
 *       "LAST_SKILL": "VBC_RESOLVERS_AGENTS",
 *       "AVG_DELAY_DD_HH_MM_SS": "00:01:12:39",
 *       "ENDED_WITH_CONSUMER_NO_REPLY": "No"
 *     }
 *   ]
 * }
 */
export async function POST(request: Request): Promise<NextResponse<DelayTimeResponse>> {
  try {
    // Verify API key
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Unauthorized',
          error: 'Invalid or missing API key' 
        },
        { status: 401 }
      );
    }

    const body: DelayTimeRequest = await request.json();
    
    // Validate required fields
    if (!body.records || !Array.isArray(body.records)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid request',
          error: 'Missing or invalid records array' 
        },
        { status: 400 }
      );
    }

    // Validate analysis date
    const analysisDate = body.analysisDate || new Date().toISOString().split('T')[0];
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(analysisDate)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid request',
          error: 'analysisDate must be in YYYY-MM-DD format' 
        },
        { status: 400 }
      );
    }

    console.log(`[Delay Time] Processing ${body.records.length} records for ${analysisDate}`);

    // Process the delay time records
    const delayData = processDelayTimeRecords(body.records, analysisDate);
    
    // Save to blob storage
    await saveDelayTimeData(delayData);

    return NextResponse.json({
      success: true,
      message: 'Delay time data saved successfully',
      data: {
        analysisDate: analysisDate,
        processedRecords: body.records.length,
        averageDelay: delayData.overallMetrics.averageDelayFormatted,
        medianDelay: delayData.overallMetrics.medianDelayFormatted,
      },
    });

  } catch (error) {
    console.error('[Delay Time API] POST error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: String(error) 
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Retrieve latest delay time data for dashboard
 */
export async function GET(): Promise<NextResponse<{ success: boolean; data?: any; error?: string }>> {
  try {
    const data = await getLatestDelayTimeData();
    
    if (!data) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error('[Delay Time API] GET error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch delay time data' 
      },
      { status: 500 }
    );
  }
}
