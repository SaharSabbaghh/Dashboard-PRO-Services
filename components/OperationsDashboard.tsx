'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, AlertTriangle, FileText, MessageSquare } from 'lucide-react';
import type { OperationsData, ProspectMetric, OperationMetric, SalesMetric } from '@/lib/operations-types';
import DatePickerCalendar from '@/components/DatePickerCalendar';

export default function OperationsDashboard() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [data, setData] = useState<OperationsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mtdData, setMtdData] = useState<Record<string, number>>({});
  const [selectedNotes, setSelectedNotes] = useState<string | null>(null);

  // Fetch available dates
  useEffect(() => {
    const fetchDates = async () => {
      try {
        const res = await fetch('/api/operations/dates');
        const result = await res.json();
        if (result.success && result.dates) {
          setAvailableDates(result.dates);
          // Auto-select the most recent date
          if (result.dates.length > 0 && !selectedDate) {
            setSelectedDate(result.dates[result.dates.length - 1]);
          }
        }
      } catch (err) {
        console.error('Error fetching available dates:', err);
      }
    };

    fetchDates();
  }, []);

  // Fetch data based on selected date
  useEffect(() => {
    if (!selectedDate) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        let url = `/api/operations?startDate=${selectedDate}`;
        if (selectedEndDate) {
          url += `&endDate=${selectedEndDate}`;
        } else {
          url += `&endDate=${selectedDate}`;
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success && result.data) {
          // Handle both single day and date range responses
          if (Array.isArray(result.data)) {
            // Multiple days - aggregate the data
            const aggregatedData = aggregateOperationsData(result.data);
            setData(aggregatedData);
          } else {
            // Single day
            setData(result.data);
          }
        } else {
          setError(result.error || 'Failed to fetch data');
        }
      } catch (err) {
        setError('Network error occurred');
        console.error('Error fetching operations data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, selectedEndDate]);

  // Aggregate multiple days of operations data
  const aggregateOperationsData = (dataArray: OperationsData[]): OperationsData => {
    if (dataArray.length === 0) {
      return {
        lastUpdated: new Date().toISOString(),
        analysisDate: selectedDate || '',
        operations: []
      };
    }

    if (dataArray.length === 1) {
      return dataArray[0];
    }

    // Create a map to aggregate operations by service type
    const serviceMap: Record<string, OperationMetric> = {};

    dataArray.forEach(dayData => {
      dayData.operations.forEach(op => {
        if (!serviceMap[op.serviceType]) {
          serviceMap[op.serviceType] = {
            serviceType: op.serviceType,
            pendingUs: 0,
            pendingClient: 0,
            pendingProVisit: 0,
            pendingGov: 0,
            doneToday: 0,
            casesDelayed: 0,
            delayedNotes: op.delayedNotes
          };
        }

        // For range data, sum up the daily values
        serviceMap[op.serviceType].pendingUs += op.pendingUs;
        serviceMap[op.serviceType].pendingClient += op.pendingClient;
        serviceMap[op.serviceType].pendingProVisit += op.pendingProVisit;
        serviceMap[op.serviceType].pendingGov += op.pendingGov;
        serviceMap[op.serviceType].doneToday += op.doneToday;
        serviceMap[op.serviceType].casesDelayed += op.casesDelayed;

        // Combine notes if multiple days have notes
        if (op.delayedNotes && serviceMap[op.serviceType].delayedNotes !== op.delayedNotes) {
          if (serviceMap[op.serviceType].delayedNotes) {
            serviceMap[op.serviceType].delayedNotes += ` | ${op.delayedNotes}`;
          } else {
            serviceMap[op.serviceType].delayedNotes = op.delayedNotes;
          }
        }
      });
    });

    return {
      lastUpdated: new Date().toISOString(),
      analysisDate: selectedEndDate 
        ? `${selectedDate} to ${selectedEndDate}` 
        : selectedDate || '',
      operations: Object.values(serviceMap)
    };
  };

  // Fetch MTD data
  useEffect(() => {
    const fetchMTDData = async () => {
      try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startDate = startOfMonth.toISOString().split('T')[0];
        const endDate = today.toISOString().split('T')[0];

        const response = await fetch(`/api/operations?startDate=${startDate}&endDate=${endDate}`);
        if (!response.ok) throw new Error('Failed to fetch MTD data');

        const result = await response.json();
        if (result.success && result.data) {
          // Calculate MTD totals per service
          const mtdTotals: Record<string, number> = {};
          if (Array.isArray(result.data)) {
            // Multiple days data
            result.data.forEach((dayData: OperationsData) => {
              dayData.operations.forEach(op => {
                if (!mtdTotals[op.serviceType]) {
                  mtdTotals[op.serviceType] = 0;
                }
                mtdTotals[op.serviceType] += op.doneToday;
              });
            });
          } else {
            // Single day data
            result.data.operations.forEach((op: any) => {
              if (!mtdTotals[op.serviceType]) {
                mtdTotals[op.serviceType] = 0;
              }
              mtdTotals[op.serviceType] += op.doneToday;
            });
          }
          setMtdData(mtdTotals);
        }
      } catch (err) {
        console.error('Error fetching MTD data:', err);
      }
    };

    fetchMTDData();
  }, []);

  // Handle date selection from calendar
  const handleDateSelect = (startDate: string | null, endDate?: string | null) => {
    setSelectedDate(startDate);
    setSelectedEndDate(endDate || null);
  };

  // Calculate summary totals from raw data
  const calculateSummary = (data: OperationsData) => {
    const totalPendingUs = data.operations.reduce((sum, o) => sum + o.pendingUs, 0);
    const totalPendingClient = data.operations.reduce((sum, o) => sum + o.pendingClient, 0);
    const totalPendingProVisit = data.operations.reduce((sum, o) => sum + o.pendingProVisit, 0);
    const totalPendingGov = data.operations.reduce((sum, o) => sum + o.pendingGov, 0);
    const totalDoneToday = data.operations.reduce((sum, o) => sum + o.doneToday, 0);
    const totalCasesDelayed = data.operations.reduce((sum, o) => sum + o.casesDelayed, 0);
    const totalMTD = Object.values(mtdData).reduce((sum, value) => sum + value, 0);

    return {
      totalPendingUs,
      totalPendingClient,
      totalPendingProVisit,
      totalPendingGov,
      totalDoneToday,
      totalCasesDelayed,
      totalMTD
    };
  };

  const summary = data ? calculateSummary(data) : null;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Operations Dashboard</h1>
            <p className="text-slate-500 mt-2">Monitor daily operations, prospects, and performance metrics</p>
          </div>
          <DatePickerCalendar
            availableDates={availableDates}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading operations data...</p>
          </div>
        </div>
      </div>
    );
  }

  // No date selected state
  if (!selectedDate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Operations Dashboard</h1>
            <p className="text-slate-500 mt-2">Monitor daily operations, prospects, and performance metrics</p>
          </div>
          <DatePickerCalendar
            availableDates={availableDates}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </div>
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200">
          <Calendar className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Please Select a Date</h3>
          <p className="text-sm text-slate-500 text-center max-w-sm">
            Use the date picker above to select a date to view operations data.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Operations Dashboard</h1>
            <p className="text-slate-500 mt-2">Monitor daily operations, prospects, and performance metrics</p>
          </div>
          <DatePickerCalendar
            availableDates={availableDates}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-4" />
            <p className="text-slate-700 font-medium">No operations data available</p>
            <p className="text-slate-500 text-sm mt-1">{error || 'Please select a different date'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Operations Dashboard</h1>
          {selectedDate && (
            <p className="text-slate-500 mt-2 text-sm">
              Showing data for {selectedEndDate && selectedEndDate !== selectedDate 
                ? `${new Date(selectedDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })} - ${new Date(selectedEndDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}`
                : new Date(selectedDate).toLocaleDateString('en-US', { 
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })
              }
            </p>
          )}
        </div>
        
        {/* Advanced Date Picker */}
        <DatePickerCalendar
          availableDates={availableDates}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Pending Cases */}
        <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <div className="text-5xl font-bold text-slate-900 mb-2">
            {summary ? summary.totalPendingUs + summary.totalPendingProVisit : 0}
          </div>
          <div className="text-sm font-medium text-slate-600">Total Pending</div>
        </div>

        {/* Completed Today */}
        <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-5xl font-bold text-slate-900 mb-2">{summary?.totalDoneToday || 0}</div>
          <div className="text-sm font-medium text-slate-600">Completed Today</div>
        </div>

        {/* Cases Delayed */}
        <div className="bg-slate-800 rounded-xl p-6 border-2 border-slate-700 shadow-sm text-white">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-6 h-6 text-slate-300" />
          </div>
          <div className="text-5xl font-bold text-white mb-2">{summary?.totalCasesDelayed || 0}</div>
          <div className="text-sm font-medium text-slate-300">Cases Delayed</div>
        </div>

        {/* MTD Completed */}
        <div className="bg-blue-600 rounded-xl p-6 border-2 border-blue-500 shadow-sm text-white">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-6 h-6 text-blue-200" />
          </div>
          <div className="text-5xl font-bold text-white mb-2">{summary?.totalMTD || 0}</div>
          <div className="text-sm font-medium text-blue-200">MTD Completed</div>
        </div>
      </div>


      {/* Operations Section */}
      <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Operations Status</h3>
              <p className="text-sm text-slate-600 mt-1">Service processing status and completion metrics</p>
            </div>
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b-2 border-slate-200">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">Service Type</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">Pending Us</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">Pending Client</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">Pending PRO</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">Pending Gov</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">Done Today</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">MTD</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">Cases Delayed</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.operations.map((operation, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6">
                    <span className="font-bold text-slate-900 text-base">{operation.serviceType}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-3 py-2 rounded-lg text-lg font-bold min-w-[3rem] ${
                      operation.pendingUs > 0 ? 'bg-orange-50 text-orange-700' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {operation.pendingUs}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-3 py-2 rounded-lg text-lg font-bold min-w-[3rem] ${
                      operation.pendingClient > 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {operation.pendingClient}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-3 py-2 rounded-lg text-lg font-bold min-w-[3rem] ${
                      operation.pendingProVisit > 0 ? 'bg-purple-50 text-purple-700' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {operation.pendingProVisit}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-3 py-2 rounded-lg text-lg font-bold min-w-[3rem] ${
                      operation.pendingGov > 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {operation.pendingGov}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-3 py-2 rounded-lg text-lg font-bold min-w-[3rem] ${
                      operation.doneToday > 0 ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {operation.doneToday}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-3 py-2 rounded-lg text-lg font-bold min-w-[3rem] ${
                      (mtdData[operation.serviceType] || 0) > 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {mtdData[operation.serviceType] || 0}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-3 py-2 rounded-lg text-lg font-bold min-w-[3rem] ${
                      operation.casesDelayed > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                    }`}>
                      {operation.casesDelayed}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {operation.delayedNotes ? (
                      <button
                        onClick={() => setSelectedNotes(operation.delayedNotes || null)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                        title="View delay notes"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delayed Notes Modal */}
      {selectedNotes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                Delay Notes
              </h3>
              <button
                onClick={() => setSelectedNotes(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-slate-700 text-sm leading-relaxed">{selectedNotes}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedNotes(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
