import { NextResponse } from 'next/server';
import { getDailyData, saveDailyData, completeRun } from '@/lib/storage';

// Force Node.js runtime for storage operations
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { date } = await request.json();
    
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }
    
    const dailyData = getDailyData(date);
    if (!dailyData) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }
    
    // Stop processing
    if (dailyData.currentRunId) {
      completeRun(date, dailyData.currentRunId);
    }
    
    dailyData.isProcessing = false;
    dailyData.currentRunId = undefined;
    saveDailyData(date, dailyData);
    
    return NextResponse.json({ message: 'Processing stopped', date });
  } catch (error) {
    console.error('[Stop] Error:', error);
    return NextResponse.json({ error: 'Failed to stop' }, { status: 500 });
  }
}

