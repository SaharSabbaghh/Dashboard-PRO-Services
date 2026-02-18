import { NextResponse } from 'next/server';
import { getDailyData, getLatestRun, getProspectDetailsByDate, getProspectsGroupedByHousehold } from '@/lib/unified-storage';
import { getPaymentData, filterPaymentsByDate } from '@/lib/payment-processor';
import { 
  getConversionsWithComplaintCheck, 
  calculateCleanConversionRates 
} from '@/lib/complaints-conversion-service';

// Force Node.js runtime for blob storage operations
export const runtime = 'nodejs';
// Disable caching for dynamic data - ensures fresh data from blob storage
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to check conversions from payment data with complaints analysis
async function calculateConversionsForDate(date: string, prospects: any[]) {
  const paymentData = await getPaymentData();
  if (!paymentData || prospects.length === 0) {
    return { oec: 0, owwa: 0, travelVisa: 0, filipinaPassportRenewal: 0, ethiopianPassportRenewal: 0 };
  }
  
  try {
    // Filter payments for this specific date (only RECEIVED payments)
    const datePayments = filterPaymentsByDate(paymentData.payments, date, 'received');
    
    // Create payment lookup maps (same logic as conversions API)
    const paymentMap = new Map<string, Set<'oec' | 'owwa' | 'travel_visa' | 'filipina_pp' | 'ethiopian_pp'>>();
    const paymentDatesMap = new Map<string, Map<'oec' | 'owwa' | 'travel_visa' | 'filipina_pp' | 'ethiopian_pp', string[]>>();
    
    datePayments.forEach(payment => {
      if (!paymentMap.has(payment.contractId)) {
        paymentMap.set(payment.contractId, new Set());
        paymentDatesMap.set(payment.contractId, new Map());
      }
      
      const services = paymentMap.get(payment.contractId)!;
      const dates = paymentDatesMap.get(payment.contractId)!;
      
      // Map payment services to prospect service types
      let prospectService: 'oec' | 'owwa' | 'travel_visa' | 'filipina_pp' | 'ethiopian_pp' | null = null;
      
      if (payment.service === 'oec') {
        prospectService = 'oec';
      } else if (payment.service === 'owwa') {
        prospectService = 'owwa';
      } else if (payment.service === 'ttl' || payment.service === 'tte' || payment.service === 'ttj' || payment.service === 'schengen' || payment.service === 'gcc') {
        prospectService = 'travel_visa';
      } else if (payment.service === 'filipina_pp') {
        prospectService = 'filipina_pp';
      } else if (payment.service === 'ethiopian_pp') {
        prospectService = 'ethiopian_pp';
      }
      
      if (prospectService) {
        services.add(prospectService);
        
        if (!dates.has(prospectService)) {
          dates.set(prospectService, []);
        }
        dates.get(prospectService)!.push(payment.dateOfPayment);
      }
    });

    // Get conversions with complaint analysis
    const conversionsWithComplaints = await getConversionsWithComplaintCheck(
      prospects,
      date,
      paymentMap,
      paymentDatesMap
    );
    
    // Calculate conversion stats (including all conversions, flagged with complaint info)
    const conversionStats = calculateCleanConversionRates(conversionsWithComplaints);
    
    console.log(`[${date}] Conversion stats with complaint analysis:`, {
      oec: `${conversionStats.stats.oec.conversions}/${conversionStats.stats.oec.prospects} total (${conversionStats.rates.oec.overall.toFixed(1)}%), ${conversionStats.stats.oec.withComplaints} with complaints`,
      owwa: `${conversionStats.stats.owwa.conversions}/${conversionStats.stats.owwa.prospects} total (${conversionStats.rates.owwa.overall.toFixed(1)}%), ${conversionStats.stats.owwa.withComplaints} with complaints`,
      travelVisa: `${conversionStats.stats.travelVisa.conversions}/${conversionStats.stats.travelVisa.prospects} total (${conversionStats.rates.travelVisa.overall.toFixed(1)}%), ${conversionStats.stats.travelVisa.withComplaints} with complaints`,
      filipinaPassportRenewal: `${conversionStats.stats.filipinaPassportRenewal.conversions}/${conversionStats.stats.filipinaPassportRenewal.prospects} total (${conversionStats.rates.filipinaPassportRenewal.overall.toFixed(1)}%), ${conversionStats.stats.filipinaPassportRenewal.withComplaints} with complaints`,
      ethiopianPassportRenewal: `${conversionStats.stats.ethiopianPassportRenewal.conversions}/${conversionStats.stats.ethiopianPassportRenewal.prospects} total (${conversionStats.rates.ethiopianPassportRenewal.overall.toFixed(1)}%), ${conversionStats.stats.ethiopianPassportRenewal.withComplaints} with complaints`
    });
    
    // Return all conversions (including those with complaints)
    return {
      oec: conversionStats.stats.oec.conversions,
      owwa: conversionStats.stats.owwa.conversions,
      travelVisa: conversionStats.stats.travelVisa.conversions,
      filipinaPassportRenewal: conversionStats.stats.filipinaPassportRenewal.conversions,
      ethiopianPassportRenewal: conversionStats.stats.ethiopianPassportRenewal.conversions,
    };
  } catch (error) {
    console.error('Error calculating complaints-aware conversions:', error);
    // Fallback to simple conversion calculation if complaints analysis fails
    const contractIds = prospects.map(p => p.contractId).filter(Boolean);
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
    
    // Calculate conversions from payment data with complaints analysis (only for this date)
    const conversions = await calculateConversionsForDate(date, prospects);
    
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
