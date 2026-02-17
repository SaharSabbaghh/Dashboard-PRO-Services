'use client';

import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, Users, FileText, Target } from 'lucide-react';
import type { OperationsData, ProspectMetric, OperationMetric, SalesMetric } from '@/lib/operations-types';
import DatePickerCalendar from '@/components/DatePickerCalendar';

export default function OperationsDashboard() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [data, setData] = useState<OperationsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        
        const response = await fetch(`/api/operations?date=${selectedDate}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          setData(result.data);
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
  }, [selectedDate]);

  // Handle date selection from calendar
  const handleDateSelect = (startDate: string | null, endDate?: string | null) => {
    setSelectedDate(startDate);
    setSelectedEndDate(endDate || null);
  };

  // Helper function to parse trend
  const parseTrend = (trend: string | null) => {
    if (!trend || trend === '-') return null;
    const isPositive = trend.includes('▲');
    const isNegative = trend.includes('▼');
    const percentage = trend.match(/[-]?\d+%/)?.[0];
    return { isPositive, isNegative, percentage };
  };

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Prospects */}
        <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">{data.summary.totalProspects}</div>
          <div className="text-sm font-medium text-slate-600">Total Prospects</div>
        </div>

        {/* Pending Cases */}
        <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">
            {data.summary.totalPendingUs + data.summary.totalPendingClient + data.summary.totalPendingProVisit + data.summary.totalPendingGov}
          </div>
          <div className="text-sm font-medium text-slate-600">Total Pending</div>
        </div>

        {/* Completed Today */}
        <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">{data.summary.totalDoneToday}</div>
          <div className="text-sm font-medium text-slate-600">Completed Today</div>
        </div>

        {/* Cases Delayed */}
        <div className="bg-slate-800 rounded-xl p-6 border-2 border-slate-700 shadow-sm text-white">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-6 h-6 text-slate-300" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{data.summary.totalCasesDelayed}</div>
          <div className="text-sm font-medium text-slate-300">Cases Delayed</div>
        </div>
      </div>

      {/* Prospects Section */}
      <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Prospects Overview</h3>
              <p className="text-sm text-slate-600 mt-1">Daily prospects with trends and MTD comparison</p>
            </div>
            <Target className="w-5 h-5 text-slate-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b-2 border-slate-200">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">Product</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">Current Day</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">Trend</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">MTD</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">Previous Day</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.prospects.map((prospect, index) => {
                const trend = parseTrend(prospect.trend);
                return (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-semibold text-slate-900 text-sm">{prospect.product}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm">
                        {prospect.currentDay ?? '—'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {trend ? (
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                          trend.isPositive ? 'bg-green-50 text-green-700' : 
                          trend.isNegative ? 'bg-red-50 text-red-700' : 
                          'bg-slate-50 text-slate-600'
                        }`}>
                          {trend.isPositive && <TrendingUp className="w-3 h-3" />}
                          {trend.isNegative && <TrendingDown className="w-3 h-3" />}
                          {trend.percentage}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="text-slate-700 font-medium">{prospect.mtd ?? '—'}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="text-slate-600">{prospect.previousDay ?? '—'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">Done MTD</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-slate-700 uppercase tracking-wider">Cases Delayed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.operations.map((operation, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6">
                    <span className="font-semibold text-slate-900 text-sm">{operation.serviceType}</span>
                    {operation.delayedNotes && (
                      <p className="text-xs text-slate-500 mt-1">{operation.delayedNotes}</p>
                    )}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium ${
                      (operation.pendingUs ?? 0) > 0 ? 'bg-orange-50 text-orange-700' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {operation.pendingUs ?? '—'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium ${
                      (operation.pendingClient ?? 0) > 0 ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {operation.pendingClient ?? '—'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium ${
                      (operation.pendingProVisit ?? 0) > 0 ? 'bg-purple-50 text-purple-700' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {operation.pendingProVisit ?? '—'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium ${
                      (operation.pendingGov ?? 0) > 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {operation.pendingGov ?? '—'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium ${
                      (operation.doneToday ?? 0) > 0 ? 'bg-green-50 text-green-700' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {operation.doneToday ?? '—'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-slate-700 font-medium">{operation.doneMtd ?? '—'}</span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium ${
                      (operation.casesDelayed ?? 0) > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                    }`}>
                      {operation.casesDelayed ?? 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
