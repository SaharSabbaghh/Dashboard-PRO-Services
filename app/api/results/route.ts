import { NextResponse } from 'next/server';
import { getAllDatesWithSummary, getProspectDetailsByDate, getAvailableDates, getDailyData } from '@/lib/storage';

// Force Node.js runtime for file system operations
export const runtime = 'nodejs';
// Disable caching for aggregated results
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    
    // Get all dates and aggregate
    const dates = getAvailableDates();
    
    let totalProcessed = 0;
    let oec = 0, owwa = 0, travelVisa = 0, filipinaPassportRenewal = 0, ethiopianPassportRenewal = 0;
    let oecConverted = 0, owwaConverted = 0, travelVisaConverted = 0, filipinaPassportRenewalConverted = 0, ethiopianPassportRenewalConverted = 0;
    const countryCounts: Record<string, number> = {};
    const byContractType = {
      CC: { oec: 0, owwa: 0, travelVisa: 0, filipinaPassportRenewal: 0, ethiopianPassportRenewal: 0 },
      MV: { oec: 0, owwa: 0, travelVisa: 0, filipinaPassportRenewal: 0, ethiopianPassportRenewal: 0 },
    };
    
    const allSummaries = getAllDatesWithSummary();
    for (const summary of allSummaries) {
      if (!summary) continue;
      totalProcessed += summary.processedCount;
      oec += summary.prospects.oec;
      owwa += summary.prospects.owwa;
      travelVisa += summary.prospects.travelVisa;
      filipinaPassportRenewal += summary.prospects.filipinaPassportRenewal || 0;
      ethiopianPassportRenewal += summary.prospects.ethiopianPassportRenewal || 0;
      oecConverted += summary.prospects.oecConverted || 0;
      owwaConverted += summary.prospects.owwaConverted || 0;
      travelVisaConverted += summary.prospects.travelVisaConverted || 0;
      filipinaPassportRenewalConverted += summary.prospects.filipinaPassportRenewalConverted || 0;
      ethiopianPassportRenewalConverted += summary.prospects.ethiopianPassportRenewalConverted || 0;
      
      for (const [country, count] of Object.entries(summary.prospects.countryCounts)) {
        countryCounts[country] = (countryCounts[country] || 0) + count;
      }
    }
    
    // Aggregate byContractType from daily data
    for (const date of dates) {
      const dailyData = getDailyData(date);
      if (dailyData?.summary?.byContractType) {
        byContractType.CC.oec += dailyData.summary.byContractType.CC?.oec || 0;
        byContractType.CC.owwa += dailyData.summary.byContractType.CC?.owwa || 0;
        byContractType.CC.travelVisa += dailyData.summary.byContractType.CC?.travelVisa || 0;
        byContractType.CC.filipinaPassportRenewal += dailyData.summary.byContractType.CC?.filipinaPassportRenewal || 0;
        byContractType.CC.ethiopianPassportRenewal += dailyData.summary.byContractType.CC?.ethiopianPassportRenewal || 0;
        
        byContractType.MV.oec += dailyData.summary.byContractType.MV?.oec || 0;
        byContractType.MV.owwa += dailyData.summary.byContractType.MV?.owwa || 0;
        byContractType.MV.travelVisa += dailyData.summary.byContractType.MV?.travelVisa || 0;
        byContractType.MV.filipinaPassportRenewal += dailyData.summary.byContractType.MV?.filipinaPassportRenewal || 0;
        byContractType.MV.ethiopianPassportRenewal += dailyData.summary.byContractType.MV?.ethiopianPassportRenewal || 0;
      }
    }
    
    const result = {
      totalProcessed,
      totalConversations: totalProcessed,
      isProcessing: false,
      prospects: { 
        oec, 
        owwa, 
        travelVisa, 
        filipinaPassportRenewal, 
        ethiopianPassportRenewal 
      },
      conversions: { 
        oec: oecConverted, 
        owwa: owwaConverted, 
        travelVisa: travelVisaConverted,
        filipinaPassportRenewal: filipinaPassportRenewalConverted,
        ethiopianPassportRenewal: ethiopianPassportRenewalConverted
      },
      countryCounts,
      byContractType,
    };
    
    if (detailed) {
      const prospectDetails: Array<unknown> = [];
      for (const date of dates) {
        prospectDetails.push(...getProspectDetailsByDate(date));
      }
      return NextResponse.json({ ...result, prospectDetails });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Results error:', error);
    return NextResponse.json({ error: 'Failed to get results' }, { status: 500 });
  }
}
