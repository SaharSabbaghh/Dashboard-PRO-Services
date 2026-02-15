'use client';

import type { ProspectDetail, ByContractType, Conversions, ServiceFilter } from '@/lib/types';

interface ServiceSummaryCardsProps {
  service: ServiceFilter;
  prospectCount: number;
  conversions?: Conversions;
  byContractType?: ByContractType;
  prospectDetails?: ProspectDetail[];
}

export default function ServiceSummaryCards({
  service,
  prospectCount,
  conversions,
  byContractType,
  prospectDetails,
}: ServiceSummaryCardsProps) {
  const serviceLabels: Record<ServiceFilter, string> = {
    oec: 'OEC',
    owwa: 'OWWA',
    travelVisa: 'Travel Visa',
    filipinaPassportRenewal: 'Filipina Passport Renewal',
    ethiopianPassportRenewal: 'Ethiopian Passport Renewal',
  };

  const conversionCount = conversions?.[service] || 0;
  const ccCount = byContractType?.CC?.[service] || 0;
  const mvCount = byContractType?.MV?.[service] || 0;
  const totalContract = ccCount + mvCount;

  // Calculate average confidence
  const calculateAvgConfidence = (): string => {
    if (!prospectDetails || prospectDetails.length === 0) return '—';

    const confidenceKey = `is${service.charAt(0).toUpperCase() + service.slice(1)}ProspectConfidence` as keyof ProspectDetail;
    const prospectKey = `is${service.charAt(0).toUpperCase() + service.slice(1)}Prospect` as keyof ProspectDetail;

    // Handle the different key names
    const getProspectKey = (): keyof ProspectDetail => {
      switch (service) {
        case 'oec': return 'isOECProspect';
        case 'owwa': return 'isOWWAProspect';
        case 'travelVisa': return 'isTravelVisaProspect';
        case 'filipinaPassportRenewal': return 'isFilipinaPassportRenewalProspect';
        case 'ethiopianPassportRenewal': return 'isEthiopianPassportRenewalProspect';
      }
    };

    const getConfidenceKey = (): keyof ProspectDetail => {
      switch (service) {
        case 'oec': return 'isOECProspectConfidence';
        case 'owwa': return 'isOWWAProspectConfidence';
        case 'travelVisa': return 'isTravelVisaProspectConfidence';
        case 'filipinaPassportRenewal': return 'isFilipinaPassportRenewalProspectConfidence';
        case 'ethiopianPassportRenewal': return 'isEthiopianPassportRenewalProspectConfidence';
      }
    };

    const pKey = getProspectKey();
    const cKey = getConfidenceKey();

    const relevantProspects = prospectDetails.filter(
      p => p[pKey] && p[cKey] !== undefined
    );

    if (relevantProspects.length === 0) return '—';

    const avg = relevantProspects.reduce(
      (sum, p) => sum + ((p[cKey] as number) || 0),
      0
    ) / relevantProspects.length;

    return `${Math.round(avg * 100)}%`;
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Prospects Count */}
      <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm">
        <p className="text-sm font-medium text-slate-600">Unique {serviceLabels[service]} Prospects</p>
        <p className="text-3xl font-bold text-slate-800 mt-2">{prospectCount}</p>
      </div>

      {/* Conversions */}
      <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm">
        <p className="text-sm font-medium text-slate-600">Unique Conversions</p>
        <p className="text-3xl font-bold text-slate-800 mt-2">{conversionCount}</p>
        <p className="text-sm text-slate-500 mt-2">
          {prospectCount > 0 ? `${((conversionCount / prospectCount) * 100).toFixed(1)}% CVR` : '—'}
        </p>
      </div>

      {/* CC Contract */}
      <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm">
        <p className="text-sm font-medium text-slate-600">CC Contract</p>
        <p className="text-3xl font-bold text-slate-800 mt-2">{ccCount}</p>
        <p className="text-sm text-slate-500 mt-2">
          {totalContract > 0 ? `${((ccCount / totalContract) * 100).toFixed(1)}% of total` : '—'}
        </p>
      </div>

      {/* MV Contract */}
      <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm">
        <p className="text-sm font-medium text-slate-600">MV Contract</p>
        <p className="text-3xl font-bold text-slate-800 mt-2">{mvCount}</p>
        <p className="text-sm text-slate-500 mt-2">
          {totalContract > 0 ? `${((mvCount / totalContract) * 100).toFixed(1)}% of total` : '—'}
        </p>
      </div>

      {/* Avg Confidence */}
      <div className="bg-slate-800 rounded-xl p-5 border-2 border-slate-700 shadow-sm text-white">
        <p className="text-sm font-medium text-slate-300">Avg LLM Confidence</p>
        <p className="text-3xl font-bold mt-2">{calculateAvgConfidence()}</p>
        <p className="text-xs text-slate-400 mt-2">
          AI detection certainty
        </p>
      </div>
    </div>
  );
}

