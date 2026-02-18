import { NextResponse } from 'next/server';
import { getDailyDataBlob } from '@/lib/blob-storage';
import { getPaymentData, filterPaymentsByDate } from '@/lib/payment-processor';
import { 
  getConversionsWithComplaintCheck, 
  calculateCleanConversionRates,
  type ConversionWithComplaintCheck 
} from '@/lib/complaints-conversion-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ConversionResult {
  contractId: string;
  services: {
    oec: boolean;
    owwa: boolean;
    travelVisa: boolean;
    filipinaPassportRenewal: boolean;
    ethiopianPassportRenewal: boolean;
  };
  paymentDates: {
    oec?: string[];
    owwa?: string[];
    travelVisa?: string[];
    filipinaPassportRenewal?: string[];
    ethiopianPassportRenewal?: string[];
  };
}

interface ConversionResponse {
  date: string;
  conversions: ConversionResult[];
  totalConversions: number;
  byService: {
    oec: number;
    owwa: number;
    travelVisa: number;
    filipinaPassportRenewal: number;
    ethiopianPassportRenewal: number;
  };
  // New: Complaints-aware conversion data
  complaintsAnalysis?: {
    conversionsWithComplaints: ConversionWithComplaintCheck[];
    cleanConversionStats: ReturnType<typeof calculateCleanConversionRates>;
  };
}

/**
 * GET /api/conversions/[date]
 * 
 * Checks which prospects converted based on payment data for a specific date.
 * Returns conversions (RECEIVED payments) that happened on that date only.
 * Now includes complaints analysis to show clean conversion rates.
 * 
 * Query parameters:
 * - includeComplaints: boolean (default: false) - Include complaints analysis
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await context.params;
    const url = new URL(request.url);
    const includeComplaints = url.searchParams.get('includeComplaints') === 'true';
    
    // Get daily conversation data
    const dailyData = await getDailyDataBlob(date);
    if (!dailyData) {
      return NextResponse.json({ error: 'No data for this date' }, { status: 404 });
    }
    
    // Get payment data
    const paymentData = await getPaymentData();
    if (!paymentData) {
      return NextResponse.json({ 
        conversions: [],
        message: 'No payment data available'
      });
    }
    
    // Filter payments for this specific date (only RECEIVED payments)
    const datePayments = filterPaymentsByDate(paymentData.payments, date, 'received');
    
    // Create a lookup map for faster searching: contractId -> Set of services
    // For travel visas, we consolidate all types (ttl, tte, ttj, schengen, gcc) into 'travel_visa' for prospect matching
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
        prospectService = 'travel_visa'; // Consolidate all travel visa types
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
    
    const conversions: ConversionResult[] = [];
    
    // For each prospect conversation, check if it has a payment
    for (const result of dailyData.results) {
      if (!result.contractId) continue;
      
      const isProspect = result.isOECProspect || result.isOWWAProspect || result.isTravelVisaProspect || 
                         result.isFilipinaPassportRenewalProspect || result.isEthiopianPassportRenewalProspect;
      if (!isProspect) continue;
      
      const paidServices = paymentMap.get(result.contractId);
      if (!paidServices || paidServices.size === 0) continue;
      
      const conversion: ConversionResult = {
        contractId: result.contractId,
        services: {
          oec: false,
          owwa: false,
          travelVisa: false,
          filipinaPassportRenewal: false,
          ethiopianPassportRenewal: false,
        },
        paymentDates: {},
      };
      
      const contractDates = paymentDatesMap.get(result.contractId)!;
      
      // Check OEC payment
      if (result.isOECProspect && paidServices.has('oec')) {
        conversion.services.oec = true;
        conversion.paymentDates.oec = contractDates.get('oec') || [];
      }
      
      // Check OWWA payment
      if (result.isOWWAProspect && paidServices.has('owwa')) {
        conversion.services.owwa = true;
        conversion.paymentDates.owwa = contractDates.get('owwa') || [];
      }
      
      // Check Travel Visa payment
      if (result.isTravelVisaProspect && paidServices.has('travel_visa')) {
        conversion.services.travelVisa = true;
        conversion.paymentDates.travelVisa = contractDates.get('travel_visa') || [];
      }
      
      // Check Filipina Passport Renewal payment
      if (result.isFilipinaPassportRenewalProspect && paidServices.has('filipina_pp')) {
        conversion.services.filipinaPassportRenewal = true;
        conversion.paymentDates.filipinaPassportRenewal = contractDates.get('filipina_pp') || [];
      }
      
      // Check Ethiopian Passport Renewal payment
      if (result.isEthiopianPassportRenewalProspect && paidServices.has('ethiopian_pp')) {
        conversion.services.ethiopianPassportRenewal = true;
        conversion.paymentDates.ethiopianPassportRenewal = contractDates.get('ethiopian_pp') || [];
      }
      
      // Only add if there was a conversion
      if (conversion.services.oec || conversion.services.owwa || conversion.services.travelVisa || 
          conversion.services.filipinaPassportRenewal || conversion.services.ethiopianPassportRenewal) {
        conversions.push(conversion);
      }
    }
    
    const response: ConversionResponse = {
      date,
      conversions,
      totalConversions: conversions.length,
      byService: {
        oec: conversions.filter(c => c.services.oec).length,
        owwa: conversions.filter(c => c.services.owwa).length,
        travelVisa: conversions.filter(c => c.services.travelVisa).length,
        filipinaPassportRenewal: conversions.filter(c => c.services.filipinaPassportRenewal).length,
        ethiopianPassportRenewal: conversions.filter(c => c.services.ethiopianPassportRenewal).length,
      },
    };

    // Include complaints analysis if requested
    if (includeComplaints) {
      try {
        const conversionsWithComplaints = await getConversionsWithComplaintCheck(
          dailyData.results,
          date,
          paymentMap,
          paymentDatesMap
        );
        
        const cleanConversionStats = calculateCleanConversionRates(conversionsWithComplaints);
        
        response.complaintsAnalysis = {
          conversionsWithComplaints,
          cleanConversionStats,
        };
      } catch (complaintsError) {
        console.error('Error analyzing complaints:', complaintsError);
        // Continue without complaints analysis rather than failing the entire request
      }
    }

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error calculating conversions:', error);
    return NextResponse.json({ error: 'Failed to calculate conversions' }, { status: 500 });
  }
}

