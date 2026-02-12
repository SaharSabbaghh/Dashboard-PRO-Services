import { NextResponse } from 'next/server';
import { getDailyData, getLatestRun, getProspectDetailsByDate, getProspectsGroupedByHousehold } from '@/lib/unified-storage';
import { getPnLComplaintsDataAsync } from '@/lib/pnl-complaints-processor';

// Force Node.js runtime for blob storage operations
export const runtime = 'nodejs';
// Disable caching for dynamic data - ensures fresh data from blob storage
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to check conversions from complaints data
async function calculateConversionsForDate(date: string, contractIds: string[]) {
  const complaintsData = await getPnLComplaintsDataAsync();
  if (!complaintsData || contractIds.length === 0) {
    return { oec: 0, owwa: 0, travelVisa: 0 };
  }
  
  const dateStart = new Date(date + 'T00:00:00Z');
  const dateEnd = new Date(date + 'T23:59:59Z');
  
  const convertedContracts = {
    oec: new Set<string>(),
    owwa: new Set<string>(),
    travelVisa: new Set<string>(),
  };
  
  // Check OEC
  for (const sale of complaintsData.services.oec.sales) {
    if (contractIds.includes(sale.contractId)) {
      const hasComplaintOnDate = sale.complaintDates.some(d => {
        const complaintDate = new Date(d);
        return complaintDate >= dateStart && complaintDate <= dateEnd;
      });
      if (hasComplaintOnDate) {
        convertedContracts.oec.add(sale.contractId);
      }
    }
  }
  
  // Check OWWA
  for (const sale of complaintsData.services.owwa.sales) {
    if (contractIds.includes(sale.contractId)) {
      const hasComplaintOnDate = sale.complaintDates.some(d => {
        const complaintDate = new Date(d);
        return complaintDate >= dateStart && complaintDate <= dateEnd;
      });
      if (hasComplaintOnDate) {
        convertedContracts.owwa.add(sale.contractId);
      }
    }
  }
  
  // Check Travel Visa (TTL, TTE, TTJ)
  for (const serviceKey of ['ttl', 'tte', 'ttj'] as const) {
    for (const sale of complaintsData.services[serviceKey].sales) {
      if (contractIds.includes(sale.contractId)) {
        const hasComplaintOnDate = sale.complaintDates.some(d => {
          const complaintDate = new Date(d);
          return complaintDate >= dateStart && complaintDate <= dateEnd;
        });
        if (hasComplaintOnDate) {
          convertedContracts.travelVisa.add(sale.contractId);
        }
      }
    }
  }
  
  return {
    oec: convertedContracts.oec.size,
    owwa: convertedContracts.owwa.size,
    travelVisa: convertedContracts.travelVisa.size,
  };
}

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
    
    // Get prospect contract IDs for conversion checking
    const prospectContractIds = prospects
      .filter(p => p.contractId)
      .map(p => p.contractId);
    
    // Calculate conversions from complaints data (only for this date)
    const conversions = await calculateConversionsForDate(date, prospectContractIds);
    
    // Calculate summary counts
    const defaultByContractType = {
      CC: { oec: 0, owwa: 0, travelVisa: 0 },
      MV: { oec: 0, owwa: 0, travelVisa: 0 },
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
        details: prospects,
      },
      conversions, // Now dynamically calculated from complaints
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
