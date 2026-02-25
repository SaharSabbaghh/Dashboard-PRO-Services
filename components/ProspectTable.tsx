'use client';

import { useState } from 'react';
import type { ProspectDetail, HouseholdGroup } from '@/lib/types';

interface ProspectTableProps {
  prospects: ProspectDetail[];
  households?: HouseholdGroup[];
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 'All'] as const;

export default function ProspectTable({ prospects, households }: ProspectTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'All'>(50);
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

  const downloadCSV = () => {
    if (prospects.length === 0) return;

    // Define CSV headers
    const headers = [
      'Conversation ID',
      'Contract ID',
      'Client ID',
      'Maid ID',
      'Client Name',
      'Maid Name',
      'Contract Type',
      'Chat Start Date',
      'Has Complaint (Converted)',
      'Converted Services',
      'Is OEC Prospect',
      'Is OWWA Prospect',
      'Is Travel Visa Prospect',
      'Travel Visa Countries',
      'Is Filipina PP Renewal Prospect',
      'Is Ethiopian PP Renewal Prospect',
    ];

    // Convert prospects to CSV rows
    const rows = prospects.map(prospect => [
      prospect.conversationId || '',
      prospect.contractId || '',
      prospect.clientId || '',
      prospect.maidId || '',
      prospect.clientName || '',
      prospect.maidName || '',
      prospect.contractType || '',
      prospect.chatStartDateTime || '',
      (prospect as any).hasComplaintOnDate ? 'Yes' : 'No',
      (prospect as any).convertedServices?.join('; ') || '',
      prospect.isOECProspect ? 'Yes' : 'No',
      prospect.isOWWAProspect ? 'Yes' : 'No',
      prospect.isTravelVisaProspect ? 'Yes' : 'No',
      prospect.travelVisaCountries?.join('; ') || '',
      prospect.isFilipinaPassportRenewalProspect ? 'Yes' : 'No',
      prospect.isEthiopianPassportRenewalProspect ? 'Yes' : 'No',
    ]);

    // Escape CSV values (handle commas, quotes, newlines)
    const escapeCSV = (value: string): string => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Build CSV content
    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `prospects_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (prospects.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 bg-white rounded-lg border border-slate-200">
        <p className="text-slate-400 text-sm">No prospects found</p>
      </div>
    );
  }


  const effectivePageSize = pageSize === 'All' ? prospects.length : pageSize;
  const totalPages = Math.ceil(prospects.length / effectivePageSize);
  const startIndex = (currentPage - 1) * effectivePageSize;
  const endIndex = Math.min(startIndex + effectivePageSize, prospects.length);
  const displayedProspects = prospects.slice(startIndex, endIndex);

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
            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">Converted</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">OEC</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">OWWA</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">Visa</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Countries</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">🇵🇭 PP</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-slate-500">🇪🇹 PP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {displayedProspects.map((p, index) => {
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
                  {(p as any).hasComplaintOnDate ? (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">
                        ✓ Yes
                      </span>
                      {(p as any).convertedServices && (p as any).convertedServices.length > 0 && (
                        <span className="text-[10px] text-slate-500" title={(p as any).convertedServices.join(', ')}>
                          {(p as any).convertedServices.join(', ')}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-500">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  {(() => {
                    const convertedServices = (p as any).convertedServices || [];
                    const isConverted = convertedServices.includes('OEC');
                    if (isConverted) {
                      return <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">Yes</span>;
                    }
                    return p.isOECProspect ? (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700">•</span>
                    ) : '—';
                  })()}
                </td>
                <td className="px-3 py-2 text-center">
                  {(() => {
                    const convertedServices = (p as any).convertedServices || [];
                    const isConverted = convertedServices.includes('OWWA');
                    if (isConverted) {
                      return <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">Yes</span>;
                    }
                    return p.isOWWAProspect ? (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-sky-100 text-sky-700">•</span>
                    ) : '—';
                  })()}
                </td>
                <td className="px-3 py-2 text-center">
                  {p.isTravelVisaProspect ? (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-slate-200 text-slate-700">•</span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-slate-600 text-xs">
                  {p.travelVisaCountries?.length > 0 ? p.travelVisaCountries.join(', ') : '—'}
                </td>
                <td className="px-3 py-2 text-center">
                  {(() => {
                    const convertedServices = (p as any).convertedServices || [];
                    const isConverted = convertedServices.includes('Filipina PP');
                    if (isConverted) {
                      return <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">Yes</span>;
                    }
                    return p.isFilipinaPassportRenewalProspect ? (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-pink-100 text-pink-700">•</span>
                    ) : '—';
                  })()}
                </td>
                <td className="px-3 py-2 text-center">
                  {(() => {
                    const convertedServices = (p as any).convertedServices || [];
                    const isConverted = convertedServices.includes('Ethiopian PP');
                    if (isConverted) {
                      return <span className="px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">Yes</span>;
                    }
                    return p.isEthiopianPassportRenewalProspect ? (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700">•</span>
                    ) : '—';
                  })()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );


  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-slate-700">
            {prospects.length} prospects
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* CSV Download Button */}
          <button
            onClick={downloadCSV}
            disabled={prospects.length === 0}
            className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
            title="Download prospects as CSV"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV
          </button>
          
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
        </div>
      </div>

      {renderFlatView()}

      {pageSize !== 'All' && totalPages > 1 && (
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
