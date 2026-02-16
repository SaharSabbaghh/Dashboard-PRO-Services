import { NextResponse } from 'next/server';
import { getDailyData, getLatestRun, getProspectDetailsByDate, getProspectsGroupedByHousehold } from '@/lib/unified-storage';
import { getPaymentData, filterPaymentsByDate } from '@/lib/payment-processor';

// Force Node.js runtime for blob storage operations
export const runtime = 'nodejs';
// Disable caching for dynamic data - ensures fresh data from blob storage
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to check conversions from payment data
async function calculateConversionsForDate(date: string, contractIds: string[]) {
  const paymentData = await getPaymentData();
  if (!paymentData || contractIds.length === 0) {
    return { oec: 0, owwa: 0, travelVisa: 0, filipinaPassportRenewal: 0, ethiopianPassportRenewal: 0 };
  }
  
  // Filter payments for this specific date (only RECEIVED payments)
  const datePayments = filterPaymentsByDate(paymentData.payments, date, 'received');
  
  const convertedContracts = {
    oec: new Set<string>(),
    owwa: new Set<string>(),
    travelVisa: new Set<string>(),
    filipinaPassportRenewal: new Set<string>(),
    ethiopianPassportRenewal: new Set<string>(),
  };
  
  // Check each payment on this date
  for (const payment of datePayments) {
    if (contractIds.includes(payment.contractId)) {
      if (payment.service === 'oec') {
        convertedContracts.oec.add(payment.contractId);
      } else if (payment.service === 'owwa') {
        convertedContracts.owwa.add(payment.contractId);
      } else if (payment.service === 'ttl' || payment.service === 'tte' || payment.service === 'ttj' || payment.service === 'schengen' || payment.service === 'gcc') {
        convertedContracts.travelVisa.add(payment.contractId);
      } else if (payment.service === 'filipina_pp') {
        convertedContracts.filipinaPassportRenewal.add(payment.contractId);
      } else if (payment.service === 'ethiopian_pp') {
        convertedContracts.ethiopianPassportRenewal.add(payment.contractId);
      }
    }
  }
  
  return {
    oec: convertedContracts.oec.size,
    owwa: convertedContracts.owwa.size,
    travelVisa: convertedContracts.travelVisa.size,
    filipinaPassportRenewal: convertedContracts.filipinaPassportRenewal.size,
    ethiopianPassportRenewal: convertedContracts.ethiopianPassportRenewal.size,
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
    
    // Calculate conversions from payment data (only for this date)
    const conversions = await calculateConversionsForDate(date, prospectContractIds);
    
    // Calculate summary counts
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
