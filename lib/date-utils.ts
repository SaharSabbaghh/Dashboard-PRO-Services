/**
 * Date Utility Functions
 * 
 * Provides consistent date parsing and formatting across the application
 */

/**
 * Normalize any date format to ISO string
 * Handles:
 * - ISO strings (2026-02-11T10:30:00.000Z)
 * - Space-separated (2026-02-11 10:30:00)
 * - Space-separated with milliseconds (2026-02-11 10:30:00.000)
 * - Partial time (2026-02-11 1:57:53)
 */
export function normalizeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toISOString();
  
  // Already an ISO string?
  if (dateStr.includes('T') && dateStr.includes('Z')) {
    return dateStr;
  }
  
  // Try parsing as ISO first
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate.toISOString();
  }
  
  // Handle space-separated format: "2026-01-26 1:57:53" or "2026-01-26 06:02:17.000"
  const [datePart, timePart] = dateStr.split(' ');
  if (!datePart) return new Date().toISOString();
  
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) return new Date().toISOString();
  
  // Handle time with optional milliseconds
  const timeClean = (timePart || '0:0:0').split('.')[0];
  const [hour, minute, second] = timeClean.split(':').map(Number);
  
  return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0).toISOString();
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Compare two dates (earlier date is less than later date)
 */
export function compareDates(date1: string, date2: string): number {
  const d1 = new Date(normalizeDate(date1)).getTime();
  const d2 = new Date(normalizeDate(date2)).getTime();
  return d1 - d2;
}

/**
 * Get the earliest date from an array
 */
export function getEarliestDate(...dates: string[]): string {
  const normalized = dates.filter(Boolean).map(normalizeDate);
  if (normalized.length === 0) return new Date().toISOString();
  return normalized.reduce((earliest, current) => 
    compareDates(current, earliest) < 0 ? current : earliest
  );
}

/**
 * Get the latest date from an array
 */
export function getLatestDate(...dates: string[]): string {
  const normalized = dates.filter(Boolean).map(normalizeDate);
  if (normalized.length === 0) return new Date().toISOString();
  return normalized.reduce((latest, current) => 
    compareDates(current, latest) > 0 ? current : latest
  );
}

