import { NextResponse } from 'next/server';
import { getDailyData, getLatestRun, getProspectDetailsByDate, getProspectsGroupedByHousehold } from '@/lib/unified-storage';
import { getAllComplaintsBeforeDate, filterProspectsWithoutPreviousComplaints } from '@/lib/complaints-conversion-service';

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
    // Get all available complaints and filter by creationDate matching the prospect date
    // This ensures we match complaints even if they were stored on a different date
    const { getAvailableDailyComplaintsDates, getDailyComplaints } = await import('@/lib/daily-complaints-storage');
    const datesResult = await getAvailableDailyComplaintsDates();
    
    if (!datesResult.success || !datesResult.dates || datesResult.dates.length === 0) {
      console.log(`[${date}] No complaints data available - all conversions = 0`);
      return { oec: 0, owwa: 0, travelVisa: 0, filipinaPassportRenewal: 0, ethiopianPassportRenewal: 0 };
    }

    // Fetch all complaints from all dates
    const allComplaintsResults = await Promise.all(
      datesResult.dates.map(d => getDailyComplaints(d))
    );
    
    // Combine all complaints and filter by creationDate matching the prospect date
    const complaints = allComplaintsResults
      .filter(r => r.success && r.data)
      .flatMap(r => r.data!.complaints)
      .filter(complaint => {
        // Match complaints where creationDate matches the prospect date
        if (!complaint.creationDate) return false;
        // Handle both ISO format (2026-02-22T14:35:48.000) and space format (2026-02-22 14:35:48.000)
        const complaintDate = complaint.creationDate.split(/[T ]/)[0]; // Extract YYYY-MM-DD
        return complaintDate === date;
      });
    
    console.log(`[${date}] Found ${complaints.length} complaints with creationDate=${date} for conversion calculation`);

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
          } else if (['ttl', 'ttlSingle', 'ttlDouble', 'ttlMultiple', 'tte', 'tteSingle', 'tteDouble', 'tteMultiple', 'ttj', 'schengen', 'gcc'].includes(serviceKey) && prospect.isTravelVisaProspect) {
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
    const allProspects = await getProspectDetailsByDate(date);
    const households = await getProspectsGroupedByHousehold(date);
    
    // Fetch all complaints before the date once (batch operation to avoid rate limiting)
    const complaintsBeforeDate = await getAllComplaintsBeforeDate(date);
    
    // Filter out prospects that have complaints BEFORE the filtered date
    // This ensures we only count prospects without previous open complaints
    // Using batch filtering to avoid making individual API calls for each prospect
    const filteredProspects = filterProspectsWithoutPreviousComplaints(
      allProspects.map(p => ({
        contractId: p.contractId,
        maidId: p.maidId,
        clientId: p.clientId
      })),
      complaintsBeforeDate
    ).map(filtered => {
      // Find the original prospect object to preserve all fields
      return allProspects.find(p => 
        (p.contractId && p.contractId === filtered.contractId) ||
        (p.maidId && p.maidId === filtered.maidId) ||
        (p.clientId && p.clientId === filtered.clientId)
      );
    }).filter((p): p is NonNullable<typeof p> => p !== undefined);
    
    // Recalculate prospect counts from filtered list
    const filteredProspectCounts = {
      oec: filteredProspects.filter(p => p.isOECProspect).length,
      owwa: filteredProspects.filter(p => p.isOWWAProspect).length,
      travelVisa: filteredProspects.filter(p => p.isTravelVisaProspect).length,
      filipinaPassportRenewal: filteredProspects.filter(p => p.isFilipinaPassportRenewalProspect).length,
      ethiopianPassportRenewal: filteredProspects.filter(p => p.isEthiopianPassportRenewalProspect).length,
    };
    
    // Calculate conversions from complaints data (using filtered prospects)
    const conversions = await calculateConversionsForDate(date, filteredProspects);
    
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
        oec: filteredProspectCounts.oec,
        owwa: filteredProspectCounts.owwa,
        travelVisa: filteredProspectCounts.travelVisa,
        filipinaPassportRenewal: filteredProspectCounts.filipinaPassportRenewal,
        ethiopianPassportRenewal: filteredProspectCounts.ethiopianPassportRenewal,
        details: filteredProspects,
      },
      conversions, // Now dynamically calculated from complaints
      countryCounts: data.summary?.countryCounts || {},
      byContractType: data.summary?.byContractType || defaultByContractType,
      latestRun,
      households,
      prospectDetails: filteredProspects, // Add this for compatibility
    });
    
  } catch (error) {
    console.error('[API] Date data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch date data' },
      { status: 500 }
    );
  }
}
