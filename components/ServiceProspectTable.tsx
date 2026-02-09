'use client';

import { useState } from 'react';
import type { ProspectDetail, ServiceFilter } from '@/lib/types';

interface ServiceProspectTableProps {
  prospects: ProspectDetail[];
  service: ServiceFilter;
}

export default function ServiceProspectTable({ prospects, service }: ServiceProspectTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleIdExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  // Filter prospects based on service type
  const getFilteredProspects = (): ProspectDetail[] => {
    switch (service) {
      case 'oec':
        return prospects.filter(p => p.isOECProspect);
      case 'owwa':
        return prospects.filter(p => p.isOWWAProspect);
      case 'travelVisa':
        return prospects.filter(p => p.isTravelVisaProspect);
    }
  };

  const getConvertedStatus = (prospect: ProspectDetail): boolean => {
    switch (service) {
      case 'oec':
        return prospect.oecConverted || false;
      case 'owwa':
        return prospect.owwaConverted || false;
      case 'travelVisa':
        return prospect.travelVisaConverted || false;
    }
  };

  const filteredProspects = getFilteredProspects();
  const showCountries = service === 'travelVisa';

  if (filteredProspects.length === 0) {
    const serviceLabels: Record<ServiceFilter, string> = {
      oec: 'OEC',
      owwa: 'OWWA',
      travelVisa: 'Travel Visa',
    };
    return (
      <div className="py-8 text-center text-slate-400">
        No {serviceLabels[service]} prospects found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="text-left py-3 px-5 font-medium text-slate-600">ID</th>
            <th className="text-left py-3 px-5 font-medium text-slate-600">Client</th>
            <th className="text-left py-3 px-5 font-medium text-slate-600">Maid</th>
            {showCountries && (
              <th className="text-left py-3 px-5 font-medium text-slate-600">Countries</th>
            )}
            <th className="text-left py-3 px-5 font-medium text-slate-600">Contract</th>
            <th className="text-left py-3 px-5 font-medium text-slate-600">Date</th>
            <th className="text-center py-3 px-5 font-medium text-slate-600">Converted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredProspects.map((prospect, idx) => (
            <tr key={`${prospect.conversationId}-${idx}`} className="hover:bg-slate-50 transition-colors">
              <td className="py-3 px-5 font-mono text-xs text-slate-500">
                <button
                  onClick={() => toggleIdExpand(prospect.conversationId)}
                  className="text-left hover:text-blue-600 transition-colors cursor-pointer"
                  title={expandedIds.has(prospect.conversationId) ? 'Click to collapse' : 'Click to expand'}
                >
                  {expandedIds.has(prospect.conversationId) ? prospect.conversationId : `${prospect.conversationId?.slice(0, 8)}...`}
                </button>
              </td>
              <td className="py-3 px-5 text-slate-700">{prospect.clientName || '—'}</td>
              <td className="py-3 px-5 text-slate-700">{prospect.maidName || '—'}</td>
              {showCountries && (
                <td className="py-3 px-5">
                  <div className="flex flex-wrap gap-1">
                    {prospect.travelVisaCountries?.length > 0 ? (
                      prospect.travelVisaCountries.map((country, i) => (
                        <span key={i} className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                          {country}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>
                </td>
              )}
              <td className="py-3 px-5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  prospect.contractType === 'CC' 
                    ? 'bg-blue-100 text-blue-700' 
                    : prospect.contractType === 'MV'
                      ? 'bg-sky-100 text-sky-700'
                      : 'bg-slate-100 text-slate-600'
                }`}>
                  {prospect.contractType || '—'}
                </span>
              </td>
              <td className="py-3 px-5 text-slate-500 text-xs">
                {prospect.chatStartDateTime ? new Date(prospect.chatStartDateTime).toLocaleDateString() : '—'}
              </td>
              <td className="py-3 px-5 text-center">
                {getConvertedStatus(prospect) ? (
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Yes</span>
                ) : (
                  <span className="text-xs text-slate-400">No</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

