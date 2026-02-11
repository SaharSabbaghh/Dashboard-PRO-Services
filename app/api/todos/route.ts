import { NextResponse } from 'next/server';
import { getOverseasSalesData, getOverseasSalesSummary } from '@/lib/unified-storage';

// Force Node.js runtime for blob storage operations
export const runtime = 'nodejs';
// Disable caching for overseas sales data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const salesData = await getOverseasSalesData();
    const summary = await getOverseasSalesSummary();
    
    return NextResponse.json({
      success: true,
      summary,
      sales: salesData?.sales || [],
      salesByMonth: salesData?.salesByMonth || {},
    });
  } catch (error) {
    console.error('[Todos API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overseas sales data', details: String(error) },
      { status: 500 }
    );
  }
}
