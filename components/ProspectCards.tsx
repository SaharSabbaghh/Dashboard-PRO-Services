'use client';

import type { ProspectDetail, ByContractType, Conversions } from '@/lib/types';

interface ProspectCardsProps {
  oecCount: number;
  owwaCount: number;
  travelVisaCount: number;
  filipinaPassportRenewalCount: number;
  ethiopianPassportRenewalCount: number;
  totalProcessed: number;
  conversions?: Conversions;
  byContractType?: ByContractType;
  prospectDetails?: ProspectDetail[];
  isLoading?: boolean;
}

export default function ProspectCards({ 
  oecCount, 
  owwaCount, 
  travelVisaCount, 
  filipinaPassportRenewalCount,
  ethiopianPassportRenewalCount,
  totalProcessed,
  conversions,
  byContractType,
  prospectDetails,
  isLoading 
}: ProspectCardsProps) {
  const calcRate = (converted: number, total: number) => 
    total > 0 ? Math.round((converted / total) * 100) : 0;

  const totalProspects = oecCount + owwaCount + travelVisaCount + filipinaPassportRenewalCount + ethiopianPassportRenewalCount;
  
  // Calculate CC and MV totals
  const ccTotal = byContractType 
    ? (byContractType.CC.oec + byContractType.CC.owwa + byContractType.CC.travelVisa + (byContractType.CC.filipinaPassportRenewal || 0) + (byContractType.CC.ethiopianPassportRenewal || 0)) 
    : 0;
  const mvTotal = byContractType 
    ? (byContractType.MV.oec + byContractType.MV.owwa + byContractType.MV.travelVisa + (byContractType.MV.filipinaPassportRenewal || 0) + (byContractType.MV.ethiopianPassportRenewal || 0)) 
    : 0;
  const ccPercent = totalProspects > 0 ? ((ccTotal / totalProspects) * 100).toFixed(1) : '0';
  const mvPercent = totalProspects > 0 ? ((mvTotal / totalProspects) * 100).toFixed(1) : '0';
  const totalConverted = (conversions?.oec || 0) + (conversions?.owwa || 0) + (conversions?.travelVisa || 0) + (conversions?.filipinaPassportRenewal || 0) + (conversions?.ethiopianPassportRenewal || 0);
  const overallRate = calcRate(totalConverted, totalProspects);

  // Calculate average confidence across all prospect types
  const calcAvgConfidence = (): number | null => {
    if (!prospectDetails || prospectDetails.length === 0) return null;
    
    const allConfidences: number[] = [];
    prospectDetails.forEach(p => {
      if (p.isOECProspect && p.isOECProspectConfidence !== undefined) {
        allConfidences.push(p.isOECProspectConfidence);
      }
      if (p.isOWWAProspect && p.isOWWAProspectConfidence !== undefined) {
        allConfidences.push(p.isOWWAProspectConfidence);
      }
      if (p.isTravelVisaProspect && p.isTravelVisaProspectConfidence !== undefined) {
        allConfidences.push(p.isTravelVisaProspectConfidence);
      }
      if (p.isFilipinaPassportRenewalProspect && p.isFilipinaPassportRenewalProspectConfidence !== undefined) {
        allConfidences.push(p.isFilipinaPassportRenewalProspectConfidence);
      }
      if (p.isEthiopianPassportRenewalProspect && p.isEthiopianPassportRenewalProspectConfidence !== undefined) {
        allConfidences.push(p.isEthiopianPassportRenewalProspectConfidence);
      }
    });
    
    if (allConfidences.length === 0) return null;
    return Math.round((allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length) * 100);
  };

  const avgConfidence = calcAvgConfidence();

  const cards = [
    {
      title: 'Unique OEC Prospects',
      count: oecCount,
      converted: conversions?.oec || 0,
      rate: calcRate(conversions?.oec || 0, oecCount),
    },
    {
      title: 'Unique OWWA Prospects',
      count: owwaCount,
      converted: conversions?.owwa || 0,
      rate: calcRate(conversions?.owwa || 0, owwaCount),
    },
    {
      title: 'Unique Visa Prospects',
      count: travelVisaCount,
      converted: conversions?.travelVisa || 0,
      rate: calcRate(conversions?.travelVisa || 0, travelVisaCount),
    },
    {
      title: 'Filipina PP Renewal',
      count: filipinaPassportRenewalCount,
      converted: conversions?.filipinaPassportRenewal || 0,
      rate: calcRate(conversions?.filipinaPassportRenewal || 0, filipinaPassportRenewalCount),
    },
    {
      title: 'Ethiopian PP Renewal',
      count: ethiopianPassportRenewalCount,
      converted: conversions?.ethiopianPassportRenewal || 0,
      rate: calcRate(conversions?.ethiopianPassportRenewal || 0, ethiopianPassportRenewalCount),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Main cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-4 items-stretch">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm flex flex-col h-full"
          >
            <p className="text-sm font-medium text-slate-600 mb-auto">{card.title}</p>
            <div className="mt-auto">
              <p className="text-3xl font-bold text-slate-800">
                {isLoading ? '...' : card.count}
              </p>
              <div className="h-5 mt-2">
                {conversions && card.count > 0 && (
                  <p className="text-sm text-green-600 font-medium">
                    {card.converted} converted ({card.rate}%)
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Total Prospects */}
        <div className="bg-white border-2 border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-full">
          <p className="text-sm font-medium text-slate-600 mb-auto">Total Prospects</p>
          <div className="mt-auto">
            <p className="text-3xl font-bold text-slate-800">
              {isLoading ? '...' : totalProspects}
            </p>
            <div className="h-5 mt-2">
              {conversions && totalProspects > 0 && (
                <p className="text-sm text-green-600 font-medium">
                  {overallRate}% CVR
                </p>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              of {totalProcessed} analyzed
            </p>
          </div>
        </div>

        {/* Average Confidence */}
        <div className="bg-slate-800 rounded-xl p-5 border-2 border-slate-700 shadow-sm text-white flex flex-col h-full">
          <p className="text-sm font-medium text-slate-300 mb-auto">Avg LLM Confidence</p>
          <div className="mt-auto">
            <p className="text-3xl font-bold">
              {isLoading ? '...' : avgConfidence !== null ? `${avgConfidence}%` : '—'}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              AI detection certainty
            </p>
          </div>
        </div>
      </div>

      {/* CC and MV cards row */}
      {byContractType && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-600">CC Contract</p>
            <p className="text-3xl font-bold mt-2 text-slate-800">
              {isLoading ? '...' : ccTotal}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              {ccPercent}% of total prospects
            </p>
          </div>

          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-600">MV Contract</p>
            <p className="text-3xl font-bold mt-2 text-slate-800">
              {isLoading ? '...' : mvTotal}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              {mvPercent}% of total prospects
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
