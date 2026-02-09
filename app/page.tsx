'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import ProspectCards from '@/components/ProspectCards';
import CountryBreakdown from '@/components/CountryBreakdown';
import ServiceBreakdownChart from '@/components/ServiceBreakdownChart';
import ProspectTable from '@/components/ProspectTable';
import CostTracker from '@/components/CostTracker';
import CSVUpload from '@/components/CSVUpload';
import UploadedFilesList from '@/components/UploadedFilesList';
import ProcessingControlsWithDate from '@/components/ProcessingControlsWithDate';
import DatePickerCalendar from '@/components/DatePickerCalendar';
import CollapsibleSection from '@/components/CollapsibleSection';
import ServiceSummaryCards from '@/components/ServiceSummaryCards';
import ServiceProspectTable from '@/components/ServiceProspectTable';
import PnLSummaryCards from '@/components/PnLSummaryCards';
import PnLServiceChart from '@/components/PnLServiceChart';
import PnLTable from '@/components/PnLTable';
import PnLServiceDetail from '@/components/PnLServiceDetail';
import TodoUpload from '@/components/TodoUpload';
import OverseasSalesCard from '@/components/OverseasSalesCard';
import type { Results, ServiceFilter } from '@/lib/types';
import type { AggregatedPnL } from '@/lib/pnl-types';

interface PnLComplaintsInfo {
  lastUpdated: string;
  rawComplaintsCount: number;
  summary: {
    totalUniqueSales: number;
    totalUniqueClients: number;
    totalUniqueContracts: number;
  };
  serviceBreakdown: Record<string, {
    uniqueSales: number;
    uniqueClients: number;
    totalComplaints: number;
    byMonth: Record<string, number>;
  }>;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('upload');
  const [dashboardSubTab, setDashboardSubTab] = useState<'overview' | 'oec' | 'owwa' | 'travelVisa'>('overview');
  const [pnlSubTab, setPnlSubTab] = useState<'overview' | 'oec' | 'owwa' | 'ttl' | 'tte' | 'ttj' | 'schengen' | 'gcc' | 'ethiopianPP' | 'filipinaPP'>('overview');
  const [results, setResults] = useState<Results | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [selectedProcessDate, setSelectedProcessDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadRefresh, setUploadRefresh] = useState(0);
  const [pnlData, setPnlData] = useState<AggregatedPnL | null>(null);
  const [pnlLoading, setPnlLoading] = useState(false);
  const [todoRefresh, setTodoRefresh] = useState(0);
  const [pnlSource, setPnlSource] = useState<'complaints' | 'excel' | 'none'>('none');
  const [pnlComplaintsInfo, setPnlComplaintsInfo] = useState<PnLComplaintsInfo | null>(null);
  
  // Use ref to avoid useCallback dependency issues
  const availableDatesRef = useRef<string[]>([]);
  availableDatesRef.current = availableDates;

  const fetchDates = useCallback(async () => {
    try {
      const res = await fetch('/api/dates');
      const data = await res.json();
      setAvailableDates(data.dates || []);
    } catch (err) {
      console.error('Failed to fetch dates:', err);
    }
  }, []);

  const fetchResults = useCallback(async (startDate?: string | null, endDate?: string | null) => {
    // Don't fetch if no date is selected
    if (!startDate) {
      setResults(null);
      return;
    }

    try {
      // If we have a date range, fetch all dates and aggregate
      if (startDate && endDate && startDate !== endDate) {
        const datesToFetch = availableDatesRef.current.filter(d => d >= startDate && d <= endDate);
        
        if (datesToFetch.length === 0) {
          setResults(null);
          return;
        }

        const allData = await Promise.all(
          datesToFetch.map(async (date) => {
            const res = await fetch(`/api/dates/${date}`);
            return res.json();
          })
        );

        // Aggregate the data
        const aggregated: Results = {
          totalProcessed: 0,
          totalConversations: 0,
          isProcessing: false,
          prospects: { oec: 0, owwa: 0, travelVisa: 0 },
          conversions: { oec: 0, owwa: 0, travelVisa: 0 },
          countryCounts: {},
          byContractType: {
            CC: { oec: 0, owwa: 0, travelVisa: 0 },
            MV: { oec: 0, owwa: 0, travelVisa: 0 },
          },
          prospectDetails: [],
          households: [],
        };

        allData.forEach((data) => {
          if (!data || data.error) return;
          
          aggregated.totalProcessed += data.totalProcessed || 0;
          aggregated.totalConversations += data.totalConversations || 0;
          aggregated.prospects.oec += data.prospects?.oec || 0;
          aggregated.prospects.owwa += data.prospects?.owwa || 0;
          aggregated.prospects.travelVisa += data.prospects?.travelVisa || 0;
          
          if (data.conversions) {
            aggregated.conversions!.oec += data.conversions.oec || 0;
            aggregated.conversions!.owwa += data.conversions.owwa || 0;
            aggregated.conversions!.travelVisa += data.conversions.travelVisa || 0;
          }
          
          if (data.byContractType) {
            aggregated.byContractType!.CC.oec += data.byContractType.CC?.oec || 0;
            aggregated.byContractType!.CC.owwa += data.byContractType.CC?.owwa || 0;
            aggregated.byContractType!.CC.travelVisa += data.byContractType.CC?.travelVisa || 0;
            aggregated.byContractType!.MV.oec += data.byContractType.MV?.oec || 0;
            aggregated.byContractType!.MV.owwa += data.byContractType.MV?.owwa || 0;
            aggregated.byContractType!.MV.travelVisa += data.byContractType.MV?.travelVisa || 0;
          }
          
          // Merge country counts
          if (data.countryCounts) {
            Object.entries(data.countryCounts).forEach(([country, count]) => {
              aggregated.countryCounts[country] = (aggregated.countryCounts[country] || 0) + (count as number);
            });
          }
          
          // Merge prospect details
          if (data.prospects?.details) {
            aggregated.prospectDetails = [...(aggregated.prospectDetails || []), ...data.prospects.details];
          }
          
          // Merge households
          if (data.households) {
            aggregated.households = [...(aggregated.households || []), ...data.households];
          }
        });

        setResults(aggregated);
        return;
      }

      // Single date
      const res = await fetch(`/api/dates/${startDate}`);
      const data = await res.json();
      
      if (data.prospects?.details) {
        setResults({
          totalProcessed: data.totalProcessed,
          totalConversations: data.totalConversations,
          isProcessing: data.isProcessing,
          prospects: {
            oec: data.prospects.oec,
            owwa: data.prospects.owwa,
            travelVisa: data.prospects.travelVisa,
          },
          conversions: data.conversions,
          countryCounts: data.countryCounts || {},
          byContractType: data.byContractType,
          lastUpdated: data.lastUpdated,
          date: data.date,
          fileName: data.fileName,
          latestRun: data.latestRun,
          prospectDetails: data.prospects.details,
          households: data.households,
        });
      } else {
        setResults(data);
      }
    } catch (err) {
      console.error('Failed to fetch results:', err);
    }
  }, []);

  // Fetch P&L data
  const fetchPnLData = useCallback(async () => {
    setPnlLoading(true);
    try {
      const res = await fetch('/api/pnl');
      const data = await res.json();
      if (data.aggregated) {
        setPnlData(data.aggregated);
        setPnlSource(data.source || 'none');
        if (data.complaintsData) {
          setPnlComplaintsInfo(data.complaintsData);
        } else {
          setPnlComplaintsInfo(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch P&L data:', err);
    } finally {
      setPnlLoading(false);
    }
  }, []);

  // Fetch dates when component mounts or after upload/processing
  useEffect(() => {
    fetchDates();
  }, [fetchDates, uploadRefresh]);

  // Fetch P&L data when switching to P&L tab
  useEffect(() => {
    if (activeTab === 'pnl') {
      fetchPnLData();
    }
  }, [activeTab, fetchPnLData]);

  // Fetch results only when a date is selected
  useEffect(() => {
    if (selectedDate) {
      setIsLoading(true);
    fetchResults(selectedDate, selectedEndDate).then(() => setIsLoading(false));
    }
  }, [fetchResults, selectedDate, selectedEndDate, uploadRefresh]);

  const handleDateSelect = (date: string | null, endDate?: string | null) => {
    setSelectedDate(date);
    setSelectedEndDate(endDate || null);
    if (date) {
    setIsLoading(true);
    fetchResults(date, endDate).then(() => setIsLoading(false));
    } else {
      setResults(null);
    }
  };

  const handleUploadComplete = () => {
    setUploadRefresh(prev => prev + 1);
    fetchDates();
  };

  const handleProcessingComplete = () => {
    setUploadRefresh(prev => prev + 1);
    if (selectedDate) {
    fetchResults(selectedDate);
    }
  };

  // Helper to get prospect count by service
  const getProspectCount = (service: ServiceFilter): number => {
    return results?.prospects?.[service] || 0;
  };

  // Helper to get filtered prospects count
  const getFilteredProspectCount = (service: ServiceFilter): number => {
    if (!results?.prospectDetails) return 0;
    switch (service) {
      case 'oec':
        return results.prospectDetails.filter(p => p.isOECProspect).length;
      case 'owwa':
        return results.prospectDetails.filter(p => p.isOWWAProspect).length;
      case 'travelVisa':
        return results.prospectDetails.filter(p => p.isTravelVisaProspect).length;
    }
  };

  // "Please select a date" placeholder
  const DateSelectionPrompt = () => (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200">
      <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">Please Select a Date</h3>
      <p className="text-sm text-slate-500 text-center max-w-sm">
        Use the date picker above to select a date or date range to view prospect data.
      </p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 p-6">
        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Upload & Process</h2>
              <p className="text-sm text-slate-500">Upload CSV reports and run AI analysis</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CSVUpload onUploadComplete={handleUploadComplete} />
              <TodoUpload onUploadComplete={() => setTodoRefresh(prev => prev + 1)} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UploadedFilesList
                selectedDate={selectedProcessDate}
                onSelectDate={setSelectedProcessDate}
                refreshTrigger={uploadRefresh}
              />
              <ProcessingControlsWithDate
                selectedDate={selectedProcessDate}
                onProcessingComplete={handleProcessingComplete}
              />
            </div>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Sub-tabs Navigation */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                {[
                  { id: 'overview', label: 'Overview', icon: '◉' },
                  { id: 'oec', label: 'OEC', icon: '◈' },
                  { id: 'owwa', label: 'OWWA', icon: '◇' },
                  { id: 'travelVisa', label: 'Travel Visa', icon: '✈' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDashboardSubTab(tab.id as typeof dashboardSubTab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      dashboardSubTab === tab.id
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
              <DatePickerCalendar
                availableDates={availableDates}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
              />
            </div>

            {/* Show prompt if no date selected */}
            {!selectedDate ? (
              <DateSelectionPrompt />
            ) : (
              <>
                {/* Overview Sub-tab */}
                {dashboardSubTab === 'overview' && (
              <>
            <ProspectCards
                  oecCount={results?.prospects?.oec || 0}
                  owwaCount={results?.prospects?.owwa || 0}
                  travelVisaCount={results?.prospects?.travelVisa || 0}
              totalProcessed={results?.totalProcessed || 0}
              conversions={results?.conversions}
              byContractType={results?.byContractType}
              prospectDetails={results?.prospectDetails}
              isLoading={isLoading}
            />

            {/* Overseas Sales Card - Sales from To-Dos */}
            <OverseasSalesCard refreshTrigger={todoRefresh} />

            <ServiceBreakdownChart 
              prospectDetails={results?.prospectDetails} 
              households={results?.households}
              byContractType={results?.byContractType}
            />

            <CountryBreakdown countryCounts={results?.countryCounts || {}} />

                <CollapsibleSection
                  title="Prospect Records"
                  count={results?.prospectDetails?.length || 0}
                >
                  <ProspectTable 
                    prospects={results?.prospectDetails || []} 
                    households={results?.households}
                  />
                </CollapsibleSection>
                  </>
                )}

                {/* OEC Sub-tab */}
                {dashboardSubTab === 'oec' && (
                  <>
                    <ServiceSummaryCards
                      service="oec"
                      prospectCount={getProspectCount('oec')}
                      conversions={results?.conversions}
                      byContractType={results?.byContractType}
                      prospectDetails={results?.prospectDetails}
                    />

                    <ServiceBreakdownChart 
                      prospectDetails={results?.prospectDetails} 
                      households={results?.households}
                      byContractType={results?.byContractType}
                      serviceFilter="oec"
                    />

                    <CollapsibleSection
                      title="OEC Prospect Details"
                      count={getFilteredProspectCount('oec')}
                    >
                      <ServiceProspectTable
                        prospects={results?.prospectDetails || []}
                        service="oec"
                      />
                    </CollapsibleSection>
                  </>
                )}

                {/* OWWA Sub-tab */}
                {dashboardSubTab === 'owwa' && (
                  <>
                    <ServiceSummaryCards
                      service="owwa"
                      prospectCount={getProspectCount('owwa')}
                      conversions={results?.conversions}
                      byContractType={results?.byContractType}
                      prospectDetails={results?.prospectDetails}
                    />

                    <ServiceBreakdownChart 
                      prospectDetails={results?.prospectDetails} 
                      households={results?.households}
                      byContractType={results?.byContractType}
                      serviceFilter="owwa"
                    />

                    <CollapsibleSection
                      title="OWWA Prospect Details"
                      count={getFilteredProspectCount('owwa')}
                    >
                      <ServiceProspectTable
                        prospects={results?.prospectDetails || []}
                        service="owwa"
                      />
                    </CollapsibleSection>
                  </>
                )}

                {/* Travel Visa Sub-tab */}
                {dashboardSubTab === 'travelVisa' && (
                  <>
                    <ServiceSummaryCards
                      service="travelVisa"
                      prospectCount={getProspectCount('travelVisa')}
                      conversions={results?.conversions}
                      byContractType={results?.byContractType}
                      prospectDetails={results?.prospectDetails}
                    />

                    <CountryBreakdown countryCounts={results?.countryCounts || {}} />

                    <ServiceBreakdownChart 
                      prospectDetails={results?.prospectDetails} 
                      households={results?.households}
                      byContractType={results?.byContractType}
                      serviceFilter="travelVisa"
                    />

                    <CollapsibleSection
                      title="Travel Visa Prospect Details"
                      count={getFilteredProspectCount('travelVisa')}
                    >
                      <ServiceProspectTable
                        prospects={results?.prospectDetails || []}
                        service="travelVisa"
                      />
                    </CollapsibleSection>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* P&L Tab */}
        {activeTab === 'pnl' && (
          <div className="space-y-6">
            {/* Sub-tabs Navigation */}
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-slate-100 p-1 rounded-lg flex-wrap">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'oec', label: 'OEC' },
                    { id: 'owwa', label: 'OWWA' },
                    { id: 'ttl', label: 'TTL' },
                    { id: 'tte', label: 'TTE' },
                    { id: 'ttj', label: 'TTJ' },
                    { id: 'schengen', label: 'Schengen' },
                    { id: 'gcc', label: 'GCC' },
                    { id: 'ethiopianPP', label: 'Ethiopian PP' },
                    { id: 'filipinaPP', label: 'Filipina PP' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setPnlSubTab(tab.id as typeof pnlSubTab)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                        pnlSubTab === tab.id
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={fetchPnLData}
                  disabled={pnlLoading}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  {pnlLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Data Source Indicator */}
            {pnlSource === 'complaints' && pnlComplaintsInfo && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">Live Complaints Data</p>
                      <p className="text-xs text-emerald-600">
                        Updated {new Date(pnlComplaintsInfo.lastUpdated).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-700">{pnlComplaintsInfo.rawComplaintsCount.toLocaleString()}</p>
                      <p className="text-xs text-emerald-600">Total Complaints</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-700">{pnlComplaintsInfo.summary.totalUniqueSales.toLocaleString()}</p>
                      <p className="text-xs text-emerald-600">Unique Sales</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-700">{pnlComplaintsInfo.summary.totalUniqueClients.toLocaleString()}</p>
                      <p className="text-xs text-emerald-600">Unique Clients</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-700">{pnlComplaintsInfo.summary.totalUniqueContracts.toLocaleString()}</p>
                      <p className="text-xs text-emerald-600">Unique Contracts</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {pnlSource === 'excel' && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Excel File Data</p>
                    <p className="text-xs text-blue-600">
                      Reading from P&L Excel files • Use API to upload live complaints data
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Overview Sub-tab */}
            {pnlSubTab === 'overview' && (
              <>
                <PnLSummaryCards data={pnlData} isLoading={pnlLoading} />
                <PnLServiceChart data={pnlData} />
                
                {/* Monthly Sales Breakdown - Only show for complaints data */}
                {pnlSource === 'complaints' && pnlComplaintsInfo && (
                  <div className="bg-white rounded-xl border-2 border-gray-600 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <h3 className="text-base font-semibold text-slate-800">Sales by Month (Per Service)</h3>
                    </div>
                    <div className="p-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-slate-600">Service</th>
                            {Object.keys(
                              Object.values(pnlComplaintsInfo.serviceBreakdown)
                                .reduce((acc, s) => ({ ...acc, ...s.byMonth }), {})
                            ).sort().map(month => (
                              <th key={month} className="px-3 py-2 text-right font-semibold text-slate-600">
                                {month}
                              </th>
                            ))}
                            <th className="px-3 py-2 text-right font-semibold text-slate-800">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Object.entries(pnlComplaintsInfo.serviceBreakdown)
                            .filter(([, data]) => data.uniqueSales > 0)
                            .map(([key, data]) => {
                              const allMonths = Object.keys(
                                Object.values(pnlComplaintsInfo.serviceBreakdown)
                                  .reduce((acc, s) => ({ ...acc, ...s.byMonth }), {})
                              ).sort();
                              return (
                                <tr key={key} className="hover:bg-slate-50">
                                  <td className="px-3 py-2 font-medium text-slate-800 capitalize">
                                    {key === 'ethiopianPP' ? 'Ethiopian PP' : 
                                     key === 'filipinaPP' ? 'Filipina PP' : 
                                     key.toUpperCase()}
                                  </td>
                                  {allMonths.map(month => (
                                    <td key={month} className="px-3 py-2 text-right text-slate-600">
                                      {data.byMonth[month] || '—'}
                                    </td>
                                  ))}
                                  <td className="px-3 py-2 text-right font-semibold text-slate-800">
                                    {data.uniqueSales}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                        <tfoot className="bg-slate-100 font-semibold">
                          <tr>
                            <td className="px-3 py-2 text-slate-800">Total</td>
                            {Object.keys(
                              Object.values(pnlComplaintsInfo.serviceBreakdown)
                                .reduce((acc, s) => ({ ...acc, ...s.byMonth }), {})
                            ).sort().map(month => {
                              const monthTotal = Object.values(pnlComplaintsInfo.serviceBreakdown)
                                .reduce((sum, s) => sum + (s.byMonth[month] || 0), 0);
                              return (
                                <td key={month} className="px-3 py-2 text-right text-slate-800">
                                  {monthTotal}
                                </td>
                              );
                            })}
                            <td className="px-3 py-2 text-right text-slate-800">
                              {pnlComplaintsInfo.summary.totalUniqueSales}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                <CollapsibleSection
                  title="Detailed Breakdown"
                  count={pnlData ? Object.keys(pnlData.services).length : 0}
                  defaultExpanded={true}
                >
                  <PnLTable data={pnlData} />
                </CollapsibleSection>
                
                {/* Cost Breakdown Section - Per Order Unit Costs */}
                {pnlData && (
                  <div className="bg-white rounded-xl border-2 border-gray-600 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <h3 className="text-base font-semibold text-slate-800">Cost Per Order (COGS)</h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {/* OEC */}
                        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                          <p className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">OEC</p>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">DMW Fees</span>
                            <span className="text-slate-700 font-medium">AED 61.5</span>
                          </div>
                          {pnlData?.services.oec.serviceFees > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Service Fee</span>
                              <span className="text-slate-700 font-medium">AED {pnlData.services.oec.serviceFees}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* OWWA */}
                        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                          <p className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">OWWA</p>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">OWWA Fees</span>
                            <span className="text-slate-700 font-medium">AED 92</span>
                          </div>
                          {pnlData?.services.owwa.serviceFees > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Service Fee</span>
                              <span className="text-slate-700 font-medium">AED {pnlData.services.owwa.serviceFees}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* TTL */}
                        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                          <p className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">TTL</p>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Embassy Fees</span>
                            <span className="text-slate-700 font-medium">Varies*</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Transport</span>
                            <span className="text-slate-700 font-medium">AED 100</span>
                          </div>
                          {pnlData?.services.ttl.serviceFees > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Service Fee</span>
                              <span className="text-slate-700 font-medium">AED {pnlData.services.ttl.serviceFees}</span>
                            </div>
                          )}
                          <p className="text-xs text-slate-400 mt-1">*Single: 425, Double: 565, Multiple: 745</p>
                        </div>
                        
                        {/* TTE */}
                        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                          <p className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">TTE</p>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Embassy Fees</span>
                            <span className="text-slate-700 font-medium">Varies*</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Transport</span>
                            <span className="text-slate-700 font-medium">AED 100</span>
                          </div>
                          {pnlData?.services.tte.serviceFees > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Service Fee</span>
                              <span className="text-slate-700 font-medium">AED {pnlData.services.tte.serviceFees}</span>
                            </div>
                          )}
                          <p className="text-xs text-slate-400 mt-1">*Single: 370, Multiple: 470</p>
                        </div>
                        
                        {/* TTJ */}
                        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                          <p className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">TTJ</p>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Embassy Fees</span>
                            <span className="text-slate-700 font-medium">AED 220</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">3rd Party</span>
                            <span className="text-slate-700 font-medium">AED 100</span>
                          </div>
                          {pnlData?.services.ttj.serviceFees > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Service Fee</span>
                              <span className="text-slate-700 font-medium">AED {pnlData.services.ttj.serviceFees}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* GCC */}
                        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                          <p className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">GCC</p>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Dubai Police</span>
                            <span className="text-slate-700 font-medium">AED 220</span>
                          </div>
                          {pnlData?.services.gcc.serviceFees > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Service Fee</span>
                              <span className="text-slate-700 font-medium">AED {pnlData.services.gcc.serviceFees}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Ethiopian PP */}
                        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                          <p className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">Ethiopian PP</p>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Gov. Fees</span>
                            <span className="text-slate-700 font-medium">AED 1,350</span>
                          </div>
                          {pnlData?.services.ethiopianPP.serviceFees > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Service Fee</span>
                              <span className="text-slate-700 font-medium">AED {pnlData.services.ethiopianPP.serviceFees}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Filipina PP */}
                        <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                          <p className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-2">Filipina PP</p>
                          {pnlData?.services.filipinaPP.serviceFees > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500">Service Fee</span>
                              <span className="text-slate-700 font-medium">AED {pnlData.services.filipinaPP.serviceFees}</span>
                            </div>
                          )}
                          {(!pnlData?.services.filipinaPP.serviceFees || pnlData.services.filipinaPP.serviceFees === 0) && (
                            <p className="text-xs text-slate-400">No direct costs</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Individual Service Sub-tabs */}
            {pnlSubTab === 'oec' && (
              <PnLServiceDetail data={pnlData} filter="oec" />
            )}
            {pnlSubTab === 'owwa' && (
              <PnLServiceDetail data={pnlData} filter="owwa" />
            )}
            {pnlSubTab === 'ttl' && (
              <PnLServiceDetail data={pnlData} filter="ttl" />
            )}
            {pnlSubTab === 'tte' && (
              <PnLServiceDetail data={pnlData} filter="tte" />
            )}
            {pnlSubTab === 'ttj' && (
              <PnLServiceDetail data={pnlData} filter="ttj" />
            )}
            {pnlSubTab === 'schengen' && (
              <PnLServiceDetail data={pnlData} filter="schengen" />
            )}
            {pnlSubTab === 'gcc' && (
              <PnLServiceDetail data={pnlData} filter="gcc" />
            )}
            {pnlSubTab === 'ethiopianPP' && (
              <PnLServiceDetail data={pnlData} filter="ethiopianPP" />
            )}
            {pnlSubTab === 'filipinaPP' && (
              <PnLServiceDetail data={pnlData} filter="filipinaPP" />
            )}
          </div>
        )}

        {/* Costs Tab */}
        {activeTab === 'costs' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Cost Tracking</h2>
              <p className="text-sm text-slate-500">Monitor API usage and expenses</p>
            </div>
            <CostTracker />
          </div>
        )}
      </main>
    </div>
  );
}
