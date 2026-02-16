import { NextRequest, NextResponse } from 'next/server';
import { storeAgentHours, getAgentHours } from '@/lib/agent-hours-storage';
import type { AgentHoursRequest } from '@/lib/chat-types';

/**
 * POST /api/agent-hours
 * Store agent hours data for a specific date
 */
export async function POST(request: NextRequest) {
  try {
    const body: AgentHoursRequest = await request.json();
    
    const result = await storeAgentHours(body);
    
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    console.error('Error in agent-hours POST:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to process request',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent-hours?date=YYYY-MM-DD
 * Retrieve agent hours data for a specific date
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        {
          success: false,
          error: 'date parameter is required',
        },
        { status: 400 }
      );
    }

    const result = await getAgentHours(date);
    
    return NextResponse.json(result, {
      status: result.success ? 200 : 404,
    });
  } catch (error) {
    console.error('Error in agent-hours GET:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

