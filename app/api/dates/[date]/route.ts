import { NextResponse } from 'next/server';
import { getDailyData, getLatestRun, getProspectDetailsByDate, getProspectsGroupedByHousehold } from '@/lib/unified-storage';

// Force Node.js runtime for blob storage operations
export const runtime = 'nodejs';
// Disable caching for dynamic data - ensures fresh data from blob storage
export const dynamic = 'force-dynamic';
export const revalidate = 0;


export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }
    
    // Use getDailyData directly (same as the working /api/dates endpoint)
    const data = await getDailyData(date);
    if (!data) {
      return NextResponse.json(
        { error: 'No data found for this date' },
        { status: 404 }
      );
    }
    
    const latestRun = await getLatestRun(date);
    const prospects = await getProspectDetailsByDate(date);
    const households = await getProspectsGroupedByHousehold(date);
    
    // Use stored conversion data from the original processing
    const defaultByContractType = {
      CC: { oec: 0, owwa: 0, travelVisa: 0, filipinaPassportRenewal: 0, ethiopianPassportRenewal: 0 },
      MV: { oec: 0, owwa: 0, travelVisa: 0, filipinaPassportRenewal: 0, ethiopianPassportRenewal: 0 },
    };
    
    return NextResponse.json({
      date,
      fileName: data.fileName,
      totalProcessed: data.processedCount,
      totalConversations: data.totalConversations,
      isProcessing: data.isProcessing,
      prospects: {
        oec: data.summary?.oec || 0,
        owwa: data.summary?.owwa || 0,
        travelVisa: data.summary?.travelVisa || 0,
        filipinaPassportRenewal: data.summary?.filipinaPassportRenewal || 0,
        ethiopianPassportRenewal: data.summary?.ethiopianPassportRenewal || 0,
        details: prospects,
      },
      conversions: {
        oec: data.summary?.oecConverted || 0,
        owwa: data.summary?.owwaConverted || 0,
        travelVisa: data.summary?.travelVisaConverted || 0,
        filipinaPassportRenewal: data.summary?.filipinaPassportRenewalConverted || 0,
        ethiopianPassportRenewal: data.summary?.ethiopianPassportRenewalConverted || 0,
      },
      countryCounts: data.summary?.countryCounts || {},
      byContractType: data.summary?.byContractType || defaultByContractType,
      latestRun,
      households,
      prospectDetails: prospects, // Add this for compatibility
    });
    
  } catch (error) {
    console.error('[API] Date data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch date data' },
      { status: 500 }
    );
  }
}
