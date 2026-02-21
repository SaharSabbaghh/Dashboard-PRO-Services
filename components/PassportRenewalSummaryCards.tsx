'use client';

import type { ProspectDetail, ByContractType, Conversions } from '@/lib/types';

interface PassportRenewalSummaryCardsProps {
  filipinaCount: number;
  ethiopianCount: number;
  conversions?: Conversions;
  byContractType?: ByContractType;
  prospectDetails?: ProspectDetail[];
}

export default function PassportRenewalSummaryCards({
  filipinaCount,
  ethiopianCount,
  conversions,
  byContractType,
  prospectDetails,
}: PassportRenewalSummaryCardsProps) {
  const totalCount = filipinaCount + ethiopianCount;
  const filipinaConversionCount = conversions?.filipinaPassportRenewal || 0;
  const ethiopianConversionCount = conversions?.ethiopianPassportRenewal || 0;
  const totalConversionCount = filipinaConversionCount + ethiopianConversionCount;

  const filipinaCCCount = byContractType?.CC?.filipinaPassportRenewal || 0;
  const filipinaMVCount = byContractType?.MV?.filipinaPassportRenewal || 0;
  const ethiopianCCCount = byContractType?.CC?.ethiopianPassportRenewal || 0;
  const ethiopianMVCount = byContractType?.MV?.ethiopianPassportRenewal || 0;
  const totalCCCount = filipinaCCCount + ethiopianCCCount;
  const totalMVCount = filipinaMVCount + ethiopianMVCount;
  const totalContract = totalCCCount + totalMVCount;

  // Calculate average confidence for Filipina
  const calculateFilipinaAvgConfidence = (): string => {
    if (!prospectDetails || prospectDetails.length === 0) return '—';
    const relevantProspects = prospectDetails.filter(
      p => p.isFilipinaPassportRenewalProspect && p.isFilipinaPassportRenewalProspectConfidence !== undefined
    );
    if (relevantProspects.length === 0) return '—';
    const avg = relevantProspects.reduce(
      (sum, p) => sum + ((p.isFilipinaPassportRenewalProspectConfidence || 0)),
      0
    ) / relevantProspects.length;
    return `${Math.round(avg * 100)}%`;
  };

  // Calculate average confidence for Ethiopian
  const calculateEthiopianAvgConfidence = (): string => {
    if (!prospectDetails || prospectDetails.length === 0) return '—';
    const relevantProspects = prospectDetails.filter(
      p => p.isEthiopianPassportRenewalProspect && p.isEthiopianPassportRenewalProspectConfidence !== undefined
    );
    if (relevantProspects.length === 0) return '—';
    const avg = relevantProspects.reduce(
      (sum, p) => sum + ((p.isEthiopianPassportRenewalProspectConfidence || 0)),
      0
    ) / relevantProspects.length;
    return `${Math.round(avg * 100)}%`;
  };

  return (
    <div className="space-y-4">
      {/* Combined totals row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Prospects */}
        <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm flex flex-col">
          <p className="text-sm font-medium text-slate-600">Total Passport Renewal Prospects</p>
          <p className="text-3xl font-bold text-slate-800 mt-auto">{totalCount}</p>
        </div>

        {/* Total Conversions */}
        <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm flex flex-col">
          <p className="text-sm font-medium text-slate-600">Total Conversions</p>
          <p className="text-3xl font-bold text-slate-800 mt-auto">{totalConversionCount}</p>
          <p className="text-sm text-slate-500 mt-2">
            {totalCount > 0 ? `${((totalConversionCount / totalCount) * 100).toFixed(1)}% CVR` : '—'}
          </p>
        </div>

        {/* CC Contract */}
        <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm flex flex-col">
          <p className="text-sm font-medium text-slate-600">CC Contract</p>
          <p className="text-3xl font-bold text-slate-800 mt-auto">{totalCCCount}</p>
          <p className="text-sm text-slate-500 mt-2">
            {totalContract > 0 ? `${((totalCCCount / totalContract) * 100).toFixed(1)}% of total` : '—'}
          </p>
        </div>

        {/* MV Contract */}
        <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm flex flex-col">
          <p className="text-sm font-medium text-slate-600">MV Contract</p>
          <p className="text-3xl font-bold text-slate-800 mt-auto">{totalMVCount}</p>
          <p className="text-sm text-slate-500 mt-2">
            {totalContract > 0 ? `${((totalMVCount / totalContract) * 100).toFixed(1)}% of total` : '—'}
          </p>
        </div>

        {/* Avg Confidence */}
        <div className="bg-slate-800 rounded-xl p-5 border-2 border-slate-700 shadow-sm text-white flex flex-col">
          <p className="text-sm font-medium text-slate-300">Avg LLM Confidence</p>
          <p className="text-3xl font-bold mt-auto">
            {(() => {
              const filipinaConf = calculateFilipinaAvgConfidence();
              const ethiopianConf = calculateEthiopianAvgConfidence();
              if (filipinaConf === '—' && ethiopianConf === '—') return '—';
              if (filipinaConf === '—') return ethiopianConf;
              if (ethiopianConf === '—') return filipinaConf;
              // Calculate weighted average
              const filipinaNum = parseFloat(filipinaConf.replace('%', ''));
              const ethiopianNum = parseFloat(ethiopianConf.replace('%', ''));
              const filipinaRelevant = prospectDetails?.filter(p => p.isFilipinaPassportRenewalProspect && p.isFilipinaPassportRenewalProspectConfidence !== undefined).length || 0;
              const ethiopianRelevant = prospectDetails?.filter(p => p.isEthiopianPassportRenewalProspect && p.isEthiopianPassportRenewalProspectConfidence !== undefined).length || 0;
              const totalRelevant = filipinaRelevant + ethiopianRelevant;
              if (totalRelevant === 0) return '—';
              const weightedAvg = ((filipinaNum * filipinaRelevant) + (ethiopianNum * ethiopianRelevant)) / totalRelevant;
              return `${Math.round(weightedAvg)}%`;
            })()}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            AI detection certainty
          </p>
        </div>
      </div>

      {/* Breakdown by type */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Filipina Prospects */}
        <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm flex flex-col">
          <p className="text-sm font-medium text-slate-600">Filipina PP Prospects</p>
          <p className="text-3xl font-bold text-slate-800 mt-auto">{filipinaCount}</p>
          {filipinaCount > 0 && (
            <p className="text-sm text-slate-500 mt-2">
              {filipinaConversionCount} converted ({((filipinaConversionCount / filipinaCount) * 100).toFixed(1)}%)
            </p>
          )}
        </div>

        {/* Ethiopian Prospects */}
        <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm flex flex-col">
          <p className="text-sm font-medium text-slate-600">Ethiopian PP Prospects</p>
          <p className="text-3xl font-bold text-slate-800 mt-auto">{ethiopianCount}</p>
          {ethiopianCount > 0 && (
            <p className="text-sm text-slate-500 mt-2">
              {ethiopianConversionCount} converted ({((ethiopianConversionCount / ethiopianCount) * 100).toFixed(1)}%)
            </p>
          )}
        </div>

        {/* Filipina Avg Confidence */}
        <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm flex flex-col">
          <p className="text-sm font-medium text-slate-600">Filipina Avg Confidence</p>
          <p className="text-3xl font-bold text-slate-800 mt-auto">{calculateFilipinaAvgConfidence()}</p>
        </div>

        {/* Ethiopian Avg Confidence */}
        <div className="bg-white rounded-xl p-5 border-2 border-slate-200 shadow-sm flex flex-col">
          <p className="text-sm font-medium text-slate-600">Ethiopian Avg Confidence</p>
          <p className="text-3xl font-bold text-slate-800 mt-auto">{calculateEthiopianAvgConfidence()}</p>
        </div>
      </div>
    </div>
  );
}

