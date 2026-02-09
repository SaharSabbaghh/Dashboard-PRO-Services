'use client';

import { useState, useRef, useEffect } from 'react';
import { format, parse, isValid, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

interface PnLDatePickerProps {
  availableMonths: string[]; // ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]
  selectedStartDate: string | null;
  selectedEndDate: string | null;
  onDateSelect: (startDate: string | null, endDate?: string | null) => void;
}

export default function PnLDatePicker({
  availableMonths,
  selectedStartDate,
  selectedEndDate,
  onDateSelect,
}: PnLDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'month' | 'range'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync with props
  useEffect(() => {
    if (selectedStartDate && selectedEndDate && selectedStartDate !== selectedEndDate) {
      setMode('range');
      setRangeStart(selectedStartDate.substring(0, 7));
      setRangeEnd(selectedEndDate.substring(0, 7));
    } else if (selectedStartDate) {
      setMode('month');
      setSelectedMonth(selectedStartDate.substring(0, 7));
    }
    // If no dates selected, keep current mode but clear selections
  }, [selectedStartDate, selectedEndDate]);

  const months = [
    { key: '01', label: 'Jan' },
    { key: '02', label: 'Feb' },
    { key: '03', label: 'Mar' },
    { key: '04', label: 'Apr' },
    { key: '05', label: 'May' },
    { key: '06', label: 'Jun' },
    { key: '07', label: 'Jul' },
    { key: '08', label: 'Aug' },
    { key: '09', label: 'Sep' },
    { key: '10', label: 'Oct' },
    { key: '11', label: 'Nov' },
    { key: '12', label: 'Dec' },
  ];

  const isMonthAvailable = (monthKey: string) => {
    return availableMonths.includes(monthKey);
  };

  const isMonthSelected = (monthKey: string) => {
    if (mode === 'month') {
      return selectedMonth === monthKey;
    }
    if (mode === 'range') {
      return rangeStart === monthKey || rangeEnd === monthKey;
    }
    return false;
  };

  const isInRange = (monthKey: string) => {
    if (mode === 'range' && rangeStart && rangeEnd) {
      return monthKey > rangeStart && monthKey < rangeEnd;
    }
    return false;
  };

  const handleMonthClick = (monthKey: string) => {
    if (!isMonthAvailable(monthKey)) return;

    if (mode === 'month' || mode === 'all') {
      setMode('month');
      setSelectedMonth(monthKey);
      // Convert month to date range (first day to last day of month)
      const startDate = `${monthKey}-01`;
      const monthDate = parse(startDate, 'yyyy-MM-dd', new Date());
      const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd');
      onDateSelect(startDate, endDate);
      setIsOpen(false);
    } else if (mode === 'range') {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        // Start new range
        setRangeStart(monthKey);
        setRangeEnd(null);
      } else {
        // Complete the range
        let start = rangeStart;
        let end = monthKey;
        if (monthKey < rangeStart) {
          start = monthKey;
          end = rangeStart;
        }
        setRangeStart(start);
        setRangeEnd(end);
        
        // Convert to date range
        const startDate = `${start}-01`;
        const endMonthDate = parse(`${end}-01`, 'yyyy-MM-dd', new Date());
        const endDate = format(endOfMonth(endMonthDate), 'yyyy-MM-dd');
        onDateSelect(startDate, endDate);
        setIsOpen(false);
      }
    }
  };

  const handleThisMonth = () => {
    const thisMonth = format(new Date(), 'yyyy-MM');
    if (isMonthAvailable(thisMonth)) {
      setMode('month');
      setSelectedMonth(thisMonth);
      const startDate = `${thisMonth}-01`;
      const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      onDateSelect(startDate, endDate);
      setIsOpen(false);
    }
  };

  const handleLastMonth = () => {
    const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM');
    if (isMonthAvailable(lastMonth)) {
      setMode('month');
      setSelectedMonth(lastMonth);
      const startDate = `${lastMonth}-01`;
      const lastMonthDate = subMonths(new Date(), 1);
      const endDate = format(endOfMonth(lastMonthDate), 'yyyy-MM-dd');
      onDateSelect(startDate, endDate);
      setIsOpen(false);
    }
  };

  const handleLast3Months = () => {
    const endMonth = format(new Date(), 'yyyy-MM');
    const startMonth = format(subMonths(new Date(), 2), 'yyyy-MM');
    
    setMode('range');
    setRangeStart(startMonth);
    setRangeEnd(endMonth);
    
    const startDate = `${startMonth}-01`;
    const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');
    onDateSelect(startDate, endDate);
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (!selectedStartDate && !selectedEndDate) {
      return 'Select Date';
    }
    if (mode === 'month' && selectedMonth) {
      try {
        const date = parse(`${selectedMonth}-01`, 'yyyy-MM-dd', new Date());
        return format(date, 'MMM yyyy');
      } catch {
        return selectedMonth;
      }
    }
    if (mode === 'range' && rangeStart && rangeEnd) {
      try {
        const startDate = parse(`${rangeStart}-01`, 'yyyy-MM-dd', new Date());
        const endDate = parse(`${rangeEnd}-01`, 'yyyy-MM-dd', new Date());
        return `${format(startDate, 'MMM yyyy')} - ${format(endDate, 'MMM yyyy')}`;
      } catch {
        return `${rangeStart} - ${rangeEnd}`;
      }
    }
    if (mode === 'range' && rangeStart && !rangeEnd) {
      try {
        const startDate = parse(`${rangeStart}-01`, 'yyyy-MM-dd', new Date());
        return `${format(startDate, 'MMM yyyy')} - ...`;
      } catch {
        return `${rangeStart} - ...`;
      }
    }
    return 'Select Date';
  };

  // Get years that have data
  const yearsWithData = [...new Set(availableMonths.map(m => parseInt(m.substring(0, 4))))].sort();

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white hover:bg-slate-50 transition-colors"
      >
        <svg
          className="w-4 h-4 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="text-slate-700 font-medium">{getDisplayText()}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl border border-slate-200 shadow-lg p-4 min-w-[320px]">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-slate-100">
            <button
              onClick={handleThisMonth}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              This Month
            </button>
            <button
              onClick={handleLastMonth}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Last Month
            </button>
            <button
              onClick={handleLast3Months}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Last 3 Months
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => {
                setMode('month');
                setRangeStart(null);
                setRangeEnd(null);
              }}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                mode === 'month'
                  ? 'bg-slate-100 text-slate-700 font-medium'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Single Month
            </button>
            <button
              onClick={() => {
                setMode('range');
                setSelectedMonth(null);
              }}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                mode === 'range'
                  ? 'bg-slate-100 text-slate-700 font-medium'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Date Range
            </button>
            {mode === 'range' && rangeStart && !rangeEnd && (
              <span className="text-xs text-blue-600 ml-2">Select end month</span>
            )}
          </div>

          {/* Year Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCurrentYear(y => y - 1)}
              disabled={!yearsWithData.includes(currentYear - 1)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-base font-semibold text-slate-800">
              {currentYear}
            </div>
            <button
              onClick={() => setCurrentYear(y => y + 1)}
              disabled={!yearsWithData.includes(currentYear + 1)}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-4 gap-2">
            {months.map((month) => {
              const monthKey = `${currentYear}-${month.key}`;
              const available = isMonthAvailable(monthKey);
              const selected = isMonthSelected(monthKey);
              const inRange = isInRange(monthKey);

              return (
                <button
                  key={month.key}
                  onClick={() => handleMonthClick(monthKey)}
                  disabled={!available}
                  className={`
                    py-2 px-3 text-sm rounded-lg transition-all
                    ${!available ? 'text-slate-300 cursor-default' : ''}
                    ${available && !selected && !inRange ? 'text-slate-700 hover:bg-slate-100' : ''}
                    ${selected ? 'bg-blue-600 text-white font-medium' : ''}
                    ${inRange ? 'bg-blue-100 text-blue-700' : ''}
                    ${available ? 'font-medium' : ''}
                  `}
                >
                  {month.label}
                </button>
              );
            })}
          </div>

          {/* Range Info */}
          {mode === 'range' && rangeStart && rangeEnd && (
            <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs text-blue-700 text-center">
              {(() => {
                try {
                  const startDate = parse(`${rangeStart}-01`, 'yyyy-MM-dd', new Date());
                  const endDate = parse(`${rangeEnd}-01`, 'yyyy-MM-dd', new Date());
                  return `${format(startDate, 'MMM yyyy')} → ${format(endDate, 'MMM yyyy')}`;
                } catch {
                  return `${rangeStart} → ${rangeEnd}`;
                }
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

