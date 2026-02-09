import { NextResponse } from 'next/server';
import { resetDailyProcessing, getDailyData } from '@/lib/unified-storage';

export async function POST(request: Request) {
  try {
    const { date } = await request.json();
    
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }
    
    const dailyData = await getDailyData(date);
    if (!dailyData) {
      return NextResponse.json({ error: 'No data found for this date' }, { status: 404 });
    }
    
    await resetDailyProcessing(date);
    
    return NextResponse.json({
      message: 'Reset successful',
      date,
      totalConversations: dailyData.totalConversations,
    });
    
  } catch (error) {
    console.error('[Reset-Date] Error:', error);
    return NextResponse.json({ error: 'Failed to reset' }, { status: 500 });
  }
}
