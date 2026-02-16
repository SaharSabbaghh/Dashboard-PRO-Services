import { NextResponse } from 'next/server';
import { getAvailableAgentHoursDates } from '@/lib/agent-hours-storage';

/**
 * GET /api/agent-hours/dates
 * Get all available dates with agent hours data
 */
export async function GET() {
  try {
    const result = await getAvailableAgentHoursDates();
    
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error) {
    console.error('Error in agent-hours dates GET:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

