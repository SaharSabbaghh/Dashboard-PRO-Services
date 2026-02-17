'use client';

import { useState, useRef, useEffect } from 'react';
import { format, parse, isValid, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';

interface PnLDatePickerProps {
  availableMonths: string[]; // ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]
  availableDates?: string[]; // ["2025-10-01", "2025-10-02", ...] for daily view
  selectedStartDate: string | null;
  selectedEndDate: string | null;
  onDateSelect: (startDate: string | null, endDate?: string | null) => void;
  viewMode?: 'daily' | 'monthly'; // New prop for view mode
  onViewModeChange?: (mode: 'daily' | 'monthly') => void; // Callback for mode change
}

export default function PnLDatePicker({
  availableMonths,
  availableDates = [],
  selectedStartDate,
  selectedEndDate,
  onDateSelect,
  viewMode = 'monthly',
  onViewModeChange,
}: PnLDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'month' | 'range' | 'day'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null); // For daily view
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => format(new Date(), 'yyyy-MM'));
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
    if (viewMode === 'daily') {
      if (selectedStartDate && selectedStartDate === selectedEndDate) {
        setMode('day');
        setSelectedDay(selectedStartDate);
        setCurrentMonth(selectedStartDate.substring(0, 7));
      } else if (selectedStartDate && selectedEndDate && selectedStartDate !== selectedEndDate) {
        setMode('range');
        setRangeStart(selectedStartDate);
        setRangeEnd(selectedEndDate);
      } else {
        setMode('day');
      }
    } else {
      // Monthly mode
      if (selectedStartDate && selectedEndDate && selectedStartDate !== selectedEndDate) {
        setMode('range');
        setRangeStart(selectedStartDate.substring(0, 7));
        setRangeEnd(selectedEndDate.substring(0, 7));
      } else if (selectedStartDate) {
        setMode('month');
        setSelectedMonth(selectedStartDate.substring(0, 7));
      }
    }
  }, [selectedStartDate, selectedEndDate, viewMode]);

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

  const isDateAvailable = (dateStr: string) => {
    return availableDates.includes(dateStr);
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

  const isDateSelected = (dateStr: string) => {
    if (mode === 'day') {
      return selectedDay === dateStr;
    }
    if (mode === 'range') {
      return rangeStart === dateStr || rangeEnd === dateStr;
    }
    return false;
  };

  const isInRange = (monthKey: string) => {
    if (mode === 'range' && rangeStart && rangeEnd) {
      return monthKey > rangeStart && monthKey < rangeEnd;
    }
    return false;
  };

  const isDateInRange = (dateStr: string) => {
    if (mode === 'range' && rangeStart && rangeEnd) {
      return dateStr > rangeStart && dateStr < rangeEnd;
    }
    return false;
  };

  const handleMonthClick = (monthKey: string) => {
    if (!isMonthAvailable(monthKey)) return;

    if (mode === 'month') {
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

  const handleDateClick = (dateStr: string) => {
    if (!isDateAvailable(dateStr)) return;

    if (mode === 'day') {
      setSelectedDay(dateStr);
      onDateSelect(dateStr, dateStr);
      setIsOpen(false);
    } else if (mode === 'range') {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        // Start new range
        setRangeStart(dateStr);
        setRangeEnd(null);
      } else {
        // Complete the range
        let start = rangeStart;
        let end = dateStr;
        if (dateStr < rangeStart) {
          start = dateStr;
          end = rangeStart;
        }
        setRangeStart(start);
        setRangeEnd(end);
        
        onDateSelect(start, end);
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

  const handleDayClick = (day: string) => {
    setMode('day');
    setSelectedDay(day);
    onDateSelect(day, day); // Same start and end date for daily view
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    if (isDateAvailable(today)) {
      setMode('day');
      setSelectedDay(today);
      setCurrentMonth(format(new Date(), 'yyyy-MM'));
      onDateSelect(today, today);
      setIsOpen(false);
    }
  };

  // Get days in current month
  const getDaysInMonth = () => {
    const monthDate = parse(`${currentMonth}-01`, 'yyyy-MM-dd', new Date());
    const daysInMonth = endOfMonth(monthDate).getDate();
    const firstDayOfWeek = monthDate.getDay(); // 0 = Sunday
    
    const days: (string | null)[] = [];
    
    // Add empty cells for days before the month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = day.toString().padStart(2, '0');
      days.push(`${currentMonth}-${dayStr}`);
    }
    
    return days;
  };

  const getDisplayText = () => {
    if (!selectedStartDate && !selectedEndDate) {
      return 'Select Date';
    }
    if (mode === 'day' && selectedDay) {
      try {
        const date = parse(selectedDay, 'yyyy-MM-dd', new Date());
        return format(date, 'MMM dd, yyyy');
      } catch {
        return selectedDay;
      }
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
        if (viewMode === 'daily') {
          // For daily mode, rangeStart and rangeEnd are full dates
          const startDate = parse(rangeStart, 'yyyy-MM-dd', new Date());
          const endDate = parse(rangeEnd, 'yyyy-MM-dd', new Date());
          return `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd, yyyy')}`;
        } else {
          // For monthly mode, rangeStart and rangeEnd are month keys
          const startDate = parse(`${rangeStart}-01`, 'yyyy-MM-dd', new Date());
          const endDate = parse(`${rangeEnd}-01`, 'yyyy-MM-dd', new Date());
          return `${format(startDate, 'MMM yyyy')} - ${format(endDate, 'MMM yyyy')}`;
        }
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
          {/* View Mode Toggle (Daily/Monthly) */}
          {onViewModeChange && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg mb-4">
              <button
                onClick={() => {
                  onViewModeChange('daily');
                  setMode('day');
                  setSelectedMonth(null);
                  setRangeStart(null);
                  setRangeEnd(null);
                }}
                className={`flex-1 px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                  viewMode === 'daily'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => {
                  onViewModeChange('monthly');
                  setMode('month');
                  setSelectedDay(null);
                }}
                className={`flex-1 px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
                  viewMode === 'monthly'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Monthly
              </button>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-slate-100">
            {viewMode === 'daily' ? (
              <button
                onClick={handleToday}
                className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Today
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>

          {viewMode === 'daily' ? (
            /* Daily View - Calendar */
            <>
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => {
                    const prevMonth = format(subMonths(parse(`${currentMonth}-01`, 'yyyy-MM-dd', new Date()), 1), 'yyyy-MM');
                    setCurrentMonth(prevMonth);
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="text-base font-semibold text-slate-800">
                  {format(parse(`${currentMonth}-01`, 'yyyy-MM-dd', new Date()), 'MMMM yyyy')}
                </div>
                <button
                  onClick={() => {
                    const nextMonth = format(addMonths(parse(`${currentMonth}-01`, 'yyyy-MM-dd', new Date()), 1), 'yyyy-MM');
                    setCurrentMonth(nextMonth);
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-xs font-medium text-slate-500 py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth().map((day, i) => {
                  if (!day) {
                    return <div key={i} className="py-2"></div>;
                  }
                  const isAvailable = isDateAvailable(day);
                  const isSelected = isDateSelected(day);
                  const isInDateRange = isDateInRange(day);
                  const isToday = day === format(new Date(), 'yyyy-MM-dd');

                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(day)}
                      disabled={!isAvailable}
                      className={`
                        py-2 px-1 text-sm rounded-lg transition-all
                        ${!isAvailable ? 'text-slate-300 cursor-not-allowed' : ''}
                        ${isSelected && isAvailable ? 'bg-blue-600 text-white font-medium' : ''}
                        ${isInDateRange && isAvailable ? 'bg-blue-100 text-blue-700' : ''}
                        ${!isSelected && !isInDateRange && isToday && isAvailable ? 'bg-slate-100 text-slate-700 font-medium' : ''}
                        ${!isSelected && !isInDateRange && !isToday && isAvailable ? 'text-slate-700 hover:bg-slate-100' : ''}
                      `}
                    >
                      {parseInt(day.split('-')[2])}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* Monthly View - Existing monthly picker */
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

