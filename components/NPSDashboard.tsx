'use client';

import { useState, useEffect } from 'react';
import DatePickerCalendar from '@/components/DatePickerCalendar';
import NPSSummaryCard from '@/components/NPSSummaryCard';
import NPSChart from '@/components/NPSChart';
import NPSServiceDetail from '@/components/NPSServiceDetail';
import type { NPSAggregatedData } from '@/lib/nps-types';

export default function NPSDashboard() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [data, setData] = useState<NPSAggregatedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeServiceTab, setActiveServiceTab] = useState<'overview' | string>('overview');

  // Fetch available dates
  useEffect(() => {
    const fetchDates = async () => {
      try {
        const res = await fetch('/api/nps/dates');
        const result = await res.json();
        if (result.success && result.dates) {
          setAvailableDates(result.dates);
          // Auto-select the most recent date
          if (result.dates.length > 0 && !selectedDate) {
            setSelectedDate(result.dates[result.dates.length - 1]);
          }
        }
      } catch (err) {
        console.error('Error fetching NPS dates:', err);
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
        
        let url = `/api/nps?startDate=${selectedDate}`;
        if (selectedEndDate) {
          url += `&endDate=${selectedEndDate}`;
        } else {
          url += `&endDate=${selectedDate}`;
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to fetch data');
        }
      } catch (err) {
        setError('Network error occurred');
        console.error('Error fetching NPS data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, selectedEndDate]);

  // Handle date selection from calendar
  const handleDateSelect = (startDate: string | null, endDate?: string | null) => {
    setSelectedDate(startDate);
    setSelectedEndDate(endDate || null);
    setActiveServiceTab('overview'); // Reset to overview when date changes
  };

  // Get unique service names for tabs
  const serviceNames = data?.services.map(s => s.service) || [];

  // Loading state
  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="h-8 bg-slate-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-slate-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Sub-tabs and Date Picker */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg flex-wrap">
          <button
            onClick={() => setActiveServiceTab('overview')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeServiceTab === 'overview'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Overview
          </button>
          {serviceNames.map((service) => (
            <button
              key={service}
              onClick={() => setActiveServiceTab(service)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeServiceTab === service
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              {service}
            </button>
          ))}
        </div>
        <DatePickerCalendar
          availableDates={availableDates}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Date selection prompt */}
      {!selectedDate && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-200">
          <svg className="w-16 h-16 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Please Select a Date</h3>
          <p className="text-sm text-slate-500 text-center max-w-sm">
            Use the date picker above to select a date or date range to view NPS data.
          </p>
        </div>
      )}

      {/* Overview Tab */}
      {selectedDate && activeServiceTab === 'overview' && (
        <>
          <NPSSummaryCard metrics={data?.overall || null} isLoading={isLoading} />
          <NPSChart data={data} isLoading={isLoading} />
        </>
      )}

      {/* Service Tabs */}
      {selectedDate && activeServiceTab !== 'overview' && (
        <NPSServiceDetail
          serviceMetrics={data?.services.filter(s => s.service === activeServiceTab) || []}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

