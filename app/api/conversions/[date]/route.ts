import { NextResponse } from 'next/server';
import { getDailyDataBlob } from '@/lib/blob-storage';
import { getPnLComplaintsDataAsync } from '@/lib/pnl-complaints-processor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ConversionResult {
  contractId: string;
  services: {
    oec: boolean;
    owwa: boolean;
    travelVisa: boolean;
  };
  complaintDates: {
    oec?: string[];
    owwa?: string[];
    travelVisa?: string[];
  };
}

/**
 * GET /api/conversions/[date]
 * 
 * Checks which prospects converted based on complaints data for a specific date.
 * Returns conversions that happened on that date only.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await context.params;
    
    // Get daily conversation data
    const dailyData = await getDailyDataBlob(date);
    if (!dailyData) {
      return NextResponse.json({ error: 'No data for this date' }, { status: 404 });
    }
    
    // Get complaints data
    const complaintsData = await getPnLComplaintsDataAsync();
    if (!complaintsData) {
      return NextResponse.json({ 
        conversions: [],
        message: 'No complaints data available'
      });
    }
    
    const conversions: ConversionResult[] = [];
    const dateStart = new Date(date + 'T00:00:00Z');
    const dateEnd = new Date(date + 'T23:59:59Z');
    
    // For each prospect conversation, check if it appears in complaints
    for (const result of dailyData.results) {
      if (!result.contractId) continue;
      
      const isProspect = result.isOECProspect || result.isOWWAProspect || result.isTravelVisaProspect;
      if (!isProspect) continue;
      
      const conversion: ConversionResult = {
        contractId: result.contractId,
        services: {
          oec: false,
          owwa: false,
          travelVisa: false,
        },
        complaintDates: {},
      };
      
      // Check OEC complaints
      if (result.isOECProspect) {
        const oecSale = complaintsData.services.oec.sales.find(
          s => s.contractId === result.contractId
        );
        if (oecSale) {
          // Check if any complaint date matches the specified date
          const datesOnThisDay = oecSale.complaintDates.filter(complaintDate => {
            const d = new Date(complaintDate);
            return d >= dateStart && d <= dateEnd;
          });
          if (datesOnThisDay.length > 0) {
            conversion.services.oec = true;
            conversion.complaintDates.oec = datesOnThisDay;
          }
        }
      }
      
      // Check OWWA complaints
      if (result.isOWWAProspect) {
        const owwaSale = complaintsData.services.owwa.sales.find(
          s => s.contractId === result.contractId
        );
        if (owwaSale) {
          const datesOnThisDay = owwaSale.complaintDates.filter(complaintDate => {
            const d = new Date(complaintDate);
            return d >= dateStart && d <= dateEnd;
          });
          if (datesOnThisDay.length > 0) {
            conversion.services.owwa = true;
            conversion.complaintDates.owwa = datesOnThisDay;
          }
        }
      }
      
      // Check Travel Visa complaints (TTL, TTE, TTJ based on countries)
      if (result.isTravelVisaProspect && result.travelVisaCountries.length > 0) {
        const countries = result.travelVisaCountries.map(c => c.toLowerCase());
        let hasConversion = false;
        const visaDates: string[] = [];
        
        // Check TTL (Lebanon)
        if (countries.includes('lebanon')) {
          const ttlSale = complaintsData.services.ttl.sales.find(
            s => s.contractId === result.contractId
          );
          if (ttlSale) {
            const datesOnThisDay = ttlSale.complaintDates.filter(complaintDate => {
              const d = new Date(complaintDate);
              return d >= dateStart && d <= dateEnd;
            });
            if (datesOnThisDay.length > 0) {
              hasConversion = true;
              visaDates.push(...datesOnThisDay);
            }
          }
        }
        
        // Check TTE (Egypt)
        if (countries.includes('egypt')) {
          const tteSale = complaintsData.services.tte.sales.find(
            s => s.contractId === result.contractId
          );
          if (tteSale) {
            const datesOnThisDay = tteSale.complaintDates.filter(complaintDate => {
              const d = new Date(complaintDate);
              return d >= dateStart && d <= dateEnd;
            });
            if (datesOnThisDay.length > 0) {
              hasConversion = true;
              visaDates.push(...datesOnThisDay);
            }
          }
        }
        
        // Check TTJ (Jordan)
        if (countries.includes('jordan')) {
          const ttjSale = complaintsData.services.ttj.sales.find(
            s => s.contractId === result.contractId
          );
          if (ttjSale) {
            const datesOnThisDay = ttjSale.complaintDates.filter(complaintDate => {
              const d = new Date(complaintDate);
              return d >= dateStart && d <= dateEnd;
            });
            if (datesOnThisDay.length > 0) {
              hasConversion = true;
              visaDates.push(...datesOnThisDay);
            }
          }
        }
        
        if (hasConversion) {
          conversion.services.travelVisa = true;
          conversion.complaintDates.travelVisa = visaDates;
        }
      }
      
      // Only add if there was a conversion
      if (conversion.services.oec || conversion.services.owwa || conversion.services.travelVisa) {
        conversions.push(conversion);
      }
    }
    
    return NextResponse.json({
      date,
      conversions,
      totalConversions: conversions.length,
      byService: {
        oec: conversions.filter(c => c.services.oec).length,
        owwa: conversions.filter(c => c.services.owwa).length,
        travelVisa: conversions.filter(c => c.services.travelVisa).length,
      },
    });
    
  } catch (error) {
    console.error('Error calculating conversions:', error);
    return NextResponse.json({ error: 'Failed to calculate conversions' }, { status: 500 });
  }
}

