'use client';

import { useState } from 'react';
import type { ProspectDetail, ServiceFilter } from '@/lib/types';

interface ServiceProspectTableProps {
  prospects: ProspectDetail[];
  service: ServiceFilter;
}

export default function ServiceProspectTable({ prospects, service }: ServiceProspectTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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
      case 'filipinaPassportRenewal':
        return prospects.filter(p => p.isFilipinaPassportRenewalProspect);
      case 'ethiopianPassportRenewal':
        return prospects.filter(p => p.isEthiopianPassportRenewalProspect);
      default:
        return [];
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
      case 'filipinaPassportRenewal':
        return prospect.filipinaPassportRenewalConverted || false;
      case 'ethiopianPassportRenewal':
        return prospect.ethiopianPassportRenewalConverted || false;
      default:
        return false;
    }
  };

  const filteredProspects = getFilteredProspects();
  const showCountries = service === 'travelVisa';

  if (filteredProspects.length === 0) {
    const serviceLabels: Record<ServiceFilter, string> = {
      oec: 'OEC',
      owwa: 'OWWA',
      travelVisa: 'Travel Visa',
      filipinaPassportRenewal: 'Filipina Passport Renewal',
      ethiopianPassportRenewal: 'Ethiopian Passport Renewal',
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleIdExpand(prospect.conversationId)}
                    className="text-left hover:text-blue-600 transition-colors cursor-pointer flex-1"
                    title={expandedIds.has(prospect.conversationId) ? 'Click to collapse' : 'Click to expand'}
                  >
                    {expandedIds.has(prospect.conversationId) ? prospect.conversationId : `${prospect.conversationId?.slice(0, 8)}...`}
                  </button>
                  <button
                    onClick={(e) => copyToClipboard(prospect.conversationId, e)}
                    className="p-1 hover:bg-slate-200 rounded transition-colors group relative"
                    title="Copy ID"
                  >
                    {copiedId === prospect.conversationId ? (
                      <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-slate-400 group-hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
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

