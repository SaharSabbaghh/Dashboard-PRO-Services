'use client';

import { useState, useRef, useEffect } from 'react';
import { format, parse, isValid, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

interface DatePickerCalendarProps {
  availableDates: string[];
  selectedDate: string | null;
  onDateSelect: (date: string | null, endDate?: string | null) => void;
}

interface DateRange {
  from: Date | null;
  to: Date | null;
}

export default function DatePickerCalendar({
  availableDates,
  selectedDate,
  onDateSelect,
}: DatePickerCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      const parsed = parse(selectedDate, 'yyyy-MM-dd', new Date());
      if (isValid(parsed)) return parsed;
    }
    return new Date();
  });
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

  // Generate calendar days
  const generateCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const isDateAvailable = (date: Date) => {
    const formatted = format(date, 'yyyy-MM-dd');
    return availableDates.includes(formatted);
  };

  const isDateSelected = (date: Date) => {
    if (mode === 'single' && selectedDate) {
      const selected = parse(selectedDate, 'yyyy-MM-dd', new Date());
      return isSameDay(date, selected);
    }
    if (mode === 'range') {
      if (dateRange.from && isSameDay(date, dateRange.from)) return true;
      if (dateRange.to && isSameDay(date, dateRange.to)) return true;
    }
    return false;
  };

  const isInRange = (date: Date) => {
    if (mode === 'range') {
      // When we have both from and to
      if (dateRange.from && dateRange.to) {
        return date > dateRange.from && date < dateRange.to;
      }
      // When we only have from and are hovering
      if (dateRange.from && !dateRange.to && hoverDate) {
        const start = dateRange.from < hoverDate ? dateRange.from : hoverDate;
        const end = dateRange.from < hoverDate ? hoverDate : dateRange.from;
        return date > start && date < end;
      }
    }
    return false;
  };

  const isRangeEnd = (date: Date) => {
    if (mode === 'range' && dateRange.from && !dateRange.to && hoverDate) {
      return isSameDay(date, hoverDate);
    }
    return false;
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  const handleDayClick = (day: Date) => {
    if (!isDateAvailable(day)) return;

    const formatted = format(day, 'yyyy-MM-dd');

    if (mode === 'single') {
      onDateSelect(formatted);
      setIsOpen(false);
    } else {
      // Range mode
      if (!dateRange.from || (dateRange.from && dateRange.to)) {
        // Start new range
        setDateRange({ from: day, to: null });
      } else {
        // Complete the range
        let from = dateRange.from;
        let to = day;
        if (day < dateRange.from) {
          from = day;
          to = dateRange.from;
        }
        setDateRange({ from, to });
        // Pass both start and end dates
        onDateSelect(format(from, 'yyyy-MM-dd'), format(to, 'yyyy-MM-dd'));
        setIsOpen(false);
      }
    }
  };

  const handleClear = () => {
    onDateSelect(null);
    setDateRange({ from: null, to: null });
  };

  const handleToday = () => {
    const today = new Date();
    const formatted = format(today, 'yyyy-MM-dd');
    setCurrentMonth(today);
    if (isDateAvailable(today)) {
      onDateSelect(formatted);
      setIsOpen(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    );
  };

  // Format display text
  const getDisplayText = () => {
    if (mode === 'range' && dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
    }
    if (mode === 'range' && dateRange.from) {
      return `${format(dateRange.from, 'MMM d, yyyy')} - ...`;
    }
    if (!selectedDate) return 'All Dates';
    try {
      const parsed = parse(selectedDate, 'yyyy-MM-dd', new Date());
      if (isValid(parsed)) {
        return format(parsed, 'MMM d, yyyy');
      }
    } catch {
      // Fall through
    }
    return selectedDate;
  };

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
        <span className="text-slate-700">{getDisplayText()}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Calendar */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl border border-slate-200 shadow-lg p-5 min-w-[280px]">
          {/* Header with Month/Year and Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-base font-semibold text-slate-800">
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Mode Toggle - subtle */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => {
                setMode('single');
                setDateRange({ from: null, to: null });
              }}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                mode === 'single'
                  ? 'bg-slate-100 text-slate-700 font-medium'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Single
            </button>
            <button
              onClick={() => {
                setMode('range');
                setDateRange({ from: null, to: null });
              }}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                mode === 'range'
                  ? 'bg-slate-100 text-slate-700 font-medium'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Range
            </button>
            {mode === 'range' && dateRange.from && !dateRange.to && (
              <span className="text-xs text-blue-600 ml-2">Select end date</span>
            )}
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day, i) => (
              <div key={i} className="text-center text-sm font-medium text-slate-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const available = isDateAvailable(day);
              const selected = isDateSelected(day);
              const inRange = isInRange(day);
              const rangeEnd = isRangeEnd(day);
              const today = isToday(day);

              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(day)}
                  onMouseEnter={() => mode === 'range' && dateRange.from && !dateRange.to && setHoverDate(day)}
                  onMouseLeave={() => setHoverDate(null)}
                  disabled={!available}
                  className={`
                    w-9 h-9 text-sm rounded-lg transition-all flex items-center justify-center
                    ${!isCurrentMonth ? 'text-slate-300' : ''}
                    ${isCurrentMonth && !available ? 'text-slate-300 cursor-default' : ''}
                    ${isCurrentMonth && available && !selected && !inRange && !rangeEnd ? 'text-slate-700 hover:bg-slate-100' : ''}
                    ${selected ? 'bg-blue-600 text-white font-medium' : ''}
                    ${inRange ? 'bg-blue-100 text-blue-700' : ''}
                    ${rangeEnd && !selected ? 'bg-blue-200 text-blue-800' : ''}
                    ${today && !selected ? 'ring-2 ring-blue-400 ring-inset' : ''}
                    ${available && isCurrentMonth ? 'font-medium' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Range Info */}
          {mode === 'range' && dateRange.from && dateRange.to && (
            <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs text-blue-700 text-center">
              {format(dateRange.from, 'MMM d')} → {format(dateRange.to, 'MMM d, yyyy')}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={handleClear}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={handleToday}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
