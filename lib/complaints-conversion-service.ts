import { getDailyComplaints, type DailyComplaintsData } from './daily-complaints-storage';
import { getServiceKeyFromComplaintType, type PnLServiceKey } from './pnl-complaints-types';
import type { ProcessedConversation } from './storage';

export interface ComplaintCheckResult {
  hasComplaint: boolean;
  complaintTypes: string[];
  complaintDates: string[];
}

export interface ConversionWithComplaintCheck {
  contractId: string;
  services: {
    oec: { converted: boolean; hasComplaint: boolean; complaintTypes: string[] };
    owwa: { converted: boolean; hasComplaint: boolean; complaintTypes: string[] };
    travelVisa: { converted: boolean; hasComplaint: boolean; complaintTypes: string[] };
    filipinaPassportRenewal: { converted: boolean; hasComplaint: boolean; complaintTypes: string[] };
    ethiopianPassportRenewal: { converted: boolean; hasComplaint: boolean; complaintTypes: string[] };
  };
  paymentDates: {
    oec?: string[];
    owwa?: string[];
    travelVisa?: string[];
    filipinaPassportRenewal?: string[];
    ethiopianPassportRenewal?: string[];
  };
}

/**
 * Service key mapping for complaints to prospect services
 */
const COMPLAINT_SERVICE_MAP: Record<PnLServiceKey, keyof ConversionWithComplaintCheck['services']> = {
  oec: 'oec',
  owwa: 'owwa',
  ttl: 'travelVisa',
  ttlSingle: 'travelVisa',
  ttlDouble: 'travelVisa',
  ttlMultiple: 'travelVisa',
  tte: 'travelVisa', 
  tteSingle: 'travelVisa',
  tteMultiple: 'travelVisa',
  ttj: 'travelVisa',
  schengen: 'travelVisa',
  gcc: 'travelVisa',
  filipinaPP: 'filipinaPassportRenewal',
  ethiopianPP: 'ethiopianPassportRenewal',
};

/**
 * Check if a prospect has complaints for specific services on a given date
 * Links by contract ID, maid ID, or client ID
 */
export async function checkComplaintsForProspect(
  prospect: { contractId?: string; maidId?: string; clientId?: string },
  date: string,
  services: PnLServiceKey[]
): Promise<Record<PnLServiceKey, ComplaintCheckResult>> {
  const result: Record<PnLServiceKey, ComplaintCheckResult> = {} as any;
  
  // Initialize all services as no complaints
  services.forEach(service => {
    result[service] = {
      hasComplaint: false,
      complaintTypes: [],
      complaintDates: []
    };
  });

  try {
    // Get complaints data for the date
    const complaintsResult = await getDailyComplaints(date);
    if (!complaintsResult.success || !complaintsResult.data) {
      return result; // No complaints data available
    }

    // Filter complaints for this prospect by contract ID, maid ID, or client ID
    const prospectComplaints = complaintsResult.data.complaints.filter(complaint => {
      return (
        (prospect.contractId && complaint.contractId === prospect.contractId) ||
        (prospect.maidId && complaint.housemaidId === prospect.maidId) ||
        (prospect.clientId && complaint.clientId === prospect.clientId)
      );
    });

    if (prospectComplaints.length === 0) {
      return result; // No complaints for this prospect
    }

    // Check each service
    services.forEach(serviceKey => {
      const serviceComplaints = prospectComplaints.filter(complaint => {
        const complaintServiceKey = getServiceKeyFromComplaintType(complaint.complaintType);
        return complaintServiceKey === serviceKey;
      });

      if (serviceComplaints.length > 0) {
        result[serviceKey] = {
          hasComplaint: true,
          complaintTypes: serviceComplaints.map(c => c.complaintType),
          complaintDates: serviceComplaints.map(c => c.creationDate)
        };
      }
    });

    return result;
  } catch (error) {
    console.error('Error checking complaints for contract:', error);
    return result; // Return no complaints on error
  }
}

/**
 * Check if a prospect has complaints for a specific service on a given date
 * Links by contract ID, maid ID, or client ID
 */
export async function checkProspectHasComplaints(
  prospect: ProcessedConversation,
  date: string,
  service: 'oec' | 'owwa' | 'travelVisa' | 'filipinaPassportRenewal' | 'ethiopianPassportRenewal'
): Promise<boolean> {
  // Map prospect service to complaint service keys
  let serviceKeysToCheck: PnLServiceKey[] = [];
  
  switch (service) {
    case 'oec':
      serviceKeysToCheck = ['oec'];
      break;
    case 'owwa':
      serviceKeysToCheck = ['owwa'];
      break;
    case 'travelVisa':
      serviceKeysToCheck = ['ttl', 'tte', 'ttj', 'schengen', 'gcc'];
      break;
    case 'filipinaPassportRenewal':
      serviceKeysToCheck = ['filipinaPP'];
      break;
    case 'ethiopianPassportRenewal':
      serviceKeysToCheck = ['ethiopianPP'];
      break;
  }

  const complaintChecks = await checkComplaintsForProspect(
    {
      contractId: prospect.contractId,
      maidId: prospect.maidId,
      clientId: prospect.clientId
    },
    date,
    serviceKeysToCheck
  );

  // Check if any of the relevant services have complaints
  return serviceKeysToCheck.some(serviceKey => complaintChecks[serviceKey]?.hasComplaint);
}

/**
 * Get conversion data with complaint information for a specific date
 */
export async function getConversionsWithComplaintCheck(
  prospects: ProcessedConversation[],
  date: string,
  paymentMap: Map<string, Set<'oec' | 'owwa' | 'travel_visa' | 'filipina_pp' | 'ethiopian_pp'>>,
  paymentDatesMap: Map<string, Map<'oec' | 'owwa' | 'travel_visa' | 'filipina_pp' | 'ethiopian_pp', string[]>>
): Promise<ConversionWithComplaintCheck[]> {
  const conversions: ConversionWithComplaintCheck[] = [];

  for (const prospect of prospects) {
    if (!prospect.contractId) continue;
    
    const isProspect = prospect.isOECProspect || prospect.isOWWAProspect || prospect.isTravelVisaProspect || 
                       prospect.isFilipinaPassportRenewalProspect || prospect.isEthiopianPassportRenewalProspect;
    if (!isProspect) continue;

    const paidServices = paymentMap.get(prospect.contractId);
    const contractDates = paymentDatesMap.get(prospect.contractId);

    // Check complaints for all relevant services
    const servicesToCheck: PnLServiceKey[] = [];
    if (prospect.isOECProspect) servicesToCheck.push('oec');
    if (prospect.isOWWAProspect) servicesToCheck.push('owwa');
    if (prospect.isTravelVisaProspect) servicesToCheck.push('ttl', 'tte', 'ttj', 'schengen', 'gcc');
    if (prospect.isFilipinaPassportRenewalProspect) servicesToCheck.push('filipinaPP');
    if (prospect.isEthiopianPassportRenewalProspect) servicesToCheck.push('ethiopianPP');

    const complaintChecks = await checkComplaintsForProspect(
      {
        contractId: prospect.contractId,
        maidId: prospect.maidId,
        clientId: prospect.clientId
      },
      date,
      servicesToCheck
    );

    const conversion: ConversionWithComplaintCheck = {
      contractId: prospect.contractId,
      services: {
        oec: { 
          converted: false, 
          hasComplaint: complaintChecks.oec?.hasComplaint || false,
          complaintTypes: complaintChecks.oec?.complaintTypes || []
        },
        owwa: { 
          converted: false, 
          hasComplaint: complaintChecks.owwa?.hasComplaint || false,
          complaintTypes: complaintChecks.owwa?.complaintTypes || []
        },
        travelVisa: { 
          converted: false, 
          hasComplaint: ['ttl', 'ttlSingle', 'ttlDouble', 'ttlMultiple', 'tte', 'tteSingle', 'tteDouble', 'tteMultiple', 'ttj', 'schengen', 'gcc'].some(key => 
            complaintChecks[key as PnLServiceKey]?.hasComplaint
          ),
          complaintTypes: ['ttl', 'ttlSingle', 'ttlDouble', 'ttlMultiple', 'tte', 'tteSingle', 'tteDouble', 'tteMultiple', 'ttj', 'schengen', 'gcc'].flatMap(key => 
            complaintChecks[key as PnLServiceKey]?.complaintTypes || []
          )
        },
        filipinaPassportRenewal: { 
          converted: false, 
          hasComplaint: complaintChecks.filipinaPP?.hasComplaint || false,
          complaintTypes: complaintChecks.filipinaPP?.complaintTypes || []
        },
        ethiopianPassportRenewal: { 
          converted: false, 
          hasComplaint: complaintChecks.ethiopianPP?.hasComplaint || false,
          complaintTypes: complaintChecks.ethiopianPP?.complaintTypes || []
        },
      },
      paymentDates: {},
    };

    // Check conversions (payments) only if there are paid services
    if (paidServices && paidServices.size > 0 && contractDates) {
      // Check OEC conversion
      if (prospect.isOECProspect && paidServices.has('oec')) {
        conversion.services.oec.converted = true;
        conversion.paymentDates.oec = contractDates.get('oec') || [];
      }

      // Check OWWA conversion
      if (prospect.isOWWAProspect && paidServices.has('owwa')) {
        conversion.services.owwa.converted = true;
        conversion.paymentDates.owwa = contractDates.get('owwa') || [];
      }

      // Check Travel Visa conversion
      if (prospect.isTravelVisaProspect && paidServices.has('travel_visa')) {
        conversion.services.travelVisa.converted = true;
        conversion.paymentDates.travelVisa = contractDates.get('travel_visa') || [];
      }

      // Check Filipina Passport Renewal conversion
      if (prospect.isFilipinaPassportRenewalProspect && paidServices.has('filipina_pp')) {
        conversion.services.filipinaPassportRenewal.converted = true;
        conversion.paymentDates.filipinaPassportRenewal = contractDates.get('filipina_pp') || [];
      }

      // Check Ethiopian Passport Renewal conversion
      if (prospect.isEthiopianPassportRenewalProspect && paidServices.has('ethiopian_pp')) {
        conversion.services.ethiopianPassportRenewal.converted = true;
        conversion.paymentDates.ethiopianPassportRenewal = contractDates.get('ethiopian_pp') || [];
      }
    }

    // Add to results if it's a prospect (regardless of conversion status)
    conversions.push(conversion);
  }

  return conversions;
}

/**
 * Calculate conversion rates excluding prospects with complaints
 */
export function calculateCleanConversionRates(conversions: ConversionWithComplaintCheck[]) {
  const stats = {
    oec: { prospects: 0, conversions: 0, withComplaints: 0, cleanConversions: 0 },
    owwa: { prospects: 0, conversions: 0, withComplaints: 0, cleanConversions: 0 },
    travelVisa: { prospects: 0, conversions: 0, withComplaints: 0, cleanConversions: 0 },
    filipinaPassportRenewal: { prospects: 0, conversions: 0, withComplaints: 0, cleanConversions: 0 },
    ethiopianPassportRenewal: { prospects: 0, conversions: 0, withComplaints: 0, cleanConversions: 0 },
  };

  conversions.forEach(conversion => {
    Object.keys(stats).forEach(service => {
      const serviceKey = service as keyof typeof stats;
      const serviceData = conversion.services[serviceKey];
      
      if (serviceData) {
        stats[serviceKey].prospects++;
        
        if (serviceData.converted) {
          stats[serviceKey].conversions++;
          
          // Only count as clean conversion if no complaint
          if (!serviceData.hasComplaint) {
            stats[serviceKey].cleanConversions++;
          }
        }
        
        if (serviceData.hasComplaint) {
          stats[serviceKey].withComplaints++;
        }
      }
    });
  });

  return {
    stats,
    rates: {
      oec: {
        overall: stats.oec.prospects > 0 ? (stats.oec.conversions / stats.oec.prospects * 100) : 0,
        clean: stats.oec.prospects > 0 ? (stats.oec.cleanConversions / stats.oec.prospects * 100) : 0,
      },
      owwa: {
        overall: stats.owwa.prospects > 0 ? (stats.owwa.conversions / stats.owwa.prospects * 100) : 0,
        clean: stats.owwa.prospects > 0 ? (stats.owwa.cleanConversions / stats.owwa.prospects * 100) : 0,
      },
      travelVisa: {
        overall: stats.travelVisa.prospects > 0 ? (stats.travelVisa.conversions / stats.travelVisa.prospects * 100) : 0,
        clean: stats.travelVisa.prospects > 0 ? (stats.travelVisa.cleanConversions / stats.travelVisa.prospects * 100) : 0,
      },
      filipinaPassportRenewal: {
        overall: stats.filipinaPassportRenewal.prospects > 0 ? (stats.filipinaPassportRenewal.conversions / stats.filipinaPassportRenewal.prospects * 100) : 0,
        clean: stats.filipinaPassportRenewal.prospects > 0 ? (stats.filipinaPassportRenewal.cleanConversions / stats.filipinaPassportRenewal.prospects * 100) : 0,
      },
      ethiopianPassportRenewal: {
        overall: stats.ethiopianPassportRenewal.prospects > 0 ? (stats.ethiopianPassportRenewal.conversions / stats.ethiopianPassportRenewal.prospects * 100) : 0,
        clean: stats.ethiopianPassportRenewal.prospects > 0 ? (stats.ethiopianPassportRenewal.cleanConversions / stats.ethiopianPassportRenewal.prospects * 100) : 0,
      },
    }
  };
}
