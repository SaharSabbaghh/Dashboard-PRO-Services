'use client';

import { useState } from 'react';
import type { ProspectDetail, HouseholdGroup } from '@/lib/types';

interface ProspectTableProps {
  prospects: ProspectDetail[];
  households?: HouseholdGroup[];
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 'All'] as const;
type ViewMode = 'flat' | 'household';

export default function ProspectTable({ prospects, households }: ProspectTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'All'>(50);
  const [viewMode, setViewMode] = useState<ViewMode>('flat');
  const [expandedHouseholds, setExpandedHouseholds] = useState<Set<string>>(new Set());
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

  if (prospects.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 bg-white rounded-lg border border-slate-200">
        <p className="text-slate-400 text-sm">No prospects found</p>
      </div>
    );
  }

  const toggleHousehold = (householdId: string) => {
    setExpandedHouseholds(prev => {
      const next = new Set(prev);
      if (next.has(householdId)) {
        next.delete(householdId);
      } else {
        next.add(householdId);
      }
      return next;
    });
  };

  const effectivePageSize = pageSize === 'All' ? prospects.length : pageSize;
  const totalPages = Math.ceil(prospects.length / effectivePageSize);
  const startIndex = (currentPage - 1) * effectivePageSize;
  const endIndex = Math.min(startIndex + effectivePageSize, prospects.length);
  const displayedProspects = prospects.slice(startIndex, endIndex);

  const householdStats = households ? {
    total: households.length,
    linked: households.filter(h => h.contractId).length,
    standalone: households.filter(h => !h.contractId).length,
  } : null;

  const getContractTypeBadge = (contractType?: string) => {
    const baseClass = 'px-1.5 py-0.5 rounded text-xs font-medium';
    if (contractType === 'CC') return `${baseClass} bg-blue-100 text-blue-700`;
    if (contractType === 'MV') return `${baseClass} bg-sky-100 text-sky-700`;
    return `${baseClass} bg-slate-100 text-slate-600`;
  };

  const renderFlatView = () => (
    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">ID</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Contract</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Name</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">Type</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">OEC</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">OWWA</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">Visa</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Countries</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">🇵🇭 PP</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">🇪🇹 PP</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">Converted</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {displayedProspects.map((p, index) => {
            const converted = p.oecConverted || p.owwaConverted || p.travelVisaConverted || p.filipinaPassportRenewalConverted || p.ethiopianPassportRenewalConverted;
            const displayName = p.clientName || p.maidName || '—';
            const personType = p.clientId ? 'Client' : p.maidId ? 'Maid' : '';
            
            return (
              <tr key={`flat-${p.conversationId}-${startIndex + index}`} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-600 font-mono text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleIdExpand(p.conversationId)}
                      className="text-left hover:text-blue-600 transition-colors cursor-pointer flex-1"
                      title={expandedIds.has(p.conversationId) ? 'Click to collapse' : 'Click to expand'}
                    >
                      {expandedIds.has(p.conversationId) ? p.conversationId : `${p.conversationId?.slice(0, 8)}...`}
                    </button>
                    <button
                      onClick={(e) => copyToClipboard(p.conversationId, e)}
                      className="p-1 hover:bg-slate-200 rounded transition-colors group relative"
                      title="Copy ID"
                    >
                      {copiedId === p.conversationId ? (
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
                <td className="px-3 py-2 text-slate-600 text-xs">
                  {p.contractId ? (
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono">
                      {p.contractId}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-slate-700 font-medium truncate max-w-[150px]" title={displayName}>
                      {displayName}
                    </span>
                    {personType && (
                      <span className="text-[10px] text-slate-500">{personType}</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={getContractTypeBadge(p.contractType)}>
                    {p.contractType || 'Contract Detail Not Found'}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  {p.isOECProspect ? (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                      {p.oecConverted ? '✓' : '•'}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  {p.isOWWAProspect ? (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-sky-100 text-sky-700">
                      {p.owwaConverted ? '✓' : '•'}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  {p.isTravelVisaProspect ? (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-slate-200 text-slate-700">
                      {p.travelVisaConverted ? '✓' : '•'}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-slate-600 text-xs">
                  {p.travelVisaCountries?.length > 0 ? p.travelVisaCountries.join(', ') : '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  {p.isFilipinaPassportRenewalProspect ? (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-pink-100 text-pink-700">
                      {p.filipinaPassportRenewalConverted ? '✓' : '•'}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  {p.isEthiopianPassportRenewalProspect ? (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                      {p.ethiopianPassportRenewalConverted ? '✓' : '•'}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  {converted ? (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-blue-600 text-white font-medium">Yes</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderHouseholdView = () => {
    if (!households || households.length === 0) {
      return (
        <div className="flex items-center justify-center h-24">
          <p className="text-slate-400 text-sm">No household data available</p>
        </div>
      );
    }

    return (
      <div className="overflow-y-auto max-h-[500px] divide-y divide-slate-100">
        {households.map((household, hIndex) => {
          const isExpanded = expandedHouseholds.has(household.householdId);
          const isLinked = !!household.contractId;
          const memberCount = household.members.length;
          const hasConversion = household.conversions.oec || household.conversions.owwa || household.conversions.travelVisa;

          return (
            <div key={`household-${household.householdId}-${hIndex}`} className="bg-white">
              {/* Household Header */}
              <div 
                className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 ${
                  isLinked ? 'border-l-4 border-blue-400' : 'border-l-4 border-slate-200'
                }`}
                onClick={() => toggleHousehold(household.householdId)}
              >
                <div className="flex items-center gap-3">
                  <button className="text-slate-400 hover:text-slate-600">
                    <svg 
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      {isLinked ? (
                        <>
                          <span className="text-sm font-medium text-slate-700">
                            Household #{household.contractId}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700">
                            Linked
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-slate-500">Standalone</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
                            Contract Detail Not Found
                          </span>
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      {household.hasClient && household.clientName && (
                        <span className="text-slate-600">Client: {household.clientName}</span>
                      )}
                      {household.hasMaid && household.maidNames.length > 0 && (
                        <span className="text-slate-500">
                          Maid{household.maidNames.length > 1 ? 's' : ''}: {household.maidNames.join(', ')}
                        </span>
                      )}
                      <span className="text-slate-400">({memberCount} conversation{memberCount > 1 ? 's' : ''})</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {household.prospectTypes.oec && (
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      household.conversions.oec ? 'bg-blue-200 text-blue-800' : 'bg-blue-100 text-blue-700'
                    }`}>
                      OEC {household.conversions.oec && '✓'}
                    </span>
                  )}
                  {household.prospectTypes.owwa && (
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      household.conversions.owwa ? 'bg-sky-200 text-sky-800' : 'bg-sky-100 text-sky-700'
                    }`}>
                      OWWA {household.conversions.owwa && '✓'}
                    </span>
                  )}
                  {household.prospectTypes.travelVisa && (
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      household.conversions.travelVisa ? 'bg-slate-300 text-slate-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      Visa {household.conversions.travelVisa && '✓'}
                    </span>
                  )}
                  {hasConversion && (
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-600 text-white font-medium">
                      Converted
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded Members */}
              {isExpanded && (
                <div className="bg-slate-50 border-t border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-1.5 text-left text-[10px] font-medium text-slate-500 uppercase">ID</th>
                        <th className="px-4 py-1.5 text-left text-[10px] font-medium text-slate-500 uppercase">Person</th>
                        <th className="px-4 py-1.5 text-center text-[10px] font-medium text-slate-500 uppercase">Type</th>
                        <th className="px-4 py-1.5 text-center text-[10px] font-medium text-slate-500 uppercase">OEC</th>
                        <th className="px-4 py-1.5 text-center text-[10px] font-medium text-slate-500 uppercase">OWWA</th>
                        <th className="px-4 py-1.5 text-center text-[10px] font-medium text-slate-500 uppercase">Visa</th>
                        <th className="px-4 py-1.5 text-left text-[10px] font-medium text-slate-500 uppercase">Countries</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {household.members.map((member, idx) => {
                        const displayName = member.clientName || member.maidName || '—';
                        const personType = member.clientId ? 'Client' : member.maidId ? 'Maid' : '';
                        
                        return (
                          <tr key={`member-${household.householdId}-${member.conversationId}-${idx}`} className="hover:bg-slate-100">
                            <td className="px-4 py-2 text-slate-600 font-mono text-xs">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleIdExpand(member.conversationId); }}
                                  className="text-left hover:text-blue-600 transition-colors cursor-pointer flex-1"
                                  title={expandedIds.has(member.conversationId) ? 'Click to collapse' : 'Click to expand'}
                                >
                                  {expandedIds.has(member.conversationId) ? member.conversationId : `${member.conversationId?.slice(0, 8)}...`}
                                </button>
                                <button
                                  onClick={(e) => copyToClipboard(member.conversationId, e)}
                                  className="p-1 hover:bg-slate-300 rounded transition-colors group relative"
                                  title="Copy ID"
                                >
                                  {copiedId === member.conversationId ? (
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
                            <td className="px-4 py-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-600">
                                  {personType}
                                </span>
                                <span className="text-slate-700 truncate max-w-[120px]" title={displayName}>
                                  {displayName}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center">
                              <span className={getContractTypeBadge(member.contractType).replace('text-xs', 'text-[10px]')}>
                                {member.contractType || 'Contract Detail Not Found'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-center text-xs">
                              {member.isOECProspect ? (
                                <span className={member.oecConverted ? 'text-blue-700 font-medium' : 'text-blue-500'}>
                                  {member.oecConverted ? '✓' : '•'}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-2 text-center text-xs">
                              {member.isOWWAProspect ? (
                                <span className={member.owwaConverted ? 'text-sky-700 font-medium' : 'text-sky-500'}>
                                  {member.owwaConverted ? '✓' : '•'}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-2 text-center text-xs">
                              {member.isTravelVisaProspect ? (
                                <span className={member.travelVisaConverted ? 'text-slate-700 font-medium' : 'text-slate-500'}>
                                  {member.travelVisaConverted ? '✓' : '•'}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-2 text-slate-600 text-xs">
                              {member.travelVisaCountries?.length > 0 ? member.travelVisaCountries.join(', ') : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-slate-700">
            {prospects.length} prospects
          </div>
          
          {householdStats && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                {householdStats.linked} linked households
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {householdStats.standalone} standalone
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {households && households.length > 0 && (
            <div className="flex rounded-md border border-slate-200 overflow-hidden">
              <button
                onClick={() => setViewMode('flat')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === 'flat' ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Flat
              </button>
              <button
                onClick={() => setViewMode('household')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === 'household' ? 'bg-slate-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                By Household
              </button>
            </div>
          )}
          
          {viewMode === 'flat' && (
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(e.target.value === 'All' ? 'All' : Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs border border-slate-200 rounded px-2 py-1"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {viewMode === 'flat' ? renderFlatView() : renderHouseholdView()}

      {viewMode === 'flat' && pageSize !== 'All' && totalPages > 1 && (
        <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">{startIndex + 1}-{endIndex} of {prospects.length}</span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
