import { NextResponse } from 'next/server';
import { getCostSummary, getTodayCosts, resetCostLog } from '@/lib/cost-tracker';

export async function GET() {
  try {
    const summary = getCostSummary();
    const today = getTodayCosts();
    
    return NextResponse.json({
      total: {
        cost: summary.totalCost,
        calls: summary.totalCalls,
        inputTokens: summary.totalInputTokens,
        outputTokens: summary.totalOutputTokens,
      },
      today: {
        cost: today.cost,
        calls: today.calls,
      },
      byModel: summary.byModel,
      byType: summary.byType,
      recentEntries: summary.entries.slice(-20).reverse(),
    });
    
  } catch (error) {
    console.error('[Costs] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get cost data' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    resetCostLog();
    return NextResponse.json({ message: 'Cost log reset' });
  } catch (error) {
    console.error('[Costs] Reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset cost log' },
      { status: 500 }
    );
  }
}

