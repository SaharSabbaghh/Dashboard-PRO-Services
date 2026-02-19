import { NextResponse } from 'next/server';
import { getDailyData, getLatestRun, getProspectDetailsByDate, getProspectsGroupedByHousehold } from '@/lib/unified-storage';

// Force Node.js runtime for blob storage operations
export const runtime = 'nodejs';
// Disable caching for dynamic data - ensures fresh data from blob storage
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to calculate conversions from complaints data only
async function calculateConversionsForDate(date: string, prospects: any[]) {
  if (prospects.length === 0) {
    return { oec: 0, owwa: 0, travelVisa: 0, filipinaPassportRenewal: 0, ethiopianPassportRenewal: 0 };
  }
  
  try {
    // Get complaints data for this date
    const { getDailyComplaints } = await import('@/lib/daily-complaints-storage');
    const complaintsResult = await getDailyComplaints(date);
    
    if (!complaintsResult.success || !complaintsResult.data) {
      console.log(`[${date}] No complaints data found - all conversions = 0`);
      return { oec: 0, owwa: 0, travelVisa: 0, filipinaPassportRenewal: 0, ethiopianPassportRenewal: 0 };
    }

    const complaints = complaintsResult.data.complaints;
    console.log(`[${date}] Found ${complaints.length} complaints for conversion calculation`);

    // Create conversion counters
    const conversions = {
      oec: new Set<string>(),
      owwa: new Set<string>(),
      travelVisa: new Set<string>(),
      filipinaPassportRenewal: new Set<string>(),
      ethiopianPassportRenewal: new Set<string>(),
    };

    // For each prospect, check if they have a complaint (which indicates conversion)
    for (const prospect of prospects) {
      // Check if this prospect has complaints that match their prospect type
      const matchingComplaints = complaints.filter(complaint => {
        // Link by contract ID, maid ID, or client ID
        return (
          (prospect.contractId && complaint.contractId === prospect.contractId) ||
          (prospect.maidId && complaint.housemaidId === prospect.maidId) ||
          (prospect.clientId && complaint.clientId === prospect.clientId)
        );
      });

      if (matchingComplaints.length > 0) {
        // Map complaint types to services using existing function
        const { getServiceKeyFromComplaintType } = await import('@/lib/pnl-complaints-types');
        
        for (const complaint of matchingComplaints) {
          const serviceKey = getServiceKeyFromComplaintType(complaint.complaintType);
          if (!serviceKey) continue;
          
          // Map complaint service to prospect service and count as conversion
          const prospectKey = prospect.contractId || prospect.maidId || prospect.clientId;
          if (!prospectKey) continue;
          
          if (serviceKey === 'oec' && prospect.isOECProspect) {
            conversions.oec.add(prospectKey);
          } else if (serviceKey === 'owwa' && prospect.isOWWAProspect) {
            conversions.owwa.add(prospectKey);
          } else if (['ttl', 'ttlSingle', 'ttlDouble', 'ttlMultiple', 'tte', 'tteSingle', 'tteMultiple', 'ttj', 'schengen', 'gcc'].includes(serviceKey) && prospect.isTravelVisaProspect) {
            conversions.travelVisa.add(prospectKey);
          } else if (serviceKey === 'filipinaPP' && prospect.isFilipinaPassportRenewalProspect) {
            conversions.filipinaPassportRenewal.add(prospectKey);
          } else if (serviceKey === 'ethiopianPP' && prospect.isEthiopianPassportRenewalProspect) {
            conversions.ethiopianPassportRenewal.add(prospectKey);
          }
        }
      }
    }
    
    const result = {
      oec: conversions.oec.size,
      owwa: conversions.owwa.size,
      travelVisa: conversions.travelVisa.size,
      filipinaPassportRenewal: conversions.filipinaPassportRenewal.size,
      ethiopianPassportRenewal: conversions.ethiopianPassportRenewal.size,
    };

    console.log(`[${date}] Complaints-based conversions:`, {
      oec: `${result.oec} conversions`,
      owwa: `${result.owwa} conversions`,
      travelVisa: `${result.travelVisa} conversions`,
      filipinaPassportRenewal: `${result.filipinaPassportRenewal} conversions`,
      ethiopianPassportRenewal: `${result.ethiopianPassportRenewal} conversions`
    });
    
    return result;
  } catch (error) {
    console.error('Error calculating complaints-based conversions:', error);
    return { oec: 0, owwa: 0, travelVisa: 0, filipinaPassportRenewal: 0, ethiopianPassportRenewal: 0 };
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
    
    // Calculate conversions from complaints data (not payment data)
    const conversions = await calculateConversionsForDate(date, prospects);
    
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
